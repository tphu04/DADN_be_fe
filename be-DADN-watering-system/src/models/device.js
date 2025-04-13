const prisma = require('../../config/database');
const { DeviceFactoryCreator } = require('../factory/DevicePatternFactory');

// Các hàm truy vấn Device sử dụng Prisma
const Device = {
  // Tìm tất cả thiết bị
  findAll: async () => {
    try {
      return await prisma.iotdevice.findMany();
    } catch (error) {
      console.error('Error finding all devices:', error);
      return [];
    }
  },

  // Tìm thiết bị theo ID
  findById: async (id) => {
    try {
      return await prisma.iotdevice.findUnique({
        where: { id: parseInt(id) },
        include: {
          feed: true
        }
      });
    } catch (error) {
      console.error(`Error finding device with ID ${id}:`, error);
      return null;
    }
  },

  // Tìm thiết bị theo mã thiết bị
  findByDeviceCode: async (deviceCode) => {
    try {
      return await prisma.iotdevice.findUnique({
        where: { deviceCode }
      });
    } catch (error) {
      console.error(`Error finding device with code ${deviceCode}:`, error);
      return null;
    }
  },

  // Tìm thiết bị theo người dùng
  findByUserId: async (userId) => {
    try {
      console.log(`Finding devices for user ID: ${userId}`);
      // Sử dụng configuration để tìm thiết bị theo userId
      return await prisma.iotdevice.findMany({
        where: {
          configuration: {
            some: {
              userId: parseInt(userId)
            }
          }
        },
        include: {
          feed: true
        }
      });
    } catch (error) {
      console.error(`Error finding devices for user ${userId}:`, error);
      // Trả về mảng rỗng thay vì throw error để tránh làm crash ứng dụng
      return [];
    }
  },

  // Tìm thiết bị theo loại
  findByType: async (deviceType) => {
    try {
      return await prisma.iotdevice.findMany({
        where: { deviceType }
      });
    } catch (error) {
      console.error(`Error finding devices with type ${deviceType}:`, error);
      return [];
    }
  },

  // Tạo thiết bị mới sử dụng Factory Pattern
  create: async (deviceData) => {
    try {
      // Lấy factory tương ứng với loại thiết bị
      const factory = DeviceFactoryCreator.getFactory(deviceData.deviceType);
      
      // Sử dụng factory để tạo thiết bị
      return await factory.createDevice(deviceData);
    } catch (error) {
      console.error('Lỗi tạo thiết bị:', error);
      throw error;
    }
  },

  // Cập nhật thiết bị
  update: async (id, deviceData) => {
    try {
      return await prisma.iotdevice.update({
        where: { id: parseInt(id) },
        data: deviceData
      });
    } catch (error) {
      console.error(`Error updating device with ID ${id}:`, error);
      throw error;
    }
  },

  // Xóa thiết bị
  delete: async (id) => {
    try {
      return await prisma.iotdevice.delete({
        where: { id: parseInt(id) }
      });
    } catch (error) {
      console.error(`Error deleting device with ID ${id}:`, error);
      throw error;
    }
  }
};

module.exports = Device;
