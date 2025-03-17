const mqtt = require('mqtt');
const prisma = require('../../config/database');

class MQTTService {
    constructor() {
        this.deviceConnections = new Map();
    }

    /**
     * Kết nối thiết bị với MQTT broker
     * @param {Object} device - Đối tượng thiết bị từ database
     */
    async connectDevice(device) {
        try {
            // Nếu thiết bị đã kết nối, ngắt kết nối trước
            if (this.deviceConnections.has(device.id)) {
                await this.disconnectDevice(device.id);
            }

            // Nếu thiết bị không hoạt động, không kết nối MQTT
            if (device.status === 'Off') {
                console.log(`Thiết bị ${device.deviceCode} đang tắt, không kết nối MQTT`);
                return false;
            }

            // Cấu hình MQTT
            const mqttConfig = {
                host: 'io.adafruit.com',
                port: 1883,
                protocol: 'mqtt',
                username: device.mqttUsername || process.env.MQTT_USERNAME,
                password: device.mqttApiKey || process.env.MQTT_API_KEY,
                keepalive: 60,
                reconnectPeriod: 5000
            };

            console.log(`Đang kết nối MQTT cho thiết bị ${device.deviceCode}`);
            const client = mqtt.connect(`${mqttConfig.protocol}://${mqttConfig.host}`, mqttConfig);

            client.on('connect', async () => {
                console.log(`Đã kết nối MQTT cho thiết bị ${device.deviceCode}`);
                
                // Cập nhật trạng thái thiết bị thành On trong database
                await prisma.ioTDevice.update({
                    where: { id: device.id },
                    data: { 
                        status: 'On',
                        isOnline: true,
                        lastSeen: new Date(),
                        lastSeenAt: new Date()
                    }
                });
                
                // Subscribe vào topics dựa theo feeds hoặc loại thiết bị
                if (device.feeds && device.feeds.length > 0) {
                    // Nếu có danh sách feeds, đăng ký theo từng feed
                    for (const feed of device.feeds) {
                        const topic = `${mqttConfig.username}/feeds/${feed.feedKey}`;
                        client.subscribe(topic, (err) => {
                            if (err) {
                                console.error(`Lỗi đăng ký topic ${topic}:`, err);
                            } else {
                                console.log(`Đã đăng ký topic ${topic}`);
                            }
                        });
                    }
                } else {
                    // Đăng ký dựa trên loại thiết bị nếu không có feeds
                    if (device.deviceType === 'temperature_humidity') {
                        client.subscribe(`${mqttConfig.username}/feeds/dht20-nhietdo`);
                        client.subscribe(`${mqttConfig.username}/feeds/dht20-doam`);
                        console.log(`Đã đăng ký feeds nhiệt độ và độ ẩm`);
                    } else if (device.deviceType === 'soil_moisture') {
                        client.subscribe(`${mqttConfig.username}/feeds/doamdat`);
                        console.log(`Đã đăng ký feed độ ẩm đất`);
                    } else if (device.deviceType === 'pump_water') {
                        // Có thể đăng ký feed cho máy bơm nếu cần
                        client.subscribe(`${mqttConfig.username}/feeds/pump-control`);
                        console.log(`Đã đăng ký feed điều khiển máy bơm`);
                    }
                }
            });

            client.on('message', async (topic, message) => {
                console.log(`Nhận tin nhắn từ topic ${topic}: ${message.toString()}`);
                try {
                    const value = parseFloat(message.toString());
                    if (isNaN(value)) {
                        console.error(`Nhận được giá trị không hợp lệ từ topic ${topic}: ${message.toString()}`);
                        return;
                    }

                    const feedKey = topic.split('/').pop();
                    
                    // Cập nhật last seen time
                    await prisma.ioTDevice.update({
                        where: { id: device.id },
                        data: { 
                            status: 'On',
                            lastSeenAt: new Date(),
                            lastSeen: new Date(),
                            isOnline: true
                        }
                    });

                    // Xử lý dữ liệu theo feed key và loại thiết bị
                    if (device.feeds && device.feeds.length > 0) {
                        // Tìm feed tương ứng
                        const feed = device.feeds.find(f => f.feedKey === feedKey);
                        if (feed) {
                            // Kiểm tra giá trị có nằm trong khoảng cho phép không
                            const isAbnormal = (feed.minValue != null && value < feed.minValue) ||
                                              (feed.maxValue != null && value > feed.maxValue);
                            
                            // Cập nhật giá trị cuối cùng của feed
                            await prisma.feed.update({
                                where: { id: feed.id },
                                data: { lastValue: value }
                            });
                            
                            // Lưu dữ liệu cảm biến
                            await prisma.sensorData.create({
                                data: {
                                    value,
                                    deviceId: device.id,
                                    feedId: feed.id,
                                    isAbnormal
                                }
                            });
                            
                            console.log(`Đã lưu dữ liệu: ${device.deviceCode}, Feed: ${feed.name}, Value: ${value}`);
                        }
                    }

                    // Lưu dữ liệu vào các bảng tương ứng dựa trên loại thiết bị và feed key
                    if (device.deviceType === 'temperature_humidity') {
                        if (feedKey === 'dht20-nhietdo') {
                            // Lưu dữ liệu nhiệt độ
                            await prisma.temperatureHumidityData.create({
                                data: {
                                    temperature: value,
                                    humidity: 0, // Sẽ được cập nhật khi có dữ liệu độ ẩm
                                    deviceId: device.id
                                }
                            });
                            console.log(`Đã lưu dữ liệu nhiệt độ: ${value}°C`);
                        } else if (feedKey === 'dht20-doam') {
                            // Tìm và cập nhật bản ghi nhiệt độ gần nhất
                            const latestData = await prisma.temperatureHumidityData.findFirst({
                                where: { deviceId: device.id },
                                orderBy: { readingTime: 'desc' }
                            });

                            if (latestData) {
                                await prisma.temperatureHumidityData.update({
                                    where: { id: latestData.id },
                                    data: { humidity: value }
                                });
                            } else {
                                await prisma.temperatureHumidityData.create({
                                    data: {
                                        temperature: 0,
                                        humidity: value,
                                        deviceId: device.id
                                    }
                                });
                            }
                            console.log(`Đã lưu dữ liệu độ ẩm: ${value}%`);
                        }
                    } else if (device.deviceType === 'soil_moisture' && feedKey === 'doamdat') {
                        // Lưu dữ liệu độ ẩm đất
                        await prisma.soilMoistureData.create({
                            data: {
                                moistureValue: value,
                                deviceId: device.id
                            }
                        });
                        console.log(`Đã lưu dữ liệu độ ẩm đất: ${value}%`);
                    } else if (device.deviceType === 'pump_water' && feedKey === 'pump-control') {
                        // Lưu dữ liệu máy bơm
                        await prisma.pumpWaterData.create({
                            data: {
                                status: value > 0 ? 'on' : 'off',
                                pumpSpeed: Math.round(value),
                                deviceId: device.id
                            }
                        });
                        console.log(`Đã lưu dữ liệu máy bơm: ${value}`);
                    }

                    // Tạo log data nếu có ID thông báo
                    try {
                        // Lấy thông báo đầu tiên từ database
                        const notification = await prisma.notification.findFirst();
                        if (notification) {
                            await prisma.logData.create({
                                data: {
                                    value: `Received ${value} from ${topic}`,
                                    deviceId: device.id,
                                    notificationId: notification.id
                                }
                            });
                        }
                    } catch (logError) {
                        console.error('Lỗi khi tạo log data:', logError);
                    }

                } catch (error) {
                    console.error('Lỗi xử lý tin nhắn MQTT:', error);
                }
            });

            client.on('error', (error) => {
                console.error(`Lỗi MQTT cho thiết bị ${device.deviceCode}:`, error);
            });

            client.on('offline', async () => {
                console.log(`Thiết bị ${device.deviceCode} offline`);
                await this.updateDeviceStatus(device.id, false);
            });

            client.on('close', async () => {
                console.log(`Kết nối MQTT đã đóng cho thiết bị ${device.deviceCode}`);
                await this.updateDeviceStatus(device.id, false);
            });

            // Lưu kết nối vào Map
            this.deviceConnections.set(device.id, client);
            return true;
        } catch (error) {
            console.error(`Lỗi kết nối thiết bị ${device.deviceCode}:`, error);
            return false;
        }
    }

