const prisma = require('../../config/database');

/**
 * Service xử lý các thông báo trong hệ thống
 */
class NotificationService {
    constructor() {
        this.io = null; // Đối tượng Socket.IO để gửi thông báo real-time
    }

    /**
     * Thiết lập Socket.IO để gửi thông báo real-time
     * @param {Object} io - Đối tượng Socket.IO
     */
    setSocketIO(io) {
        this.io = io;
        console.log('✅ Đã thiết lập Socket.IO cho Notification Service');
    }

    /**
     * Tạo thông báo mới
     * @param {Object} notification - Thông tin thông báo
     * @returns {Promise<Object>} - Thông báo đã tạo
     */
    async createNotification(notification) {
        try {
            // Tạo thông báo mới trong database
            const newNotification = await prisma.notification.create({
                data: {
                    message: notification.message,
                    type: notification.type,
                    source: notification.source || null,
                    value: notification.value ? String(notification.value) : null,
                    deviceId: notification.deviceId,
                }
            });

            // Gửi thông báo qua Socket.IO nếu đã thiết lập
            if (this.io) {
                this.io.emit('new-notification', newNotification);
            }

            console.log(`📢 Đã tạo thông báo: ${notification.message}`);
            return newNotification;
        } catch (error) {
            console.error('Lỗi khi tạo thông báo:', error);
            throw error;
        }
    }

    /**
     * Tạo thông báo về ngưỡng giá trị
     * @param {Object} device - Thông tin thiết bị
     * @param {Object} feed - Thông tin feed
     * @param {number} value - Giá trị hiện tại
     * @param {boolean} isOverMax - Có vượt quá ngưỡng tối đa không
     * @returns {Promise<Object>} - Thông báo đã tạo
     */
    async createThresholdNotification(device, feed, value, isOverMax) {
        try {
            // Lấy cấu hình mới nhất từ bảng configuration dựa theo updatedAt
            const latestConfig = await prisma.configuration.findFirst({
                orderBy: { updatedAt: 'desc' }
            });

            if (!latestConfig) {
                throw new Error("Không tìm thấy cấu hình hệ thống!");
            }

            // Xác định threshold dựa trên loại feed, chuyển về chữ thường để đảm bảo nhất quán
            let threshold;
            // Chuyển feed.name và feed.feedKey về chữ thường để so sánh không phân biệt hoa thường
            const feedNameLower = feed.name.toLowerCase();
            const feedKeyLower = feed.feedKey ? feed.feedKey.toLowerCase() : '';

            console.log(`🔍 Đang xác định loại của feed: ${feed.name} (${feed.feedKey})`);

            // Kiểm tra xem feed có liên quan đến nhiệt độ không
            if (feedNameLower.includes('temp') || 
                feedNameLower.includes('temperature') || 
                feedNameLower.includes('nhiet') || 
                feedKeyLower.includes('temp') || 
                feedKeyLower.includes('nhiet') || 
                feedKeyLower.includes('nhietdo')) {
                
                console.log(`✅ Xác định feed "${feed.name}" là loại: Nhiệt độ`);
                threshold = isOverMax ? latestConfig.temperatureMax : latestConfig.temperatureMin;
            }
            // Kiểm tra xem feed có liên quan đến độ ẩm không khí không
            else if (feedNameLower.includes('humid') || 
                    feedNameLower.includes('humidity') || 
                    feedNameLower.includes('doam') || 
                    feedKeyLower.includes('humid') || 
                    feedKeyLower.includes('doam') || 
                    !feedNameLower.includes('soil') && (feedNameLower.includes('moisture') || feedKeyLower.includes('moisture'))) {
                
                console.log(`✅ Xác định feed "${feed.name}" là loại: Độ ẩm không khí`);
                threshold = isOverMax ? latestConfig.humidityMax : latestConfig.humidityMin;
            }
            // Kiểm tra xem feed có liên quan đến độ ẩm đất không
            else if (feedNameLower.includes('soil') || 
                    feedNameLower.includes('dat') || 
                    feedKeyLower.includes('soil') || 
                    feedKeyLower.includes('dat') || 
                    feedKeyLower.includes('doamdat') || 
                    (feedNameLower.includes('soil') && feedNameLower.includes('moisture'))) {
                
                console.log(`✅ Xác định feed "${feed.name}" là loại: Độ ẩm đất`);
                threshold = isOverMax ? latestConfig.soilMoistureMax : latestConfig.soilMoistureMin;
            }
            else {
                // Nếu không thể xác định, thử từng loại
                console.log(`⚠️ Không thể xác định loại của feed: ${feed.name} (${feed.feedKey}), đang thử xác định theo các từ khóa`);
                
                // Object mapping cho các loại feed và giá trị cấu hình tương ứng
                const configMap = {
                    'humidity': { max: latestConfig.humidityMax, min: latestConfig.humidityMin, type: 'Độ ẩm không khí' },
                    'temperature': { max: latestConfig.temperatureMax, min: latestConfig.temperatureMin, type: 'Nhiệt độ' },
                    'soil': { max: latestConfig.soilMoistureMax, min: latestConfig.soilMoistureMin, type: 'Độ ẩm đất' },
                    'moisture': { max: latestConfig.soilMoistureMax, min: latestConfig.soilMoistureMin, type: 'Độ ẩm đất' }
                };
                
                // Tìm từ khóa phù hợp trong tên feed hoặc feedKey
                const matchedKey = Object.keys(configMap).find(key => 
                    feedNameLower.includes(key) || 
                    feedKeyLower.includes(key)
                );
                
                if (matchedKey) {
                    console.log(`✅ Xác định feed "${feed.name}" là loại: ${configMap[matchedKey].type} theo từ khóa "${matchedKey}"`);
                    threshold = isOverMax ? configMap[matchedKey].max : configMap[matchedKey].min;
                } else {
                    console.error(`❌ Không thể xác định loại của feed: ${feed.name} (${feed.feedKey})`);
                    throw new Error(`Loại feed không hợp lệ: ${feed.name}`);
                }
            }

            console.log(`🌡️ Ngưỡng đã xác định: ${threshold} (${isOverMax ? 'Tối đa' : 'Tối thiểu'})`);
            const message = `${device.deviceCode}: Giá trị ${feed.name} (${value}) ${isOverMax ? 'vượt quá ngưỡng tối đa' : 'dưới ngưỡng tối thiểu'} (${threshold})`;

            return this.createNotification({
                message,
                type: 'THRESHOLD',
                source: device.deviceCode,
                deviceId: device.id,
                value: String(value)
            });
        } catch (error) {
            console.error('Lỗi khi tạo thông báo ngưỡng:', error);
            throw error;
        }
    }

