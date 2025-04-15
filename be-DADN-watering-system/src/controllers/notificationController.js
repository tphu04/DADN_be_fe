const notificationService = require('../services/notificationService');
const prisma = require('../../config/database');

/**
 * Lấy danh sách notifications mới nhất
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getNotifications = async (req, res) => {
    try {
        // Lấy các tham số phân trang từ query
        const limit = req.query.limit ? parseInt(req.query.limit) : 20;
        const page = req.query.page ? parseInt(req.query.page) : 1;
        const offset = (page - 1) * limit;
        
        // Lấy tổng số thông báo
        const totalCount = await prisma.notification.count();
        
        // Lấy danh sách thông báo
        const notifications = await prisma.notification.findMany({
            take: limit,
            skip: offset,
            orderBy: { createdAt: 'desc' },
            include: {
                iotdevice: {
                    select: {
                        id: true,
                        deviceCode: true,
                        deviceType: true
                    }
                }
            }
        });
        
        return res.status(200).json({
            success: true,
            data: notifications,
            pagination: {
                total: totalCount,
                page,
                limit,
                pages: Math.ceil(totalCount / limit)
            }
        });
    } catch (error) {
        console.error('Lỗi khi lấy danh sách thông báo:', error);
        return res.status(500).json({
            success: false,
            message: 'Đã xảy ra lỗi khi lấy danh sách thông báo',
            error: error.message
        });
    }
};

/**
 * Lấy số lượng thông báo chưa đọc
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getUnreadCount = async (req, res) => {
    try {
        const unreadCount = await notificationService.getUnreadCount();
        
        return res.status(200).json({
            success: true,
            count: unreadCount
        });
    } catch (error) {
        console.error('Lỗi khi lấy số lượng thông báo chưa đọc:', error);
        return res.status(500).json({
            success: false,
            message: 'Đã xảy ra lỗi khi lấy số lượng thông báo chưa đọc',
            error: error.message
        });
    }
};

/**
 * Đánh dấu thông báo là đã đọc
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        
        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'ID thông báo không được cung cấp'
            });
        }
        
        const notification = await notificationService.markAsRead(parseInt(id));
        
        return res.status(200).json({
            success: true,
            data: notification
        });
    } catch (error) {
        console.error(`Lỗi khi đánh dấu thông báo ${req.params.id} là đã đọc:`, error);
        return res.status(500).json({
            success: false,
            message: 'Đã xảy ra lỗi khi đánh dấu thông báo là đã đọc',
            error: error.message
        });
    }
};

/**
 * Đánh dấu tất cả thông báo là đã đọc
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.markAllAsRead = async (req, res) => {
    try {
        const result = await notificationService.markAllAsRead();
        
        return res.status(200).json({
            success: true,
            message: `Đã đánh dấu ${result.count} thông báo là đã đọc`
        });
    } catch (error) {
        console.error('Lỗi khi đánh dấu tất cả thông báo là đã đọc:', error);
        return res.status(500).json({
            success: false,
            message: 'Đã xảy ra lỗi khi đánh dấu tất cả thông báo là đã đọc',
            error: error.message
        });
    }
};

/**
 * Tạo thông báo mới (dùng cho testing)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.createTestNotification = async (req, res) => {
    try {
        const { deviceId, message, type, value } = req.body;
        
        if (!deviceId || !message) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu thông tin bắt buộc (deviceId, message)'
            });
        }
        
        // Lấy thông tin thiết bị
        const device = await prisma.ioTDevice.findUnique({
            where: { id: parseInt(deviceId) }
        });
        
        if (!device) {
            return res.status(404).json({
                success: false,
                message: `Không tìm thấy thiết bị với ID ${deviceId}`
            });
        }
        
        // Tạo thông báo test
        const notification = await notificationService.createTestNotification(
            device,
            message,
            value
        );
        
        return res.status(201).json({
            success: true,
            data: notification
        });
    } catch (error) {
        console.error('Lỗi khi tạo thông báo test:', error);
        return res.status(500).json({
            success: false,
            message: 'Đã xảy ra lỗi khi tạo thông báo test',
            error: error.message
        });
    }
};

/**
 * Xóa thông báo
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.deleteNotification = async (req, res) => {
    try {
        const { id } = req.params;
        
        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'ID thông báo không được cung cấp'
            });
        }
        
        await prisma.notification.delete({
            where: { id: parseInt(id) }
        });
        
        return res.status(200).json({
            success: true,
            message: `Đã xóa thông báo có ID ${id}`
        });
    } catch (error) {
        console.error(`Lỗi khi xóa thông báo ${req.params.id}:`, error);
        return res.status(500).json({
            success: false,
            message: 'Đã xảy ra lỗi khi xóa thông báo',
            error: error.message
        });
    }
};

/**
 * Lấy thông báo theo loại
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getNotificationsByType = async (req, res) => {
    try {
        const { type } = req.params;
        const limit = req.query.limit ? parseInt(req.query.limit) : 20;
        
        if (!type) {
            return res.status(400).json({
                success: false,
                message: 'Loại thông báo không được cung cấp'
            });
        }
        
        const notifications = await prisma.notification.findMany({
            where: { type },
            take: limit,
            orderBy: { timestamp: 'desc' },
            include: {
                iotdevice: {
                    select: {
                        id: true,
                        deviceCode: true,
                        deviceType: true
                    }
                }
            }
        });
        
        return res.status(200).json({
            success: true,
            data: notifications
        });
    } catch (error) {
        console.error(`Lỗi khi lấy thông báo loại ${req.params.type}:`, error);
        return res.status(500).json({
            success: false,
            message: 'Đã xảy ra lỗi khi lấy thông báo theo loại',
            error: error.message
        });
    }
};
