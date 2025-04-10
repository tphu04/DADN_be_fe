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
                    timestamp: new Date()
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
        const threshold = isOverMax ? feed.maxValue : feed.minValue;
        const message = `${device.deviceCode}: Giá trị ${feed.name} (${value}) ${isOverMax ? 'vượt quá ngưỡng tối đa' : 'dưới ngưỡng tối thiểu'} (${threshold})`;
        
        return this.createNotification({
            message,
            type: 'THRESHOLD',
            source: device.deviceCode,
            deviceId: device.id,
            value: String(value)
        });
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
     * Lấy danh sách thông báo mới nhất
     * @param {number} limit - Số lượng thông báo tối đa
     * @returns {Promise<Array>} - Danh sách thông báo
     */
    async getLatestNotifications(limit = 20) {
        try {
            return await prisma.notification.findMany({
                take: limit,
                orderBy: { timestamp: 'desc' },
                include: { device: true }
            });
        } catch (error) {
            console.error('Lỗi khi lấy danh sách thông báo:', error);
            throw error;
        }
    }

    /**
     * Đánh dấu thông báo là đã đọc
     * @param {number} id - ID của thông báo
     * @returns {Promise<Object>} - Thông báo đã cập nhật
     */
    async markAsRead(id) {
        try {
            return await prisma.notification.update({
                where: { id },
                data: { isRead: true }
            });
        } catch (error) {
            console.error(`Lỗi khi đánh dấu thông báo ${id} là đã đọc:`, error);
            throw error;
        }
    }

    /**
     * Đánh dấu tất cả thông báo là đã đọc
     * @returns {Promise<Object>} - Số lượng thông báo đã cập nhật
     */
    async markAllAsRead() {
        try {
            return await prisma.notification.updateMany({
                where: { isRead: false },
                data: { isRead: true }
            });
        } catch (error) {
            console.error('Lỗi khi đánh dấu tất cả thông báo là đã đọc:', error);
            throw error;
        }
    }

    /**
     * Lấy số lượng thông báo chưa đọc
     * @returns {Promise<number>} - Số lượng thông báo chưa đọc
     */
    async getUnreadCount() {
        try {
            return await prisma.notification.count({
                where: { isRead: false }
            });
        } catch (error) {
            console.error('Lỗi khi lấy số lượng thông báo chưa đọc:', error);
            throw error;
        }
    }
}

// Tạo và xuất instance duy nhất
const notificationService = new NotificationService();
module.exports = notificationService;
