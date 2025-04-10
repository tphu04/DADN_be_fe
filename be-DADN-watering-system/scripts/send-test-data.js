require('dotenv').config();
const mqtt = require('mqtt');

/**
 * Script gửi dữ liệu test tới MQTT broker
 */
async function sendTestData() {
    try {
        console.log('===== BẮT ĐẦU GỬI DỮ LIỆU TEST TỚI MQTT =====\n');
        
        // Kết nối MQTT
        const username = process.env.MQTT_USERNAME;
        const password = process.env.MQTT_API_KEY;
        const broker = process.env.MQTT_HOST || 'io.adafruit.com';
        
        console.log(`Đang kết nối tới MQTT broker: mqtt://${username}:***@${broker}`);
        
        const client = mqtt.connect(`mqtt://${broker}`, {
            port: process.env.MQTT_PORT || 1883,
            username: username, 
            password: password,
            clientId: 'test_' + Math.random().toString(16).substring(2, 8)
        });
        
        client.on('connect', async () => {
            console.log('✅ Đã kết nối thành công tới MQTT broker!');
            
            // Gửi dữ liệu test cho các topic
            console.log('\n1. Gửi dữ liệu nhiệt độ (dht20-nhietdo):');
            const temperature = (25 + Math.random() * 5).toFixed(1);
            const tempTopic = `${username}/feeds/dht20-nhietdo`;
            console.log(`Gửi nhiệt độ: ${temperature}°C tới topic: ${tempTopic}`);
            client.publish(tempTopic, temperature.toString());
            
            // Đợi giữa các lần gửi
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            console.log('\n2. Gửi dữ liệu độ ẩm không khí (dht20-doam):');
            const humidity = (60 + Math.random() * 20).toFixed(1);
            const humidityTopic = `${username}/feeds/dht20-doam`;
            console.log(`Gửi độ ẩm không khí: ${humidity}% tới topic: ${humidityTopic}`);
            client.publish(humidityTopic, humidity.toString());
            
            // Đợi giữa các lần gửi
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            console.log('\n3. Gửi dữ liệu độ ẩm đất (doamdat):');
            const soilMoisture = (40 + Math.random() * 30).toFixed(1);
            const soilTopic = `${username}/feeds/doamdat`;
            console.log(`Gửi độ ẩm đất: ${soilMoisture}% tới topic: ${soilTopic}`);
            client.publish(soilTopic, soilMoisture.toString());
            
            // Đợi giữa các lần gửi
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            console.log('\n4. Gửi dữ liệu điều khiển máy bơm (maybom):');
            const pumpValue = "80";
            const pumpTopic = `${username}/feeds/maybom`;
            console.log(`Gửi điều khiển máy bơm: ${pumpValue}% tới topic: ${pumpTopic}`);
            client.publish(pumpTopic, pumpValue);
            
            // Đợi để đảm bảo tất cả tin nhắn đã được gửi
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            console.log('\nĐã gửi tất cả dữ liệu test!');
            client.end();
            console.log('Đã đóng kết nối MQTT.');
            console.log('\n===== KẾT THÚC GỬI DỮ LIỆU TEST =====');
        });
        
        client.on('error', (error) => {
            console.error('Lỗi kết nối MQTT:', error);
            process.exit(1);
        });
        
    } catch (error) {
        console.error('Lỗi khi gửi dữ liệu test:', error);
        process.exit(1);
    }
}

// Chạy script
sendTestData(); 