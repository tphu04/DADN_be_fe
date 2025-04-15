const express = require('express');
const router = express.Router();
const automationController = require('../controllers/automationController');
const { verifyToken } = require('../middleware/authMiddleware');

// Lấy trạng thái tự động hóa
router.get('/status', verifyToken, automationController.getAutomationStatus);

// Bật/tắt tự động hóa
router.post('/toggle', verifyToken, automationController.toggleAutomation);

module.exports = router; 