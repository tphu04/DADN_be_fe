const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: API để quản lý thông báo
 */

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Lấy danh sách thông báo
 *     tags: [Notifications]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Số lượng thông báo trả về
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Số trang
 *     responses:
 *       200:
 *         description: Danh sách thông báo
 *       500:
 *         description: Lỗi server
 */
router.get('/', notificationController.getNotifications);

/**
 * @swagger
 * /api/notifications/unread:
 *   get:
 *     summary: Lấy số lượng thông báo chưa đọc
 *     tags: [Notifications]
 *     responses:
 *       200:
 *         description: Số lượng thông báo chưa đọc
 *       500:
 *         description: Lỗi server
 */
router.get('/unread', notificationController.getUnreadCount);

/**
 * @swagger
 * /api/notifications/mark-read/{id}:
 *   put:
 *     summary: Đánh dấu thông báo là đã đọc
 *     tags: [Notifications]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID của thông báo
 *     responses:
 *       200:
 *         description: Thông báo đã được đánh dấu là đã đọc
 *       400:
 *         description: ID thông báo không hợp lệ
 *       500:
 *         description: Lỗi server
 */
router.put('/mark-read/:id', notificationController.markAsRead);

/**
 * @swagger
 * /api/notifications/mark-all-read:
 *   put:
 *     summary: Đánh dấu tất cả thông báo là đã đọc
 *     tags: [Notifications]
 *     responses:
 *       200:
 *         description: Tất cả thông báo đã được đánh dấu là đã đọc
 *       500:
 *         description: Lỗi server
 */
router.put('/mark-all-read', notificationController.markAllAsRead);

/**
 * @swagger
 * /api/notifications/test:
 *   post:
 *     summary: Tạo thông báo test
 *     tags: [Notifications]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - deviceId
 *               - message
 *             properties:
 *               deviceId:
 *                 type: integer
 *                 description: ID của thiết bị
 *               message:
 *                 type: string
 *                 description: Nội dung thông báo
 *               type:
 *                 type: string
 *                 description: Loại thông báo
 *                 default: TEST
 *               value:
 *                 type: string
 *                 description: Giá trị liên quan
 *     responses:
 *       201:
 *         description: Thông báo đã được tạo
 *       400:
 *         description: Thông tin không hợp lệ
 *       404:
 *         description: Không tìm thấy thiết bị
 *       500:
 *         description: Lỗi server
 */
router.post('/test', notificationController.createTestNotification);

/**
 * @swagger
 * /api/notifications/{id}:
 *   delete:
 *     summary: Xóa thông báo
 *     tags: [Notifications]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID của thông báo
 *     responses:
 *       200:
 *         description: Thông báo đã được xóa
 *       400:
 *         description: ID thông báo không hợp lệ
 *       500:
 *         description: Lỗi server
 */
router.delete('/:id', notificationController.deleteNotification);

/**
 * @swagger
 * /api/notifications/type/{type}:
 *   get:
 *     summary: Lấy thông báo theo loại
 *     tags: [Notifications]
 *     parameters:
 *       - in: path
 *         name: type
 *         schema:
 *           type: string
 *         required: true
 *         description: Loại thông báo (THRESHOLD, CONNECTION, PUMP, UPDATE, TEST)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Số lượng thông báo trả về
 *     responses:
 *       200:
 *         description: Danh sách thông báo theo loại
 *       400:
 *         description: Loại thông báo không hợp lệ
 *       500:
 *         description: Lỗi server
 */
router.get('/type/:type', notificationController.getNotificationsByType);

module.exports = router;
