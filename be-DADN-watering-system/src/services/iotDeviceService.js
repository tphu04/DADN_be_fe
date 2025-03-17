const prisma = require('../../config/database');
const mqttService = require('./mqtt.service');

class IoTDeviceService {
    /**
     * Khởi tạo tất cả thiết bị khi khởi động server
     */
    async initializeDevices() {
        try {
            // Lấy tất cả thiết bị từ database
            const devices = await prisma.ioTDevice.findMany({
                include: { feeds: true }
            });
            
            console.log(`Tìm thấy ${devices.length} thiết bị trong database`);
            
            // Khởi tạo kết nối MQTT cho từng thiết bị có status = On
            let connectedCount = 0;
            for (const device of devices) {
                if (device.status === 'On') {
                    const connected = await mqttService.connectDevice(device);
                    if (connected) connectedCount++;
                } else {
                    console.log(`Thiết bị ${device.deviceCode} đang tắt, không kết nối MQTT`);
                }
            }
            
            console.log(`Đã khởi tạo ${connectedCount}/${devices.length} thiết bị`);
        } catch (error) {
            console.error('Lỗi khởi tạo thiết bị:', error);
        }
    }

    /**
     * Lấy tất cả thiết bị
     */
    async getAllDevices() {
        try {
            return await prisma.ioTDevice.findMany({
                include: {
                    feeds: true
                }
            });
        } catch (error) {
            console.error('Lỗi lấy danh sách thiết bị:', error);
            throw error;
        }
    }

    /**
     * Lấy thông tin chi tiết thiết bị
     */
    async getDeviceById(id) {
        try {
            return await prisma.ioTDevice.findUnique({
                where: { id: parseInt(id) },
                include: {
                    feeds: true,
                    temperatureHumidityData: {
                        take: 100,
                        orderBy: { readingTime: 'desc' }
                    },
                    soilMoistureData: {
                        take: 100,
                        orderBy: { readingTime: 'desc' }
                    },
                    pumpWaterData: {
                        take: 100,
                        orderBy: { readingTime: 'desc' }
                    }
                }
            });
        } catch (error) {
            console.error('Lỗi lấy thông tin thiết bị:', error);
            throw error;
        }
    }

    /**
     * Tạo thiết bị mới
     */
    async createDevice(deviceData) {
        try {
            // Trích xuất thông tin feeds từ dữ liệu gửi lên
            const { feeds, ...deviceInfo } = deviceData;
            
            // Mặc định status = Off khi mới tạo
            if (!deviceInfo.status) {
                deviceInfo.status = 'Off';
            }
            
            // Tạo thiết bị với các feed (nếu có) sử dụng cú pháp đúng của Prisma
            const device = await prisma.ioTDevice.create({
                data: {
                    ...deviceInfo,
                    // Sử dụng cú pháp create cho quan hệ feeds
                    feeds: feeds ? {
                        create: feeds
                    } : undefined
                },
                // Bao gồm thông tin feeds trong kết quả trả về
                include: {
                    feeds: true
                }
            });

            // Kết nối thiết bị với MQTT nếu status = On
            if (device.status === 'On') {
                await mqttService.connectDevice(device);
            }

            return device;
        } catch (error) {
            console.error('Lỗi tạo thiết bị:', error);
            throw error;
        }
    }

    /**
     * Cập nhật thiết bị
     */
    async updateDevice(id, deviceData) {
        try {
            // Lấy thông tin thiết bị hiện tại
            const currentDevice = await prisma.ioTDevice.findUnique({
                where: { id: parseInt(id) },
                include: { feeds: true }
            });
            
            if (!currentDevice) {
                throw new Error(`Không tìm thấy thiết bị với ID ${id}`);
            }
            
            // Cập nhật thiết bị
            const device = await prisma.ioTDevice.update({
                where: { id: parseInt(id) },
                data: deviceData,
                include: { feeds: true }
            });

            // Kiểm tra nếu status thay đổi
            if (deviceData.status !== undefined && currentDevice.status !== deviceData.status) {
                if (deviceData.status === 'On') {
                    // Nếu chuyển thành On, kết nối MQTT
                    await mqttService.connectDevice(device);
                } else {
                    // Nếu chuyển thành Off, ngắt kết nối MQTT
                    await mqttService.disconnectDevice(parseInt(id));
                }
            }

            return device;
        } catch (error) {
            console.error('Lỗi cập nhật thiết bị:', error);
            throw error;
        }
    }

