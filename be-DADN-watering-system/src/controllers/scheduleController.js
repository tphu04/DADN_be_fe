const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const mqttService = require('../services/mqtt.service');

// Hàm trợ giúp để chuyển đổi chuỗi JSON thành mảng
const parseDaysArray = (daysString) => {
  try {
    return JSON.parse(daysString);
  } catch (error) {
    console.error('Lỗi khi parse chuỗi JSON days:', error);
    return [];
  }
};

// Hàm trợ giúp để chuyển đổi mảng thành chuỗi JSON
const stringifyDaysArray = (daysArray) => {
  try {
    return JSON.stringify(daysArray);
  } catch (error) {
    console.error('Lỗi khi stringify mảng days:', error);
    return '[]';
  }
};

// Kiểm tra thiết bị có online không dựa trên dữ liệu gần nhất
const isDeviceOnline = async (device) => {
  if (!device) return false;
  
  // Thời gian 5 phút trước
  const fiveMinutesAgo = new Date();
  fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);
  
  // Kiểm tra dựa trên loại thiết bị
  try {
    let latestData = null;
    
    switch (device.deviceType) {
      case 'pump_water':
        latestData = await prisma.pumpwaterdata.findFirst({
          where: { deviceId: device.id },
          orderBy: { readingTime: 'desc' }
        });
        break;
        
      case 'light':
        latestData = await prisma.lightdata.findFirst({
          where: { deviceId: device.id },
          orderBy: { readingTime: 'desc' }
        });
        break;
        
      case 'temperature_humidity':
        latestData = await prisma.temperaturehumiditydata.findFirst({
          where: { deviceId: device.id },
          orderBy: { readingTime: 'desc' }
        });
        break;
        
      case 'soil_moisture':
        latestData = await prisma.soilmoisturedata.findFirst({
          where: { deviceId: device.id },
          orderBy: { readingTime: 'desc' }
        });
        break;
    }
    
    // Nếu không có dữ liệu hoặc dữ liệu quá cũ, coi như thiết bị offline
    if (!latestData || !latestData.readingTime) return false;
    
    // Thiết bị được coi là online nếu có dữ liệu trong vòng 5 phút
    return new Date(latestData.readingTime) > fiveMinutesAgo;
  } catch (error) {
    console.error(`Lỗi khi kiểm tra trạng thái online của thiết bị ${device.id}:`, error);
    return false;
  }
};

// Lấy tất cả lịch trình của người dùng
exports.getAllSchedules = async (req, res) => {
  try {
    // Bỏ filter userId
    
    // Lấy tất cả lịch trình
    const schedules = await prisma.scheduled.findMany({
      include: {
        device: {
          select: {
            id: true,
            deviceCode: true,
            deviceType: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    // Chuyển đổi chuỗi days thành mảng
    const formattedSchedules = schedules.map(schedule => ({
      ...schedule,
      days: parseDaysArray(schedule.days)
    }));
    
    return res.status(200).json({
      success: true,
      data: formattedSchedules
    });
  } catch (error) {
    console.error('Lỗi khi lấy danh sách lịch trình:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách lịch trình',
      error: error.message
    });
  }
};

// Lấy lịch trình theo ID
exports.getScheduleById = async (req, res) => {
  try {
    const { id } = req.params;
    // Bỏ dòng lấy userId
    
    // Lấy lịch trình theo ID, không lọc theo userId
    const schedule = await prisma.scheduled.findUnique({
      where: {
        id: parseInt(id)
      },
      include: {
        device: {
          select: {
            id: true,
            deviceCode: true,
            deviceType: true
          }
        }
      }
    });
    
    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy lịch trình'
      });
    }
    
    // Chuyển đổi chuỗi days thành mảng
    const formattedSchedule = {
      ...schedule,
      days: parseDaysArray(schedule.days)
    };
    
    return res.status(200).json({
      success: true,
      data: formattedSchedule
    });
  } catch (error) {
    console.error('Lỗi khi lấy thông tin lịch trình:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thông tin lịch trình',
      error: error.message
    });
  }
};

