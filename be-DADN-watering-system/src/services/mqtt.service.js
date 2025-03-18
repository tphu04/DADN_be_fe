const mqtt = require('mqtt');
const prisma = require('../../config/database');
require('dotenv').config();

// Lưu các giá trị đã xử lý gần đây để tránh lặp lại
const processedValues = new Map();

class MQTTService {
    constructor() {
        console.log('MQTTService constructor');
        this.deviceConnections = new Map();
        this.isConnected = false;
        this.feeds = {};
        
        // Lấy thông tin kết nối từ biến môi trường
        this.username = process.env.MQTT_USERNAME || 'leduccuongks0601';
        this.password = process.env.MQTT_API_KEY || 'aio_SNIo23qcDoXgGUptXfEwQk73o40p';
        this.broker = process.env.MQTT_BROKER || 'io.adafruit.com';
        
        // Hiển thị thông tin kết nối (che password)
        console.log(`Đang kết nối tới MQTT broker: mqtt://${this.username}:***@${this.broker}`);
        
        // Khởi tạo kết nối MQTT
        try {
            this.client = mqtt.connect(`mqtt://${this.username}:${this.password}@${this.broker}`, {
                clientId: 'backend_' + Math.random().toString(16).substring(2, 8),
                clean: true,
                connectTimeout: 30000,
                reconnectPeriod: 5000,
                keepalive: 60
            });
            
            // Thiết lập các event handlers
            this._setupEventHandlers();
        } catch (error) {
            console.error('Lỗi khởi tạo MQTT client:', error);
        }
    }
    
    _setupEventHandlers() {
        // Xử lý sự kiện kết nối
        this.client.on('connect', () => {
            console.log('✅ ĐÃ KẾT NỐI THÀNH CÔNG tới MQTT broker!');
            this.isConnected = true;
        });
        
        // Xử lý sự kiện reconnect
        this.client.on('reconnect', () => {
            console.log('Đang thử kết nối lại với MQTT broker...');
        });
        
        // Xử lý sự kiện error
        this.client.on('error', (err) => {
            console.error('❌ Lỗi kết nối MQTT:', err.message);
            this.isConnected = false;
        });
        
        // Xử lý sự kiện close
        this.client.on('close', () => {
            console.log('Kết nối MQTT đã đóng');
            this.isConnected = false;
        });
        
        // Xử lý sự kiện message
        this.client.on('message', async (topic, message) => {
            try {
                console.log(`📩 Nhận được tin nhắn từ topic ${topic}: ${message.toString()}`);
                
                // Xử lý dữ liệu ở đây
                await this._processReceivedData(topic, message);
            } catch (error) {
                console.error('Lỗi xử lý tin nhắn MQTT:', error);
            }
        });
    }
    
    // Kiểm tra trạng thái kết nối
    checkConnection() {
        return this.isConnected && this.client && this.client.connected;
    }
    
