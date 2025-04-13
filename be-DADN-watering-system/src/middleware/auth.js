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

// Middleware to authorize admins
const authorizeAdmin = async (req, res, next) => {
    try {
        // This middleware should be used after authenticateToken
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required before authorization'
            });
        }

        // Check if user is an admin based on both isAdmin flag and userType
        if (req.user.isAdmin && req.user.userType === 'admin') {
            return next(); // Admin is allowed to proceed
        }

        // Not authorized
        return res.status(403).json({
            success: false,
            message: 'Access denied. Admin privileges required.'
        });
    } catch (error) {
        console.error('Admin authorization error:', error);
        return res.status(500).json({
            success: false,
            message: 'An error occurred during authorization.'
        });
    }
};

module.exports = {
    authenticateToken,
    authorizeAdmin
}; 