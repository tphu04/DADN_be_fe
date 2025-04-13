const prisma = require('../../config/database');

// Get admin profile
const getAdminProfile = async (req, res) => {
    try {
        const adminId = req.user.id;
        console.log(`Fetching admin profile for ID: ${adminId}, userType: ${req.user.userType}`);
        
        // Check if the user is an admin
        if (!req.user.isAdmin || req.user.userType !== 'admin') {
            console.log('Unauthorized attempt to access admin profile:', req.user);
            return res.status(403).json({
                success: false,
                message: 'Only admins can access this endpoint'
            });
        }
        
        // Get admin details from Admin table
        const admin = await prisma.admin.findUnique({
            where: { id: adminId }
        });
        
        if (!admin) {
            console.log(`Admin ID ${adminId} not found in Admin table`);
            return res.status(404).json({
                success: false,
                message: 'Admin not found'
            });
        }
        
        console.log(`Admin profile found for ${admin.username}`);
        
        // Return admin details (exclude password)
        const { password, ...adminData } = admin;
        
        return res.status(200).json({
            success: true,
            data: {
                ...adminData,
                userType: 'admin'
            }
        });
    } catch (error) {
        console.error('Error getting admin profile:', error);
        return res.status(500).json({
            success: false,
            message: 'Error retrieving admin profile',
            error: error.message
        });
    }
};

// Get all users for admin dashboard
const getUsersForAdmin = async (req, res) => {
    try {
        console.log(`Admin ${req.user.id} requesting user list`);
        
        // Check if user is actually an admin
        if (!req.user.isAdmin || req.user.userType !== 'admin') {
            console.log('Unauthorized attempt to access admin functions');
            return res.status(403).json({
                success: false,
                message: 'Only admins can access this endpoint'
            });
        }
        
        // Get basic user data that we know exists
        const users = await prisma.user.findMany({
            select: {
                id: true,
                fullname: true,
                username: true,
                email: true,
                phone: true,
                address: true,
                createdAt: true,
                _count: {
                    select: {
                        configuration: true
                    }
                }
            }
        });
        
        // If there are no users, return empty array
        if (!users || users.length === 0) {
            return res.status(200).json({
                success: true,
                data: []
            });
        }
        
        // Add default extended fields to all users
        const usersWithExtendedData = users.map(user => ({
            ...user,
            role: 'USER',
            isAccepted: false
        }));
        
        return res.status(200).json({
            success: true,
            data: usersWithExtendedData
        });
    } catch (error) {
        console.error('Error getting users for admin:', error);
        return res.status(500).json({
            success: false,
            message: 'Error retrieving users',
            error: error.message
        });
    }
};

// Get system statistics for admin dashboard
const getSystemStats = async (req, res) => {
    try {
        // Get counts for different entities
        const userCount = await prisma.user.count();
        const deviceCount = await prisma.iotdevice.count();
        const activeDeviceCount = await prisma.iotdevice.count({
            where: { status: 'On' }
        });
        
        // Get recent notifications
        const recentNotifications = await prisma.notification.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' }
        });
        
        return res.status(200).json({
            success: true,
            data: {
                userCount,
                deviceCount,
                activeDeviceCount,
                recentNotifications
            }
        });
    } catch (error) {
        console.error('Error getting system stats:', error);
        return res.status(500).json({
            success: false,
            message: 'Error retrieving system statistics',
            error: error.message
        });
    }
};

/**
 * Get all devices for admin
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const getAllDevices = async (req, res) => {
    try {
        const devices = await prisma.iotdevice.findMany({
            include: {
                feed: true
            }
        });

        return res.status(200).json({
            success: true,
            data: devices
        });
    } catch (error) {
        console.error('Error fetching all devices:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error while fetching devices',
            error: error.message
        });
    }
};

/**
 * Create a new device
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const createDevice = async (req, res) => {
    try {
        const { deviceCode, deviceName, deviceType } = req.body;

        // Validate input
        if (!deviceCode || !deviceType) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        // Check if device code already exists
        const existingDevice = await prisma.iotdevice.findFirst({
            where: { deviceCode }
        });

        if (existingDevice) {
            return res.status(400).json({
                success: false,
                message: 'Device code already exists'
            });
        }

        // Create the device
        const newDevice = await prisma.iotdevice.create({
            data: {
                deviceCode,
                deviceName: deviceName || deviceCode,
                deviceType,
                status: 'Off',
                isOnline: false
            }
        });

        return res.status(201).json({
            success: true,
            data: newDevice,
            message: 'Device created successfully'
        });
    } catch (error) {
        console.error('Error creating device:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error while creating device'
        });
    }
};

/**
 * Update a device
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const updateDevice = async (req, res) => {
    try {
        const { id } = req.params;
        const { deviceName, deviceType } = req.body;

        // Check if device exists
        const device = await prisma.iotdevice.findUnique({
            where: { id: parseInt(id) }
        });

        if (!device) {
            return res.status(404).json({
                success: false,
                message: 'Device not found'
            });
        }

        // Update the device
        const updatedDevice = await prisma.iotdevice.update({
            where: { id: parseInt(id) },
            data: {
                deviceName: deviceName !== undefined ? deviceName : device.deviceName,
                deviceType: deviceType !== undefined ? deviceType : device.deviceType
            }
        });

        return res.status(200).json({
            success: true,
            data: updatedDevice,
            message: 'Device updated successfully'
        });
    } catch (error) {
        console.error('Error updating device:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error while updating device'
        });
    }
};

/**
 * Delete a device
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const deleteDevice = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if device exists
        const device = await prisma.iotdevice.findUnique({
            where: { id: parseInt(id) }
        });

        if (!device) {
            return res.status(404).json({
                success: false,
                message: 'Device not found'
            });
        }

        // Delete related feeds first
        await prisma.feed.deleteMany({
            where: { deviceId: parseInt(id) }
        });

        // Delete the device
        await prisma.iotdevice.delete({
            where: { id: parseInt(id) }
        });

        return res.status(200).json({
            success: true,
            message: 'Device deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting device:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error while deleting device'
        });
    }
};

/**
 * Update MQTT credentials for a user
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
const updateMQTTCredentials = async (req, res) => {
    try {
        const { userId } = req.params;
        const { mqttUsername, mqttApiKey } = req.body;

        // Validate input
        if (!mqttUsername || !mqttApiKey) {
            return res.status(400).json({
                success: false,
                message: 'Missing MQTT credentials'
            });
        }

        // Check if user exists
        const user = await prisma.user.findUnique({
            where: { id: parseInt(userId) }
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Update the device MQTT credentials for all user's devices
        const userDevices = await prisma.iotdevice.findMany({
            where: { 
                configuration: {
                    some: {
                        userId: parseInt(userId)
                    }
                }
            }
        });

        if (userDevices && userDevices.length > 0) {
            for (const device of userDevices) {
                await prisma.iotdevice.update({
                    where: { id: device.id },
                    data: {
                        mqttUsername,
                        mqttApiKey
                    }
                });
            }
        }

        return res.status(200).json({
            success: true,
            message: 'MQTT credentials updated successfully for user devices'
        });
    } catch (error) {
        console.error('Error updating MQTT credentials:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error while updating MQTT credentials',
            error: error.message
        });
    }
};

module.exports = {
    getAdminProfile,
    getUsersForAdmin,
    getSystemStats,
    getAllDevices,
    createDevice,
    updateDevice,
    deleteDevice,
    updateMQTTCredentials
};
