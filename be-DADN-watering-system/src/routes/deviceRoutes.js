const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/deviceController');
const { verifyToken, authenticate } = require('../middleware/authMiddleware');

// Áp dụng middleware verifyToken cho tất cả các routes
router.use(verifyToken);

// Lấy danh sách thiết bị
router.get('/', deviceController.getAllDevices);

// Lấy thông tin chi tiết của một thiết bị
router.get('/:id', deviceController.getDeviceById);

// Tạo thiết bị mới
router.post('/', deviceController.createDevice);

// Cập nhật thông tin thiết bị
router.put('/:id', deviceController.updateDevice);

// Xóa thiết bị
router.delete('/:id', deviceController.deleteDevice);

// Điều khiển thiết bị
router.post('/:id/control', deviceController.controlDevice);

// Lấy dữ liệu lịch sử của thiết bị
router.get('/:id/data', deviceController.getDeviceData);

// Lấy dữ liệu nhiệt độ và độ ẩm
router.get('/:id/temperature-humidity', deviceController.getTemperatureHumidityData);

// Lấy dữ liệu độ ẩm đất
router.get('/:id/soil-moisture', deviceController.getSoilMoistureData);

// Lấy dữ liệu máy bơm
router.get('/:id/pump-water', deviceController.getPumpWaterData);

// Lấy dữ liệu đèn
router.get('/:id/light', deviceController.getLightData);

// Add activation endpoint
router.post('/:id/activate', deviceController.activateDevice);

// Lấy cấu hình thiết bị
router.get('/:id/configuration', deviceController.getDeviceConfiguration);

module.exports = router; 