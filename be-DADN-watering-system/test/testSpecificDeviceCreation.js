require('dotenv').config();
const { 
    createTemperatureHumidityDevice,
    createSoilMoistureDevice, 
    createPumpWaterDevice,
    createDeviceByType
} = require('../src/factory/DevicePatternFactory');

async function testSpecificDeviceCreation() {
    try {
        console.log('===== BẮT ĐẦU KIỂM TRA TỪNG HÀM TẠO THIẾT BỊ CỤ THỂ =====\n');
        
        // 1. Tạo thiết bị đo nhiệt độ và độ ẩm
        console.log('1. Tạo thiết bị đo nhiệt độ và độ ẩm:');
        const tempHumidDevice = await createTemperatureHumidityDevice({
            deviceCode: "DHT20_" + Date.now(),
            description: "Thiết bị đo nhiệt độ và độ ẩm DHT20",
            status: "On",
            mqttUsername: process.env.MQTT_USERNAME,
            mqttApiKey: process.env.MQTT_API_KEY,
            feeds: [
                {
                    name: "Nhiệt độ",
                    feedKey: "temperature",
                    minValue: -10,
                    maxValue: 100
                },
                {
                    name: "Độ ẩm",
                    feedKey: "humidity",
                    minValue: 0,
                    maxValue: 100
                }
            ]
        });
        console.log('→ Thiết bị đo nhiệt độ và độ ẩm đã được tạo:', tempHumidDevice);
        console.log('→ Loại thiết bị:', tempHumidDevice.deviceType);
        console.log('\n');
        
        // 2. Tạo thiết bị đo độ ẩm đất
        console.log('2. Tạo thiết bị đo độ ẩm đất:');
        const soilMoistureDevice = await createSoilMoistureDevice({
            deviceCode: "SoilSensor_" + Date.now(),
            description: "Cảm biến đo độ ẩm đất",
            status: "On",
            mqttUsername: process.env.MQTT_USERNAME,
            mqttApiKey: process.env.MQTT_API_KEY,
            feeds: [
                {
                    name: "Độ ẩm đất",
                    feedKey: "doamdat",
                    minValue: 0,
                    maxValue: 100
                }
            ]
        });
        console.log('→ Thiết bị đo độ ẩm đất đã được tạo:', soilMoistureDevice);
        console.log('→ Loại thiết bị:', soilMoistureDevice.deviceType);
        console.log('\n');
        
        // 3. Tạo thiết bị máy bơm nước
        console.log('3. Tạo thiết bị máy bơm nước:');
        const pumpDevice = await createPumpWaterDevice({
            deviceCode: "Pump_" + Date.now(),
            description: "Máy bơm nước tưới cây",
            status: "On",
            mqttUsername: process.env.MQTT_USERNAME,
            mqttApiKey: process.env.MQTT_API_KEY,
            feeds: [
                {
                    name: "Máy bơm",
                    feedKey: "pump",
                    minValue: 0,
                    maxValue: 100
                }
            ]
        });
        console.log('→ Thiết bị máy bơm nước đã được tạo:', pumpDevice);
        console.log('→ Loại thiết bị:', pumpDevice.deviceType);
        console.log('\n');
        
        // 4. Tạo thiết bị bằng hàm chung createDeviceByType
        console.log('4. Tạo thiết bị bằng hàm createDeviceByType:');
        const genericDevice = await createDeviceByType('temperature_humidity', {
            deviceCode: "Generic_" + Date.now(),
            description: "Thiết bị tạo bằng hàm createDeviceByType",
            status: "On",
            mqttUsername: process.env.MQTT_USERNAME,
            mqttApiKey: process.env.MQTT_API_KEY,
            feeds: [
                {
                    name: "Nhiệt độ",
                    feedKey: "temperature",
                    minValue: -10,
                    maxValue: 100
                }
            ]
        });
        console.log('→ Thiết bị đã được tạo bằng createDeviceByType:', genericDevice);
        console.log('→ Loại thiết bị:', genericDevice.deviceType);
        console.log('\n');

        // Xóa tất cả thiết bị test
        console.log('Dọn dẹp - xóa tất cả thiết bị test...');
        const prisma = require('../config/database');
        
        // Xóa các thiết bị theo ID
        const deviceIds = [
            tempHumidDevice.id,
            soilMoistureDevice.id,
            pumpDevice.id,
            genericDevice.id
        ];
        
        // Xử lý xóa thiết bị
        for (const id of deviceIds) {
            await prisma.$transaction([
                // Xóa các feeds liên quan
                prisma.feed.deleteMany({ where: { deviceId: id } }),
                // Xóa thiết bị
                prisma.ioTDevice.delete({ where: { id } })
            ]);
            console.log(`→ Đã xóa thiết bị ID: ${id}`);
        }
        
        console.log('===== KẾT THÚC KIỂM TRA =====');
    } catch (error) {
        console.error('Lỗi:', error);
    }
}

testSpecificDeviceCreation(); 