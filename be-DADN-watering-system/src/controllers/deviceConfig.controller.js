const prisma = require('../../config/database');
const mqtt = require('../utils/mqtt');

// Get current device configuration
exports.getDeviceConfig = async (req, res) => {
    try {
        const deviceId = parseInt(req.params.deviceId);
        
        // Lấy userId từ request (thông qua middleware auth)
        const userId = req.user.id;
        
        const config = await prisma.configuration.findFirst({
            where: { 
                deviceId: deviceId,
                userId: userId
            }
        });
        
        if (!config) {
            // Nếu không tìm thấy cấu hình, trả về cấu hình mặc định
            return res.json({
                soilMoisture: { min: 0, max: 100 },
                temperature: { min: 0, max: 100 },
                airHumidity: { min: 0, max: 100 },
                pumpWaterSpeed: 0,
                light: false
            });
        }
        
        // Chuyển đổi format để tương thích với frontend
        const response = {
            soilMoisture: { min: config.soilMoistureMin, max: config.soilMoistureMax },
            temperature: { min: config.temperatureMin, max: config.temperatureMax },
            airHumidity: { min: config.humidityMin, max: config.humidityMax },
            pumpWaterSpeed: config.pumpWaterSpeed,
            light: config.lightOn
        };
        
        res.json(response);
    } catch (error) {
        console.error('Error getting device config:', error);
        res.status(500).json({ message: error.message });
    }
};

// Update device configuration
exports.updateDeviceConfig = async (req, res) => {
    try {
        const deviceId = parseInt(req.params.deviceId);
        
        // Lấy userId từ request (thông qua middleware auth)
        const userId = req.user.id;
        
        const { 
            soilMoisture, 
            temperature, 
            airHumidity, 
            pumpWaterSpeed,
            light 
        } = req.body;

        // Kiểm tra thiết bị có tồn tại và thuộc về user không
        const device = await prisma.device.findFirst({
            where: { 
                id: deviceId,
                userId: userId
            }
        });

        if (!device) {
            return res.status(404).json({ message: 'Không tìm thấy thiết bị hoặc bạn không có quyền truy cập' });
        }
        
        // Lưu cấu hình vào database
        const config = await prisma.configuration.upsert({
            where: { 
                deviceId_userId: {
                    deviceId: deviceId,
                    userId: userId
                }
            },
            update: {
                soilMoistureMin: soilMoisture.min,
                soilMoistureMax: soilMoisture.max,
                temperatureMin: temperature.min,
                temperatureMax: temperature.max,
                humidityMin: airHumidity.min,
                humidityMax: airHumidity.max,
                pumpWaterSpeed: pumpWaterSpeed,
                lightOn: light,
                pumpWaterOn: pumpWaterSpeed > 0
            },
            create: {
                deviceId: deviceId,
                userId: userId,
                soilMoistureMin: soilMoisture.min,
                soilMoistureMax: soilMoisture.max,
                temperatureMin: temperature.min,
                temperatureMax: temperature.max,
                humidityMin: airHumidity.min,
                humidityMax: airHumidity.max,
                pumpWaterSpeed: pumpWaterSpeed,
                lightOn: light,
                pumpWaterOn: pumpWaterSpeed > 0
            }
        });

        // Lưu lịch sử cấu hình
        await prisma.deviceConfigHistory.create({
            data: {
                deviceId: deviceId,
                userId: userId,
                soilMoistureMin: soilMoisture.min,
                soilMoistureMax: soilMoisture.max,
                temperatureMin: temperature.min,
                temperatureMax: temperature.max,
                humidityMin: airHumidity.min,
                humidityMax: airHumidity.max,
                pumpWaterSpeed: pumpWaterSpeed,
                lightOn: light,
                pumpWaterOn: pumpWaterSpeed > 0
            }
        });

        // Gửi thông báo
        await prisma.notification.create({
            data: {
                deviceId: deviceId,
                message: "Cấu hình thiết bị đã được cập nhật",
                type: "CONFIG",
                source: device.deviceCode,
                value: JSON.stringify({
                    soilMoisture,
                    temperature,
                    airHumidity,
                    pumpWaterSpeed,
                    light
                })
            }
        });

        // Gửi cập nhật đến thiết bị qua MQTT (nếu cài đặt)
        if (mqtt && typeof mqtt.publish === 'function') {
            mqtt.publish(`device/${device.deviceCode}/config`, JSON.stringify({
                soilMoisture,
                temperature,
                airHumidity,
                pumpWaterSpeed,
                light
            }));
        }

        // Trả về đúng định dạng cho frontend
        res.json({
            soilMoisture: { min: config.soilMoistureMin, max: config.soilMoistureMax },
            temperature: { min: config.temperatureMin, max: config.temperatureMax },
            airHumidity: { min: config.humidityMin, max: config.humidityMax },
            pumpWaterSpeed: config.pumpWaterSpeed,
            light: config.lightOn
        });
    } catch (error) {
        console.error('Error updating device config:', error);
        res.status(500).json({ message: error.message });
    }
}; 