    /**
     * Cập nhật trạng thái thiết bị trong database
     */
    async updateDeviceStatus(deviceId, isOnline) {
        try {
            await prisma.ioTDevice.update({
                where: { id: deviceId },
                data: {
                    isOnline,
                    status: isOnline ? 'On' : 'Off',
                    lastSeen: isOnline ? new Date() : undefined
                }
            });
        } catch (error) {
            console.error('Lỗi cập nhật trạng thái thiết bị:', error);
        }
    }

    /**
     * Ngắt kết nối MQTT cho thiết bị
     */
    async disconnectDevice(deviceId) {
        const client = this.deviceConnections.get(deviceId);
        if (client) {
            client.end();
            this.deviceConnections.delete(deviceId);
            await this.updateDeviceStatus(deviceId, false);
            console.log(`Đã ngắt kết nối MQTT cho thiết bị ID: ${deviceId}`);
            return true;
        }
        return false;
    }

    /**
     * Kết nối lại thiết bị
     */
    async reconnectDevice(deviceId) {
        try {
            // Lấy thông tin thiết bị từ database
            const device = await prisma.ioTDevice.findUnique({
                where: { id: deviceId },
                include: { feeds: true }
            });

            if (device) {
                // Ngắt kết nối cũ nếu có
                await this.disconnectDevice(deviceId);
                // Kết nối lại
                return await this.connectDevice(device);
            }
            return false;
        } catch (error) {
            console.error(`Lỗi kết nối lại thiết bị ID ${deviceId}:`, error);
            return false;
        }
    }

