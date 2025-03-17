// Tạo file test/simulateMQTT.js
require('dotenv').config();
const mqtt = require('mqtt');
const prisma = require('../config/database');

async function createNotificationForTest() {
    try {
        // Kiểm tra xem đã có notification với ID 1 chưa
        const existingNotification = await prisma.notification.findUnique({
            where: { id: 1 }
        });
        
        if (!existingNotification) {
            // Tạo user trước
            let testUser = await prisma.user.findFirst();
            
            if (!testUser) {
                testUser = await prisma.user.create({
                    data: {
                        fullname: "Test User",
                        username: "testuser",
                        password: "password123",
                        email: "test@example.com",
                        phone: "0123456789",
                        address: "Test Address"
                    }
                });
            }
            
            // Tạo notification với ID 1
            await prisma.notification.create({
                data: {
                    id: 1,
                    message: "Test notification for MQTT",
                    type: "info",
                    userId: testUser.id
                }
            });
            
            console.log("Created test notification");
        }
    } catch (error) {
        console.error("Error creating test notification:", error);
    }
}

async function createTestDevice() {
    try {
        // Tạo thiết bị DHT20 nếu chưa có
        let device = await prisma.ioTDevice.findFirst({
            where: {
                deviceCode: "TEST_DHT20",
                deviceType: "temperature_humidity"
            }
        });
        
        if (!device) {
            device = await prisma.ioTDevice.create({
                data: {
                    deviceCode: "TEST_DHT20",
                    deviceType: "temperature_humidity",
                    description: "Test DHT20 sensor for temperature and humidity"
                }
            });
            console.log("Created test device:", device);
        }
        
        return device;
    } catch (error) {
        console.error("Error creating test device:", error);
        throw error;
    }
}

async function simulateMQTTData() {
    try {
        // Tạo user và notification cần thiết
        await createNotificationForTest();
        
        // Tạo thiết bị test
        const device = await createTestDevice();
        
        // Kết nối MQTT
        const mqttConfig = {
            host: 'io.adafruit.com',
            port: 1883,
            protocol: 'mqtt',
            username: process.env.MQTT_USERNAME,
            password: process.env.MQTT_API_KEY
        };
        
        console.log("Connecting to MQTT broker with username:", mqttConfig.username);
        
        const client = mqtt.connect(`${mqttConfig.protocol}://${mqttConfig.host}`, mqttConfig);
        
        client.on('connect', () => {
            console.log("Connected to MQTT broker");
            
            // Gửi dữ liệu nhiệt độ
            const temperature = (20 + Math.random() * 10).toFixed(1);
            console.log(`Publishing temperature: ${temperature}°C`);
            client.publish(`${mqttConfig.username}/feeds/dht20-nhietdo`, temperature.toString());
            
            // Đợi 2 giây rồi gửi dữ liệu độ ẩm
            setTimeout(() => {
                const humidity = (40 + Math.random() * 30).toFixed(1);
                console.log(`Publishing humidity: ${humidity}%`);
                client.publish(`${mqttConfig.username}/feeds/dht20-doam`, humidity.toString());
                
                // Lưu dữ liệu trực tiếp vào database để test
                saveMockData(device.id, parseFloat(temperature), parseFloat(humidity));
                
                // Đóng kết nối sau khi gửi dữ liệu
                setTimeout(() => {
                    console.log("Closing MQTT connection");
                    client.end();
                }, 1000);
            }, 2000);
        });
        
        client.on('error', (error) => {
            console.error("MQTT Error:", error);
        });
    } catch (error) {
        console.error("Error simulating MQTT data:", error);
    }
}

async function saveMockData(deviceId, temperature, humidity) {
    try {
        // Lưu dữ liệu nhiệt độ và độ ẩm
        const data = await prisma.temperatureHumidityData.create({
            data: {
                temperature,
                humidity,
                deviceId
            }
        });
        
        console.log("Saved test data to database:", data);
        
        // Tạo log
        await prisma.logData.create({
            data: {
                value: `Test data: Temperature=${temperature}°C, Humidity=${humidity}%`,
                deviceId,
                notificationId: 1
            }
        });
        
        console.log("Saved test log");
        
        // Kiểm tra dữ liệu sau khi lưu
        await checkSavedData(deviceId);
    } catch (error) {
        console.error("Error saving mock data:", error);
    }
}

async function checkSavedData(deviceId) {
    try {
        // Lấy dữ liệu mới nhất
        const latestData = await prisma.temperatureHumidityData.findFirst({
            where: {
                deviceId
            },
            orderBy: {
                readingTime: 'desc'
            }
        });
        
        console.log("Latest data in database:", latestData);
        
        // Lấy log mới nhất
        const latestLog = await prisma.logData.findFirst({
            where: {
                deviceId
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        
        console.log("Latest log in database:", latestLog);
        
        return {
            sensorData: latestData,
            log: latestLog
        };
    } catch (error) {
        console.error("Error checking saved data:", error);
        throw error;
    }
}

// Chạy test
simulateMQTTData().catch(console.error);