const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/deviceController');
const { verifyToken } = require('../middleware/authMiddleware');

// Áp dụng middleware xác thực cho tất cả các routes
router.use(verifyToken);

// Lấy danh sách thiết bị của người dùng hiện tại
router.get('/', deviceController.getUserDevices);

// Tạo thiết bị mới
router.post('/', deviceController.createDevice);

// Lấy thông tin chi tiết thiết bị
router.get('/:id', deviceController.getDeviceById);

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

module.exports = router; 