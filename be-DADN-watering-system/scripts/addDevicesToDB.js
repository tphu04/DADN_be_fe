require('dotenv').config();
const {
    createTemperatureHumidityDevice,
    createSoilMoistureDevice,
    createPumpWaterDevice,
    createLightDevice
} = require('../src/factory/DevicePatternFactory');

/**
 * Script thêm 3 thiết bị vào database
 */
async function addDevicesToDatabase() {
    try {
        console.log('===== BẮT ĐẦU THÊM 3 THIẾT BỊ VÀO DATABASE =====\n');

        // 1. Thêm thiết bị đo nhiệt độ và độ ẩm
        console.log('1. Thêm thiết bị đo nhiệt độ và độ ẩm:');
        const dht20Device = await createTemperatureHumidityDevice({
            deviceCode: "DHT20_MAIN",
            description: "Thiết bị đo nhiệt độ và độ ẩm không khí chính",
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
        console.log('→ Thiết bị đo nhiệt độ và độ ẩm đã được thêm:');
        console.log(`   - ID: ${dht20Device.id}`);
        console.log(`   - Mã thiết bị: ${dht20Device.deviceCode}`);
        console.log(`   - Loại: ${dht20Device.deviceType}`);
        console.log('\n');

        // 2. Thêm thiết bị đo độ ẩm đất
        console.log('2. Thêm thiết bị đo độ ẩm đất:');
        const soilMoistureDevice = await createSoilMoistureDevice({
            deviceCode: "SOIL_SENSOR_01",
            description: "Cảm biến đo độ ẩm đất khu vực 1",
            status: "On",
            mqttUsername: process.env.MQTT_USERNAME,
            mqttApiKey: process.env.MQTT_API_KEY,
            feeds: [
                {
                    name: "Độ ẩm đất",
                    feedKey: "soil_moisture",
                    minValue: 0,
                    maxValue: 100
                }
            ]
        });
        console.log('→ Thiết bị đo độ ẩm đất đã được thêm:');
        console.log(`   - ID: ${soilMoistureDevice.id}`);
        console.log(`   - Mã thiết bị: ${soilMoistureDevice.deviceCode}`);
        console.log(`   - Loại: ${soilMoistureDevice.deviceType}`);
        console.log('\n');

        // 3. Thêm thiết bị máy bơm nước
        console.log('3. Thêm thiết bị máy bơm nước:');
        const pumpDevice = await createPumpWaterDevice({
            deviceCode: "WATER_PUMP_MAIN",
            description: "Máy bơm nước tưới cây tự động",
            status: "On",
            mqttUsername: process.env.MQTT_USERNAME,
            mqttApiKey: process.env.MQTT_API_KEY,
            feeds: [
                {
                    name: "Điều khiển bơm",
                    feedKey: "pump_control",
                    minValue: 0,
                    maxValue: 100
                }
            ]
        });
        // 4. Thêm thiết bị đèn
        console.log('4. Thêm thiết bị đèn:');
        const lightDevice = await createLightDevice({
            deviceCode: "LIGHT_MAIN",
            description: "Đèn điều khiển độ sáng tự động",
            status: "On",
            mqttUsername: process.env.MQTT_USERNAME,
            mqttApiKey: process.env.MQTT_API_KEY,
            feeds: [
                {
                    name: "Trạng thái đèn",
                    feedKey: "light_status",
                    minValue: 0,
                    maxValue: 1
                },
                {
                    name: "Độ sáng",
                    feedKey: "light_brightness",
                    minValue: 0,
                    maxValue: 100
                }
            ]
        });
        console.log('→ Thiết bị đèn đã được thêm:');
        console.log(`   - ID: ${lightDevice.id}`);
        console.log(`   - Mã thiết bị: ${lightDevice.deviceCode}`);
        console.log(`   - Loại: ${lightDevice.deviceType}`);
        console.log('\n');

        // Cập nhật phần tổng kết
        console.log('===== KẾT QUẢ THÊM THIẾT BỊ =====');
        console.log('Đã thêm thành công 4 thiết bị vào database:');
        console.log(`1. Thiết bị đo nhiệt độ và độ ẩm (${dht20Device.deviceCode}) - ID: ${dht20Device.id}`);
        console.log(`2. Thiết bị đo độ ẩm đất (${soilMoistureDevice.deviceCode}) - ID: ${soilMoistureDevice.id}`);
        console.log(`3. Thiết bị máy bơm nước (${pumpDevice.deviceCode}) - ID: ${pumpDevice.id}`);
        console.log(`4. Thiết bị đèn (${lightDevice.deviceCode}) - ID: ${lightDevice.id}`);
        console.log('\nCác thiết bị đã được kích hoạt và sẵn sàng hoạt động (status = On).');
    } catch (error) {
        console.error('Lỗi khi thêm thiết bị:', error);
    }
}

// Chạy script
addDevicesToDatabase(); 