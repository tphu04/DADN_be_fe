require('dotenv').config();
const mqtt = require('mqtt');
const prisma = require('./database');

// MQTT Configuration
const mqttConfig = {
    host: process.env.MQTT_HOST || 'io.adafruit.com',
    port: process.env.MQTT_PORT || 1883,
    protocol: process.env.MQTT_PROTOCOL || 'mqtt',
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_API_KEY
};

// Create MQTT client
const client = mqtt.connect(`${mqttConfig.protocol}://${mqttConfig.host}`, {
    port: mqttConfig.port,
    username: mqttConfig.username,
    password: mqttConfig.password
});

// MQTT connection event handlers
client.on('connect', async () => {
    console.log('Connected to MQTT broker');
    
    try {
        // Tải danh sách feed từ database để đăng ký topic
        const feeds = await prisma.feed.findMany({
            select: {
                feedKey: true
            }
        });
        
        if (feeds && feeds.length > 0) {
            console.log(`Đã tìm thấy ${feeds.length} feed trong database`);
            
            // Đăng ký topic cho mỗi feed
            for (const feed of feeds) {
                const topic = `${mqttConfig.username}/feeds/${feed.feedKey}`;
                client.subscribe(topic, (err) => {
                    if (!err) {
                        console.log(`Subscribed to ${topic}`);
                    } else {
                        console.error(`Error subscribing to ${topic}:`, err);
                    }
                });
            }
        } else {
            console.log('Không tìm thấy feed nào trong database');
        }
    } catch (error) {
        console.error('Lỗi khi tải danh sách feed từ database:', error);
    }
});

client.on('error', (error) => {
    console.error('MQTT Error:', error);
});

client.on('message', async (topic, message) => {
    try {
        const value = parseFloat(message.toString());
        if (isNaN(value)) {
            console.error(`Nhận được giá trị không hợp lệ cho topic ${topic}: ${message.toString()}`);
            return;
        }

        // Xử lý dữ liệu dựa trên topic, lấy username từ topic
        const topicParts = topic.split('/');
        const username = topicParts[0]; // Username từ topic
        const feedName = topicParts[2]; // Tên feed từ topic
        
        console.log(`Nhận dữ liệu từ thiết bị ${device.deviceCode}, username: ${username}, feed: ${feedName}`);
        
        if (device.deviceType === 'temperature_humidity') {
            if (feedName === 'dht20-nhietdo') {
                // Lưu dữ liệu nhiệt độ
                await prisma.temperatureHumidityData.create({
                    data: {
                        temperature: value,
                        humidity: 0,
                        deviceId: device.id
                    }
                });
                console.log(`Đã lưu dữ liệu nhiệt độ: ${value}°C cho thiết bị ${device.deviceCode}`);
            } else if (feedName === 'dht20-doam') {
                // Xử lý dữ liệu độ ẩm
                // ... code hiện tại ...
            }
        } else if (device.deviceType === 'soil_moisture' && feedName === 'doamdat') {
            // ... code hiện tại ...
        }
    } catch (error) {
        console.error('Error processing message:', error);
    }
});

module.exports = client; 

// Test data cho thiết bị mới
const newDevice = {
    deviceCode: "user1_DHT20_" + Date.now(), // Sử dụng làm MQTT username
    deviceType: "temperature_humidity",
    description: "Test DHT20 sensor",
    mqttApiKey: "aio_abcd1234" // API key riêng cho thiết bị này
}; 