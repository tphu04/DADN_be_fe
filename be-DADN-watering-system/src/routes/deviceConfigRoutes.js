const express = require('express');
const router = express.Router();
const deviceConfigController = require('../controllers/deviceConfigController');
const { verifyToken } = require('../middleware/authMiddleware');

// Áp dụng middleware xác thực cho tất cả các routes
router.use(verifyToken);

// API lấy cấu hình mặc định
router.get('/default', deviceConfigController.getDefaultConfig);

// API lấy cấu hình hiện tại của người dùng
router.get('/current', deviceConfigController.getCurrentConfig);

// API lưu cấu hình mới
router.post('/save', (req, res) => {
  console.log('DEBUG - Route POST /save được gọi');
  console.log('DEBUG - Body request:', JSON.stringify(req.body));
  
  // Gọi trực tiếp hàm lưu cấu hình
  deviceConfigController.saveConfiguration(req, res);
});

// Lấy lịch sử cấu hình
router.get('/history', deviceConfigController.getConfigHistory);

// Các route sau được giữ lại để tương thích ngược với các phiên bản trước
router.get('/:id', deviceConfigController.getCurrentConfig);
router.get('/:id/history', deviceConfigController.getConfigHistory);

// Route cũ để tương thích ngược, sẽ chuyển hướng đến saveConfiguration
router.put('/:id', (req, res) => {
  console.log('DEBUG - Route PUT /:id được gọi (tương thích ngược)');
  console.log('DEBUG - Body request:', JSON.stringify(req.body));
  
  // Chuyển hướng đến hàm lưu cấu hình
  deviceConfigController.saveConfiguration(req, res);
});

router.post('/batch-update', (req, res) => {
  console.log('DEBUG - Route POST /batch-update được gọi (tương thích ngược)');
  console.log('DEBUG - Body request:', JSON.stringify(req.body));
  
  // Chuyển hướng đến hàm lưu cấu hình
  deviceConfigController.saveConfiguration(req, res);
});

module.exports = router; 