// Tạo lịch trình mới
exports.createSchedule = async (req, res) => {
  try {
    const userId = req.user.id;
    const { deviceId, scheduleType, enabled, startTime, endTime, duration, speed, days, autoMode } = req.body;
    
    // Kiểm tra thiết bị có tồn tại không
    const device = await prisma.iotdevice.findUnique({
      where: { id: parseInt(deviceId) }
    });
    
    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Thiết bị không tồn tại'
      });
    }
    
    // Kiểm tra loại thiết bị có phù hợp với loại lịch trình không
    if (scheduleType === 'watering' && device.deviceType !== 'pump_water') {
      return res.status(400).json({
        success: false,
        message: 'Lịch trình tưới nước chỉ áp dụng cho máy bơm'
      });
    }
    
    if (scheduleType === 'lighting' && device.deviceType !== 'light') {
      return res.status(400).json({
        success: false,
        message: 'Lịch trình chiếu sáng chỉ áp dụng cho đèn'
      });
    }
    
    // Tạo lịch trình mới
    const newSchedule = await prisma.scheduled.create({
      data: {
        userId,
        deviceId: parseInt(deviceId),
        scheduleType,
        enabled: enabled || false,
        startTime,
        endTime,
        duration: duration ? parseInt(duration) : null,
        speed: speed ? parseInt(speed) : null,
        days: stringifyDaysArray(days || []),
        autoMode: autoMode !== undefined ? autoMode : true
      }
    });
    
    // Tính toán thời gian thực thi tiếp theo
    await updateNextExecution(newSchedule.id);
    
    // Tạo thông báo AUTOMATION
    try {
      const notificationService = require('../services/notificationService');
      const username = req.user ? `Người dùng (ID: ${req.user.id})` : 'Hệ thống';
      
      const configData = {
        scheduleType,
        enabled: enabled || false,
        autoMode: autoMode !== undefined ? autoMode : true,
        days: days || []
      };
      
      // Bổ sung thông tin chi tiết tùy theo loại lịch trình
      if (scheduleType === 'watering') {
        configData.startTime = startTime;
        configData.duration = duration;
        configData.speed = speed;
      } else if (scheduleType === 'lighting') {
        configData.startTime = startTime;
        configData.endTime = endTime;
      }
      
      await notificationService.createAutomationConfigNotification(
        device,
        configData,
        username
      );
    } catch (notificationError) {
      console.error('Lỗi khi tạo thông báo AUTOMATION:', notificationError);
      // Không dừng tiến trình nếu thông báo lỗi
    }
    
    return res.status(201).json({
      success: true,
      message: 'Tạo lịch trình thành công',
      data: {
        ...newSchedule,
        days: days || []
      }
    });
  } catch (error) {
    console.error('Lỗi khi tạo lịch trình:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo lịch trình',
      error: error.message
    });
  }
};

