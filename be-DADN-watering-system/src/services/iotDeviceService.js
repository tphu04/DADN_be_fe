const prisma = require('../../config/database');
const mqttService = require('./mqtt.service');
const { DeviceFactoryCreator } = require('../factory/DevicePatternFactory');

class IoTDeviceService {
    /**
     * Khởi tạo tất cả thiết bị khi khởi động server
     */
    async initializeDevices() {
        try {
            const devices = await this.getAllDevices();
            console.log(`Tìm thấy ${devices.length} thiết bị trong database`);
            
            // Kiểm tra kết nối MQTT
            if (!mqttService.checkConnection()) {
                console.log('MQTT chưa kết nối, đang đợi kết nối trước khi khởi tạo thiết bị...');
                
                // Đợi kết nối MQTT
                await new Promise((resolve) => {
                    // Đăng ký sự kiện connect
                    mqttService.client.once('connect', () => {
                        console.log('MQTT đã kết nối, tiếp tục khởi tạo thiết bị');
                        resolve();
                    });
                    
                    // Đặt timeout để không đợi mãi
                    setTimeout(() => {
                        console.log('Hết thời gian đợi MQTT, tiếp tục khởi tạo');
                        resolve();
                    }, 10000); // 10 giây
                });
            }
            
            // Kiểm tra lại sau khi đợi
            if (!mqttService.checkConnection()) {
                console.warn('MQTT vẫn chưa kết nối sau khi đợi, thiết bị có thể không được khởi tạo đúng');
            } else {
                console.log('MQTT đã kết nối, bắt đầu khởi tạo thiết bị');
            }
            
            // Khởi tạo từng thiết bị
            let initializedCount = 0;
            for (const device of devices) {
                // Đợi giữa các lần kết nối để tránh quá tải
                if (initializedCount > 0) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
                
                const success = await mqttService.connectDevice(device);
                if (success) {
                    initializedCount++;
                }
            }
            
            console.log(`Đã khởi tạo ${initializedCount}/${devices.length} thiết bị`);
            return devices;
        } catch (error) {
            console.error('Lỗi khởi tạo thiết bị:', error);
            throw error;
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
            const device = await prisma.ioTDevice.findUnique({
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
                    },
                    lightData: {
                        take: 100,
                        orderBy: { readingTime: 'desc' }
                    }
                }
            });

            // Log để kiểm tra
            console.log('Device data:', device);
            if (device.deviceType === 'light') {
                console.log('Light data:', device.lightData);
            }

            return device;
        } catch (error) {
            console.error('Lỗi lấy thông tin thiết bị:', error);
            throw error;
        }
    }

    /**
     * Tạo thiết bị mới sử dụng Factory Pattern
     */
    async createDevice(deviceData) {
        try {
            // Lấy factory tương ứng với loại thiết bị
            const factory = DeviceFactoryCreator.getFactory(deviceData.deviceType);
            
            // Sử dụng factory để tạo thiết bị
            return await factory.createDevice(deviceData);
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
                // 1. Xóa các feeds liên quan
                prisma.feed.deleteMany({
                    where: { deviceId: parseInt(id) }
                }),
                
                // 2. Xóa dữ liệu nhiệt độ và độ ẩm
                prisma.temperatureHumidityData.deleteMany({
                    where: { deviceId: parseInt(id) }
                }),
                
                // 3. Xóa dữ liệu độ ẩm đất
                prisma.soilMoistureData.deleteMany({
                    where: { deviceId: parseInt(id) }
                }),
                
                // 4. Xóa dữ liệu máy bơm
                prisma.pumpWaterData.deleteMany({
                    where: { deviceId: parseInt(id) }
                }),
                
                // 5. Xóa Log data
                prisma.logData.deleteMany({
                    where: { deviceId: parseInt(id) }
                }),
                
                // 6. Xóa Configurations
                prisma.configuration.deleteMany({
                    where: { deviceId: parseInt(id) }
                }),
                
                // 7. Cuối cùng xóa thiết bị
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
     * Điều khiển thiết bị
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