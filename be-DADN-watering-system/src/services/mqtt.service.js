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
        this.deviceMQTTClients = new Map(); // Map để lưu kết nối MQTT cho mỗi thiết bị
        this.isConnected = false;
        this.feeds = {};
        this.io = null; // Biến để lưu trữ đối tượng Socket.IO

        // Lấy thông tin kết nối từ biến môi trường
        this.username = process.env.MQTT_USERNAME || 'leduccuongks0601';
        this.password = process.env.MQTT_API_KEY || 'aio_SNIo23qcDoXgGUptXfEwQk73o40p';
        this.broker = process.env.MQTT_BROKER || 'io.adafruit.com';

        // Hiển thị thông tin kết nối (che password)
        console.log(`🔌 Đang kết nối tới MQTT broker mặc định: mqtt://${this.username}:***@${this.broker}`);

        // Khởi tạo kết nối MQTT mặc định
        try {
            this.client = mqtt.connect(`mqtt://${this.username}:${this.password}@${this.broker}`, {
                clientId: 'backend_' + Math.random().toString(16).substring(2, 8),
                clean: true,
                connectTimeout: 30000,
                reconnectPeriod: 5000,
                keepalive: 60,
                port: 1883 // Thêm port mặc định cho MQTT
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
                await this._processReceivedData(topic, message.toString());
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

        // Gửi dữ liệu cập nhật cho tất cả người dùng
        console.log('🔔 Gửi dữ liệu cập nhật cho tất cả người dùng', data);
        
        // Thêm timestamp nếu chưa có
        if (!data.timestamp) {
            data.timestamp = new Date().toISOString();
        }
        
        // Gửi với event name 'sensor_update' cho tất cả client
        this.io.emit('sensor_update', data);
        
        // Đảm bảo gửi với event name 'sensor-update' (dấu gạch ngang) nếu frontend sử dụng định dạng này
        this.io.emit('sensor-update', data);
    }

    // Thêm phương thức _updateDeviceStatus
    async _updateDeviceStatus(deviceId, feedKey, value) {
        try {
            // Cập nhật lastSeen của thiết bị
            await prisma.iotdevice.update({
                where: { id: deviceId },
                data: {
                    isOnline: true,
                    lastSeen: new Date(),
                    lastSeenAt: new Date()
                }
            });
            console.log(`✅ Đã cập nhật trạng thái thiết bị ${deviceId} - Feed ${feedKey}: ${value}`);
            return true;
        } catch (error) {
            console.error(`❌ Lỗi khi cập nhật trạng thái thiết bị: ${error.message}`);
            return false;
        }
    }

    // Sửa phương thức tạo dữ liệu nhiệt độ
    async _processReceivedData(topic, data) {
        console.log(`📩 Nhận dữ liệu MQTT: Topic=${topic}, Data=${data}`);
        
        // Phân tích cấu trúc topic để lấy feedKey
        const topicParts = topic.split('/');
        // Kiểm tra xem topic có đúng định dạng không (ví dụ: username/feeds/feedKey)
        if (topicParts.length < 3) {
            console.log(`❌ Topic không đúng định dạng: ${topic}`);
            return;
        }

        // feedKey thường là phần tử cuối cùng của đường dẫn topic
        const feedKey = topicParts[topicParts.length - 1];
        
        if (!feedKey || feedKey.trim() === '') {
            console.log(`❌ Không thể xác định feedKey từ topic: ${topic}`);
            return;
        }

        console.log(`🔍 Đã xác định feedKey: ${feedKey} từ topic: ${topic}`);
        
        (async () => {
            try {
                // Tìm feed dựa trên feedKey chính xác
                const feed = await prisma.feed.findFirst({
                    where: { feedKey: feedKey },
                    include: { iotdevice: true }
                });

                if (!feed) {
                    console.log(`❌ Không tìm thấy feed với feedKey: ${feedKey}`);
                    console.log(`💡 Kiểm tra database feed có tồn tại feedKey này không, hoặc có lỗi chính tả trong feedKey.`);
                    
                    // Thử tìm feed gần đúng để gợi ý
                    const allFeeds = await prisma.feed.findMany({
                        select: { feedKey: true }
                    });
                    console.log(`📋 Danh sách tất cả feedKey hiện có: ${allFeeds.map(f => f.feedKey).join(', ')}`);
                    return;
                }

                if (!feed.iotdevice) {
                    console.log(`❌ Feed ${feedKey} không có thiết bị liên kết`);
                    return;
                }

                console.log(`✅ Đã tìm thấy feed: ${feed.feedKey} thuộc thiết bị: ${feed.iotdevice.deviceCode} (ID: ${feed.iotdevice.id}, Loại: ${feed.iotdevice.deviceType})`);
                const device = feed.iotdevice;

                // Phân tích giá trị và xử lý dữ liệu
                let parsedValue = parseFloat(data);
                if (isNaN(parsedValue)) {
                    console.log(`⚠️ Không thể chuyển đổi dữ liệu "${data}" thành số`);
                    return;
                }

                console.log(`📊 Giá trị đã phân tích: ${parsedValue}`);

                // Cập nhật giá trị mới nhất cho feed
                try {
                    await prisma.feed.update({
                        where: { id: feed.id },
                        data: { lastValue: parsedValue }
                    });
                    console.log(`✅ Đã cập nhật giá trị mới cho feed ${feed.feedKey}: ${parsedValue}`);

                    // Cập nhật trạng thái thiết bị nếu cần
                    await this._updateDeviceStatus(device.id, feed.feedKey, parsedValue);
                } catch (error) {
                    console.error(`❌ Lỗi khi cập nhật giá trị feed: ${error.message}`);
                }

                // Kiểm tra ngưỡng và tạo thông báo nếu vượt ngưỡng
                if (feed.maxValue !== null && parsedValue > feed.maxValue) {
                    await notificationService.createThresholdNotification(device, feed, parsedValue, true);
                } else if (feed.minValue !== null && parsedValue < feed.minValue) {
                    await notificationService.createThresholdNotification(device, feed, parsedValue, false);
                }

                // Xử lý dữ liệu dựa trên loại thiết bị từ cơ sở dữ liệu
                console.log(`📊 Xử lý dữ liệu cho thiết bị loại: ${device.deviceType}`);
                
                // Lưu dữ liệu dựa vào deviceType từ database
                switch (device.deviceType) {
                    case 'soil_moisture':
                        console.log(`📊 Đã lưu dữ liệu độ ẩm đất: ${parsedValue}%`);
                        await prisma.soilmoisturedata.create({
                            data: {
                                deviceId: device.id,
                                moistureValue: parsedValue
                            }
                        });
                        
                        // WebSocket update
                        this.emitSensorUpdate({
                            deviceId: device.id,
                            type: 'soil_moisture',
                            data: {
                                soilMoisture: parsedValue,
                                timestamp: new Date().toISOString()
                            }
                        });
                        break;
                        
                    case 'temperature_humidity':
                        // Xác định đây là nhiệt độ hay độ ẩm dựa vào tên feed
                        if (feed.name.toLowerCase().includes('nhiet') || 
                            feed.name.toLowerCase().includes('temp') || 
                            feedKey.includes('nhietdo') || 
                            feedKey.includes('temp')) {
                            
                            console.log(`📊 Đã lưu dữ liệu nhiệt độ: ${parsedValue}°C`);
                            
                            // Tìm bản ghi gần nhất để cập nhật
                            const latestRecord = await prisma.temperaturehumiditydata.findFirst({
                                where: {
                                    deviceId: device.id,
                                    readingTime: {
                                        gte: new Date(Date.now() - 60000) // Dữ liệu trong vòng 60 giây
                                    }
                                },
                                orderBy: {
                                    readingTime: 'desc'
                                }
                            });
                            
                            if (latestRecord && latestRecord.humidity > 0) {
                                // Cập nhật bản ghi hiện có với nhiệt độ mới
                                await prisma.temperaturehumiditydata.update({
                                    where: { id: latestRecord.id },
                                    data: { 
                                        temperature: parsedValue,
                                        readingTime: new Date()
                                    }
                                });
                                console.log(`🔄 Đã cập nhật bản ghi ID ${latestRecord.id} với nhiệt độ ${parsedValue}°C và độ ẩm ${latestRecord.humidity}%`);
                            } else {
                                // Tạo bản ghi mới chỉ với nhiệt độ
                                await prisma.temperaturehumiditydata.create({
                                    data: {
                                        temperature: parsedValue,
                                        humidity: 0, // Set độ ẩm là 0 khi chỉ có nhiệt độ
                                        deviceId: device.id // Sử dụng deviceId trực tiếp thay vì device.connect
                                    }
                                });
                                console.log(`📝 Đã tạo bản ghi mới chỉ với nhiệt độ ${parsedValue}°C`);
                            }
                            
                            // WebSocket update
                            this.emitSensorUpdate({
                                deviceId: device.id,
                                type: 'temperature_humidity',
                                data: {
                                    temperature: parsedValue,
                                    timestamp: new Date().toISOString()
                                }
                            });
                        } else {
                            // Đây là dữ liệu độ ẩm
                            console.log(`📊 Đã lưu dữ liệu độ ẩm không khí: ${parsedValue}%`);
                            
                            // Tìm bản ghi gần nhất để cập nhật
                            const latestRecord = await prisma.temperaturehumiditydata.findFirst({
                                where: {
                                    deviceId: device.id,
                                    readingTime: {
                                        gte: new Date(Date.now() - 60000) // Dữ liệu trong vòng 60 giây
                                    }
                                },
                                orderBy: {
                                    readingTime: 'desc'
                                }
                            });
                            
                            if (latestRecord && latestRecord.temperature > 0) {
                                // Cập nhật bản ghi hiện có với độ ẩm mới
                                await prisma.temperaturehumiditydata.update({
                                    where: { id: latestRecord.id },
                                    data: { 
                                        humidity: parsedValue,
                                        readingTime: new Date()
                                    }
                                });
                                console.log(`🔄 Đã cập nhật bản ghi ID ${latestRecord.id} với nhiệt độ ${latestRecord.temperature}°C và độ ẩm ${parsedValue}%`);
                            } else {
                                // Tạo bản ghi mới chỉ với độ ẩm
                                await prisma.temperaturehumiditydata.create({
                                    data: {
                                        temperature: 0, // Set nhiệt độ là 0 khi chỉ có độ ẩm
                                        humidity: parsedValue,
                                        deviceId: device.id // Sử dụng deviceId trực tiếp thay vì device.connect
                                    }
                                });
                                console.log(`📝 Đã tạo bản ghi mới chỉ với độ ẩm ${parsedValue}%`);
                            }
                            
                            // WebSocket update
                            this.emitSensorUpdate({
                                deviceId: device.id,
                                type: 'temperature_humidity',
                                data: {
                                    humidity: parsedValue,
                                    timestamp: new Date().toISOString()
                                }
                            });
                        }
                        break;
                        
                    case 'pump_water':
                        console.log(`📊 Đã lưu dữ liệu máy bơm: ${parsedValue}%`);
                        // Xác định trạng thái dựa trên tốc độ
                        const pumpStatus = parsedValue > 0 ? 'On' : 'Off';
                        
                        // Luôn lưu dữ liệu vào PumpWaterData
                        await prisma.pumpwaterdata.create({
                            data: {
                                deviceId: device.id,
                                pumpSpeed: parsedValue,
                                status: pumpStatus
                            }
                        });
                        
                        // Cập nhật trạng thái thiết bị khi nhận dữ liệu máy bơm
                        await prisma.iotdevice.update({
                            where: { id: device.id },
                            data: {
                                status: pumpStatus, // Cập nhật trạng thái thiết bị theo máy bơm
                                isOnline: true,
                                lastSeen: new Date(),
                                lastSeenAt: new Date()
                            }
                        });
                        
                        // WebSocket update
                        this.emitSensorUpdate({
                            deviceId: device.id,
                            type: 'pump_status',
                            data: {
                                status: pumpStatus,
                                pumpSpeed: parsedValue,
                                timestamp: new Date().toISOString()
                            }
                        });
                        break;
                        
                    case 'light':
                        console.log(`📊 Đã lưu dữ liệu đèn: ${parsedValue}`);
                        // Với đèn, chúng ta lưu trạng thái On/Off
                        // Mở rộng điều kiện kiểm tra để đèn có thể nhận nhiều loại giá trị khác nhau
                        const lightStatus = parsedValue === 1 || 
                                          parsedValue === '1' || 
                                          parsedValue === 'On' || 
                                          parsedValue === 'on' || 
                                          parsedValue === 'true' || 
                                          parsedValue === 'yes' || 
                                          parsedValue > 0
                                          ? 'On' : 'Off';
                        
                        console.log(`🔍 Light value: "${data}" parsed to: ${parsedValue}, status: ${lightStatus}`);
                        
                        // Lưu dữ liệu đèn
                        await prisma.lightdata.create({
                            data: {
                                deviceId: device.id,
                                status: lightStatus,
                                readingTime: new Date()
                            }
                        });

                        // Cập nhật trạng thái thiết bị
                        await prisma.iotdevice.update({
                            where: { id: device.id },
                            data: {
                                status: lightStatus,
                                isOnline: true,
                                lastSeen: new Date(),
                                lastSeenAt: new Date()
                            }
                        });

                        // WebSocket update
                        this.emitSensorUpdate({
                            deviceId: device.id,
                            type: 'light',
                            data: {
                                status: lightStatus,
                                timestamp: new Date().toISOString()
                            }
                        });
                        break;
                        
                    default:
                        console.log(`⚠️ Loại thiết bị không xác định: ${device.deviceType}`);
                }

                console.log(`✅ Hoàn tất xử lý dữ liệu cho feed ${feedKey}`);
                return true;
            } catch (error) {
                console.error(`❌ Lỗi xử lý dữ liệu cho topic ${topic}:`, error);
                return false;
            }
        })();
    }

    // Tạo và lấy client MQTT cho thiết bị cụ thể
    async createDeviceConnection(deviceId) {
        try {
            // Kiểm tra xem kết nối đã tồn tại chưa
            if (this.deviceMQTTClients.has(deviceId)) {
                return this.deviceMQTTClients.get(deviceId);
            }

            // Lấy thông tin thiết bị từ database
            const device = await prisma.iotdevice.findUnique({
                where: { id: deviceId },
                select: {
                    id: true,
                    deviceCode: true,
                    mqttUsername: true,
                    mqttApiKey: true
                }
            });

            // Nếu thiết bị không tồn tại, không tạo kết nối
            if (!device) {
                console.warn(`⚠️ Thiết bị ${deviceId} không tồn tại, không tạo kết nối MQTT`);
                return null;
            }

            // Nếu thiết bị không có thông tin MQTT, không tạo kết nối
            if (!device.mqttUsername || !device.mqttApiKey) {
                console.warn(`⚠️ Thiết bị ${deviceId} không có thông tin MQTT, không tạo kết nối`);
                return null;
            }

            console.log(`🔌 Đang tạo kết nối MQTT cho thiết bị ${deviceId} với username ${device.mqttUsername}`);

            // Tạo kết nối MQTT cho thiết bị
            const deviceClient = mqtt.connect(`mqtt://${device.mqttUsername}:${device.mqttApiKey}@${this.broker}`, {
                clientId: `device_${deviceId}_${Math.random().toString(16).substring(2, 8)}`,
                clean: true,
                connectTimeout: 30000,
                reconnectPeriod: 5000,
                keepalive: 60,
                port: 1883
            });

            // Thiết lập event handlers cho device client
            deviceClient.on('connect', () => {
                console.log(`✅ Đã kết nối MQTT thành công cho thiết bị ${deviceId}`);
            });

            deviceClient.on('error', (err) => {
                console.error(`❌ Lỗi kết nối MQTT cho thiết bị ${deviceId}:`, err.message);
            });

            deviceClient.on('message', async (topic, message) => {
                try {
                    console.log(`📩 Thiết bị ${deviceId} nhận được tin nhắn từ topic ${topic}: ${message.toString()}`);
                    // Xử lý tin nhắn tương tự như client mặc định
                    await this._processReceivedData(topic, message.toString());
                } catch (error) {
                    console.error(`❌ Lỗi xử lý tin nhắn MQTT cho thiết bị ${deviceId}:`, error);
                }
            });

            // Lưu kết nối vào Map
            this.deviceMQTTClients.set(deviceId, {
                client: deviceClient,
                username: device.mqttUsername,
                isConnected: true
            });

            return this.deviceMQTTClients.get(deviceId);
        } catch (error) {
            console.error(`❌ Lỗi tạo kết nối MQTT cho thiết bị ${deviceId}:`, error);
            return null;
        }
    }

    // Lấy MQTT client cho thiết bị
    async getMQTTClientForDevice(device) {
        try {
            // Kiểm tra xem thiết bị có thông tin MQTT riêng không
            if (device.mqttUsername && device.mqttApiKey) {
                // Kiểm tra xem thiết bị đã có kết nối chưa
                if (this.deviceMQTTClients.has(device.id)) {
                    return this.deviceMQTTClients.get(device.id);
                }

                // Nếu chưa có, tạo kết nối mới
                return await this.createDeviceConnection(device.id);
            }

            // Nếu thiết bị không có thông tin MQTT riêng, sử dụng kết nối mặc định
            return {
                client: this.client,
                username: this.username,
                isConnected: this.isConnected
            };
        } catch (error) {
            console.error(`❌ Lỗi lấy MQTT client cho thiết bị ${device.id}:`, error);
            return {
                client: this.client,
                username: this.username,
                isConnected: this.isConnected
            };
        }
    }

    // Cập nhật phương thức connectDevice để sử dụng kết nối MQTT của thiết bị
    async connectDevice(device) {
        try {
            console.log(`Đang kết nối thiết bị ${device.deviceCode} với MQTT`);

            // Lấy MQTT client của thiết bị
            let mqttConnection = await this.getMQTTClientForDevice(device);
            
            if (!mqttConnection || !mqttConnection.isConnected) {
                console.warn(`⚠️ MQTT chưa kết nối cho thiết bị ${device.deviceCode}, sử dụng kết nối mặc định`);
                // Fallback to default connection
                mqttConnection = {
                    client: this.client,
                    username: this.username,
                    isConnected: this.isConnected
                };
            }

            if (!mqttConnection.isConnected) {
                console.warn(`⚠️ MQTT chưa kết nối, không thể kết nối thiết bị ${device.deviceCode}`);
                return false;
            }

            // Xác định các topics cần đăng ký
            const topics = [];

            // Tải lại thông tin feeds của thiết bị để đảm bảo có dữ liệu mới nhất
            const deviceWithFeeds = await prisma.iotdevice.findUnique({
                where: { id: device.id },
                include: { feed: true }
            });

            if (!deviceWithFeeds || !deviceWithFeeds.feed || deviceWithFeeds.feed.length === 0) {
                console.warn(`⚠️ Thiết bị ${device.deviceCode} không có feeds, không thể kết nối MQTT`);
                return false;
            }

            // Đăng ký các topics dựa trên feedKey của thiết bị
            for (const feed of deviceWithFeeds.feed) {
                if (feed.feedKey) {
                    const topic = `${mqttConnection.username}/feeds/${feed.feedKey}`;
                    topics.push(topic);
                }
            }

            // Nếu không có topics nào được định nghĩa
            if (topics.length === 0) {
                console.warn(`⚠️ Không có topics nào được xác định cho thiết bị ${device.deviceCode}`);
                return false;
            }

            // Đăng ký các topics
            for (const topic of topics) {
                mqttConnection.client.subscribe(topic, (err) => {
                    if (err) {
                        console.error(`❌ Lỗi đăng ký topic ${topic}:`, err);
                    } else {
                        console.log(`✅ Đã đăng ký topic ${topic} cho thiết bị ${device.deviceCode}`);
                    }
                });
            }

            // Cập nhật trạng thái thiết bị
            await prisma.iotdevice.update({
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

    // Thêm phương thức đăng ký nhận dữ liệu từ tất cả feeds
    async subscribeToAllFeeds() {
        if (!this.checkConnection()) {
            console.error('❌ MQTT chưa kết nối, không thể đăng ký feeds');
            return false;
        }

        try {
            console.log('🔄 Đang đăng ký tất cả feeds cho MQTT từ database...');
            
            // Đăng ký các feed trong database cho kết nối mặc định
            const feeds = await prisma.feed.findMany({
                include: {
                    iotdevice: {
                        select: {
                            deviceCode: true,
                            deviceType: true
                        }
                    }
                }
            });
            
            console.log(`🔍 Tìm thấy ${feeds.length} feed trong database`);
            
            if (feeds.length === 0) {
                console.warn('⚠️ Không có feed nào trong database!');
                return true;
            }
            
            // Đăng ký feed trong kết nối mặc định
            for (const feed of feeds) {
                const topic = `${this.username}/feeds/${feed.feedKey}`;
                this.client.subscribe(topic, (err) => {
                    if (err) {
                        console.error(`❌ Lỗi đăng ký topic ${topic}:`, err);
                    } else {
                        console.log(`✅ Đã đăng ký topic ${topic} cho thiết bị ${feed.iotdevice?.deviceCode || 'unknown'}`);
                    }
                });
            }
            
            console.log('✅ Đã đăng ký tất cả feeds từ database thành công');
            return true;
        } catch (error) {
            console.error('❌ Lỗi khi đăng ký feeds:', error);
            return false;
        }
    }

    // Thêm phương thức đăng ký các topics mặc định
    async _subscribeToDefaultTopics() {
        try {
            // Lấy tất cả các feed từ database
            const feeds = await prisma.feed.findMany();
            
            console.log(`🔍 Tìm thấy ${feeds.length} feed trong database để đăng ký`);
            
            if (feeds.length === 0) {
                console.log('⚠️ Không có feed nào trong database');
                return;
            }
            
            // Đăng ký tất cả các feed trong database
            for (const feed of feeds) {
                const topic = `${this.username}/feeds/${feed.feedKey}`;
                this.client.subscribe(topic, (err) => {
                    if (err) {
                        console.error(`❌ Lỗi đăng ký topic ${topic}:`, err);
                    } else {
                        console.log(`✅ Đã đăng ký topic ${topic} cho feed ${feed.name || feed.feedKey}`);
                    }
                });
            }
            
            console.log('✅ Đã đăng ký tất cả feed từ database thành công');
        } catch (error) {
            console.error('❌ Lỗi khi đăng ký topics mặc định:', error);
        }
    }
    
    // Thêm phương thức đăng ký feed mới khi thiết bị được thêm vào
    async registerDeviceFeed(device) {
        if (!this.checkConnection()) {
            console.error('❌ MQTT chưa kết nối, không thể đăng ký feed mới');
            return false;
        }

        try {
            if (!device) {
                console.error('❌ Thiết bị không hợp lệ');
                return false;
            }

            console.log(`🔄 Đang đăng ký feed cho thiết bị: ${device.deviceCode}`);
            
            // Lấy feed của thiết bị từ database
            const deviceWithFeed = await prisma.iotdevice.findUnique({
                where: { id: device.id },
                include: { feed: true }
            });
            
            if (!deviceWithFeed || !deviceWithFeed.feed) {
                console.warn(`⚠️ Không tìm thấy feed cho thiết bị ${device.deviceCode}`);
                return false;
            }
            
            // Đăng ký tất cả feed của thiết bị
            for (const feed of deviceWithFeed.feed) {
                const topic = `${this.username}/feeds/${feed.feedKey}`;
                this.client.subscribe(topic, (err) => {
                    if (err) {
                        console.error(`❌ Lỗi đăng ký topic ${topic}:`, err);
                    } else {
                        console.log(`✅ Đã đăng ký topic ${topic} cho thiết bị ${device.deviceCode}`);
                    }
                });
            }

            return true;
        } catch (error) {
            console.error(`❌ Lỗi khi đăng ký feed mới cho thiết bị ${device?.deviceCode}:`, error);
            return false;
        }
    }

    // Phương thức để gửi dữ liệu lên MQTT cho thiết bị cụ thể
    async publishToMQTT(deviceId, feedKey, value) {
        try {
            // Lấy thông tin thiết bị từ database
            const device = await prisma.iotdevice.findUnique({
                where: { id: deviceId }
            });

            if (!device) {
                console.warn(`⚠️ Không tìm thấy thiết bị ${deviceId}`);
                return false;
            }

            // Lấy MQTT client dựa trên thông tin thiết bị
            const mqttConnection = await this.getMQTTClientForDevice(device);
            
            if (!mqttConnection || !mqttConnection.isConnected) {
                console.warn(`⚠️ MQTT chưa kết nối cho thiết bị ${deviceId}, sử dụng kết nối mặc định`);
                // Sử dụng kết nối mặc định
                const topic = `${this.username}/feeds/${feedKey}`;
                console.log(`📤 Gửi dữ liệu đến ${topic}: ${value}`);
                
                this.client.publish(topic, value.toString(), { qos: 1 }, (err) => {
                    if (err) {
                        console.error(`❌ Lỗi gửi dữ liệu đến ${topic}:`, err);
                        return false;
                    } else {
                        console.log(`✅ Đã gửi dữ liệu thành công đến ${topic}`);
                        return true;
                    }
                });
                
                return true;
            }

            // Tạo topic và gửi dữ liệu bằng kết nối của thiết bị
            const topic = `${mqttConnection.username}/feeds/${feedKey}`;
            console.log(`📤 Gửi dữ liệu đến ${topic}: ${value}`);
            
            mqttConnection.client.publish(topic, value.toString(), { qos: 1 }, (err) => {
                if (err) {
                    console.error(`❌ Lỗi gửi dữ liệu đến ${topic}:`, err);
                    return false;
                } else {
                    console.log(`✅ Đã gửi dữ liệu thành công đến ${topic}`);
                    return true;
                }
            });
            
            return true;
        } catch (error) {
            console.error(`❌ Lỗi gửi dữ liệu MQTT cho thiết bị ${deviceId}:`, error);
            return false;
        }
    }

    // Thêm phương thức để ngắt kết nối một thiết bị cụ thể
    async disconnectDevice(deviceId) {
        try {
            console.log(`Đang ngắt kết nối thiết bị với ID ${deviceId}`);
            
            // Lấy thông tin thiết bị
            const device = await prisma.iotdevice.findUnique({
                where: { id: deviceId },
                include: { feed: true }
            });

            if (!device) {
                console.warn(`⚠️ Không tìm thấy thiết bị với ID ${deviceId}`);
                return false;
            }

            // Hủy đăng ký các topics của thiết bị
            const connection = this.deviceConnections.get(deviceId);
            if (connection && connection.topics) {
                const mqttConnection = await this.getMQTTClientForDevice(device);
                
                for (const topic of connection.topics) {
                    mqttConnection.client.unsubscribe(topic, (err) => {
                        if (err) {
                            console.error(`❌ Lỗi hủy đăng ký topic ${topic}:`, err);
                        } else {
                            console.log(`✅ Đã hủy đăng ký topic ${topic} cho thiết bị ${device.deviceCode}`);
                        }
                    });
                }
            }

            // Nếu thiết bị có client MQTT riêng, đóng kết nối
            if (this.deviceMQTTClients.has(deviceId)) {
                const deviceClient = this.deviceMQTTClients.get(deviceId);
                if (deviceClient && deviceClient.client) {
                    deviceClient.client.end(true);
                    console.log(`✅ Đã đóng kết nối MQTT cho thiết bị ${device.deviceCode}`);
                }
                this.deviceMQTTClients.delete(deviceId);
            }

            // Xóa thông tin kết nối
            this.deviceConnections.delete(deviceId);

            // Cập nhật trạng thái thiết bị
            await prisma.iotdevice.update({
                where: { id: deviceId },
                data: {
                    status: 'Off',
                    isOnline: false,
                    lastSeen: new Date(),
                    lastSeenAt: new Date()
                }
            });

            console.log(`✅ Đã ngắt kết nối thành công thiết bị ${device.deviceCode}`);
            return true;
        } catch (error) {
            console.error(`❌ Lỗi ngắt kết nối thiết bị ${deviceId}:`, error);
            return false;
        }
    }

    // Thêm phương thức để đóng tất cả kết nối
    async closeAllConnections() {
        try {
            console.log('Đóng tất cả kết nối MQTT...');
            
            // Đóng kết nối mặc định
            if (this.client) {
                this.client.end(true);
                console.log('Đã đóng kết nối MQTT mặc định');
            }
            
            // Đóng tất cả kết nối của thiết bị
            for (const [deviceId, connection] of this.deviceMQTTClients.entries()) {
                if (connection.client) {
                    connection.client.end(true);
                    console.log(`Đã đóng kết nối MQTT cho thiết bị ${deviceId}`);
                }
            }
            
            // Xóa tất cả kết nối
            this.deviceMQTTClients.clear();
            this.deviceConnections.clear();
            this.isConnected = false;
            
            console.log('✅ Đã đóng tất cả kết nối MQTT thành công');
            return true;
        } catch (error) {
            console.error('Lỗi khi đóng kết nối MQTT:', error);
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