// Cập nhật lịch trình
exports.updateSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    // Bỏ dòng lấy userId
    const { enabled, startTime, endTime, duration, speed, days, autoMode } = req.body;
    
    // Kiểm tra lịch trình có tồn tại không, không lọc theo userId
    const existingSchedule = await prisma.scheduled.findUnique({
      where: {
        id: parseInt(id)
      },
      include: {
        device: true
      }
    });
    
    if (!existingSchedule) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy lịch trình'
      });
    }
    
    // Chuẩn bị dữ liệu cập nhật
    const updateData = {};
    
    if (enabled !== undefined) updateData.enabled = enabled;
    if (startTime !== undefined) updateData.startTime = startTime;
    if (endTime !== undefined) updateData.endTime = endTime;
    if (duration !== undefined) updateData.duration = parseInt(duration);
    if (speed !== undefined) updateData.speed = parseInt(speed);
    if (days !== undefined) updateData.days = stringifyDaysArray(days);
    if (autoMode !== undefined) updateData.autoMode = autoMode;
    
    // Cập nhật lịch trình
    const updatedSchedule = await prisma.scheduled.update({
      where: { id: parseInt(id) },
      data: updateData
    });
    
    // Tính toán thời gian thực thi tiếp theo
    await updateNextExecution(updatedSchedule.id);
    
    // Tạo thông báo AUTOMATION khi cập nhật lịch trình
    try {
      const notificationService = require('../services/notificationService');
      const username = req.user ? `Người dùng (ID: ${req.user.id})` : 'Hệ thống';
      
      // Chuẩn bị dữ liệu cấu hình cho thông báo
      const configData = {
        scheduleType: existingSchedule.scheduleType,
        enabled: updateData.enabled !== undefined ? updateData.enabled : existingSchedule.enabled,
        autoMode: updateData.autoMode !== undefined ? updateData.autoMode : existingSchedule.autoMode,
        days: days !== undefined ? days : parseDaysArray(existingSchedule.days)
      };
      
      // Bổ sung thông tin chi tiết tùy theo loại lịch trình
      if (existingSchedule.scheduleType === 'watering') {
        configData.startTime = updateData.startTime || existingSchedule.startTime;
        configData.duration = updateData.duration !== undefined ? updateData.duration : existingSchedule.duration;
        configData.speed = updateData.speed !== undefined ? updateData.speed : existingSchedule.speed;
      } else if (existingSchedule.scheduleType === 'lighting') {
        configData.startTime = updateData.startTime || existingSchedule.startTime;
        configData.endTime = updateData.endTime || existingSchedule.endTime;
      }
      
      await notificationService.createAutomationConfigNotification(
        existingSchedule.device,
        configData,
        username
      );
    } catch (notificationError) {
      console.error('Lỗi khi tạo thông báo AUTOMATION khi cập nhật:', notificationError);
      // Không dừng tiến trình nếu thông báo lỗi
    }
    
    return res.status(200).json({
      success: true,
      message: 'Cập nhật lịch trình thành công',
      data: {
        ...updatedSchedule,
        days: parseDaysArray(updatedSchedule.days)
      }
    });
  } catch (error) {
    console.error('Lỗi khi cập nhật lịch trình:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật lịch trình',
      error: error.message
    });
  }
};

// Xóa lịch trình
exports.deleteSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    // Bỏ dòng lấy userId
    
    // Kiểm tra lịch trình có tồn tại không, không lọc theo userId
    const existingSchedule = await prisma.scheduled.findUnique({
      where: {
        id: parseInt(id)
      }
    });
    
    if (!existingSchedule) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy lịch trình'
      });
    }
    
    // Xóa lịch trình
    await prisma.scheduled.delete({
      where: { id: parseInt(id) }
    });
    
    return res.status(200).json({
      success: true,
      message: 'Đã xóa lịch trình thành công'
    });
  } catch (error) {
    console.error('Lỗi khi xóa lịch trình:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa lịch trình',
      error: error.message
    });
  }
};

// Bật/tắt lịch trình
exports.toggleSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    // Bỏ dòng lấy userId
    
    // Kiểm tra lịch trình có tồn tại không, không lọc theo userId
    const existingSchedule = await prisma.scheduled.findUnique({
      where: {
        id: parseInt(id)
      }
    });
    
    if (!existingSchedule) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy lịch trình'
      });
    }
    
    // Đảo trạng thái enabled
    const updatedSchedule = await prisma.scheduled.update({
      where: { id: parseInt(id) },
      data: { enabled: !existingSchedule.enabled }
    });
    
    // Tính toán thời gian thực thi tiếp theo nếu đã bật
    if (updatedSchedule.enabled) {
      await updateNextExecution(updatedSchedule.id);
    }
    
    return res.status(200).json({
      success: true,
      message: `Đã ${updatedSchedule.enabled ? 'bật' : 'tắt'} lịch trình`,
      data: {
        ...updatedSchedule,
        days: parseDaysArray(updatedSchedule.days)
      }
    });
  } catch (error) {
    console.error('Lỗi khi bật/tắt lịch trình:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi bật/tắt lịch trình',
      error: error.message
    });
  }
};