    // Phương thức xử lý dữ liệu - phải được đặt bên trong class
    async _processReceivedData(topic, message) {
        try {
            // Parse giá trị từ message
            let value;
            try {
                // Thử parse JSON
                value = JSON.parse(message.toString());
            } catch (e) {
                // Nếu không phải JSON, thử convert sang số
                value = parseFloat(message.toString());
                if (isNaN(value)) {
                    // Nếu không phải số, giữ nguyên string
                    value = message.toString().trim();
                }
            }
            
            // Lưu vào internal cache
            this.feeds[topic] = {
                value,
                timestamp: new Date(),
                raw: message.toString()
            };
            
            // Phân tích thông tin topic để lấy feedKey
            // Ví dụ: leduccuongks0601/feeds/dht20-nhietdo
            const parts = topic.split('/');
            if (parts.length < 3 || parts[1] !== 'feeds') {
                console.log(`Topic không đúng định dạng: ${topic}`);
                return;
            }
            
            const feedKey = parts[2];
            console.log(`Xử lý dữ liệu cho feed: ${feedKey}`);
            
            // Tìm thiết bị và feed tương ứng trong database
            let device, feed;
            
            // Tìm feed trước
            feed = await prisma.feed.findFirst({
                where: { feedKey },
                include: { device: true }
            });
            
            if (feed) {
                device = feed.device;
                console.log(`Tìm thấy feed ${feed.name} của thiết bị ${device.deviceCode}`);
            } else {
                // Nếu không tìm thấy feed, tìm thiết bị phù hợp
                if (feedKey.includes('nhietdo') || feedKey.includes('temp')) {
                    device = await prisma.ioTDevice.findFirst({
                        where: { deviceType: 'temperature_humidity' }
                    });
                } else if (feedKey.includes('doam') || feedKey.includes('hum')) {
                    device = await prisma.ioTDevice.findFirst({
                        where: { deviceType: 'temperature_humidity' }
                    });
                } else if (feedKey.includes('soil') || feedKey.includes('dat')) {
                    device = await prisma.ioTDevice.findFirst({
                        where: { deviceType: 'soil_moisture' }
                    });
                } else if (feedKey.includes('pump') || feedKey.includes('bom')) {
                    device = await prisma.ioTDevice.findFirst({
                        where: { deviceType: 'pump_water' }
                    });
                }
                
                if (!device) {
                    console.log(`Không tìm thấy thiết bị phù hợp cho feed ${feedKey}`);
                    return;
                }
                
                console.log(`Tìm thấy thiết bị ${device.deviceCode} phù hợp với feed ${feedKey}`);
                
                // Tự động tạo feed nếu chưa có
                feed = await prisma.feed.create({
                    data: {
                        name: feedKey,
                        feedKey: feedKey,
                        description: `Feed tự động tạo cho ${feedKey}`,
                        deviceId: device.id
                    }
                });
                console.log(`Đã tạo feed mới: ${feed.name}`);
            }
            
            // Lấy giá trị số từ dữ liệu
            let numericValue = null;
            if (typeof value === 'number') {
                numericValue = value;
            } else if (typeof value === 'string') {
                numericValue = parseFloat(value);
            } else if (typeof value === 'object' && value !== null) {
                // Các trường thường gặp trong object từ Adafruit
                if (value.value !== undefined) {
                    numericValue = parseFloat(value.value);
                } else if (value.last_value !== undefined) {
                    numericValue = parseFloat(value.last_value);
                }
            }
            
            if (isNaN(numericValue)) {
                console.log(`Không thể parse giá trị thành số`);
                return;
            }
            
            
            
            // Cập nhật trạng thái thiết bị
            await prisma.ioTDevice.update({
                where: { id: device.id },
                data: { 
                    status: 'On',
                    isOnline: true,
                    lastSeen: new Date(),
                    lastSeenAt: new Date() 
                }
            });
            
            // Cập nhật giá trị mới nhất của feed
            await prisma.feed.update({
                where: { id: feed.id },
                data: { lastValue: numericValue }
            });
            
            // Lưu dữ liệu sensor chung
            const sensorData = await prisma.sensorData.create({
                data: {
                    value: numericValue,
                    deviceId: device.id,
                    feedId: feed.id,
                    isAbnormal: false
                }
            });
            
            // Lưu dữ liệu theo loại thiết bị cụ thể
            // if (device.deviceType === 'temperature_humidity') {
            //     // Xử lý nhiệt độ
            //     if (feedKey.includes('nhietdo') || feedKey.includes('temp')) {
            //         await prisma.temperatureHumidityData.create({
            //             data: {
            //                 temperature: numericValue,
            //                 humidity: 0, // Sẽ được cập nhật khi có dữ liệu độ ẩm
            //                 deviceId: device.id
            //             }
            //         });
            //         console.log(`📊 Đã lưu dữ liệu nhiệt độ: ${numericValue}°C`);
            //     } 
            //     // Xử lý độ ẩm
            //     else if (feedKey.includes('doam') || feedKey.includes('hum')) {
            //         // Tìm bản ghi nhiệt độ gần nhất (trong vòng 1 phút)
            //         const latestData = await prisma.temperatureHumidityData.findFirst({
            //             where: { 
            //                 deviceId: device.id,
            //                 readingTime: {
            //                     gte: new Date(Date.now() - 60000) // 1 phút
            //                 }
            //             },
            //             orderBy: { readingTime: 'desc' }
            //         });
                    
            //         if (latestData) {
            //             // Cập nhật bản ghi hiện có
            //             await prisma.temperatureHumidityData.update({
            //                 where: { id: latestData.id },
            //                 data: { humidity: numericValue }
            //             });
            //             console.log(`📊 Đã cập nhật dữ liệu độ ẩm: ${numericValue}% cho bản ghi hiện có`);
            //         } else {
            //             // Tạo bản ghi mới
            //             await prisma.temperatureHumidityData.create({
            //                 data: {
            //                     temperature: 0, // Giá trị mặc định
            //                     humidity: numericValue,
            //                     deviceId: device.id
            //                 }
            //             });
            //             console.log(`📊 Đã tạo bản ghi mới với độ ẩm: ${numericValue}%`);
            //         }
            //     }
            // } 
            // // Xử lý độ ẩm đất
            // else if (device.deviceType === 'soil_moisture') {
            //     await prisma.soilMoistureData.create({
            //         data: {
            //             moistureValue: numericValue,
            //             deviceId: device.id
            //         }
            //     });
            //     console.log(`📊 Đã lưu dữ liệu độ ẩm đất: ${numericValue}%`);
            // }
            // Kiểm tra xem cả hai feed đã có giá trị chưa (nhiệt độ và độ ẩm)
            const feedKeyTemperature = 'dht20-nhietdo'; // Feed nhiệt độ
            const feedKeyHumidity = 'dht20-doam'; // Feed độ ẩm

            // Nếu cả hai feed đã có dữ liệu, thì lưu chúng vào cơ sở dữ liệu
            if (this.feeds[`${this.username}/feeds/${feedKeyTemperature}`] && this.feeds[`${this.username}/feeds/${feedKeyHumidity}`]) {
                const temperatureValue = this.feeds[`${this.username}/feeds/${feedKeyTemperature}`].value;
                const humidityValue = this.feeds[`${this.username}/feeds/${feedKeyHumidity}`].value;

                console.log(`Cả nhiệt độ và độ ẩm đều có giá trị: ${temperatureValue} và ${humidityValue}`);

                // Lưu nhiệt độ và độ ẩm vào cơ sở dữ liệu
                await prisma.temperatureHumidityData.create({
                    data: {
                        temperature: temperatureValue,
                        humidity: humidityValue,
                        deviceId: device.id
                    }
                });

                console.log(`📊 Đã lưu dữ liệu nhiệt độ: ${temperatureValue}°C và độ ẩm: ${humidityValue}%`);
                
                // Xóa cache sau khi lưu để tránh lặp lại
                delete this.feeds[`${this.username}/feeds/${feedKeyTemperature}`];
                delete this.feeds[`${this.username}/feeds/${feedKeyHumidity}`];
            }

            // Nếu chỉ nhận được một trong hai feed, chỉ lưu dữ liệu của feed đó
            else if (feedKey.includes('nhietdo') || feedKey.includes('temp')) {
                console.log(`📊 Đã lưu dữ liệu nhiệt độ: ${numericValue}°C`);
                await prisma.temperatureHumidityData.create({
                    data: {
                        temperature: numericValue,
                        humidity: 0, // Mặc định, độ ẩm là 0 cho đến khi nhận được giá trị độ ẩm
                        deviceId: device.id
                    }
                });
            } else if (feedKey.includes('doam') || feedKey.includes('hum')) {
                console.log(`📊 Đã lưu dữ liệu độ ẩm: ${numericValue}%`);
                await prisma.temperatureHumidityData.create({
                    data: {
                        temperature: 0, // Mặc định, nhiệt độ là 0 cho đến khi nhận được giá trị nhiệt độ
                        humidity: numericValue,
                        deviceId: device.id
                    }
                });
            } else if (feedKey.includes('pump') || feedKey.includes('bom')) {
                console.log(`📊 Đã lưu dữ liệu máy bơm: ${numericValue}`);
                await prisma.pumpWaterData.create({
                    data: {
                        pumpWaterValue: numericValue,
                        deviceId: device.id
                    }
                });
            } else if (feedKey.includes('soil') || feedKey.includes('dat')) {
                console.log(`📊 Đã lưu dữ liệu độ ẩm đất: ${numericValue}%`);
                await prisma.soilMoistureData.create({
                    data: {
                        moistureValue: numericValue,
                        deviceId: device.id
                    }
                });
            }
            
            
            
            console.log(`✅ Hoàn tất xử lý dữ liệu cho feed ${feedKey}`);
            return true;
        } catch (error) {
            console.error(`❌ Lỗi xử lý dữ liệu cho topic ${topic}:`, error);
            return false;
        }
    }
    
