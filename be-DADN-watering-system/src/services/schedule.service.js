const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const scheduleController = require('../controllers/scheduleController');
const cron = require('node-cron');
const moment = require('moment-timezone')

// Hàm khởi tạo cron job để kiểm tra và thực thi lịch trình
const initScheduleService = () => {
  console.log('Khởi tạo dịch vụ lịch trình tự động...');

  // Chạy mỗi phút để kiểm tra lịch trình
  cron.schedule('* * * * *', async () => {
    try {
      // Lấy thời gian hiện tại
      const now = moment().tz('Asia/Ho_Chi_Minh');
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentTimeString = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
      
      // Lấy ngày trong tuần hiện tại (0: Chủ nhật, 1: Thứ 2, ...)
      const dayOfWeek = now.day();
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const currentDay = dayNames[dayOfWeek];
      
      console.log(`Kiểm tra lịch trình vào ${currentTimeString}, ${currentDay}`);
      
      // Lấy tất cả lịch trình đang được kích hoạt
      const activeSchedules = await prisma.scheduled.findMany({
        where: {
          enabled: true,
          autoMode: true
        },
        include: {
          device: true
        }
      });
      
      console.log(`Tìm thấy ${activeSchedules.length} lịch trình đang kích hoạt`);
      
      // Kiểm tra từng lịch trình
      for (const schedule of activeSchedules) {
        try {
          // Chuyển đổi chuỗi days thành mảng
          const scheduleDays = JSON.parse(schedule.days || '[]');
          
          // Kiểm tra xem lịch trình có áp dụng cho ngày hiện tại không
          if (scheduleDays.includes(currentDay)) {
            // Xử lý lịch trình tưới nước
            if (schedule.scheduleType === 'watering' && schedule.startTime === currentTimeString) {
              console.log(`Thực thi lịch trình tưới nước ID ${schedule.id} cho thiết bị ${schedule.device.deviceCode}`);
              await scheduleController.executeSchedule(schedule.id);
            }
            
            // Xử lý lịch trình chiếu sáng - bật đèn
            if (schedule.scheduleType === 'lighting' && schedule.startTime === currentTimeString) {
              console.log(`Thực thi lịch trình bật đèn ID ${schedule.id} cho thiết bị ${schedule.device.deviceCode}`);
              await scheduleController.executeSchedule(schedule.id);
            }
            
            // Xử lý lịch trình chiếu sáng - tắt đèn
            if (schedule.scheduleType === 'lighting' && schedule.endTime === currentTimeString) {
              console.log(`Thực thi lịch trình tắt đèn ID ${schedule.id} cho thiết bị ${schedule.device.deviceCode}`);
              await scheduleController.turnOffBySchedule(schedule.id);
            }
          }
        } catch (error) {
          console.error(`Lỗi khi xử lý lịch trình ID ${schedule.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Lỗi khi kiểm tra lịch trình:', error);
    }
  });
  
  console.log('Dịch vụ lịch trình tự động đã được khởi tạo');
};

module.exports = {
  initScheduleService
};
