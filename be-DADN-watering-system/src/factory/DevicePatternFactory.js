const prisma = require('../../config/database');
const mqttService = require('../services/mqtt.service');

// Abstract Device Factory
class DeviceFactory {
    async createDevice(deviceData) {
        throw new Error('Method createDevice() must be implemented by subclasses');
    }

    // Common initialization logic
    async initializeDevice(device) {
        try {
            // Đăng ký feed của thiết bị mới vào MQTT
            await mqttService.registerDeviceFeed(device);
            
            // Kết nối thiết bị với MQTT nếu status = On
            if (device.status === 'On') {
                await mqttService.connectDevice(device);
            }

            return device;
        } catch (error) {
            console.error(`Lỗi khởi tạo thiết bị ${device.deviceCode}:`, error);
            return device;
        }
    }
}

// Concrete Factory for Temperature Humidity Device
class TemperatureHumidityDeviceFactory extends DeviceFactory {
    async createDevice(deviceData) {
        try {
            // Trích xuất thông tin feed từ dữ liệu gửi lên
            const { feed, ...deviceInfo } = deviceData;
            
            // Mặc định status = Off khi mới tạo
            if (!deviceInfo.status) {
                deviceInfo.status = 'Off';
            }
            
            // Đảm bảo deviceType là temperature_humidity
            deviceInfo.deviceType = 'temperature_humidity';
            
            // Validate userId - bắt buộc phải có
            if (!deviceInfo.userId) {
                throw new Error('userId là bắt buộc để tạo thiết bị');
            }
            
            // Tạo thiết bị với feed (nếu có)
            const device = await prisma.iotdevice.create({
                data: {
                    deviceCode: deviceInfo.deviceCode,
                    deviceType: deviceInfo.deviceType,
                    description: deviceInfo.description || '',
                    feed: {
                        create: feed.map(f => ({
                            name: f.name,
                            feedKey: f.feedKey,
                            minValue: f.minValue || null,
                            maxValue: f.maxValue || null
                        }))
                    },
                    configuration: {
                        create: {
                            userId: deviceInfo.userId,
                            createdAt: new Date(),
                            updatedAt: new Date()
                        }
                    }
                },
                include: {
                    feed: true,
                    configuration: true
                }
            });

            return this.initializeDevice(device);
        } catch (error) {
            console.error('Lỗi tạo thiết bị nhiệt độ và độ ẩm:', error);
            throw error;
        }
    }
}

// Concrete Factory for Soil Moisture Device
class SoilMoistureDeviceFactory extends DeviceFactory {
    async createDevice(deviceData) {
        try {
            // Trích xuất thông tin feed từ dữ liệu gửi lên
            const { feed, ...deviceInfo } = deviceData;
            
            // Mặc định status = Off khi mới tạo
            if (!deviceInfo.status) {
                deviceInfo.status = 'Off';
            }
            
            // Đảm bảo deviceType là soil_moisture
            deviceInfo.deviceType = 'soil_moisture';
            
            // Validate userId - bắt buộc phải có
            if (!deviceInfo.userId) {
                throw new Error('userId là bắt buộc để tạo thiết bị');
            }
            
            // Tạo thiết bị với feed (nếu có)
            const device = await prisma.iotdevice.create({
                data: {
                    deviceCode: deviceInfo.deviceCode,
                    deviceType: deviceInfo.deviceType,
                    description: deviceInfo.description || '',
                    feed: {
                        create: feed.map(f => ({
                            name: f.name,
                            feedKey: f.feedKey,
                            minValue: f.minValue || null,
                            maxValue: f.maxValue || null
                        }))
                    },
                    configuration: {
                        create: {
                            userId: deviceInfo.userId,
                            createdAt: new Date(),
                            updatedAt: new Date()
                        }
                    }
                },
                include: {
                    feed: true,
                    configuration: true
                }
            });

            return this.initializeDevice(device);
        } catch (error) {
            console.error('Lỗi tạo thiết bị đo độ ẩm đất:', error);
            throw error;
        }
    }
}

// Concrete Factory for Pump Water Device
class PumpWaterDeviceFactory extends DeviceFactory {
    async createDevice(deviceData) {
        try {
            // Trích xuất thông tin feed từ dữ liệu gửi lên
            const { feed, ...deviceInfo } = deviceData;
            
            // Mặc định status = Off khi mới tạo
            if (!deviceInfo.status) {
                deviceInfo.status = 'Off';
            }
            
            // Đảm bảo deviceType là pump_water
            deviceInfo.deviceType = 'pump_water';
            
            // Validate userId - bắt buộc phải có
            if (!deviceInfo.userId) {
                throw new Error('userId là bắt buộc để tạo thiết bị');
            }
            
            // Tạo thiết bị với feed (nếu có)
            const device = await prisma.iotdevice.create({
                data: {
                    deviceCode: deviceInfo.deviceCode,
                    deviceType: deviceInfo.deviceType,
                    description: deviceInfo.description || '',
                    feed: {
                        create: feed.map(f => ({
                            name: f.name,
                            feedKey: f.feedKey,
                            minValue: f.minValue || null,
                            maxValue: f.maxValue || null
                        }))
                    },
                    configuration: {
                        create: {
                            userId: deviceInfo.userId,
                            createdAt: new Date(),
                            updatedAt: new Date()
                        }
                    }
                },
                include: {
                    feed: true,
                    configuration: true
                }
            });

            return this.initializeDevice(device);
        } catch (error) {
            console.error('Lỗi tạo thiết bị máy bơm nước:', error);
            throw error;
        }
    }
}