    /**
     * Tạo thông báo về kết nối thiết bị
     * @param {Object} device - Thông tin thiết bị
     * @param {boolean} isConnected - Thiết bị đã kết nối hay ngắt kết nối
     * @returns {Promise<Object>} - Thông báo đã tạo
     */
    async createConnectionNotification(device, isConnected) {
        const message = `Thiết bị ${device.deviceCode} đã ${isConnected ? 'kết nối thành công' : 'ngắt kết nối'}`;
        
        return this.createNotification({
            message,
            type: 'CONNECTION',
            source: device.deviceCode,
            deviceId: device.id,
            value: isConnected ? 'connected' : 'disconnected'
        });
    }

    /**
     * Tạo thông báo về máy bơm
     * @param {Object} device - Thông tin thiết bị
     * @param {boolean} isOn - Máy bơm đã bật hay tắt
     * @param {number} speed - Tốc độ máy bơm (nếu đang bật)
     * @returns {Promise<Object>} - Thông báo đã tạo
     */
    async createPumpNotification(device, isOn, speed = 0) {
        const message = `Máy bơm ${device.deviceCode} đã được ${isOn ? `BẬT với tốc độ ${speed}%` : 'TẮT'}`;
        
        return this.createNotification({
            message,
            type: 'PUMP',
            source: device.deviceCode,
            deviceId: device.id,
            value: isOn ? String(speed) : '0'
        });
    }

