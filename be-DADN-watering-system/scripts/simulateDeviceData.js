require('dotenv').config();
const mqtt = require('mqtt');
const prisma = require('../config/database');

/**
 * Script gửi dữ liệu giả lập MQTT cho các thiết bị đã tạo
 */
async function simulateDeviceData() {
    try {
        console.log('===== BẮT ĐẦU GỬI DỮ LIỆU GIẢ LẬP CHO THIẾT BỊ =====\n');
        
        // Lấy danh sách thiết bị từ database
        const devices = await prisma.ioTDevice.findMany({
            include: { feeds: true }
        });
        
        if (devices.length === 0) {
            console.log('Không tìm thấy thiết bị nào trong database.');
            return;
        }
        
        console.log(`Tìm thấy ${devices.length} thiết bị trong database.`);

        // Kết nối MQTT
        const username = process.env.MQTT_USERNAME;
        const password = process.env.MQTT_API_KEY;
        const broker = process.env.MQTT_HOST || 'io.adafruit.com';
        
        console.log(`Đang kết nối tới MQTT broker: mqtt://${username}:***@${broker}`);
        
        const client = mqtt.connect(`mqtt://${broker}`, {
            port: 1883,
            username: username, 
            password: password,
            clientId: 'simulator_' + Math.random().toString(16).substring(2, 8)
        });
        
        client.on('connect', async () => {
            console.log('✅ Đã kết nối thành công tới MQTT broker!');
            
            // Gửi dữ liệu giả lập cho từng thiết bị
            for (const device of devices) {
                console.log(`\nĐang gửi dữ liệu giả lập cho thiết bị: ${device.deviceCode} (${device.deviceType})`);
                
                if (device.deviceType === 'temperature_humidity') {
                    // Gửi dữ liệu nhiệt độ và độ ẩm
                    const temperature = (20 + Math.random() * 10).toFixed(1); // Nhiệt độ từ 20-30°C
                    const humidity = (50 + Math.random() * 30).toFixed(1); // Độ ẩm từ 50-80%
                    
                    // Tìm feed nhiệt độ
                    const tempFeed = device.feeds.find(f => f.feedKey.includes('temp') || f.feedKey.includes('nhietdo')) || 
                                   { feedKey: 'dht20-nhietdo' };
                    
                    // Tìm feed độ ẩm
                    const humidityFeed = device.feeds.find(f => (f.feedKey.includes('hum') || f.feedKey.includes('doam')) && 
                                                        !f.feedKey.includes('soil') && !f.feedKey.includes('dat')) || 
                                      { feedKey: 'dht20-doam' };
                    
                    // Gửi nhiệt độ
                    const tempTopic = `${username}/feeds/${tempFeed.feedKey}`;
                    console.log(`Gửi nhiệt độ: ${temperature}°C tới topic: ${tempTopic}`);
                    client.publish(tempTopic, temperature.toString());
                    
                    // Đợi một chút trước khi gửi độ ẩm
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                    // Gửi độ ẩm
                    const humidityTopic = `${username}/feeds/${humidityFeed.feedKey}`;
                    console.log(`Gửi độ ẩm: ${humidity}% tới topic: ${humidityTopic}`);
                    client.publish(humidityTopic, humidity.toString());
                }
                else if (device.deviceType === 'soil_moisture') {
                    // Gửi dữ liệu độ ẩm đất
                    const soilMoisture = (30 + Math.random() * 40).toFixed(1); // Độ ẩm đất từ 30-70%
                    
                    // Tìm feed độ ẩm đất
                    const soilFeed = device.feeds.find(f => f.feedKey.includes('soil') || f.feedKey.includes('dat')) || 
                                  { feedKey: 'doamdat' };
                    
                    // Gửi độ ẩm đất
                    const soilTopic = `${username}/feeds/${soilFeed.feedKey}`;
                    console.log(`Gửi độ ẩm đất: ${soilMoisture}% tới topic: ${soilTopic}`);
                    client.publish(soilTopic, soilMoisture.toString());
                }
                else if (device.deviceType === 'pump_water') {
                    // Gửi dữ liệu máy bơm nước
                    const pumpStatus = Math.random() > 0.5 ? 1 : 0; // Trạng thái bật/tắt 50/50
                    const pumpSpeed = pumpStatus ? (50 + Math.random() * 50).toFixed(0) : "0"; // Tốc độ từ 50-100%
                    
                    // Tìm feed máy bơm
                    const pumpFeed = device.feeds.find(f => f.feedKey.includes('pump') || f.feedKey.includes('bom')) || 
                                  { feedKey: 'maybom' };
                    
                    // Gửi trạng thái máy bơm
                    const pumpTopic = `${username}/feeds/${pumpFeed.feedKey}`;
                    console.log(`Gửi dữ liệu máy bơm: ${pumpStatus ? 'BẬT' : 'TẮT'} (${pumpSpeed}%) tới topic: ${pumpTopic}`);
                    client.publish(pumpTopic, pumpSpeed.toString());
                }
                
                // Đợi giữa các thiết bị để tránh quá tải
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
            
            console.log('\nĐã gửi dữ liệu giả lập cho tất cả thiết bị.');
            console.log('Đang đợi 5 giây để đảm bảo dữ liệu được xử lý...');
            
            // Đợi 5 giây để đảm bảo dữ liệu được xử lý
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            // Đóng kết nối
            client.end();
            console.log('Đã đóng kết nối MQTT.');
            console.log('\n===== KẾT THÚC GỬI DỮ LIỆU GIẢ LẬP =====');
            process.exit(0);
        });
        
        client.on('error', (error) => {
            console.error('Lỗi kết nối MQTT:', error);
            process.exit(1);
        });
        
    } catch (error) {
        console.error('Lỗi khi gửi dữ liệu giả lập:', error);
        process.exit(1);
    }
}

// Chạy script
simulateDeviceData(); 