// Concrete Factory for Light Device
class LightDeviceFactory extends DeviceFactory {
    async createDevice(deviceData) {
        try {
            // Trích xuất thông tin feed từ dữ liệu gửi lên
            const { feed, ...deviceInfo } = deviceData;
            
            // Mặc định status = Off khi mới tạo
            if (!deviceInfo.status) {
                deviceInfo.status = 'Off';
            }
            
            // Đảm bảo deviceType là light
            deviceInfo.deviceType = 'light';
            
            // Validate userId - bắt buộc phải có
            if (!deviceInfo.userId) {
                throw new Error('userId là bắt buộc để tạo thiết bị');
            }
            
            // Tạo thiết bị với feed (nếu có)
            const device = await prisma.iotdevice.create({
                data: {
                    deviceCode: deviceInfo.deviceCode,
                    deviceType: deviceInfo.deviceType,
                    description: deviceInfo.description || '',
                    feed: {
                        create: feed.map(f => ({
                            name: f.name,
                            feedKey: f.feedKey,
                            minValue: f.minValue || null,
                            maxValue: f.maxValue || null
                        }))
                    },
                    configuration: {
                        create: {
                            userId: deviceInfo.userId,
                            createdAt: new Date(),
                            updatedAt: new Date()
                        }
                    }
                },
                include: {
                    feed: true,
                    configuration: true
                }
            });

            return this.initializeDevice(device);
        } catch (error) {
            console.error('Lỗi tạo thiết bị đèn:', error);
            throw error;
        }
    }
}

// Factory Creator - creates appropriate factory based on device type
class DeviceFactoryCreator {
    static getFactory(deviceType) {
        switch (deviceType) {
            case 'temperature_humidity':
                return new TemperatureHumidityDeviceFactory();
            case 'soil_moisture':
                return new SoilMoistureDeviceFactory();
            case 'pump_water':
                return new PumpWaterDeviceFactory();
            case 'light':
                return new LightDeviceFactory();
            default:
                throw new Error(`Không hỗ trợ loại thiết bị: ${deviceType}`);
        }
    }
}

// Các hàm tiện ích để tạo riêng từng loại thiết bị

/**
 * Tạo thiết bị đo nhiệt độ và độ ẩm
 * @param {Object} deviceData - Dữ liệu của thiết bị (không cần có deviceType)
 * @returns {Promise<Object>} - Thiết bị đã được tạo
 */
async function createTemperatureHumidityDevice(deviceData) {
    const factory = new TemperatureHumidityDeviceFactory();
    return await factory.createDevice({
        ...deviceData,
        deviceType: 'temperature_humidity'
    });
}

/**
 * Tạo thiết bị đo độ ẩm đất
 * @param {Object} deviceData - Dữ liệu của thiết bị (không cần có deviceType)
 * @returns {Promise<Object>} - Thiết bị đã được tạo
 */
async function createSoilMoistureDevice(deviceData) {
    const factory = new SoilMoistureDeviceFactory();
    return await factory.createDevice({
        ...deviceData,
        deviceType: 'soil_moisture'
    });
}

/**
 * Tạo thiết bị máy bơm nước
 * @param {Object} deviceData - Dữ liệu của thiết bị (không cần có deviceType)
 * @returns {Promise<Object>} - Thiết bị đã được tạo
 */
async function createPumpWaterDevice(deviceData) {
    const factory = new PumpWaterDeviceFactory();
    return await factory.createDevice({
        ...deviceData,
        deviceType: 'pump_water'
    });
}

/**
 * Tạo thiết bị đèn
 * @param {Object} deviceData - Dữ liệu của thiết bị (không cần có deviceType)
 * @returns {Promise<Object>} - Thiết bị đã được tạo
 */
async function createLightDevice(deviceData) {
    const factory = new LightDeviceFactory();
    return await factory.createDevice({
        ...deviceData,
        deviceType: 'light'
    });
}

/**
 * Tạo thiết bị dựa vào loại
 * @param {string} deviceType - Loại thiết bị
 * @param {Object} deviceData - Dữ liệu của thiết bị
 * @returns {Promise<Object>} - Thiết bị đã được tạo
 */
async function createDeviceByType(deviceType, deviceData) {
    const factory = DeviceFactoryCreator.getFactory(deviceType);
    return await factory.createDevice({
        ...deviceData,
        deviceType
    });
}

module.exports = {
    DeviceFactoryCreator,
    createTemperatureHumidityDevice,
    createSoilMoistureDevice,
    createPumpWaterDevice,
    createLightDevice,
    createDeviceByType
}; 