    // Phương thức kết nối thiết bị
    async connectDevice(device) {
        try {
            console.log(`Đang kết nối thiết bị ${device.deviceCode} với MQTT`);
            
            // Kiểm tra kết nối
            if (!this.checkConnection()) {
                console.warn(`⚠️ MQTT chưa kết nối, không thể kết nối thiết bị ${device.deviceCode}`);
                return false;
            }
            
            // Xác định các topics cần đăng ký
            const topics = [];
            
            if (device.feeds && device.feeds.length > 0) {
                // Nếu thiết bị có feeds được định nghĩa sẵn
                for (const feed of device.feeds) {
                    topics.push(`${this.username}/feeds/${feed.feedKey}`);
                }
            } else {
                // Đăng ký dựa vào loại thiết bị
                if (device.deviceType === 'temperature_humidity') {
                    topics.push(`${this.username}/feeds/dht20-nhietdo`);
                    topics.push(`${this.username}/feeds/dht20-doam`);
                } else if (device.deviceType === 'soil_moisture') {
                    topics.push(`${this.username}/feeds/doamdat`);
                }
            }
            
            // Đăng ký các topics
            for (const topic of topics) {
                this.client.subscribe(topic, (err) => {
                    if (err) {
                        console.error(`❌ Lỗi đăng ký topic ${topic}:`, err);
                    } else {
                        console.log(`✅ Đã đăng ký topic ${topic} cho thiết bị ${device.deviceCode}`);
                    }
                });
            }
            
            // Cập nhật trạng thái thiết bị
            await prisma.ioTDevice.update({
                where: { id: device.id },
                data: { 
                    status: 'On',
                    isOnline: true,
                    lastSeen: new Date(),
                    lastSeenAt: new Date()
                }
            });
            
            // Lưu thông tin kết nối
            this.deviceConnections.set(device.id, {
                deviceCode: device.deviceCode,
                deviceType: device.deviceType,
                topics: topics
            });
            
            console.log(`✅ Đã kết nối thành công thiết bị ${device.deviceCode}`);
            return true;
        } catch (error) {
            console.error(`❌ Lỗi kết nối thiết bị ${device.deviceCode}:`, error);
            return false;
        }
    }
    