// Lấy lịch trình theo thiết bị
exports.getSchedulesByDevice = async (req, res) => {
  try {
    const { deviceId } = req.params;
    // Bỏ dòng lấy userId
    
    // Kiểm tra thiết bị có tồn tại không
    const device = await prisma.iotdevice.findFirst({
      where: {
        id: parseInt(deviceId)
      }
    });
    
    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Thiết bị không tồn tại'
      });
    }
    
    // Lấy lịch trình theo deviceId, không lọc theo userId
    const schedules = await prisma.scheduled.findMany({
      where: {
        deviceId: parseInt(deviceId)
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    // Chuyển đổi chuỗi days thành mảng
    const formattedSchedules = schedules.map(schedule => ({
      ...schedule,
      days: parseDaysArray(schedule.days)
    }));
    
    return res.status(200).json({
      success: true,
      data: formattedSchedules
    });
  } catch (error) {
    console.error('Lỗi khi lấy lịch trình theo thiết bị:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy lịch trình theo thiết bị',
      error: error.message
    });
  }
};

// Hàm tính toán thời gian thực thi tiếp theo
async function updateNextExecution(scheduleId) {
  try {
    const schedule = await prisma.scheduled.findUnique({
      where: { id: parseInt(scheduleId) }
    });
    
    if (!schedule || !schedule.enabled) return;
    
    const days = parseDaysArray(schedule.days);
    if (days.length === 0) return;
    
    const now = new Date();
    const dayMap = {
      'sunday': 0,
      'monday': 1,
      'tuesday': 2,
      'wednesday': 3,
      'thursday': 4,
      'friday': 5,
      'saturday': 6
    };
    
    // Lấy thời gian thực thi (startTime cho watering hoặc onTime cho lighting)
    let executionTime;
    if (schedule.scheduleType === 'watering') {
      executionTime = schedule.startTime;
    } else if (schedule.scheduleType === 'lighting') {
      executionTime = schedule.startTime; // Thời gian bật đèn
    }
    
    if (!executionTime) return;
    
    // Tìm ngày tiếp theo trong lịch trình
    let nextDay = -1;
    let daysToAdd = 0;
    
    for (let i = 0; i < 7; i++) {
      const checkDay = (now.getDay() + i) % 7;
      const dayName = Object.keys(dayMap).find(key => dayMap[key] === checkDay);
      
      if (days.includes(dayName)) {
        // Nếu là ngày hiện tại, kiểm tra thời gian
        if (i === 0) {
          const [hours, minutes] = executionTime.split(':').map(Number);
          const executionDate = new Date(now);
          executionDate.setHours(hours, minutes, 0, 0);
          
          // Nếu thời gian thực thi đã qua, chuyển sang ngày tiếp theo
          if (executionDate <= now) {
            continue;
          }
        }
        
        nextDay = checkDay;
        daysToAdd = i;
        break;
      }
    }
    
    // Nếu không tìm thấy ngày tiếp theo, quay lại ngày đầu tiên trong lịch trình
    if (nextDay === -1) {
      const firstScheduleDay = days[0];
      nextDay = dayMap[firstScheduleDay];
      
      // Tính số ngày cần thêm
      daysToAdd = (nextDay - now.getDay() + 7) % 7;
      if (daysToAdd === 0) daysToAdd = 7; // Nếu là cùng ngày trong tuần, đợi đến tuần sau
    }
    
    // Tạo ngày thực thi tiếp theo
    const nextExecution = new Date(now);
    nextExecution.setDate(now.getDate() + daysToAdd);
    
    // Đặt giờ và phút
    const [hours, minutes] = executionTime.split(':').map(Number);
    nextExecution.setHours(hours, minutes, 0, 0);
    
    // Cập nhật thời gian thực thi tiếp theo
    await prisma.scheduled.update({
      where: { id: parseInt(scheduleId) },
      data: { nextExecution }
    });
    
    console.log(`Đã cập nhật thời gian thực thi tiếp theo cho lịch trình ${scheduleId}: ${nextExecution}`);
  } catch (error) {
    console.error('Lỗi khi cập nhật thời gian thực thi tiếp theo:', error);
  }
}