    /**
     * Xóa thiết bị
     */
    async deleteDevice(id) {
        try {
            // Ngắt kết nối MQTT trước
            await mqttService.disconnectDevice(parseInt(id));

            // Xóa các bản ghi liên quan để tránh vi phạm ràng buộc khóa ngoại
            await prisma.$transaction([
                // 1. Xóa dữ liệu cảm biến
                prisma.temperatureHumidityData.deleteMany({
                    where: { deviceId: parseInt(id) }
                }),
                
                prisma.soilMoistureData.deleteMany({
                    where: { deviceId: parseInt(id) }
                }),
                
                prisma.pumpWaterData.deleteMany({
                    where: { deviceId: parseInt(id) }
                }),

                // 2. Xóa dữ liệu SensorData
                prisma.sensorData.deleteMany({
                    where: { deviceId: parseInt(id) }
                }),
                
                // 3. Xóa Log data
                prisma.logData.deleteMany({
                    where: { deviceId: parseInt(id) }
                }),
                
                // 4. Xóa Configurations
                prisma.configuration.deleteMany({
                    where: { deviceId: parseInt(id) }
                }),
                
                // 5. Xóa Feed
                prisma.feed.deleteMany({
                    where: { deviceId: parseInt(id) }
                }),

                // 6. Cuối cùng xóa thiết bị
                prisma.ioTDevice.delete({
                    where: { id: parseInt(id) }
                })
            ]);

            return true;
        } catch (error) {
            console.error('Lỗi xóa thiết bị:', error);
            throw error;
        }
    }

    /**
     * Lấy dữ liệu nhiệt độ và độ ẩm
     */
    async getTemperatureHumidityData(deviceId, limit = 100) {
        try {
            return await prisma.temperatureHumidityData.findMany({
                where: { deviceId: parseInt(deviceId) },
                orderBy: { readingTime: 'desc' },
                take: parseInt(limit)
            });
        } catch (error) {
            console.error('Lỗi lấy dữ liệu nhiệt độ và độ ẩm:', error);
            throw error;
        }
    }

    /**
     * Lấy dữ liệu độ ẩm đất
     */
    async getSoilMoistureData(deviceId, limit = 100) {
        try {
            return await prisma.soilMoistureData.findMany({
                where: { deviceId: parseInt(deviceId) },
                orderBy: { readingTime: 'desc' },
                take: parseInt(limit)
            });
        } catch (error) {
            console.error('Lỗi lấy dữ liệu độ ẩm đất:', error);
            throw error;
        }
    }

    /**
     * Lấy dữ liệu máy bơm
     */
    async getPumpWaterData(deviceId, limit = 100) {
        try {
            return await prisma.pumpWaterData.findMany({
                where: { deviceId: parseInt(deviceId) },
                orderBy: { readingTime: 'desc' },
                take: parseInt(limit)
            });
        } catch (error) {
            console.error('Lỗi lấy dữ liệu máy bơm:', error);
            throw error;
        }
    }

    /**
     * Điều khiển thiết bị (gửi lệnh MQTT)
     */
    async controlDevice(deviceId, command) {
        try {
            const device = await prisma.ioTDevice.findUnique({
                where: { id: parseInt(deviceId) },
                include: { feeds: true }
            });
            
            if (!device) {
                throw new Error(`Không tìm thấy thiết bị với ID ${deviceId}`);
            }
            
            if (device.status === 'Off') {
                throw new Error(`Thiết bị ${device.deviceCode} đang tắt, không thể điều khiển`);
            }
            
            // Xử lý lệnh tùy theo loại thiết bị
            if (device.deviceType === 'pump_water' && command.action) {
                const value = command.action === 'on' ? (command.speed || 100) : 0;
                return await mqttService.publishMessage(parseInt(deviceId), 'pump-control', value);
            }
            
            throw new Error(`Lệnh không hợp lệ hoặc không hỗ trợ cho loại thiết bị ${device.deviceType}`);
        } catch (error) {
            console.error('Lỗi điều khiển thiết bị:', error);
            throw error;
        }
    }
}

// Tạo và xuất instance duy nhất
const iotDeviceService = new IoTDeviceService();
module.exports = iotDeviceService; 