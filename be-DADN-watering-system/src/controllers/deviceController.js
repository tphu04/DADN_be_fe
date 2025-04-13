const Device = require('../models/device');
const SensorData = require('../models/sensorData');
const prisma = require('../../config/database');
const { DeviceFactoryCreator } = require('../factory/DevicePatternFactory');
const mqttService = require('../services/mqtt.service');

const deviceController = {
    // Lấy tất cả thiết bị
    async getAllDevices(req, res) {
        try {
            const devices = await prisma.iotdevice.findMany({
                include: {
                    feed: true
                }
            });
            
            return res.json({
                success: true,
                data: devices
            });
        } catch (error) {
            console.error('Error getting devices:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Internal server error',
                error: error.message 
            });
        }
    },

    // Lấy thiết bị của người dùng hiện tại
    async getUserDevices(req, res) {
        try {
            // Lấy tất cả thiết bị thay vì chỉ lấy thiết bị của người dùng hiện tại
            console.log(`Fetching all devices for all users`);
            
            const devices = await prisma.iotdevice.findMany({
                include: {
                    feed: true
                }
            });
            
            console.log(`Found ${devices.length} devices in total`);
            
            return res.json({
                success: true,
                data: devices
            });
        } catch (error) {
            console.error('Error getting user devices:', error);
            return res.status(500).json({
                success: false, 
                message: 'Lỗi khi lấy danh sách thiết bị',
                error: error.message
            });
        }
    },

    // Lấy thông tin một thiết bị
    async getDevice(req, res) {
        try {
            const device = await prisma.iotdevice.findUnique({
                where: { id: parseInt(req.params.id) }
            });
            if (!device) {
                return res.status(404).json({ error: 'Device not found' });
            }
            res.json(device);
        } catch (error) {
            console.error('Error getting device:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    },

    // Tạo thiết bị mới và feed mặc định
    async createDevice(req, res) {
        try {
            // Lấy nguyên dữ liệu từ request
            const deviceData = req.body;
            
            // Kiểm tra xem đã tồn tại thiết bị với cùng mã thiết bị chưa
            // Chỉ áp dụng cho thiết bị loại temperature_humidity
            let newDevice;
            let existingDevice = null;
            
            if (deviceData.deviceType === 'temperature_humidity') {
                existingDevice = await prisma.iotdevice.findFirst({
                    where: {
                        deviceCode: deviceData.deviceCode,
                        deviceType: 'temperature_humidity'
                    },
                    include: {
                        feed: true
                    }
                });
                
                if (existingDevice) {
                    console.log(`Đã tìm thấy thiết bị temperature_humidity hiện có với mã ${deviceData.deviceCode}, ID: ${existingDevice.id}`);
                    newDevice = existingDevice;
                }
            }
            
            // Nếu không tìm thấy thiết bị hiện có hoặc không phải loại temperature_humidity, tạo thiết bị mới
            if (!existingDevice) {
                newDevice = await prisma.iotdevice.create({
                    data: {
                        deviceCode: deviceData.deviceCode,
                        deviceType: deviceData.deviceType,
                        description: deviceData.description,
                        status: deviceData.status || 'Off',
                        isOnline: deviceData.isOnline || false
                    }
                });
                console.log(`Đã tạo thiết bị mới với ID: ${newDevice.id}`);
            }
            
            // Danh sách feeds đã tạo
            const createdFeeds = [];

            // Nếu có feeds được cung cấp, tạo chính xác theo dữ liệu nhập vào
            if (deviceData.feeds && deviceData.feeds.length > 0) {
                for (const feedData of deviceData.feeds) {
                    // Nếu đã có thiết bị và feed có cùng feedKey, bỏ qua để tránh trùng lặp
                    if (existingDevice) {
                        const existingFeed = existingDevice.feed.find(f => f.feedKey === feedData.feedKey);
                        if (existingFeed) {
                            console.log(`Bỏ qua feed đã tồn tại với feedKey: ${feedData.feedKey}`);
                            createdFeeds.push(existingFeed);
                            continue;
                        }
                    }
                    
                    // Tạo feed mới
                    const feed = await prisma.feed.create({
                        data: {
                            name: feedData.name,
                            feedKey: feedData.feedKey,
                            deviceId: newDevice.id,
                            minValue: feedData.minValue,
                            maxValue: feedData.maxValue,
                            lastValue: feedData.lastValue || null
                        }
                    });
                    
                    createdFeeds.push(feed);
                    console.log(`Đã tạo feed mới: ${feed.name} (${feed.feedKey}) cho thiết bị ID: ${newDevice.id}`);
                }
            }
            
            // Tạo configuration nếu có userId và thiết bị vừa được tạo mới
            if (deviceData.userId && !existingDevice) {
                await prisma.configuration.create({
                    data: {
                        userId: parseInt(deviceData.userId),
                        deviceId: newDevice.id,
                        updatedAt: new Date(),
                        // Thêm các giá trị configuration khác nếu có
                        humidityMax: deviceData.humidityMax || 100,
                        humidityMin: deviceData.humidityMin || 0,
                        temperatureMax: deviceData.temperatureMax || 100,
                        temperatureMin: deviceData.temperatureMin || 0,
                        soilMoistureMax: deviceData.soilMoistureMax || 100,
                        soilMoistureMin: deviceData.soilMoistureMin || 0,
                        lightOn: deviceData.lightOn || false,
                        pumpWaterOn: deviceData.pumpWaterOn || false,
                        pumpWaterSpeed: deviceData.pumpWaterSpeed || 0
                    }
                });
                console.log(`Đã tạo configuration cho thiết bị ID: ${newDevice.id}`);
            }

            // Trả về thông tin thiết bị đã tạo hoặc đã tìm thấy
            return res.status(201).json({
                success: true,
                message: existingDevice 
                    ? 'Đã thêm feed vào thiết bị hiện có' 
                    : 'Thiết bị đã được tạo thành công',
                data: {
                    device: newDevice,
                    feeds: createdFeeds,
                    isExisting: !!existingDevice
                }
            });
        } catch (error) {
            console.error('Lỗi khi tạo thiết bị:', error);
            return res.status(500).json({
                success: false,
                message: 'Đã xảy ra lỗi khi tạo thiết bị',
                error: error.message
            });
        }
    },

    // Cập nhật thiết bị
    async updateDevice(req, res) {
        try {
            const userId = req.user.id;
            const deviceId = parseInt(req.params.id);
            const { description, status, feeds } = req.body;
            
            // Kiểm tra thiết bị có tồn tại và thuộc về user không
            const existingDevice = await prisma.iotdevice.findFirst({
                where: {
                    id: deviceId,
                    configuration: {
                        some: {
                            userId: userId
                        }
                    }
                },
                include: {
                    feed: true
                }
            });
            
            if (!existingDevice) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy thiết bị hoặc bạn không có quyền truy cập'
                });
            }
            
            // Dữ liệu cập nhật
            const updateData = {};
            
            if (description !== undefined) updateData.description = description;
            if (status !== undefined) updateData.status = status;
            
            // Cập nhật thiết bị
            const updatedDevice = await prisma.iotdevice.update({
                where: {
                    id: deviceId
                },
                data: updateData,
                include: {
                    feed: true
                }
            });
            
            // Cập nhật feeds nếu có
            if (feeds && feeds.length > 0) {
                for (const feed of feeds) {
                    if (!feed.id) continue; // Bỏ qua nếu không có id
                    
                    // Tìm feed trong danh sách feeds của thiết bị
                    const existingFeed = existingDevice.feed.find(f => f.id === parseInt(feed.id));
                    
                    if (!existingFeed) {
                        console.warn(`Feed với id ${feed.id} không tồn tại trong thiết bị ${deviceId}`);
                        continue;
                    }
                    
                    // Cập nhật feed
                    await prisma.feed.update({
                        where: { id: parseInt(feed.id) },
                        data: {
                            name: feed.name !== undefined ? feed.name : existingFeed.name,
                            feedKey: feed.feedKey !== undefined ? feed.feedKey : existingFeed.feedKey,
                            minValue: feed.minValue !== undefined ? feed.minValue : existingFeed.minValue,
                            maxValue: feed.maxValue !== undefined ? feed.maxValue : existingFeed.maxValue
                        }
                    });
                    
                    console.log(`Đã cập nhật feed ${feed.id} cho thiết bị ${deviceId}`);
                }
                
                // Nếu đã cập nhật feed, cần đăng ký lại MQTT cho thiết bị
                if (updatedDevice.status === 'On') {
                    // Ngắt kết nối hiện tại
                    await mqttService.disconnectDevice(deviceId);
                    
                    // Lấy thông tin thiết bị với feeds mới
                    const refreshedDevice = await prisma.iotdevice.findUnique({
                        where: { id: deviceId },
                        include: { feed: true }
                    });
                    
                    // Kết nối lại MQTT với feeds mới
                    await mqttService.connectDevice(refreshedDevice);
                }
            }
            
            // Kiểm tra nếu status thay đổi
            if (status !== undefined && existingDevice.status !== status) {
                if (status === 'On') {
                    // Nếu chuyển thành On, kết nối MQTT
                    await mqttService.connectDevice(updatedDevice);
                } else {
                    // Nếu chuyển thành Off, ngắt kết nối MQTT
                    await mqttService.disconnectDevice(deviceId);
                }
            }
            
            // Lấy thông tin thiết bị mới nhất sau khi cập nhật
            const finalDevice = await prisma.iotdevice.findUnique({
                where: { id: deviceId },
                include: { feed: true }
            });
            
            return res.json({
                success: true,
                message: 'Cập nhật thiết bị thành công',
                data: finalDevice
            });
        } catch (error) {
            console.error('Error updating device:', error);
            return res.status(500).json({
                success: false,
                message: 'Lỗi khi cập nhật thiết bị',
                error: error.message
            });
        }
    },

    // Xóa thiết bị
    async deleteDevice(req, res) {
        try {
            const deviceId = parseInt(req.params.id);
            
            if (isNaN(deviceId)) {
                return res.status(400).json({
                    success: false,
                    message: 'ID thiết bị không hợp lệ'
                });
            }
            
            // Kiểm tra xem thiết bị có tồn tại không
            const device = await prisma.iotdevice.findUnique({
                where: { id: deviceId },
                include: { feed: true }
            });
            
            if (!device) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy thiết bị'
                });
            }
            
            // Xóa tất cả các bản ghi liên quan theo thứ tự để tránh ràng buộc khóa ngoại
            try {
                await prisma.$transaction(async (prisma) => {
                    // 1. Xóa thông báo liên quan đến thiết bị
                    await prisma.notification.deleteMany({
                        where: { deviceId }
                    });
                    
                    // 2. Xóa các feed liên quan
                    await prisma.feed.deleteMany({
                        where: { deviceId }
                    });
                    
                    // 3. Xóa dữ liệu cảm biến tùy theo loại thiết bị
                    switch (device.deviceType) {
                        case 'temperature_humidity':
                            await prisma.temperaturehumiditydata.deleteMany({
                                where: { deviceId }
                            });
                            break;
                        case 'soil_moisture':
                            await prisma.soilmoisturedata.deleteMany({
                                where: { deviceId }
                            });
                            break;
                        case 'pump_water':
                            await prisma.pumpwaterdata.deleteMany({
                                where: { deviceId }
                            });
                            break;
                        case 'light':
                            await prisma.lightdata.deleteMany({
                                where: { deviceId }
                            });
                            break;
                    }
                    
                    // 4. Xóa configuration liên quan
                    await prisma.configuration.deleteMany({
                        where: { deviceId }
                    });
                    
                    // 5. Cuối cùng xóa thiết bị
                    await prisma.iotdevice.delete({
                        where: { id: deviceId }
                    });
                });
                
                console.log(`Đã xóa thành công thiết bị id=${deviceId}`);
                
                return res.json({
                    success: true,
                    message: 'Thiết bị đã được xóa thành công'
                });
            } catch (transactionError) {
                console.error('Lỗi trong transaction xóa thiết bị:', transactionError);
                
                // Thêm thông tin chi tiết về lỗi để debug
                if (transactionError.code === 'P2003') {
                    return res.status(500).json({
                        success: false,
                        message: `Không thể xóa thiết bị do còn ràng buộc với bảng khác (${transactionError.meta?.field_name || 'không xác định'})`,
                        hint: 'Kiểm tra các bảng liên quan và xóa dữ liệu tham chiếu trước',
                        error: transactionError.message
                    });
                }
                
                throw transactionError;
            }
        } catch (error) {
            console.error('Lỗi khi xóa thiết bị:', error);
            return res.status(500).json({
                success: false,
                message: 'Đã xảy ra lỗi khi xóa thiết bị',
                error: error.message
            });
        }
    },

    // Lấy dữ liệu nhiệt độ và độ ẩm của thiết bị
    async getTemperatureHumidityData(req, res) {
        try {
            const { id } = req.params;
            const { limit = 100 } = req.query;

            // Kiểm tra id có tồn tại không
            if (!id) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Device ID is required' 
                });
            }

            // Xác minh thiết bị tồn tại và thuộc về người dùng
            const device = await prisma.iotdevice.findUnique({
                where: { id: parseInt(id) }
            });
            
            if (!device) {
                return res.status(404).json({ success: false, message: 'Device not found' });
            }

            // Kiểm tra trạng thái hoạt động của thiết bị
            const isDeviceActive = device.status === 'On' || device.status === 'active';

            // Lấy dữ liệu theo loại thiết bị
            let data = [];
            
            if (isDeviceActive && device.deviceType === 'temperature_humidity') {
                data = await prisma.temperaturehumiditydata.findMany({
                    where: { deviceId: parseInt(id) },
                    orderBy: { readingTime: 'desc' },
                    take: parseInt(limit)
                });
            }
            
            // Nếu không có dữ liệu, trả về mảng rỗng
            if (!data || data.length === 0) {
                console.log('No temperature/humidity data found, returning empty array');
                data = [];
            }

            return res.status(200).json({
                success: true,
                deviceStatus: device.status,
                data: data
            });
        } catch (error) {
            console.error('Error fetching temperature/humidity data:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch temperature and humidity data',
                error: error.message,
                data: [] // Always include data property even in error response
            });
        }
    },

    // Lấy dữ liệu độ ẩm đất của thiết bị
    async getSoilMoistureData(req, res) {
        try {
            const { id } = req.params;
            const { limit = 100 } = req.query;

            // Kiểm tra id có tồn tại không
            if (!id) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Device ID is required' 
                });
            }

            // Xác minh thiết bị tồn tại và thuộc về người dùng
            const device = await prisma.iotdevice.findUnique({
                where: { id: parseInt(id) }
            });
            
            if (!device) {
                return res.status(404).json({ success: false, message: 'Device not found' });
            }

            // Kiểm tra trạng thái hoạt động của thiết bị
            const isDeviceActive = device.status === 'On' || device.status === 'active';

            // Lấy dữ liệu theo loại thiết bị
            let data = [];
            
            if (isDeviceActive && device.deviceType === 'soil_moisture') {
                data = await prisma.soilmoisturedata.findMany({
                    where: { deviceId: parseInt(id) },
                    orderBy: { readingTime: 'desc' },
                    take: parseInt(limit)
                });
            }
            
            // Nếu không có dữ liệu, trả về mảng rỗng
            if (!data || data.length === 0) {
                console.log('No soil moisture data found, returning empty array');
                data = [];
            }

            return res.status(200).json({
                success: true,
                deviceStatus: device.status,
                data: data
            });
        } catch (error) {
            console.error('Error fetching soil moisture data:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch soil moisture data',
                error: error.message,
                data: [] // Always include data property even in error response
            });
        }
    },

    // Lấy dữ liệu máy bơm
    async getPumpWaterData(req, res) {
        try {
            const { id } = req.params;
            const { limit = 100 } = req.query;

            // Kiểm tra id có tồn tại không
            if (!id) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Device ID is required' 
                });
            }

            // Xác minh thiết bị tồn tại và thuộc về người dùng
            const device = await prisma.iotdevice.findUnique({
                where: { id: parseInt(id) }
            });
            
            if (!device) {
                return res.status(404).json({ success: false, message: 'Device not found' });
            }

            // Kiểm tra trạng thái hoạt động của thiết bị
            const isDeviceActive = device.status === 'On' || device.status === 'active';

            // Lấy dữ liệu theo loại thiết bị
            let data = [];
            
            if (isDeviceActive && device.deviceType === 'pump_water') {
                data = await prisma.pumpwaterdata.findMany({
                    where: { deviceId: parseInt(id) },
                    orderBy: { readingTime: 'desc' },
                    take: parseInt(limit)
                });
            }
            
            // Nếu không có dữ liệu, trả về mảng rỗng
            if (!data || data.length === 0) {
                console.log('No pump data found, returning empty array');
                data = [];
            }

            return res.status(200).json({
                success: true,
                deviceStatus: device.status,
                data: data
            });
        } catch (error) {
            console.error('Error fetching pump water data:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch pump water data',
                error: error.message,
                data: [] // Always include data property even in error response
            });
        }
    },

    // Lấy dữ liệu đèn
    async getLightData(req, res) {
        try {
            const { id } = req.params;
            const { limit = 100 } = req.query;

            // Kiểm tra id có tồn tại không
            if (!id) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Device ID is required' 
                });
            }

            // Xác minh thiết bị tồn tại và thuộc về người dùng
            const device = await prisma.iotdevice.findUnique({
                where: { id: parseInt(id) }
            });
            
            if (!device) {
                return res.status(404).json({ success: false, message: 'Device not found' });
            }

            // Kiểm tra trạng thái hoạt động của thiết bị
            const isDeviceActive = device.status === 'On' || device.status === 'active';

            // Lấy dữ liệu theo loại thiết bị
            let data = [];
            
            if (isDeviceActive && device.deviceType === 'light') {
                data = await prisma.lightdata.findMany({
                    where: { deviceId: parseInt(id) },
                    orderBy: { readingTime: 'desc' },
                    take: parseInt(limit)
                });
            }
            
            // Nếu không có dữ liệu, trả về mảng rỗng
            if (!data || data.length === 0) {
                console.log('No light data found, returning empty array');
                data = [];
            }

            return res.status(200).json({
                success: true,
                deviceStatus: device.status,
                data: data
            });
        } catch (error) {
            console.error('Error fetching light data:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch light data',
                error: error.message,
                data: [] // Always include data property even in error response
            });
        }
    },

    // Sửa phương thức lấy thiết bị theo ID
    async getDeviceById(req, res) {
        try {
            const userId = req.user.id;
            const deviceId = parseInt(req.params.id);
            
            const device = await prisma.iotdevice.findFirst({
                where: {
                    id: deviceId,
                    configuration: {
                        some: {
                            userId: userId
                        }
                    }
                },
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
            
            if (!device) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy thiết bị hoặc bạn không có quyền truy cập'
                });
            }
            
            return res.json({
                success: true,
                data: device
            });
        } catch (error) {
            console.error('Error getting device details:', error);
            return res.status(500).json({
                success: false,
                message: 'Lỗi khi lấy thông tin thiết bị',
                error: error.message
            });
        }
    },

    // Điều khiển thiết bị
    async controlDevice(req, res) {
        try {
            const userId = req.user.id;
            const deviceId = parseInt(req.params.id);
            const { command } = req.body;
            
            // Kiểm tra thiết bị có tồn tại và thuộc về user không
            const device = await prisma.iotdevice.findFirst({
                where: {
                    id: deviceId,
                    userId: userId
                }
            });
            
            if (!device) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy thiết bị hoặc bạn không có quyền truy cập'
                });
            }
            
            // Kiểm tra thiết bị có đang online không
            if (!device.isOnline) {
                return res.status(400).json({
                    success: false,
                    message: 'Thiết bị đang offline'
                });
            }
            
            // Gửi lệnh điều khiển qua MQTT
            const result = await mqttService.sendCommand(device.deviceCode, command);
            
            return res.json({
                success: true,
                message: 'Gửi lệnh điều khiển thành công',
                data: result
            });
        } catch (error) {
            console.error('Error controlling device:', error);
            return res.status(500).json({
                success: false,
                message: 'Lỗi khi điều khiển thiết bị',
                error: error.message
            });
        }
    },

    // Lấy dữ liệu lịch sử của thiết bị
    async getDeviceData(req, res) {
        try {
            const userId = req.user.id;
            const deviceId = parseInt(req.params.id);
            const { type, limit = 100 } = req.query;
            
            // Kiểm tra thiết bị có tồn tại và thuộc về user không
            const device = await prisma.iotdevice.findFirst({
                where: {
                    id: deviceId,
                    configuration: {
                        some: {
                            userId: userId
                        }
                    }
                }
            });
            
            if (!device) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy thiết bị hoặc bạn không có quyền truy cập'
                });
            }
            
            let data;
            const limitNumber = parseInt(limit);
            
            // Lấy dữ liệu theo loại
            switch (type) {
                case 'temperature_humidity':
                    data = await prisma.temperaturehumiditydata.findMany({
                        where: { deviceId: deviceId },
                        orderBy: { readingTime: 'desc' },
                        take: limitNumber
                    });
                    break;
                case 'soil_moisture':
                    data = await prisma.soilmoisturedata.findMany({
                        where: { deviceId: deviceId },
                        orderBy: { readingTime: 'desc' },
                        take: limitNumber
                    });
                    break;
                case 'pump_water':
                    data = await prisma.pumpwaterdata.findMany({
                        where: { deviceId: deviceId },
                        orderBy: { readingTime: 'desc' },
                        take: limitNumber
                    });
                    break;
                case 'light':
                    data = await prisma.lightdata.findMany({
                        where: { deviceId: deviceId },
                        orderBy: { readingTime: 'desc' },
                        take: limitNumber
                    });
                    break;
                default:
                    // Nếu không có type, lấy dữ liệu tùy theo loại thiết bị
                    switch (device.deviceType) {
                        case 'temperature_humidity':
                            data = await prisma.temperaturehumiditydata.findMany({
                                where: { deviceId: deviceId },
                                orderBy: { readingTime: 'desc' },
                                take: limitNumber
                            });
                            break;
                        case 'soil_moisture':
                            data = await prisma.soilmoisturedata.findMany({
                                where: { deviceId: deviceId },
                                orderBy: { readingTime: 'desc' },
                                take: limitNumber
                            });
                            break;
                        case 'pump_water':
                            data = await prisma.pumpwaterdata.findMany({
                                where: { deviceId: deviceId },
                                orderBy: { readingTime: 'desc' },
                                take: limitNumber
                            });
                            break;
                        case 'light':
                            data = await prisma.lightdata.findMany({
                                where: { deviceId: deviceId },
                                orderBy: { readingTime: 'desc' },
                                take: limitNumber
                            });
                            break;
                    }
            }
            
            return res.json({
                success: true,
                data: data || []
            });
        } catch (error) {
            console.error('Error getting device data:', error);
            return res.status(500).json({
                success: false,
                message: 'Lỗi khi lấy dữ liệu thiết bị',
                error: error.message
            });
        }
    }
};

// Export tất cả các hàm
module.exports = deviceController; 
