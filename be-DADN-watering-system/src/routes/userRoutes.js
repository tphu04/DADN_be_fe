const express = require('express');
const { authenticateToken, authorizeAdmin } = require('../middleware/auth');
const { 
  getAllUsers, 
  updateUserAccess, 
  getCurrentUser, 
  getAllSystemUsers,
  createUser,
  updateUser,
  deleteUser,
  updateUserProfile
} = require('../controllers/userController');

const router = express.Router();

// Protected routes - Cần xác thực token
router.get('/profile', authenticateToken, getCurrentUser);
// Thêm route cho người dùng cập nhật thông tin cá nhân
router.put('/profile', authenticateToken, updateUserProfile);

// Admin routes - Cần quyền admin
router.get('/', authenticateToken, authorizeAdmin, getAllUsers);
router.get('/all', authenticateToken, authorizeAdmin, getAllSystemUsers);
router.put('/:userId/access', authenticateToken, authorizeAdmin, updateUserAccess);

// Thêm các route cho chức năng CRUD mới của user management
router.post('/', authenticateToken, authorizeAdmin, createUser);
router.put('/:userId', authenticateToken, authorizeAdmin, updateUser);
router.delete('/:userId', authenticateToken, authorizeAdmin, deleteUser);

module.exports = router;
