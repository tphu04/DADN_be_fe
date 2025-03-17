const prisma = require('../../config/database');

// Các hàm truy vấn Device sử dụng Prisma
const Device = {
  // Tìm tất cả thiết bị
  findAll: async () => {
    return prisma.ioTDevice.findMany();
  },

  // Tìm thiết bị theo ID
  findById: async (id) => {
    return prisma.ioTDevice.findUnique({
      where: { id: parseInt(id) }
    });
  },

  // Tìm thiết bị theo mã thiết bị
  findByDeviceCode: async (deviceCode) => {
    return prisma.ioTDevice.findUnique({
      where: { deviceCode }
    });
  },

  // Tìm thiết bị theo người dùng
  findByUserId: async (userId) => {
    return prisma.ioTDevice.findMany({
      where: {
        configurations: {
          some: {
            userId: parseInt(userId)
          }
        }
      }
    });
  },

  // Tìm thiết bị theo loại
  findByType: async (deviceType) => {
    return prisma.ioTDevice.findMany({
      where: { deviceType }
    });
  },

  // Tạo thiết bị mới
  create: async (deviceData) => {
    return prisma.ioTDevice.create({
      data: deviceData
    });
  },

  // Cập nhật thiết bị
  update: async (id, deviceData) => {
    return prisma.ioTDevice.update({
      where: { id: parseInt(id) },
      data: deviceData
    });
  },

  // Xóa thiết bị
  delete: async (id) => {
    return prisma.ioTDevice.delete({
      where: { id: parseInt(id) }
    });
  }
};

module.exports = Device;
