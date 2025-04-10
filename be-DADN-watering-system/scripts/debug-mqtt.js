require('dotenv').config();
const mqtt = require('mqtt');
const prisma = require('../config/database');

async function debugMQTT() {
    try {
        console.log('===== BẮT ĐẦU DEBUG MQTT =====\n');
        
        // 1. Kiểm tra thông tin trong .env
        console.log('1. Thông tin cấu hình MQTT:');
        console.log(`MQTT_HOST: ${process.env.MQTT_HOST}`);
        console.log(`MQTT_PORT: ${process.env.MQTT_PORT}`);
        console.log(`MQTT_USERNAME: ${process.env.MQTT_USERNAME}`);
        console.log(`MQTT_API_KEY: ${process.env.MQTT_API_KEY.substring(0, 6)}...`); 
        console.log(`MQTT_TOPICS: ${process.env.MQTT_TOPICS}`);
        console.log('\n');
        
        // 2. Kiểm tra thiết bị trong database
        console.log('2. Thiết bị trong database:');
        const devices = await prisma.ioTDevice.findMany({
            include: { feeds: true }
        });
        
        if (devices.length === 0) {
            console.log('Không tìm thấy thiết bị nào trong database.');
        } else {
            console.log(`Tìm thấy ${devices.length} thiết bị trong database:`);
            
            for (const device of devices) {
                console.log(`\nThiết bị ID ${device.id}:`);
                console.log(`Mã thiết bị: ${device.deviceCode}`);
                console.log(`Loại thiết bị: ${device.deviceType}`);
                console.log(`Trạng thái: ${device.status}`);
                console.log(`Trạng thái online: ${device.isOnline ? 'Online' : 'Offline'}`);
                console.log(`Thời gian kết nối cuối: ${device.lastSeen || 'Chưa kết nối'}`);
                
                if (device.feeds && device.feeds.length > 0) {
                    console.log(`Feeds (${device.feeds.length}):`);
                    device.feeds.forEach((feed, index) => {
                        console.log(`  ${index + 1}. ${feed.name} (${feed.feedKey}) - Giá trị cuối: ${feed.lastValue || 'Chưa có'}`);
                    });
                } else {
                    console.log('Thiết bị chưa có feeds nào.');
                }
            }
        }
        console.log('\n');
        
        // 3. Kiểm tra dữ liệu đã lưu
        console.log('3. Kiểm tra dữ liệu đã lưu:');
        
        // Kiểm tra dữ liệu nhiệt độ, độ ẩm
        const tempHumidData = await prisma.temperatureHumidityData.findMany({
            take: 5,
            orderBy: { readingTime: 'desc' }
        });
        
        if (tempHumidData.length > 0) {
            console.log(`Dữ liệu nhiệt độ và độ ẩm (${tempHumidData.length} bản ghi mới nhất):`);
            tempHumidData.forEach((data, index) => {
                console.log(`  ${index + 1}. Thiết bị ID ${data.deviceId}: Nhiệt độ ${data.temperature}°C, Độ ẩm ${data.humidity}%, Thời gian: ${data.readingTime}`);
            });
        } else {
            console.log('Không tìm thấy dữ liệu nhiệt độ và độ ẩm.');
        }
        
        // Kiểm tra dữ liệu độ ẩm đất
        const soilData = await prisma.soilMoistureData.findMany({
            take: 5,
            orderBy: { readingTime: 'desc' }
        });
        
        if (soilData.length > 0) {
            console.log(`\nDữ liệu độ ẩm đất (${soilData.length} bản ghi mới nhất):`);
            soilData.forEach((data, index) => {
                console.log(`  ${index + 1}. Thiết bị ID ${data.deviceId}: Độ ẩm đất ${data.moistureValue}%, Thời gian: ${data.readingTime}`);
            });
        } else {
            console.log('\nKhông tìm thấy dữ liệu độ ẩm đất.');
        }
        
        // Kiểm tra dữ liệu máy bơm
        const pumpData = await prisma.pumpWaterData.findMany({
            take: 5,
            orderBy: { readingTime: 'desc' }
        });
        
        if (pumpData.length > 0) {
            console.log(`\nDữ liệu máy bơm (${pumpData.length} bản ghi mới nhất):`);
            pumpData.forEach((data, index) => {
                console.log(`  ${index + 1}. Thiết bị ID ${data.deviceId}: Trạng thái ${data.status}, Tốc độ ${data.pumpSpeed}%, Thời gian: ${data.readingTime}`);
            });
        } else {
            console.log('\nKhông tìm thấy dữ liệu máy bơm.');
        }
        
        console.log('\n');
        
        // 4. Kết nối MQTT và đăng ký lắng nghe
        console.log('4. Kết nối MQTT và lắng nghe:');
        
        const username = process.env.MQTT_USERNAME;
        const password = process.env.MQTT_API_KEY;
        const broker = process.env.MQTT_HOST || 'io.adafruit.com';
        
        console.log(`Đang kết nối tới MQTT broker: mqtt://${username}:***@${broker}`);
        
        const client = mqtt.connect(`mqtt://${broker}`, {
            port: process.env.MQTT_PORT || 1883,
            username: username, 
            password: password,
            clientId: 'debug_' + Math.random().toString(16).substring(2, 8)
        });
        
        // Thiết lập timeout 30 giây
        const timeout = setTimeout(() => {
            console.log('\nHết thời gian đợi, đóng kết nối MQTT.');
            client.end();
            console.log('\n===== KẾT THÚC DEBUG MQTT =====');
            process.exit(0);
        }, 30000);
        
        client.on('connect', () => {
            console.log('✅ Đã kết nối thành công tới MQTT broker!');
            
            // Đăng ký các topics từ thiết bị
            const topics = [];
            
            // Đăng ký theo feeds của thiết bị
            devices.forEach(device => {
                if (device.feeds && device.feeds.length > 0) {
                    device.feeds.forEach(feed => {
                        topics.push(`${username}/feeds/${feed.feedKey}`);
                    });
                }
            });
            
            // Nếu không có feeds, đăng ký các topics mặc định
            if (topics.length === 0) {
                const defaultTopics = [
                    `${username}/feeds/dht20-nhietdo`,
                    `${username}/feeds/dht20-doam`,
                    `${username}/feeds/doamdat`,
                    `${username}/feeds/maybom`
                ];
                topics.push(...defaultTopics);
            }
            
            // Đăng ký lắng nghe tất cả các topics
            topics.forEach(topic => {
                client.subscribe(topic, (err) => {
                    if (err) {
                        console.error(`❌ Lỗi đăng ký topic ${topic}:`, err);
                    } else {
                        console.log(`✅ Đã đăng ký topic ${topic}`);
                    }
                });
            });
            
            console.log('\nĐang lắng nghe các tin nhắn MQTT... (đợi 30 giây)');
        });
        
        client.on('message', (topic, message) => {
            console.log(`📩 Nhận được tin nhắn từ topic ${topic}: ${message.toString()}`);
        });
        
        client.on('error', (error) => {
            console.error('❌ Lỗi kết nối MQTT:', error);
            clearTimeout(timeout);
            process.exit(1);
        });
        
    } catch (error) {
        console.error('Lỗi khi debug MQTT:', error);
        process.exit(1);
    }
}

// Chạy script
debugMQTT(); 