require('dotenv').config();
const mqtt = require('mqtt');
const prisma = require('../config/database');

/**
 * Script này giả lập việc gửi tin nhắn MQTT từ thiết bị IoT để kiểm thử hệ thống
 * Trước khi chạy, cần đảm bảo đã có thiết bị được tạo trong database với feeds tương ứng
 */

async function simulateMQTTMessage() {
    try {
        // 1. Tìm một thiết bị có sẵn trong database
        const device = await prisma.ioTDevice.findFirst({
            where: {
                status: 'On'
            },
            include: {
                feeds: true
            }
        });

        if (!device) {
            console.error('Không tìm thấy thiết bị nào đang hoạt động trong database');
            console.log('Vui lòng tạo thiết bị trước khi chạy test này');
            return;
        }

        console.log(`Đã tìm thấy thiết bị: ${device.deviceCode} (ID: ${device.id})`);
        console.log(`Loại thiết bị: ${device.deviceType}`);
        console.log(`Số lượng feeds: ${device.feeds.length}`);

        // 2. Kết nối đến MQTT broker
        const mqttConfig = {
            host: 'io.adafruit.com',
            port: 1883,
            protocol: 'mqtt',
            username: device.mqttUsername || process.env.MQTT_USERNAME,
            password: device.mqttApiKey || process.env.MQTT_API_KEY
        };

        console.log('Đang kết nối đến MQTT broker với thông tin:');
        console.log(`- Host: ${mqttConfig.host}`);
        console.log(`- Username: ${mqttConfig.username}`);

        const client = mqtt.connect(`${mqttConfig.protocol}://${mqttConfig.host}`, mqttConfig);

        client.on('connect', async () => {
            console.log('Đã kết nối thành công đến MQTT broker');

            // 3. Gửi dữ liệu đến các feed tương ứng
            for (const feed of device.feeds) {
                const topic = `${mqttConfig.username}/feeds/${feed.feedKey}`;
                let value;

                // Tạo giá trị ngẫu nhiên dựa trên loại feed
                if (feed.feedKey === 'dht20-nhietdo') {
                    // Nhiệt độ từ 25°C đến 35°C
                    value = (25 + Math.random() * 10).toFixed(1);
                } else if (feed.feedKey === 'dht20-doam') {
                    // Độ ẩm không khí từ 40% đến 80%
                    value = (40 + Math.random() * 40).toFixed(1);
                } else if (feed.feedKey === 'doamdat') {
                    // Độ ẩm đất từ 20% đến 90%
                    value = (20 + Math.random() * 70).toFixed(1);
                } else {
                    // Giá trị mặc định từ 0 đến 100
                    value = (Math.random() * 100).toFixed(1);
                }

                console.log(`Gửi dữ liệu đến topic ${topic}: ${value}`);
                client.publish(topic, value.toString(), { qos: 1 }, (err) => {
                    if (err) {
                        console.error(`Lỗi khi gửi dữ liệu đến ${topic}:`, err);
                    } else {
                        console.log(`Đã gửi dữ liệu thành công đến ${topic}`);
                    }
                });

                // Đợi 2 giây giữa các lần gửi
                await new Promise(resolve => setTimeout(resolve, 2000));
            }

            console.log('Đã gửi xong tất cả dữ liệu, đóng kết nối MQTT');
            client.end();
            process.exit(0);
        });

        client.on('error', (error) => {
            console.error('Lỗi kết nối MQTT:', error);
            process.exit(1);
        });

    } catch (error) {
        console.error('Lỗi trong quá trình test:', error);
        process.exit(1);
    }
}

// Chạy script test
simulateMQTTMessage(); 