    /**
     * Kiểm tra thiết bị hoạt động định kỳ
     */
    async checkDevicesActivity() {
        try {
            const inactiveThreshold = new Date();
            inactiveThreshold.setMinutes(inactiveThreshold.getMinutes() - 5); // 5 phút
            
            // Tìm các thiết bị không gửi dữ liệu trong 5 phút
            const inactiveDevices = await prisma.ioTDevice.findMany({
                where: {
                    status: 'On',
                    OR: [
                        { lastSeenAt: { lt: inactiveThreshold } },
                        { lastSeenAt: null }
                    ]
                }
            });
            
            // Đánh dấu thiết bị không hoạt động
            for (const device of inactiveDevices) {
                await prisma.ioTDevice.update({
                    where: { id: device.id },
                    data: { 
                        status: 'Off',
                        isOnline: false
                    }
                });
                console.log(`Thiết bị ${device.deviceCode} không phản hồi, đã chuyển thành không hoạt động`);
                
                // Ngắt kết nối MQTT nếu vẫn còn kết nối
                if (this.deviceConnections.has(device.id)) {
                    await this.disconnectDevice(device.id);
                }
            }
            
            if (inactiveDevices.length > 0) {
                console.log(`Đã cập nhật ${inactiveDevices.length} thiết bị không hoạt động`);
            }
        } catch (error) {
            console.error('Lỗi kiểm tra hoạt động thiết bị:', error);
        }
    }

    /**
     * Xuất bản tin nhắn đến topic MQTT
     */
    async publishMessage(deviceId, feedKey, value) {
        try {
            const device = await prisma.ioTDevice.findUnique({
                where: { id: deviceId }
            });
            
            if (!device) {
                throw new Error(`Không tìm thấy thiết bị với ID ${deviceId}`);
            }
            
            const client = this.deviceConnections.get(deviceId);
            if (!client) {
                throw new Error(`Không có kết nối MQTT cho thiết bị ID ${deviceId}`);
            }
            
            const username = device.mqttUsername || process.env.MQTT_USERNAME;
            const topic = `${username}/feeds/${feedKey}`;
            
            return new Promise((resolve, reject) => {
                client.publish(topic, value.toString(), { qos: 1 }, (error) => {
                    if (error) {
                        reject(error);
                    } else {
                        console.log(`Đã xuất bản tin nhắn đến ${topic}: ${value}`);
                        resolve(true);
                    }
                });
            });
        } catch (error) {
            console.error('Lỗi xuất bản tin nhắn MQTT:', error);
            throw error;
        }
    }
}

// Tạo và xuất instance duy nhất
const mqttService = new MQTTService();
module.exports = mqttService; 