const SensorData = require('../models/sensorData');
const Device = require('../models/device');
const prisma = require('../../config/database');

// Lấy dữ liệu mới nhất của tất cả các cảm biến của người dùng
exports.getLatestSensorData = async (req, res) => {
  try {
    const userId = req.user.id;

    // Lấy tất cả thiết bị cảm biến của người dùng
    const devices = await Device.findByUserId(userId);

    if (!devices.length) {
      return res.status(404).json({
        success: false,
        message: 'No sensor devices found for this user'
      });
    }

    const deviceIds = devices.map(device => device.id);
    
    // Kết quả trả về cho người dùng
    const result = [];

    // Lấy dữ liệu mới nhất từ các cảm biến nhiệt độ và độ ẩm
    const tempHumidDevices = devices.filter(d => d.deviceType === 'temperature_humidity');
    if (tempHumidDevices.length > 0) {
      for (const device of tempHumidDevices) {
        // Kiểm tra status của thiết bị
        if (device.status === 'On') {
          // Thiết bị đang hoạt động, lấy dữ liệu mới nhất
          const tempHumidData = await SensorData.getLatestByType([device.id], 'temperature_humidity');
          if (tempHumidData && tempHumidData.length > 0) {
            result.push({
              deviceId: device.id,
              deviceName: device.deviceCode,
              deviceType: 'temperature_humidity',
              temperature: tempHumidData[0].temperature,
              airHumidity: tempHumidData[0].humidity,
              timestamp: tempHumidData[0].readingTime
            });
          } else {
            // Không có dữ liệu cho thiết bị đang hoạt động
            result.push({
              deviceId: device.id,
              deviceName: device.deviceCode,
              deviceType: 'temperature_humidity',
              temperature: 0,
              airHumidity: 0,
              timestamp: new Date()
            });
          }
        } else {
          // Thiết bị không hoạt động, trả về 0
          result.push({
            deviceId: device.id,
            deviceName: device.deviceCode,
            deviceType: 'temperature_humidity',
            temperature: 0,
            airHumidity: 0,
            timestamp: new Date(),
            inactive: true
          });
        }
      }
    }
    
    // Lấy dữ liệu mới nhất từ các cảm biến độ ẩm đất
    const soilMoistureDevices = devices.filter(d => d.deviceType === 'soil_moisture');
    if (soilMoistureDevices.length > 0) {
      for (const device of soilMoistureDevices) {
        // Kiểm tra status của thiết bị
        if (device.status === 'On') {
          // Thiết bị đang hoạt động, lấy dữ liệu mới nhất
          const soilMoistureData = await SensorData.getLatestByType([device.id], 'soil_moisture');
          if (soilMoistureData && soilMoistureData.length > 0) {
            result.push({
              deviceId: device.id,
              deviceName: device.deviceCode,
              deviceType: 'soil_moisture',
              soilMoisture: soilMoistureData[0].moistureValue,
              timestamp: soilMoistureData[0].readingTime
            });
          } else {
            // Không có dữ liệu cho thiết bị đang hoạt động
            result.push({
              deviceId: device.id,
              deviceName: device.deviceCode,
              deviceType: 'soil_moisture',
              soilMoisture: 0,
              timestamp: new Date()
            });
          }
        } else {
          // Thiết bị không hoạt động, trả về 0
          result.push({
            deviceId: device.id,
            deviceName: device.deviceCode,
            deviceType: 'soil_moisture',
            soilMoisture: 0,
            timestamp: new Date(),
            inactive: true
          });
        }
      }
    }

    // Lấy dữ liệu mới nhất từ các thiết bị máy bơm
    const pumpWaterDevices = devices.filter(d => d.deviceType === 'pump_water');
    if (pumpWaterDevices.length > 0) {
      for (const device of pumpWaterDevices) {
        // Kiểm tra status của thiết bị
        if (device.status === 'On') {
          // Thiết bị đang hoạt động, lấy dữ liệu mới nhất
          const pumpData = await SensorData.getLatestByType([device.id], 'pump_water');
          if (pumpData && pumpData.length > 0) {
            result.push({
              deviceId: device.id,
              deviceName: device.deviceCode,
              deviceType: 'pump_water',
              status: pumpData[0].status,
              pumpSpeed: pumpData[0].pumpSpeed,
              timestamp: pumpData[0].readingTime
            });
          } else {
            // Không có dữ liệu cho thiết bị đang hoạt động
            result.push({
              deviceId: device.id,
              deviceName: device.deviceCode,
              deviceType: 'pump_water',
              status: 'Inactive',
              pumpSpeed: 0,
              timestamp: new Date()
            });
          }
        } else {
          // Thiết bị không hoạt động, trả về 0
          result.push({
            deviceId: device.id,
            deviceName: device.deviceCode,
            deviceType: 'pump_water',
            status: 'Inactive',
            pumpSpeed: 0,
            timestamp: new Date(),
            inactive: true
          });
        }
      }
    }

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching sensor data:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch sensor data',
      error: error.message
    });
  }
};

// Lấy dữ liệu lịch sử của một cảm biến cụ thể
exports.getSensorHistory = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { limit = 24, timeRange } = req.query;
    
    // Xác thực rằng thiết bị thuộc về người dùng
    const device = await Device.findById(deviceId);
    
    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found'
      });
    }
    
    // Kiểm tra quyền thông qua configuration
    const hasAccess = await prisma.configuration.findFirst({
      where: {
        deviceId: parseInt(deviceId),
        userId: req.user.id
      }
    });
    
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to access this device'
      });
    }

    let data = [];
    const limitNum = parseInt(limit);
    
    // Thêm điều kiện thời gian nếu được cung cấp
    let dateFilter = {};
    if (timeRange) {
      const now = new Date();
      const pastDate = new Date();
      
      // Đặt thời gian dựa trên tham số timeRange (hours, days, weeks)
      if (timeRange === 'day') {
        pastDate.setDate(now.getDate() - 1);
      } else if (timeRange === 'week') {
        pastDate.setDate(now.getDate() - 7);
      } else if (timeRange === 'month') {
        pastDate.setMonth(now.getMonth() - 1);
      }
      
      dateFilter = {
        readingTime: {
          gte: pastDate,
          lte: now
        }
      };
    }
    
    // Lấy dữ liệu phù hợp với loại thiết bị
    if (device.deviceType === 'temperature_humidity') {
      data = await prisma.temperatureHumidityData.findMany({
        where: {
          deviceId: parseInt(deviceId),
          ...dateFilter
        },
        orderBy: {
          readingTime: 'desc'
        },
        take: limitNum
      });
    } else if (device.deviceType === 'soil_moisture') {
      data = await prisma.soilMoistureData.findMany({
        where: {
          deviceId: parseInt(deviceId),
          ...dateFilter
        },
        orderBy: {
          readingTime: 'desc'
        },
        take: limitNum
      });
    } else if (device.deviceType === 'pump_water') {
      data = await prisma.pumpWaterData.findMany({
        where: {
          deviceId: parseInt(deviceId),
          ...dateFilter
        },
        orderBy: {
          readingTime: 'desc'
        },
        take: limitNum
      });
    }

    return res.status(200).json({
      success: true,
      deviceType: device.deviceType,
      data: data.reverse() // Đảo ngược để dữ liệu theo thứ tự tăng dần cho biểu đồ
    });
  } catch (error) {
    console.error('Error fetching sensor history:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch sensor history',
      error: error.message
    });
  }
};
