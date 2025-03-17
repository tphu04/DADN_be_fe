const express = require('express');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Protected routes - Cần xác thực token
router.get('/profile', authenticateToken, (req, res) => {
    // Trả về thông tin người dùng từ token đã xác thực
    const user = {
        id: req.user.id,
        username: req.user.username,
        email: req.user.email,
        role: req.user.role
    };
    
    res.status(200).json({
        success: true,
        message: 'User profile retrieved successfully',
        data: user
    });
});

module.exports = router;
