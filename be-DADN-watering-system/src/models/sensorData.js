const prisma = require('../../config/database');

// Các hàm truy vấn dữ liệu cảm biến sử dụng Prisma (không còn bảng SensorData nữa)
const SensorData = {
  // Lấy dữ liệu nhiệt độ và độ ẩm
  getTemperatureHumidityData: async (deviceId, limit = 100) => {
    try {
      return await prisma.temperaturehumiditydata.findMany({
        where: {
          deviceId: parseInt(deviceId)
        },
        orderBy: {
          readingTime: 'desc'
        },
        take: parseInt(limit)
      });
    } catch (error) {
      console.error(`Error getting temperature humidity data for device ${deviceId}:`, error);
      return [];
    }
  },

  // Lấy dữ liệu độ ẩm đất
  getSoilMoistureData: async (deviceId, limit = 100) => {
    try {
      return await prisma.soilmoisturedata.findMany({
        where: {
          deviceId: parseInt(deviceId)
        },
        orderBy: {
          readingTime: 'desc'
        },
        take: parseInt(limit)
      });
    } catch (error) {
      console.error(`Error getting soil moisture data for device ${deviceId}:`, error);
      return [];
    }
  },

  // Lấy dữ liệu máy bơm
  getPumpWaterData: async (deviceId, limit = 100) => {
    try {
      return await prisma.pumpwaterdata.findMany({
        where: {
          deviceId: parseInt(deviceId)
        },
        orderBy: {
          readingTime: 'desc'
        },
        take: parseInt(limit)
      });
    } catch (error) {
      console.error(`Error getting pump water data for device ${deviceId}:`, error);
      return [];
    }
  },

  // Lấy dữ liệu cảm biến mới nhất theo loại
  getLatestByType: async (deviceIds, type) => {
    try {
      const intDeviceIds = deviceIds.map(id => parseInt(id));
      
      switch(type) {
        case 'temperature_humidity':
          return await prisma.temperaturehumiditydata.findMany({
            where: {
              deviceId: { in: intDeviceIds }
            },
            orderBy: {
              readingTime: 'desc'
            },
            distinct: ['deviceId'],
            take: intDeviceIds.length
          });
        case 'soil_moisture':
          return await prisma.soilmoisturedata.findMany({
            where: {
              deviceId: { in: intDeviceIds }
            },
            orderBy: {
              readingTime: 'desc'
            },
            distinct: ['deviceId'],
            take: intDeviceIds.length
          });
        case 'pump_water':
          return await prisma.pumpwaterdata.findMany({
            where: {
              deviceId: { in: intDeviceIds }
            },
            orderBy: {
              readingTime: 'desc'
            },
            distinct: ['deviceId'],
            take: intDeviceIds.length
          });
        default:
          return [];
      }
    } catch (error) {
      console.error(`Error getting latest data for device type ${type}:`, error);
      return [];
    }
  },

  // Lưu dữ liệu nhiệt độ và độ ẩm
  saveTemperatureHumidity: async (data) => {
    try {
      return await prisma.temperaturehumiditydata.create({
        data: {
          temperature: data.temperature,
          humidity: data.humidity,
          deviceId: parseInt(data.deviceId)
        }
      });
    } catch (error) {
      console.error(`Error saving temperature humidity data:`, error);
      throw error;
    }
  },

  // Lưu dữ liệu độ ẩm đất
  saveSoilMoisture: async (data) => {
    try {
      return await prisma.soilmoisturedata.create({
        data: {
          moistureValue: data.moistureValue,
          deviceId: parseInt(data.deviceId)
        }
      });
    } catch (error) {
      console.error(`Error saving soil moisture data:`, error);
      throw error;
    }
  },

  // Lưu dữ liệu máy bơm
  savePumpWater: async (data) => {
    try {
      return await prisma.pumpwaterdata.create({
        data: {
          status: data.status,
          pumpSpeed: data.pumpSpeed || 0,
          deviceId: parseInt(data.deviceId)
        }
      });
    } catch (error) {
      console.error(`Error saving pump water data:`, error);
      throw error;
    }
  }
};

module.exports = SensorData;