    /**
     * Tạo thông báo cập nhật thiết bị
     * @param {Object} device - Thông tin thiết bị
     * @param {Object} changes - Các thay đổi đã thực hiện
     * @returns {Promise<Object>} - Thông báo đã tạo
     */
    async createUpdateNotification(device, changes) {
        // Tạo chuỗi mô tả các thay đổi
        const changesText = Object.entries(changes)
            .map(([key, value]) => `${key}: ${value}`)
            .join(', ');
        
        const message = `Thiết bị ${device.deviceCode} đã được cập nhật: ${changesText}`;
        
        return this.createNotification({
            message,
            type: 'UPDATE',
            source: device.deviceCode,
            deviceId: device.id,
            value: JSON.stringify(changes)
        });
    }

    /**
     * Tạo thông báo test
     * @param {Object} device - Thông tin thiết bị
     * @param {string} message - Nội dung thông báo
     * @param {string} value - Giá trị tùy chỉnh
     * @returns {Promise<Object>} - Thông báo đã tạo
     */
    async createTestNotification(device, message, value = null) {
        return this.createNotification({
            message,
            type: 'TEST',
            source: device.deviceCode,
            deviceId: device.id,
            value
        });
    }

    /**
     * Tạo thông báo khi người dùng điều chỉnh tốc độ máy bơm
     * @param {Object} device - Thông tin thiết bị
     * @param {number} speed - Tốc độ máy bơm mới
     * @param {string} username - Tên người dùng thực hiện hành động
     * @returns {Promise<Object>} - Thông báo đã tạo
     */
    async createPumpSpeedAdjustmentNotification(device, speed, username = 'Người dùng') {
        const message = `${username} đã điều chỉnh tốc độ máy bơm ${device.deviceCode} thành ${speed}%`;
        
        return this.createNotification({
            message,
            type: 'USER_ACTION',
            source: device.deviceCode,
            deviceId: device.id,
            value: String(speed)
        });
    }

    /**
     * Tạo thông báo khi người dùng bật/tắt đèn
     * @param {Object} device - Thông tin thiết bị
     * @param {boolean} isOn - Trạng thái bật/tắt
     * @param {string} username - Tên người dùng thực hiện hành động
     * @returns {Promise<Object>} - Thông báo đã tạo
     */
    async createLightToggleNotification(device, isOn, username = 'Người dùng') {
        const message = `${username} đã ${isOn ? 'BẬT' : 'TẮT'} đèn ${device.deviceCode}`;
        
        return this.createNotification({
            message,
            type: 'USER_ACTION',
            source: device.deviceCode,
            deviceId: device.id,
            value: isOn ? 'On' : 'Off'
        });
    }

    /**
     * Tạo thông báo khi người dùng lưu cấu hình tự động
     * @param {Object} device - Thông tin thiết bị
     * @param {Object} config - Thông tin cấu hình
     * @param {string} username - Tên người dùng thực hiện hành động
     * @returns {Promise<Object>} - Thông báo đã tạo
     */
    async createAutomationConfigNotification(device, config, username = 'Người dùng') {
        const configType = config.scheduleType || 'unknown';
        let configDetails = '';
        
        if (configType === 'watering') {
            configDetails = `thời gian: ${config.startTime}, thời lượng: ${config.duration} phút, tốc độ: ${config.speed}%`;
        } else if (configType === 'lighting') {
            configDetails = `thời gian bật: ${config.startTime}, thời gian tắt: ${config.endTime}`;
        }
        
        const message = `${username} đã cấu hình tự động ${configType} cho thiết bị ${device.deviceCode} (${configDetails})`;
        
        return this.createNotification({
            message,
            type: 'AUTOMATION',
            source: device.deviceCode,
            deviceId: device.id,
            value: JSON.stringify(config)
        });
    }

    /**
     * Lấy danh sách thông báo mới nhất
     * @param {number} limit - Số lượng thông báo tối đa
     * @returns {Promise<Array>} - Danh sách thông báo
     */
    async getLatestNotifications(limit = 20) {
        try {
            return await prisma.notification.findMany({
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: { iotdevice: true }
            });
        } catch (error) {
            console.error('Lỗi khi lấy danh sách thông báo:', error);
            throw error;
        }
    }
}

// Tạo và xuất instance duy nhất
const notificationService = new NotificationService();
module.exports = notificationService;