    // Phương thức đăng ký nhận dữ liệu từ tất cả feeds
    async subscribeToAllFeeds() {
        if (!this.checkConnection()) {
            console.error('MQTT chưa kết nối, không thể đăng ký feeds');
            return false;
        }
        
        try {
            // Đăng ký feed wildcard để nhận tất cả dữ liệu
            this.client.subscribe(`${this.username}/feeds/feed`, (err) => {
                if (err) {
                    console.error(`Lỗi đăng ký wildcard topic:`, err);
                } else {
                    console.log(`✅ Đã đăng ký topic để nhận tất cả feeds`);
                }
            });
            
            return true;
        } catch (error) {
            console.error('Lỗi khi đăng ký feeds:', error);
            return false;
        }
    }
    
    // Thêm phương thức waitForConnection nếu Server.js cần
    async waitForConnection(timeout = 15000) {
        return new Promise((resolve) => {
            if (this.checkConnection()) {
                resolve(true);
                return;
            }
            
            const connectHandler = () => {
                resolve(true);
            };
            
            this.client.once('connect', connectHandler);
            
            setTimeout(() => {
                this.client.removeListener('connect', connectHandler);
                resolve(this.checkConnection());
            }, timeout);
        });
    }
}

// Tạo và xuất instance duy nhất
const mqttService = new MQTTService();
module.exports = mqttService;