const express = require('express');
const router = express.Router();
const deviceConfigController = require('../controllers/deviceConfig.controller');
const authMiddleware = require('../middleware/auth.middleware');

// Áp dụng middleware xác thực cho tất cả các routes
router.use(authMiddleware);

// Get device configuration
router.get('/:deviceId', deviceConfigController.getDeviceConfig);

// Update device configuration
router.put('/:deviceId', deviceConfigController.updateDeviceConfig);

module.exports = router; 