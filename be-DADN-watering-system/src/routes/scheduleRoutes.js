const express = require('express');
const router = express.Router();
const scheduleController = require('../controllers/scheduleController');
const { verifyToken } = require('../middleware/authMiddleware');

// Áp dụng middleware xác thực cho tất cả các routes
router.use(verifyToken);

// Lấy tất cả lịch trình của người dùng
router.get('/', scheduleController.getAllSchedules);

// Lấy lịch trình theo ID
router.get('/:id', scheduleController.getScheduleById);

// Lấy lịch trình theo thiết bị
router.get('/device/:deviceId', scheduleController.getSchedulesByDevice);

// Tạo lịch trình mới
router.post('/', scheduleController.createSchedule);

// Cập nhật lịch trình
router.put('/:id', scheduleController.updateSchedule);

// Xóa lịch trình
router.delete('/:id', scheduleController.deleteSchedule);

// Bật/tắt lịch trình
router.patch('/:id/toggle', scheduleController.toggleSchedule);

module.exports = router;
