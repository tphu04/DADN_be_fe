const jwt = require('jsonwebtoken');
const { decodeJWT } = require('../controllers/auth/authService');

// Middleware để xác thực JWT token
const authenticateToken = async (req, res, next) => {
    try {
        // Lấy header Authorization
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Access denied. No token provided.'
            });
        }

        // Lấy token từ header
        const token = authHeader.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access denied. No token provided.'
            });
        }

        try {
            // Xác thực token
            const decoded = await decodeJWT(token);
            
            // Thêm thông tin người dùng vào request
            req.user = decoded;
            
            next();
        } catch (error) {
            return res.status(401).json({
                success: false,
                message: 'Invalid token.'
            });
        }
    } catch (error) {
        console.error('Authentication error:', error);
        return res.status(500).json({
            success: false,
            message: 'An error occurred during authentication.'
        });
    }
};

module.exports = {
    authenticateToken
}; 