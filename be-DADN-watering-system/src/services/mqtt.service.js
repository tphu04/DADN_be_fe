const mqtt = require('mqtt');
const prisma = require('../../config/database');
const notificationService = require('./notificationService');
require('dotenv').config();

// Lưu các giá trị đã xử lý gần đây để tránh lặp lại
const processedValues = new Map();

class MQTTService {
    constructor() {
        console.log('MQTTService constructor');
        this.deviceConnections = new Map();
        this.isConnected = false;
        this.feeds = {};
        this.io = null; // Biến để lưu trữ đối tượng Socket.IO

        // Lấy thông tin kết nối từ biến môi trường
        this.username = process.env.MQTT_USERNAME || 'leduccuongks0601';
        this.password = process.env.MQTT_API_KEY || 'aio_SNIo23qcDoXgGUptXfEwQk73o40p';
        this.broker = process.env.MQTT_BROKER || 'io.adafruit.com';

        // Hiển thị thông tin kết nối (che password)
        console.log(`🔌 Đang kết nối tới MQTT broker: mqtt://${this.username}:***@${this.broker}`);

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

            // Đăng ký tất cả các topics cần thiết
            this._subscribeToDefaultTopics();
        } catch (error) {
            console.error('❌ Lỗi khởi tạo MQTT client:', error);
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
                console.log(`🔍 Chi tiết tin nhắn:`, {
                    topic,
                    message: message.toString(),
                    timestamp: new Date().toISOString()
                });

                // Xử lý dữ liệu ở đây
                await this._processReceivedData(topic, message);
            } catch (error) {
                console.error('❌ Lỗi xử lý tin nhắn MQTT:', error);
                console.error('Chi tiết lỗi:', {
                    topic,
                    message: message.toString(),
                    error: error.message,
                    stack: error.stack
                });
            }
        });
    }

    // Kiểm tra trạng thái kết nối
    checkConnection() {
        return this.isConnected && this.client && this.client.connected;
    }

    // Phương thức để thiết lập đối tượng Socket.IO
    setSocketIO(io) {
        this.io = io;
        console.log('✅ Đã thiết lập Socket.IO cho MQTT service');
        // Thiết lập Socket.IO cho notification service
        notificationService.setSocketIO(io);
    }

    // Phương thức để gửi dữ liệu cập nhật qua socket
    emitSensorUpdate(data) {
        if (!this.io) {
            console.warn('⚠️ Socket.IO chưa được thiết lập, không thể gửi dữ liệu cập nhật');
            return;
        }

        console.log('📡 Đang gửi dữ liệu cập nhật qua socket');
        this.io.emit('sensor-update', data);
    }

    // Phương thức xử lý dữ liệu - phải được đặt bên trong class
    async _processReceivedData(topic, message) {
        try {
            console.log(`🔄 Bắt đầu xử lý dữ liệu từ topic: ${topic}`);
            
            // Parse giá trị từ message
            let value;
            try {
                // Thử parse JSON
                value = JSON.parse(message.toString());
                console.log(`📦 Giá trị JSON đã parse:`, value);
            } catch (e) {
                // Nếu không phải JSON, thử convert sang số
                value = parseFloat(message.toString());
                if (isNaN(value)) {
                    // Nếu không phải số, giữ nguyên string
                    value = message.toString().trim();
                }
                console.log(`📊 Giá trị đã xử lý:`, value);
            }

            // Lưu vào internal cache
            this.feeds[topic] = {
                value,
                timestamp: new Date(),
                raw: message.toString()
            };

            // Phân tích thông tin topic để lấy feedKey
            const parts = topic.split('/');
            if (parts.length < 3 || parts[1] !== 'feeds') {
                console.log(`⚠️ Topic không đúng định dạng: ${topic}`);
                return;
            }

            const feedKey = parts[2];
            console.log(`🔑 Feed key được xác định: ${feedKey}`);

            // Khai báo biến device và feed
            let device = null;
            let feed = null;

            // Tìm thiết bị phù hợp trước
            if (feedKey.includes('soil') || feedKey.includes('doamdat')) {
                device = await prisma.ioTDevice.findFirst({
                    where: { deviceType: 'soil_moisture' }
                });
            } else if (feedKey.includes('nhietdo') || feedKey.includes('temp')) {
                device = await prisma.ioTDevice.findFirst({
                    where: { deviceType: 'temperature_humidity' }
                });
            } else if (feedKey.includes('doam') || feedKey.includes('hum')) {
                device = await prisma.ioTDevice.findFirst({
                    where: { deviceType: 'temperature_humidity' }
                });
            } else if (feedKey.includes('pump') || feedKey.includes('bom')) {
                device = await prisma.ioTDevice.findFirst({
                    where: { deviceType: 'pump_water' }
                });
            } else if (feedKey.includes('light')) {
                device = await prisma.ioTDevice.findFirst({
                    where: { deviceType: 'light' }
                });
            }

            if (!device) {
                console.log(`❌ Không tìm thấy thiết bị phù hợp cho feed ${feedKey}`);
                return;
            }

            console.log(`✅ Tìm thấy thiết bị ${device.deviceCode} phù hợp với feed ${feedKey}`);

            // Sau khi tìm thấy thiết bị, tìm feed tương ứng
            feed = await prisma.feed.findFirst({
                where: { 
                    feedKey,
                    deviceId: device.id
                }
            });

            if (!feed) {
                console.log(`🔍 Không tìm thấy feed, đang tạo feed mới...`);
                // Tự động tạo feed nếu chưa có
                feed = await prisma.feed.create({
                    data: {
                        name: feedKey,
                        feedKey: feedKey,
                        deviceId: device.id,
                        minValue: null,
                        maxValue: null,
                        lastValue: null
                    }
                });
                console.log(`✨ Đã tạo feed mới: ${feed.name}`);
            } else {
                console.log(`✅ Tìm thấy feed ${feed.name} của thiết bị ${device.deviceCode}`);
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

            // Kiểm tra ngưỡng và tạo thông báo nếu vượt ngưỡng
            if (feed.maxValue !== null && numericValue > feed.maxValue) {
                await notificationService.createThresholdNotification(device, feed, numericValue, true);
            } else if (feed.minValue !== null && numericValue < feed.minValue) {
                await notificationService.createThresholdNotification(device, feed, numericValue, false);
            }

            // Cập nhật trạng thái thiết bị
            const wasOffline = !device.isOnline;
            await prisma.ioTDevice.update({
                where: { id: device.id },
                data: {
                    status: 'On',
                    isOnline: true,
                    lastSeen: new Date(),
                    lastSeenAt: new Date()
                }
            });

            // Nếu thiết bị vừa từ offline sang online, tạo thông báo kết nối
            if (wasOffline) {
                await notificationService.createConnectionNotification(device, true);
            }

            // Cập nhật giá trị mới nhất của feed
            await prisma.feed.update({
                where: { id: feed.id },
                data: { lastValue: numericValue }
            });

            // Kiểm tra xem cả hai feed đã có giá trị chưa (nhiệt độ và độ ẩm)
            const feedKeyTemperature = 'dht20-nhietdo'; // Feed nhiệt độ
            const feedKeyHumidity = 'dht20-doam'; // Feed độ ẩm

            if (feedKey.includes('soil') || feedKey.includes('doamdat')) {
                console.log(`📊 Đã lưu dữ liệu độ ẩm đất: ${numericValue}%`);
                await prisma.soilMoistureData.create({
                    data: {
                        deviceId: device.id,
                        moistureValue: numericValue
                    }
                });
            } else if (feedKey.includes('nhietdo') || feedKey.includes('temp')) {
                console.log(`📊 Đã lưu dữ liệu nhiệt độ: ${numericValue}°C`);
                // Lưu dữ liệu nhiệt độ vào TemperatureHumidityData
                await prisma.temperatureHumidityData.create({
                    data: {
                        temperature: numericValue,
                        humidity: 0, // Set độ ẩm là 0 khi chỉ có nhiệt độ
                        device: {
                            connect: {
                                id: device.id
                            }
                        }
                    }
                });
            } else if (feedKey.includes('doam') || feedKey.includes('hum')) {
                console.log(`📊 Đã lưu dữ liệu độ ẩm không khí: ${numericValue}%`);
                // Lưu dữ liệu độ ẩm vào TemperatureHumidityData
                await prisma.temperatureHumidityData.create({
                    data: {
                        temperature: 0, // Set nhiệt độ là 0 khi chỉ có độ ẩm
                        humidity: numericValue,
                        device: {
                            connect: {
                                id: device.id
                            }
                        }
                    }
                });
            } else if (feedKey.includes('pump') || feedKey.includes('bom')) {
                console.log(`📊 Đã lưu dữ liệu máy bơm: ${numericValue}%`);
                // Xác định trạng thái dựa trên tốc độ
                const status = numericValue > 0 ? 'On' : 'Off';
                
                // Luôn lưu dữ liệu vào PumpWaterData
                await prisma.pumpWaterData.create({
                    data: {
                        deviceId: device.id,
                        pumpSpeed: numericValue,
                        status: status
                    }
                });

                // Cập nhật trạng thái thiết bị
                await prisma.ioTDevice.update({
                    where: { id: device.id },
                    data: { 
                        status: status,
                        isOnline: true,
                        lastSeen: new Date(),
                        lastSeenAt: new Date()
                    }
                });

                // Gửi dữ liệu cập nhật qua socket
                let updateData = {
                    type: 'pump_water',
                    data: {
                        status: status,
                        pumpSpeed: numericValue,
                        timestamp: new Date().toISOString()
                    }
                };
                this.emitSensorUpdate(updateData);
            } else if (feedKey.includes('light')) {
                console.log(`📊 Đã lưu dữ liệu đèn: ${value}`);
                // Với đèn, chúng ta lưu trạng thái On/Off
                const status = value === 1 || value === '1' || value === 'On' ? 'On' : 'Off';

                // Lưu dữ liệu đèn
                await prisma.lightData.create({
                    data: {
                        deviceId: device.id,
                        status: status,
                        readingTime: new Date()
                    }
                });

                // Cập nhật trạng thái thiết bị
                await prisma.ioTDevice.update({
                    where: { id: device.id },
                    data: {
                        status: status,
                        isOnline: true,
                        lastSeen: new Date(),
                        lastSeenAt: new Date()
                    }
                });

                // Gửi dữ liệu cập nhật qua socket
                let updateData = {
                    deviceId: device.id,
                    type: 'light',
                    data: {
                        status: status,
                        timestamp: new Date().toISOString()
                    }
                };
                this.emitSensorUpdate(updateData);

                // Log để kiểm tra
                console.log(`✅ Đã lưu dữ liệu đèn:`, {
                    deviceId: device.id,
                    status: status,
                    timestamp: new Date().toISOString()
                });
            }

            // Gửi dữ liệu cập nhật qua socket cho các thiết bị khác
            if (!feedKey.includes('pump') && !feedKey.includes('bom') && !feedKey.includes('light')) {
                let updateData = {
                    type: device.deviceType,
                    data: {}
                };

                switch (device.deviceType) {
                    case 'temperature_humidity':
                        if (feedKey.includes('nhietdo') || feedKey.includes('temp')) {
                            updateData.data.temperature = numericValue;
                        } else if (feedKey.includes('doam') || feedKey.includes('hum')) {
                            updateData.data.humidity = numericValue;
                        }
                        break;
                    case 'soil_moisture':
                        updateData.data.soilMoisture = numericValue;
                        break;
                }

                this.emitSensorUpdate(updateData);
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
                } else if (device.deviceType === 'pump_water') {
                    topics.push(`${this.username}/feeds/maybom`);
                } else if (device.deviceType === 'light') {
                    topics.push(`${this.username}/feeds/button-light`);
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

            // Tạo thông báo kết nối thành công
            await notificationService.createConnectionNotification(device, true);

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

    // Thêm phương thức đăng ký các topics mặc định
    async _subscribeToDefaultTopics() {
        const defaultTopics = [
            `${this.username}/feeds/dht20-nhietdo`,
            `${this.username}/feeds/dht20-doam`,
            `${this.username}/feeds/doamdat`,
            `${this.username}/feeds/maybom`,
            `${this.username}/feeds/button-light`
        ];

        for (const topic of defaultTopics) {
            this.client.subscribe(topic, (err) => {
                if (err) {
                    console.error(`❌ Lỗi đăng ký topic ${topic}:`, err);
                } else {
                    console.log(`✅ Đã đăng ký topic ${topic}`);
                }
            });
        }
    }
}

// Tạo và xuất instance duy nhất
const mqttService = new MQTTService();
module.exports = mqttService;