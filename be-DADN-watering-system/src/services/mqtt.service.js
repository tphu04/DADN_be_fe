const mqtt = require('mqtt');
const prisma = require('../../config/database');
const notificationService = require('./notificationService');
const automationService = require('./automation.service');
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
        this.username = process.env.MQTT_USERNAME;
        this.password = process.env.MQTT_API_KEY;
        this.broker = process.env.MQTT_BROKER ;

        // Hiển thị thông tin kết nối (che password)
        console.log(`🔌 Đang kết nối tới MQTT broker mặc định: mqtt://${this.username}:***@${this.broker}`);

        // Khởi tạo kết nối MQTT mặc định
        try {
            this.client = mqtt.connect(`mqtts://${this.username}:${this.password}@${this.broker}`, {
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

        // Add a cache to track recently processed messages
        this._processedMessages = new Map();
        this._messageExpiryMs = 5000; // Expiry time for deduplicated messages (5 seconds)

        // Add a device state tracking to avoid duplicate commands
        this._deviceActivationStates = new Map();
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

    // Add a method to check if a message has been processed recently
    _isMessageDuplicate(topic, data) {
        const key = `${topic}:${data}`;
        const now = Date.now();
        
        // Check if message is in the cache and not expired
        if (this._processedMessages.has(key)) {
            const timestamp = this._processedMessages.get(key);
            if (now - timestamp < this._messageExpiryMs) {
                return true; // It's a duplicate
            }
        }
        
        // Not a duplicate or expired, add to cache
        this._processedMessages.set(key, now);
        
        // Clean up old messages every 100 messages
        if (this._processedMessages.size > 100) {
            this._cleanupProcessedMessages();
        }
        
            return false;
    }
    
    // Clean up expired messages from the cache
    _cleanupProcessedMessages() {
        const now = Date.now();
        for (const [key, timestamp] of this._processedMessages.entries()) {
            if (now - timestamp > this._messageExpiryMs) {
                this._processedMessages.delete(key);
            }
        }
    }

    // Sửa phương thức tạo dữ liệu nhiệt độ
    async _processReceivedData(topic, data) {
        // Check if this is a duplicate message
        // if (this._isMessageDuplicate(topic, data)) {
        //     console.log(`🔄 Bỏ qua tin nhắn trùng lặp: ${topic} - ${data}`);
        //     return;
        // }
        
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
                let parsedValue;
                
                // Kiểm tra nếu thiết bị là đèn và dữ liệu là 'On' hoặc 'Off'
                if (device.deviceType === 'light' && (data === 'On' || data === 'Off')) {
                    // Với đèn, chúng ta không cần chuyển đổi thành số
                    parsedValue = data;
                    console.log(`🔍 Dữ liệu đèn: "${data}" được giữ nguyên dạng chuỗi`);
                } 
                // Kiểm tra nếu thiết bị là máy bơm và dữ liệu có định dạng "On:50" hoặc "Off:0"
                else if (device.deviceType === 'pump_water' && data.includes(':')) {
                    // Phân tích dữ liệu định dạng "On:50" hoặc "Off:0"
                    const parts = data.split(':');
                    const status = parts[0]; // 'On' hoặc 'Off'
                    const speed = parseInt(parts[1]) ; // Tốc độ (50, 100, ...)
                    
                    // Sử dụng tốc độ làm giá trị để lưu vào database
                    parsedValue = speed;
                    console.log(`🔍 Dữ liệu máy bơm: "${data}" được phân tích thành trạng thái=${status}, tốc độ=${speed}`);
                } else {
                    // Với các loại thiết bị khác, thử chuyển đổi thành số
                    parsedValue = parseFloat(data);
                    if (isNaN(parsedValue)) {
                        console.log(`⚠️ Không thể chuyển đổi dữ liệu "${data}" thành số, sử dụng giá trị mặc định 0`);
                        // Sử dụng giá trị mặc định thay vì thoát khỏi hàm
                        parsedValue = 0;
                    }
                }

                console.log(`📊 Giá trị đã phân tích: ${parsedValue}`);

                // Cập nhật giá trị mới nhất cho feed
                try {
                    // Chuyển đổi giá trị phù hợp với schema Prisma
                    let valueToUpdate;
                    
                    if (device.deviceType === 'light' && (parsedValue === 'On' || parsedValue === 'Off')) {
                        // Đối với thiết bị đèn với giá trị chuỗi, chuyển đổi thành số
                        valueToUpdate = parsedValue === 'On' ? 1 : 0;
                        console.log(`🔄 Chuyển đổi giá trị đèn "${parsedValue}" thành số ${valueToUpdate} để lưu vào database`);
                    } else {
                        // Đối với các giá trị khác, giữ nguyên
                        valueToUpdate = parsedValue;
                    }
                    
                    await prisma.feed.update({
                        where: { id: feed.id },
                        data: { lastValue: valueToUpdate }
                    });
                    console.log(`✅ Đã cập nhật giá trị mới cho feed ${feed.feedKey}: ${valueToUpdate}`);

                    // Update device status
                    
                    // Tạo đối tượng dữ liệu cảm biến cho tự động hóa
                    const sensorData = {};
                    let isSensorData = false;
                                    
                    // Xác định loại dữ liệu cảm biến dựa trên tên feed hoặc feedKey
                    const feedName = feed.name ? feed.name.toLowerCase() : '';
                    const feedKeyLower = feed.feedKey ? feed.feedKey.toLowerCase() : '';
                    
                    // Xác định loại dữ liệu cảm biến
                    console.log(`🧪 Phân tích loại dữ liệu từ feed: ${feed.name} (${feed.feedKey})`);
                    
                    // Nhận diện độ ẩm đất
                    if (feedName.includes('soil') || feedKeyLower.includes('soil') || 
                        feedName.includes('moisture') || feedKeyLower.includes('moisture') ||
                        feedKeyLower.includes('dat') || feedKeyLower.includes('doamdat')) {
                        sensorData.soilMoisture = parsedValue;
                        console.log(`🌱 Nhận diện đây là dữ liệu độ ẩm đất: ${parsedValue}%`);
                        isSensorData = true;
                    }
                    // Nhận diện nhiệt độ
                    else if (feedName.includes('temp') || feedKeyLower.includes('temp') ||
                        feedName.includes('nhiet') || feedKeyLower.includes('nhiet') ||
                        feedKeyLower.includes('temperature')) {
                        sensorData.temperature = parsedValue;
                        console.log(`🌡️ Nhận diện đây là dữ liệu nhiệt độ: ${parsedValue}°C`);
                        isSensorData = true;
                    }
                    // Nhận diện độ ẩm không khí
                    else if ((feedName.includes('humid') || feedKeyLower.includes('humid') || 
                             feedName.includes('air') || feedKeyLower.includes('air') ||
                             feedKeyLower.includes('doam') || feedKeyLower.includes('do-am')) &&
                             !feedKeyLower.includes('soil') && !feedKeyLower.includes('dat')) {
                        sensorData.airHumidity = parsedValue;
                        console.log(`💧 Nhận diện đây là dữ liệu độ ẩm không khí: ${parsedValue}%`);
                        isSensorData = true;
                    }
                    // Nhận diện máy bơm
                    else if (feedName.includes('pump') || feedKeyLower.includes('pump') ||
                            feedKeyLower.includes('bom') || feedKeyLower.includes('water')) {
                        sensorData.pumpWater = {
                            status: data.includes(':') ? data.split(':')[0] : (parsedValue > 0 ? 'On' : 'Off'),
                            speed: parsedValue
                        };
                        console.log(`💦 Nhận diện đây là dữ liệu máy bơm: ${JSON.stringify(sensorData.pumpWater)}`);
                    }
                    // Nhận diện đèn
                    else if (feedName.includes('light') || feedKeyLower.includes('light') ||
                            feedKeyLower.includes('den') || feedKeyLower.includes('led')) {
                        sensorData.light = {
                            status: parsedValue === 'On' || parsedValue === 1 || parsedValue === '1' ? 'On' : 'Off'
                        };
                        console.log(`💡 Nhận diện đây là dữ liệu đèn: ${JSON.stringify(sensorData.light)}`);
                    }
                    // Trường hợp đặc biệt: Xử lý dht20-doam hoặc các feedKey tương tự
                    else if (feedKeyLower.includes('doam') || feedKeyLower.includes('humidity')) {
                        // Mặc định coi là độ ẩm không khí nếu không có từ khóa đất
                        sensorData.airHumidity = parsedValue;
                        console.log(`💧 Nhận diện đây là dữ liệu độ ẩm không khí (từ tên feed): ${parsedValue}%`);
                        isSensorData = true;
                    }
                    else {
                        console.log(`⚠️ Không thể nhận diện loại dữ liệu của feed: ${feed.name} (${feed.feedKey})`);
                    }
                    
                    // Gửi dữ liệu cập nhật qua Socket.IO
                    this.emitSensorUpdate({
                        deviceId: device.id,
                        deviceCode: device.deviceCode,
                        feedKey: feed.feedKey,
                        data: sensorData,
                        timestamp: new Date().toISOString()
                    });
                    
                    // Chuyển xử lý tự động hóa sang automation service
                    if (isSensorData || sensorData.soilMoisture !== undefined || 
                        sensorData.temperature !== undefined || 
                        sensorData.airHumidity !== undefined) {
                        
                        console.log(`🚀 MQTT Service: Gửi dữ liệu cảm biến đến Automation Service:`, JSON.stringify(sensorData));
                        const automationService = require('./automation.service');
                        try {
                            const result = await automationService.processSensorData(device.id, sensorData);
                            console.log(`🚀 Kết quả xử lý tự động hóa: ${result ? 'Thành công' : 'Thất bại'}`);
                } catch (error) {
                            console.error(`❌ Lỗi khi gọi automation service:`, error);
                        }
                    } else {
                        console.log(`ℹ️ Không phải dữ liệu cảm biến nên không gọi automation service`);
                }

                    // Tạo thông báo vượt ngưỡng (không tự động hóa)
                try {
                    // Lấy cấu hình mới nhất từ bảng configuration
                    const latestConfig = await prisma.configuration.findFirst({
                        orderBy: { updatedAt: 'desc' }
                    });

                    if (latestConfig) {
                        // Xác định loại feed để lấy ngưỡng tương ứng
                        const feedNameLower = feed.name.toLowerCase();
                        const feedKeyLower = feed.feedKey.toLowerCase();
                        
                        // Xác định ngưỡng dựa vào loại cảm biến
                        let maxThreshold = null;
                        let minThreshold = null;
                        
                        // Kiểm tra cả tên feed và feedKey để xác định loại
                        // Từ khóa tiếng Anh + tiếng Việt
                        if (feedNameLower.includes('humid') || 
                            feedNameLower.includes('humidity') || 
                            feedKeyLower.includes('humid') || 
                            feedKeyLower.includes('doam') || 
                            feedKeyLower.includes('do-am')) {
                            
                            maxThreshold = latestConfig.humidityMax;
                            minThreshold = latestConfig.humidityMin;
                            console.log(`🌡️ Xác định loại: Độ ẩm không khí, min=${minThreshold}, max=${maxThreshold}`);
                            
                        } else if (feedNameLower.includes('soil') || 
                                  feedNameLower.includes('moisture') || 
                                  feedKeyLower.includes('soil') || 
                                  feedKeyLower.includes('moisture') || 
                                  feedKeyLower.includes('doamdat') || 
                                  feedKeyLower.includes('dat')) {
                                  
                            maxThreshold = latestConfig.soilMoistureMax;
                            minThreshold = latestConfig.soilMoistureMin;
                            console.log(`🌡️ Xác định loại: Độ ẩm đất, min=${minThreshold}, max=${maxThreshold}`);
                            
                        } else if (feedNameLower.includes('temp') || 
                                  feedNameLower.includes('temperature') || 
                                  feedKeyLower.includes('temp') || 
                                  feedKeyLower.includes('nhiet') || 
                                  feedKeyLower.includes('nhietdo') || 
                                  feedKeyLower.includes('nhiet-do')) {
                                  
                            maxThreshold = latestConfig.temperatureMax;
                            minThreshold = latestConfig.temperatureMin;
                            console.log(`🌡️ Xác định loại: Nhiệt độ, min=${minThreshold}, max=${maxThreshold}`);
                        }
                        
                        console.log(`🔍 Kiểm tra ngưỡng cho ${feed.name} (${feed.feedKey}): Giá trị=${parsedValue}, Min=${minThreshold}, Max=${maxThreshold}`);
                        
                        // Kiểm tra và tạo thông báo nếu vượt ngưỡng
                        if (maxThreshold !== null && parsedValue > maxThreshold) {
                            console.log(`⚠️ Giá trị ${feed.name} (${parsedValue}) vượt ngưỡng tối đa (${maxThreshold})`);
                                // Chỉ tạo thông báo, không tự điều khiển thiết bị
                            await notificationService.createThresholdNotification(device, feed, parsedValue, true);
                                console.log(`✅ Đã tạo thông báo. Tự động hóa sẽ được xử lý bởi automation.service.js`);
                        } else if (minThreshold !== null && parsedValue < minThreshold) {
                            console.log(`⚠️ Giá trị ${feed.name} (${parsedValue}) dưới ngưỡng tối thiểu (${minThreshold})`);
                                // Chỉ tạo thông báo, không tự điều khiển thiết bị
                            await notificationService.createThresholdNotification(device, feed, parsedValue, false);
                                console.log(`✅ Đã tạo thông báo. Tự động hóa sẽ được xử lý bởi automation.service.js`);
                            } else {
                                console.log(`✅ Giá trị ${feed.name} (${parsedValue}) nằm trong ngưỡng cho phép`);
                        }
                        }
                    } catch (configError) {
                        console.error(`❌ Lỗi khi kiểm tra cấu hình và ngưỡng:`, configError);
                    }
                } catch (error) {
                    console.error(`❌ Lỗi khi kiểm tra ngưỡng: ${error.message}`);
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
                        let lightStatus;
                        
                        // Kiểm tra nếu parsedValue là chuỗi 'On' hoặc 'Off'
                        if (parsedValue === 'On' || parsedValue === 'Off') {
                            lightStatus = parsedValue;
                        } else {
                            // Mở rộng điều kiện kiểm tra để đèn có thể nhận nhiều loại giá trị khác nhau
                            lightStatus = parsedValue === 1 || 
                                          parsedValue === '1' || 
                                          parsedValue === 'on' || 
                                          parsedValue === 'true' || 
                                          parsedValue === 'yes' || 
                                          parsedValue > 0
                                          ? 'On' : 'Off';
                        }
                        
                        console.log(`🔍 Light value: "${data}" parsed to: ${parsedValue}, status: ${lightStatus}`);
                        
                        // Lưu dữ liệu đèn
                        await prisma.lightdata.create({
                            data: {
                                deviceId: device.id,
                                status: lightStatus,
                                readingTime: new Date()
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
            console.log(`📤 [MQTT] Gửi dữ liệu đến feed ${feedKey}: ${value}`);
            
            // Lấy thông tin thiết bị từ database
            const device = await prisma.iotdevice.findUnique({
                where: { id: parseInt(deviceId) },
                include: {
                    feed: true // Changed from 'feeds' to 'feed' to match Prisma schema
                }
            });

            if (!device) {
                console.warn(`⚠️ Không tìm thấy thiết bị ${deviceId}`);
                return false;
            }

            // Kiểm tra MQTT chính đã kết nối chưa
                    if (!this.client || !this.client.connected) {
                        console.error(`❌ MQTT client chưa kết nối, không thể gửi dữ liệu`);
                return false;
            }
            
            // Với MQTT thì cần đảm bảo value luôn là string
            const valueStr = String(value); 
            
            // Xử lý kết quả đồng bộ để đảm bảo phản hồi
            return new Promise((resolve) => {
                try {
                    // Sử dụng kết nối chính mặc định
                    const topic = `${this.username}/feeds/${feedKey}`;
                    console.log(`📤 Gửi dữ liệu đến topic ${topic}: ${valueStr}`);
                    
                    this.client.publish(topic, valueStr, { qos: 1 }, (err) => {
                        if (err) {
                            console.error(`❌ Lỗi gửi dữ liệu đến ${topic}:`, err);
                            resolve(false);
                        } else {
                            console.log(`✅ Đã gửi dữ liệu thành công đến ${topic}: ${valueStr}`);
                            
                            // Thành công - thử gửi thêm một lần nữa để đảm bảo thiết bị nhận được
                            // setTimeout(() => {
                            //     console.log(`📤 Gửi thêm lần nữa để đảm bảo thiết bị nhận được: ${topic} = ${valueStr}`);
                            //     this.client.publish(topic, valueStr, { qos: 1 }, (retryErr) => {
                            //         if (retryErr) {
                            //             console.warn(`⚠️ Lỗi khi gửi lại lần 2:`, retryErr);
                            //             // Vẫn coi là thành công vì lần đầu đã thành công
                            // } else {
                            //             console.log(`✅ Đã gửi lại lần 2 thành công`);
                            //         }
                            //     });
                            // }, 500); // đợi 500ms và gửi lại
                            
                                resolve(true);
                            }
                        });
                } catch (error) {
                    console.error(`❌ Exception khi gửi MQTT:`, error);
                            resolve(false);
                        }
                    });
            
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


            console.log(`✅ Đã ngắt kết nối thành công thiết bị ${device.deviceCode}`);
            return true;
        } catch (error) {
            console.error(`❌ Lỗi ngắt kết nối thiết bị ${deviceId}:`, error);
            return false;
        }
    }

    // Phương thức để gửi lệnh điều khiển đến thiết bị
    async publishToDevice(deviceId, deviceType, command) {
        try {
            console.log(`📤 Gửi lệnh điều khiển ${deviceType} đến thiết bị ${deviceId}:`, JSON.stringify(command));
            
            // Chuẩn hóa loại thiết bị
            let normalizedDeviceType = deviceType;
            
            // Chuyển đổi các loại thiết bị tương đương
            if (deviceType === 'pumpWater' || deviceType === 'pump_water') {
                normalizedDeviceType = 'pump';
            }
            
            console.log(`🔄 Loại thiết bị sau khi chuẩn hóa: ${normalizedDeviceType}`);
            
            // Lấy thông tin thiết bị từ database
            const device = await prisma.iotdevice.findUnique({
                where: { id: parseInt(deviceId) },
                include: {
                    feed: true // Changed from 'feeds' to 'feed' to match Prisma schema
                }
            });

            if (!device) {
                console.warn(`⚠️ Không tìm thấy thiết bị ${deviceId}`);
                return false;
            }
            
            // Log thông tin thiết bị và feed để debug
            console.log(`🔍 Thông tin thiết bị ${deviceId}:`, {
                id: device.id,
                deviceCode: device.deviceCode,
                deviceType: device.deviceType,
                feedCount: device.feed ? device.feed.length : 0
            });
            
            if (device.feed && device.feed.length > 0) {
                console.log(`🔍 Danh sách feed của thiết bị ${deviceId}:`, device.feed.map(f => ({ id: f.id, name: f.name, feedKey: f.feedKey })));
            } else {
                console.warn(`⚠️ Thiết bị ${deviceId} không có feed nào`);
                
                // Thử lấy lại thông tin feed từ bảng feed
                try {
                    const feeds = await prisma.feed.findMany({
                        where: { deviceId: parseInt(deviceId) }
                    });
                    
                    if (feeds && feeds.length > 0) {
                        console.log(`✅ Đã tìm thấy ${feeds.length} feed từ bảng feed`);
                        device.feed = feeds;
                    } else {
                        console.error(`❌ Không tìm thấy feed nào cho thiết bị ${deviceId} trong bảng feed`);
                        return false;
                    }
                } catch (feedError) {
                    console.error(`❌ Lỗi khi lấy danh sách feed:`, feedError);
                    return false;
                }
            }

            // Tìm feed tương ứng với loại thiết bị
            let targetFeed = null;
            
            if (normalizedDeviceType === 'pump') {
                // Tìm feed điều khiển máy bơm
                targetFeed = device.feed.find(feed => 
                    feed.feedKey.toLowerCase().includes('pump') || 
                    feed.feedKey.toLowerCase().includes('bom') ||
                    feed.name?.toLowerCase().includes('pump') ||
                    feed.name?.toLowerCase().includes('bom')
                );
                console.log(`🔍 MQTT - Tìm feed máy bơm: ${targetFeed ? `Đã tìm thấy (${targetFeed.feedKey})` : 'Không tìm thấy'}`);
            } else if (normalizedDeviceType === 'light') {
                // Tìm feed điều khiển đèn
                targetFeed = device.feed.find(feed => 
                    feed.feedKey.toLowerCase().includes('light') || 
                    feed.feedKey.toLowerCase().includes('den') || 
                    feed.feedKey.toLowerCase().includes('led') ||
                    feed.name?.toLowerCase().includes('light') ||
                    feed.name?.toLowerCase().includes('den') ||
                    feed.name?.toLowerCase().includes('led')
                );
                console.log(`🔍 MQTT - Tìm feed đèn: ${targetFeed ? `Đã tìm thấy (${targetFeed.feedKey})` : 'Không tìm thấy'}`);
            }

            // Nếu không tìm thấy feed tương ứng, sử dụng feed đầu tiên
                if (!targetFeed && device.feed.length > 0) {
                    targetFeed = device.feed[0];
                console.log(`⚠️ MQTT - Không tìm thấy feed phù hợp cho ${normalizedDeviceType}, sử dụng feed đầu tiên: ${targetFeed.feedKey}`);
            }

            if (!targetFeed) {
                console.warn(`⚠️ Không tìm thấy feed cho thiết bị ${deviceId} và loại ${normalizedDeviceType}`);
                return false;
            }

            // Xác định feed key và giá trị dựa trên loại thiết bị
            let feedKey = targetFeed.feedKey;
            let value = '';
            
            if (normalizedDeviceType === 'pump') {
                // Tạo giá trị cho máy bơm
                if (command.status === 'On') {
                    // Sử dụng giá trị speed từ lệnh, giữ nguyên giá trị
                    const speed = command.speed || command.value ;
                    value = `${speed}`;
                    console.log(`📤 Gửi giá trị "${value}" cho máy bơm - CHÍNH XÁC THEO LỆNH`);
                } else {
                    // Định dạng Off:0 khi tắt
                    value = '0';
                }
                console.log(`📤 Gửi giá trị "${value}" cho máy bơm`);
            } else if (normalizedDeviceType === 'light') {
                // Gửi giá trị 1/0 cho đèn thay vì On/Off
                value = command.status === 'On' ? '1' : '0';
                console.log(`📤 Gửi giá trị "${value}" cho đèn (button light chỉ nhận 1/0)`);
            } else {
                console.warn(`⚠️ Loại thiết bị không hợp lệ: ${normalizedDeviceType}`);
                return false;
            }
            
            // Gửi lệnh qua MQTT
            const result = await this.publishToMQTT(deviceId, feedKey, value);
            
            if (result) {
                console.log(`✅ Đã gửi lệnh điều khiển ${normalizedDeviceType} thành công đến thiết bị ${device.deviceCode}`);
                
                // Cập nhật trạng thái thiết bị trong database
                
                // Lưu thêm dữ liệu vào bảng tương ứng
                try {
                    if (normalizedDeviceType === 'pump') {
                    await prisma.pumpwaterdata.create({
                        data: {
                            status: command.status,
                            pumpSpeed: command.status === 'On' ? (command.speed || command.value ) : 0,
                            deviceId: parseInt(deviceId)
                        }
                    });
                        console.log(`✅ Đã lưu dữ liệu máy bơm vào database với tốc độ ${command.status === 'On' ? (command.speed || command.value ) : 0}`);
                    } else if (normalizedDeviceType === 'light') {
                    await prisma.lightdata.create({
                        data: {
                            status: command.status === 'On' ? 'On' : 'Off',
                            intensity: command.status === 'On' ? 100 : 0,
                            deviceId: parseInt(deviceId)
                        }
                    });
                        console.log(`✅ Đã lưu dữ liệu đèn vào database`);
                    }
                } catch (dbError) {
                    console.error(`⚠️ Lỗi lưu dữ liệu vào database (không ảnh hưởng đến điều khiển):`, dbError);
                }
                
                return true;
            } else {
                console.error(`❌ Lỗi gửi lệnh điều khiển ${normalizedDeviceType} đến thiết bị ${device.deviceCode}`);
                return false;
            }
        } catch (error) {
            console.error(`❌ Lỗi gửi lệnh điều khiển đến thiết bị ${deviceId}:`, error);
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