// Hàm thực thi lịch trình
exports.executeSchedule = async (scheduleId) => {
  try {
    const schedule = await prisma.scheduled.findUnique({
      where: { id: parseInt(scheduleId) },
      include: {
        device: true
      }
    });
    
    if (!schedule || !schedule.enabled) {
      console.log(`Lịch trình ${scheduleId} không tồn tại hoặc không được kích hoạt`);
      return;
    }
    
    // Kiểm tra thiết bị có online không
    if (!await isDeviceOnline(schedule.device)) {
      console.log(`Thiết bị ${schedule.device.deviceCode} đang offline, ghi log nhưng vẫn sẽ thử gửi lệnh`);
      await prisma.notification.create({
        data: {
          message: `Không thể thực thi lịch trình tưới: Thiết bị ${schedule.device.deviceCode} đang offline`,
          type: 'warning',
          source: 'system',
          deviceId: schedule.deviceId
        }
      });
      console.log(`Đã tạo thông báo cảnh báo về thiết bị offline`);
      // Continue trying to send command regardless of device online status
    }
    
    console.log(`Đang thực thi lịch trình ${scheduleId} cho thiết bị ${schedule.device.deviceCode}`);
    
    // Xử lý theo loại lịch trình
    if (schedule.scheduleType === 'watering') {
      // Log trước khi gửi lệnh MQTT
      console.log(`DEBUG: Chuẩn bị gửi lệnh bật máy bơm qua MQTT với tốc độ ${schedule.speed || 50}%`);
      
      // Gửi lệnh bật máy bơm
      const result = await mqttService.publishToDevice(schedule.deviceId, 'pump', {
        status: 'On',
        speed: schedule.speed || 50
      });
      
      console.log(`DEBUG: Kết quả gửi MQTT: ${result ? 'Thành công' : 'Thất bại'}`);
      
      if (result) {
        console.log(`Đã bật máy bơm với tốc độ ${schedule.speed || 50}% cho thiết bị ${schedule.device.deviceCode}`);
        
        // Đặt hẹn giờ để tắt máy bơm sau khoảng thời gian duration
        setTimeout(async () => {
          console.log(`DEBUG: Chuẩn bị gửi lệnh tắt máy bơm sau ${schedule.duration} phút`);
          const turnOffResult = await mqttService.publishToDevice(schedule.deviceId, 'pump', {
            status: 'Off',
            speed: 0
          });
          
          console.log(`DEBUG: Kết quả gửi lệnh tắt MQTT: ${turnOffResult ? 'Thành công' : 'Thất bại'}`);
          
          if (turnOffResult) {
            console.log(`Đã tắt máy bơm cho thiết bị ${schedule.device.deviceCode} sau ${schedule.duration} phút`);
          } else {
            console.error(`Lỗi khi tắt máy bơm cho thiết bị ${schedule.device.deviceCode}`);
          }
        }, (schedule.duration || 15) * 60 * 1000);
      } else {
        console.error(`Lỗi khi bật máy bơm cho thiết bị ${schedule.device.deviceCode}`);
        return;
      }
    } else if (schedule.scheduleType === 'lighting') {
      // Log trước khi gửi lệnh MQTT
      console.log(`DEBUG: Chuẩn bị gửi lệnh bật đèn qua MQTT`);
      
      // Gửi lệnh bật đèn
      const result = await mqttService.publishToDevice(schedule.deviceId, 'light', {
        status: 'On'
      });
      
      console.log(`DEBUG: Kết quả gửi MQTT: ${result ? 'Thành công' : 'Thất bại'}`);
      
      if (result) {
        console.log(`Đã bật đèn cho thiết bị ${schedule.device.deviceCode}`);
      } else {
        console.error(`Lỗi khi bật đèn cho thiết bị ${schedule.device.deviceCode}`);
        return;
      }
    }
    
    // Cập nhật thời gian thực thi gần nhất
    await prisma.scheduled.update({
      where: { id: parseInt(scheduleId) },
      data: { lastExecuted: new Date() }
    });
    
    // Tính toán thời gian thực thi tiếp theo
    await updateNextExecution(scheduleId);
  } catch (error) {
    console.error('Lỗi khi thực thi lịch trình:', error);
  }
};

