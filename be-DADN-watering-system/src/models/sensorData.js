const prisma = require('../../config/database');

// Các hàm truy vấn dữ liệu cảm biến sử dụng Prisma (không còn bảng SensorData nữa)
const SensorData = {
  // Lấy dữ liệu nhiệt độ và độ ẩm
  getTemperatureHumidityData: async (deviceId, limit = 100) => {
    return prisma.temperatureHumidityData.findMany({
      where: {
        deviceId: parseInt(deviceId)
      },
      orderBy: {
        readingTime: 'desc'
      },
      take: parseInt(limit)
    });
  },

  // Lấy dữ liệu độ ẩm đất
  getSoilMoistureData: async (deviceId, limit = 100) => {
    return prisma.soilMoistureData.findMany({
      where: {
        deviceId: parseInt(deviceId)
      },
      orderBy: {
        readingTime: 'desc'
      },
      take: parseInt(limit)
    });
  },

  // Lấy dữ liệu máy bơm
  getPumpWaterData: async (deviceId, limit = 100) => {
    return prisma.pumpWaterData.findMany({
      where: {
        deviceId: parseInt(deviceId)
      },
      orderBy: {
        readingTime: 'desc'
      },
      take: parseInt(limit)
    });
  },

  // Lấy dữ liệu cảm biến mới nhất theo loại
  getLatestByType: async (deviceIds, type) => {
    const intDeviceIds = deviceIds.map(id => parseInt(id));
    
    switch(type) {
      case 'temperature_humidity':
        return prisma.temperatureHumidityData.findMany({
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
        return prisma.soilMoistureData.findMany({
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
        return prisma.pumpWaterData.findMany({
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
  },

  // Lưu dữ liệu nhiệt độ và độ ẩm
  saveTemperatureHumidity: async (data) => {
    return prisma.temperatureHumidityData.create({
      data: {
        temperature: data.temperature,
        humidity: data.humidity,
        deviceId: parseInt(data.deviceId)
      }
    });
  },

  // Lưu dữ liệu độ ẩm đất
  saveSoilMoisture: async (data) => {
    return prisma.soilMoistureData.create({
      data: {
        moistureValue: data.moistureValue,
        deviceId: parseInt(data.deviceId)
      }
    });
  },

  // Lưu dữ liệu máy bơm
  savePumpWater: async (data) => {
    return prisma.pumpWaterData.create({
      data: {
        status: data.status,
        pumpSpeed: data.pumpSpeed || 0,
        deviceId: parseInt(data.deviceId)
      }
    });
  }
};

module.exports = SensorData;
