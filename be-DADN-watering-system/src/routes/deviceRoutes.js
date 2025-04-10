const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/deviceController');

// Lấy tất cả thiết bị
router.get('/', deviceController.getAllDevices);

// Lấy một thiết bị cụ thể
router.get('/:id', deviceController.getDevice);

// Tạo thiết bị mới
router.post('/', deviceController.createDevice);

// Cập nhật thiết bị
router.put('/:id', deviceController.updateDevice);

// Xóa thiết bị
router.delete('/:id', deviceController.deleteDevice);

// Lấy dữ liệu nhiệt độ và độ ẩm
router.get('/:id/temperature-humidity', deviceController.getTemperatureHumidityData);

// Lấy dữ liệu độ ẩm đất
router.get('/:id/soil-moisture', deviceController.getSoilMoistureData);

// Lấy dữ liệu máy bơm
router.get('/:id/pump-water', deviceController.getPumpWaterData);

// Lấy dữ liệu đèn
router.get('/:id/light', deviceController.getLightData);

module.exports = router; 