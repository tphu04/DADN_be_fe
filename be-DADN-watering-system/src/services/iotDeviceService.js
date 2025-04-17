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
            return await prisma.iotdevice.findMany({
                include: {
                    feed: true
                }
            });
        } catch (error) {
            console.error('Lỗi lấy danh sách thiết bị:', error);
            throw error;
        }
    }

    /**
     * Lấy thiết bị theo userId
     */
    async getDevicesByUserId(userId) {
        try {
            return await prisma.iotdevice.findMany({
                where: { userId: parseInt(userId) },
                include: {
                    feed: true
                }
            });
        } catch (error) {
            console.error('Lỗi lấy danh sách thiết bị của người dùng:', error);
            throw error;
        }
    }

    /**
     * Lấy thông tin chi tiết thiết bị
     */
    async getDeviceById(id, userId = null) {
        try {
            const whereClause = { id: parseInt(id) };
            
            // Nếu có userId, chỉ lấy thiết bị thuộc về user đó
            if (userId) {
                whereClause.userId = parseInt(userId);
            }
            
            const device = await prisma.iotdevice.findFirst({
                where: whereClause,
                include: {
                    feed: true,
                    temperaturehumiditydata: {
                        take: 100,
                        orderBy: { readingTime: 'desc' }
                    },
                    soilmoisturedata: {
                        take: 100,
                        orderBy: { readingTime: 'desc' }
                    },
                    pumpwaterdata: {
                        take: 100,
                        orderBy: { readingTime: 'desc' }
                    },
                    lightdata: {
                        take: 100,
                        orderBy: { readingTime: 'desc' }
                    }
                }
            });

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
            // Đảm bảo có userId
            if (!deviceData.userId) {
                throw new Error('userId là bắt buộc để tạo thiết bị');
            }
            
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
    async updateDevice(id, deviceData, userId = null) {
        try {
            // Lấy thông tin thiết bị hiện tại
            const whereClause = { id: parseInt(id) };
            
            // Nếu có userId, chỉ cập nhật thiết bị thuộc về user đó
            if (userId) {
                whereClause.userId = parseInt(userId);
            }
            
            const currentDevice = await prisma.iotdevice.findFirst({
                where: whereClause,
                include: { feed: true }
            });
            
            if (!currentDevice) {
                throw new Error(`Không tìm thấy thiết bị với ID ${id}`);
            }
            
            // Tách feeds từ deviceData nếu có
            const { feeds, ...deviceDataWithoutFeeds } = deviceData;
            
            // Cập nhật thiết bị
            const device = await prisma.iotdevice.update({
                where: { id: parseInt(id) },
                data: deviceDataWithoutFeeds,
                include: { feed: true }
            });
            
            // Cập nhật feeds nếu có
            if (feeds && feeds.length > 0) {
                // Tạo mảng các promise cập nhật feed
                const feedUpdatePromises = feeds.map(async (feed) => {
                    if (!feed.id) return null; // Bỏ qua nếu không có id
                    
                    // Tìm feed hiện tại
                    const existingFeed = currentDevice.feed.find(f => f.id === parseInt(feed.id));
                    if (!existingFeed) {
                        console.warn(`Feed với id ${feed.id} không tồn tại trong thiết bị ${id}`);
                        return null;
                    }
                    
                    // Cập nhật feed
                    return prisma.feed.update({
                        where: { id: parseInt(feed.id) },
                        data: {
                            name: feed.name !== undefined ? feed.name : existingFeed.name,
                            feedKey: feed.feedKey !== undefined ? feed.feedKey : existingFeed.feedKey,
                            minValue: feed.minValue !== undefined ? feed.minValue : existingFeed.minValue,
                            maxValue: feed.maxValue !== undefined ? feed.maxValue : existingFeed.maxValue
                        }
                    });
                });
                
                // Thực thi tất cả các update promise
                await Promise.all(feedUpdatePromises.filter(p => p !== null));
                
                // Nếu đã cập nhật feed, cần đăng ký lại MQTT cho thiết bị
                if (device.status === 'On') {
                    // Ngắt kết nối hiện tại
                    await mqttService.disconnectDevice(parseInt(id));
                    
                    // Lấy thông tin thiết bị với feeds mới
                    const refreshedDevice = await prisma.iotdevice.findUnique({
                        where: { id: parseInt(id) },
                        include: { feed: true }
                    });
                    
                    // Kết nối lại MQTT với feeds mới
                    await mqttService.connectDevice(refreshedDevice);
                }
            }

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
            
            // Trả về thông tin thiết bị mới nhất
            return await prisma.iotdevice.findUnique({
                where: { id: parseInt(id) },
                include: { feed: true }
            });
        } catch (error) {
            console.error('Lỗi cập nhật thiết bị:', error);
            throw error;
        }
    }

    /**
     * Xóa thiết bị
     */
    async deleteDevice(id, userId = null) {
        try {
            const whereClause = { id: parseInt(id) };
            
            // Nếu có userId, chỉ xóa thiết bị thuộc về user đó
            if (userId) {
                whereClause.userId = parseInt(userId);
            }
            
            // Kiểm tra thiết bị có tồn tại không
            const device = await prisma.iotdevice.findFirst({
                where: whereClause
            });
            
            if (!device) {
                throw new Error(`Không tìm thấy thiết bị với ID ${id}`);
            }
            
            // Ngắt kết nối MQTT trước khi xóa
            await mqttService.disconnectDevice(parseInt(id));
            
            // Xóa các dữ liệu liên quan
            await prisma.$transaction([
                // 1. Xóa các feeds liên quan
                prisma.feed.deleteMany({
                    where: { deviceId: parseInt(id) }
                }),
                
                // 2. Xóa dữ liệu nhiệt độ và độ ẩm
                prisma.temperaturehumiditydata.deleteMany({
                    where: { deviceId: parseInt(id) }
                }),
                
                // 3. Xóa dữ liệu độ ẩm đất
                prisma.soilmoisturedata.deleteMany({
                    where: { deviceId: parseInt(id) }
                }),
                
                // 4. Xóa dữ liệu máy bơm
                prisma.pumpwaterdata.deleteMany({
                    where: { deviceId: parseInt(id) }
                }),
                
                // 5. Xóa dữ liệu đèn
                prisma.lightdata.deleteMany({
                    where: { deviceId: parseInt(id) }
                }),
                
                // 6. Xóa thông báo
                prisma.notification.deleteMany({
                    where: { deviceId: parseInt(id) }
                }),
                
                // 7. Xóa cấu hình
                prisma.configuration.deleteMany({
                    where: { deviceId: parseInt(id) }
                }),
                
                // 8. Xóa lịch sử cấu hình
                prisma.deviceConfigHistory.deleteMany({
                    where: { deviceId: parseInt(id) }
                }),
                
                // 9. Cuối cùng xóa thiết bị
                prisma.iotdevice.delete({
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
    async getTemperatureHumidityData(deviceId, limit = 100, userId = null) {
        try {
            // Nếu có userId, kiểm tra thiết bị có thuộc về user đó không
            if (userId) {
                const device = await prisma.iotdevice.findFirst({
                    where: {
                        id: parseInt(deviceId),
                        userId: parseInt(userId)
                    }
                });
                
                if (!device) {
                    throw new Error(`Không tìm thấy thiết bị với ID ${deviceId}`);
                }
            }
            
            return await prisma.temperaturehumiditydata.findMany({
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
    async getSoilMoistureData(deviceId, limit = 100, userId = null) {
        try {
            // Nếu có userId, kiểm tra thiết bị có thuộc về user đó không
            if (userId) {
                const device = await prisma.iotdevice.findFirst({
                    where: {
                        id: parseInt(deviceId),
                        userId: parseInt(userId)
                    }
                });
                
                if (!device) {
                    throw new Error(`Không tìm thấy thiết bị với ID ${deviceId}`);
                }
            }
            
            return await prisma.soilmoisturedata.findMany({
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
     * Lấy dữ liệu máy bơm nước
     */
    async getPumpWaterData(deviceId, limit = 100, userId = null) {
        try {
            // Nếu có userId, kiểm tra thiết bị có thuộc về user đó không
            if (userId) {
                const device = await prisma.iotdevice.findFirst({
                    where: {
                        id: parseInt(deviceId),
                        userId: parseInt(userId)
                    }
                });
                
                if (!device) {
                    throw new Error(`Không tìm thấy thiết bị với ID ${deviceId}`);
                }
            }
            
            return await prisma.pumpwaterdata.findMany({
                where: { deviceId: parseInt(deviceId) },
                orderBy: { readingTime: 'desc' },
                take: parseInt(limit)
            });
        } catch (error) {
            console.error('Lỗi lấy dữ liệu máy bơm nước:', error);
            throw error;
        }
    }
    
    /**
     * Lấy dữ liệu đèn
     */
    async getLightData(deviceId, limit = 100, userId = null) {
        try {
            // Nếu có userId, kiểm tra thiết bị có thuộc về user đó không
            if (userId) {
                const device = await prisma.iotdevice.findFirst({
                    where: {
                        id: parseInt(deviceId),
                        userId: parseInt(userId)
                    }
                });
                
                if (!device) {
                    throw new Error(`Không tìm thấy thiết bị với ID ${deviceId}`);
                }
            }
            
            return await prisma.lightdata.findMany({
                where: { deviceId: parseInt(deviceId) },
                orderBy: { readingTime: 'desc' },
                take: parseInt(limit)
            });
        } catch (error) {
            console.error('Lỗi lấy dữ liệu đèn:', error);
            throw error;
        }
    }
}

module.exports = new IoTDeviceService(); 