// Hàm tắt thiết bị theo lịch trình
exports.turnOffBySchedule = async (scheduleId) => {
  try {
    const schedule = await prisma.scheduled.findUnique({
      where: { id: parseInt(scheduleId) },
      include: {
        device: true
      }
    });
    
    if (!schedule || !schedule.enabled) {
      console.log(`Lịch trình ${scheduleId} không tồn tại hoặc không được kích hoạt`);
      return;
    }
    
    // Kiểm tra thiết bị có online không
    if (!await isDeviceOnline(schedule.device)) {
      console.log(`Thiết bị ${schedule.device.deviceCode} (ID: ${schedule.deviceId}) không trực tuyến`);
      return;
    }
    
    console.log(`Đang tắt thiết bị theo lịch trình ${scheduleId} cho thiết bị ${schedule.device.deviceCode}`);
    
    // Chỉ áp dụng cho lịch trình chiếu sáng
    if (schedule.scheduleType === 'lighting') {
      // Gửi lệnh tắt đèn
      const result = await mqttService.publishToDevice(schedule.deviceId, 'light', {
        status: 'Off'
      });
      
      if (result) {
        console.log(`Đã tắt đèn cho thiết bị ${schedule.device.deviceCode}`);
      } else {
        console.error(`Lỗi khi tắt đèn cho thiết bị ${schedule.device.deviceCode}`);
      }
    }
  } catch (error) {
    console.error('Lỗi khi tắt thiết bị theo lịch trình:', error);
  }
};

// Đặt trạng thái bật/tắt lịch trình qua tham số query
exports.setScheduleEnabled = async (req, res) => {
  try {
    const { id } = req.params;
    const { enabled } = req.query;
    
    console.log(`Đang đặt trạng thái enabled=${enabled} cho lịch trình ${id}`);
    
    // Kiểm tra tham số enabled
    if (enabled === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu tham số enabled'
      });
    }
    
    // Chuyển đổi giá trị chuỗi enabled thành boolean
    const enabledValue = enabled === 'true' || enabled === '1';
    
    // Kiểm tra lịch trình có tồn tại không
    const existingSchedule = await prisma.scheduled.findUnique({
      where: {
        id: parseInt(id)
      }
    });
    
    if (!existingSchedule) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy lịch trình'
      });
    }
    
    // Cập nhật trạng thái enabled
    const updatedSchedule = await prisma.scheduled.update({
      where: { id: parseInt(id) },
      data: { enabled: enabledValue }
    });
    
    // Tính toán thời gian thực thi tiếp theo nếu đã bật
    if (updatedSchedule.enabled) {
      await updateNextExecution(updatedSchedule.id);
    }
    
    return res.status(200).json({
      success: true,
      message: `Đã ${updatedSchedule.enabled ? 'bật' : 'tắt'} lịch trình`,
      data: {
        ...updatedSchedule,
        days: parseDaysArray(updatedSchedule.days)
      }
    });
  } catch (error) {
    console.error('Lỗi khi đặt trạng thái lịch trình:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi đặt trạng thái lịch trình',
      error: error.message
    });
  }
};