const express = require('express');
const router = express.Router();
const sensorController = require('../controllers/sensorController');
const { authenticateToken } = require('../middleware/auth');

// Lấy dữ liệu mới nhất từ tất cả các cảm biến
router.get('/latest', authenticateToken, sensorController.getLatestSensorData);

// Lấy dữ liệu lịch sử của một cảm biến cụ thể
router.get('/history/:deviceId', authenticateToken, sensorController.getSensorHistory);

module.exports = router;
