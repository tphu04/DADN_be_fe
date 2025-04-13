const express = require('express');
const { authenticateToken, authorizeAdmin } = require('../middleware/auth');
const { 
    getAdminProfile, 
    getUsersForAdmin, 
    getSystemStats,
    getAllDevices,
    createDevice,
    updateDevice,
    deleteDevice,
    updateMQTTCredentials
} = require('../controllers/adminController');

const router = express.Router();

// All routes require authentication and admin authorization
router.use(authenticateToken);
router.use(authorizeAdmin);

// Admin profile
router.get('/profile', getAdminProfile);

// User management
router.get('/users', getUsersForAdmin);

// Device management
router.get('/devices', getAllDevices);
router.post('/devices', createDevice);
router.put('/devices/:id', updateDevice);
router.delete('/devices/:id', deleteDevice);

// MQTT credentials management
router.put('/users/:userId/mqtt', updateMQTTCredentials);

// System statistics
router.get('/stats', getSystemStats);

module.exports = router;
