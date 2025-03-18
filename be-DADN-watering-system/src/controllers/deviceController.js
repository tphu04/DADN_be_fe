const Device = require('../models/device');
const SensorData = require('../models/sensorData');
const prisma = require('../../config/database');

const deviceController = {
    // Lấy tất cả thiết bị
    async getAllDevices(req, res) {
        try {
            const devices = await Device.findAll();
            res.json(devices);
        } catch (error) {
            console.error('Error getting devices:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    },

    // Lấy thông tin một thiết bị
    async getDevice(req, res) {
        try {
            const device = await Device.findById(req.params.id);
            if (!device) {
                return res.status(404).json({ error: 'Device not found' });
            }
            res.json(device);
        } catch (error) {
            console.error('Error getting device:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    },

    // Tạo thiết bị mới
    async createDevice(req, res) {
        try {
            const deviceData = req.body;
            const device = await Device.create(deviceData);
            res.status(201).json(device);
        } catch (error) {
            console.error('Error creating device:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    },

    // Cập nhật thiết bị
    async updateDevice(req, res) {
        try {
            const deviceData = req.body;
            const device = await Device.update(req.params.id, deviceData);
            res.json(device);
        } catch (error) {
            console.error('Error updating device:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    },

    // Xóa thiết bị
    async deleteDevice(req, res) {
        try {
            await Device.delete(req.params.id);
            res.status(204).send();
        } catch (error) {
            console.error('Error deleting device:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    },

    // Lấy dữ liệu nhiệt độ và độ ẩm của thiết bị
    async getTemperatureHumidityData(req, res) {
        try {
            const { id } = req.params;
            const { limit = 100 } = req.query;

            // Kiểm tra id có tồn tại không
            if (!id) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Device ID is required' 
                });
            }

            console.log('Fetching temperature data for device ID:', id);

            // Xác minh thiết bị tồn tại và thuộc về người dùng
            const device = await Device.findById(id);
            if (!device) {
                return res.status(404).json({ success: false, message: 'Device not found' });
            }

            // Kiểm tra trạng thái hoạt động của thiết bị
            const isDeviceActive = device.status === 'On' || device.status === 'active';
            console.log(`Device status: ${device.status}, isActive: ${isDeviceActive}`);

            // Lấy dữ liệu theo loại thiết bị
            let data = [];
            
            if (isDeviceActive && device.deviceType === 'temperature_humidity') {
                data = await prisma.temperatureHumidityData.findMany({
                    where: { deviceId: parseInt(id) },
                    orderBy: { readingTime: 'desc' },
                    take: parseInt(limit)
                });
            }
            
            // Nếu không có dữ liệu, trả về mảng rỗng
            if (!data || data.length === 0) {
                console.log('No temperature/humidity data found, returning empty array');
                data = [];
            }

            return res.status(200).json({
                success: true,
                deviceStatus: device.status,
                data: data
            });
        } catch (error) {
            console.error('Error fetching temperature/humidity data:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch temperature and humidity data',
                error: error.message,
                data: [] // Always include data property even in error response
            });
        }
    },

    // Lấy dữ liệu độ ẩm đất của thiết bị
    async getSoilMoistureData(req, res) {
        try {
            const { id } = req.params;
            const { limit = 100 } = req.query;

            // Kiểm tra id có tồn tại không
            if (!id) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Device ID is required' 
                });
            }

            console.log('Fetching soil moisture data for device ID:', id);

            // Xác minh thiết bị tồn tại và thuộc về người dùng
            const device = await Device.findById(id);
            if (!device) {
                return res.status(404).json({ success: false, message: 'Device not found' });
            }

            // Kiểm tra trạng thái hoạt động của thiết bị
            const isDeviceActive = device.status === 'On' || device.status === 'active';
            console.log(`Device status: ${device.status}, isActive: ${isDeviceActive}`);

            // Lấy dữ liệu theo loại thiết bị
            let data = [];
            
            if (isDeviceActive && device.deviceType === 'soil_moisture') {
                data = await prisma.soilMoistureData.findMany({
                    where: { deviceId: parseInt(id) },
                    orderBy: { readingTime: 'desc' },
                    take: parseInt(limit)
                });
            }
            
            // Nếu không có dữ liệu, trả về mảng rỗng
            if (!data || data.length === 0) {
                console.log('No soil moisture data found, returning empty array');
                data = [];
            }

            return res.status(200).json({
                success: true,
                deviceStatus: device.status,
                data: data
            });
        } catch (error) {
            console.error('Error fetching soil moisture data:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch soil moisture data',
                error: error.message,
                data: [] // Always include data property even in error response
            });
        }
    },

    // Lấy dữ liệu máy bơm
    async getPumpWaterData(req, res) {
        try {
            const { id } = req.params;
            const { limit = 100 } = req.query;

            // Kiểm tra id có tồn tại không
            if (!id) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Device ID is required' 
                });
            }

            console.log('Fetching pump data for device ID:', id);

            // Xác minh thiết bị tồn tại và thuộc về người dùng
            const device = await Device.findById(id);
            if (!device) {
                return res.status(404).json({ success: false, message: 'Device not found' });
            }

            // Kiểm tra trạng thái hoạt động của thiết bị
            const isDeviceActive = device.status === 'On' || device.status === 'active';
            console.log(`Device status: ${device.status}, isActive: ${isDeviceActive}`);

            // Lấy dữ liệu theo loại thiết bị
            let data = [];
            
            if (isDeviceActive && device.deviceType === 'pump_water') {
                data = await prisma.pumpWaterData.findMany({
                    where: { deviceId: parseInt(id) },
                    orderBy: { readingTime: 'desc' },
                    take: parseInt(limit)
                });
            }
            
            // Nếu không có dữ liệu, trả về mảng rỗng
            if (!data || data.length === 0) {
                console.log('No pump data found, returning empty array');
                data = [];
            }

            return res.status(200).json({
                success: true,
                deviceStatus: device.status,
                data: data
            });
        } catch (error) {
            console.error('Error fetching pump water data:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch pump water data',
                error: error.message,
                data: [] // Always include data property even in error response
            });
        }
    },

    // Sửa phương thức lấy thiết bị theo ID
    async getDeviceById(req, res) {
        try {
            const { id } = req.params;
            
            // Lấy thông tin thiết bị
            const device = await prisma.ioTDevice.findUnique({
                where: { id: parseInt(id) },
                include: {
                    feeds: true
                }
            });
            
            if (!device) {
                return res.status(404).json({ message: 'Không tìm thấy thiết bị' });
            }
            
            // Lấy dữ liệu mới nhất dựa trên loại thiết bị
            let latestData = null;
            
            if (device.deviceType === 'temperature_humidity') {
                latestData = await prisma.temperatureHumidityData.findFirst({
                    where: { deviceId: device.id },
                    orderBy: { readingTime: 'desc' }
                });
            } else if (device.deviceType === 'soil_moisture') {
                latestData = await prisma.soilMoistureData.findFirst({
                    where: { deviceId: device.id },
                    orderBy: { readingTime: 'desc' }
                });
            }
            
            // Lấy lịch sử dữ liệu (100 bản ghi gần nhất)
            let historicalData = [];
            
            if (device.deviceType === 'temperature_humidity') {
                historicalData = await prisma.temperatureHumidityData.findMany({
                    where: { deviceId: device.id },
                    orderBy: { readingTime: 'desc' },
                    take: 100
                });
            } else if (device.deviceType === 'soil_moisture') {
                historicalData = await prisma.soilMoistureData.findMany({
                    where: { deviceId: device.id },
                    orderBy: { readingTime: 'desc' },
                    take: 100
                });
            }
            
            return res.json({
                device,
                latestData,
                historicalData
            });
        } catch (error) {
            console.error('Lỗi khi lấy thiết bị:', error);
            return res.status(500).json({ message: error.message });
        }
    }
};

module.exports = deviceController; 
