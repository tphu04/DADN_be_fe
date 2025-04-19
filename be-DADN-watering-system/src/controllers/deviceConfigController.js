const prisma = require('../../config/database');
const mqtt = require('mqtt');
const client = mqtt.connect('mqtt://io.adafruit.com', {
  username: process.env.ADAFRUIT_USERNAME || 'your_username',
  password: process.env.ADAFRUIT_KEY || 'your_key'
});



// Hàm kiểm tra kết nối database
async function checkDatabaseConnection() {
  try {
    // Thực hiện một truy vấn đơn giản để kiểm tra kết nối
    const count = await prisma.iotdevice.count();
    return true;
  } catch (error) {
    console.error('Lỗi kết nối đến database:', error);
    return false;
  }
}

// Lấy cấu hình mặc định của thiết bị
const getDefaultConfig = () => {
  return {
    soilMoisture: { min: 20, max: 80 },
    temperature: { min: 20, max: 35 },
    airHumidity: { min: 40, max: 80 }
  };
};

// Lấy thông tin cấu hình của thiết bị theo ID
exports.getDeviceConfig = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Kiểm tra thiết bị có tồn tại không
    const device = await prisma.iotdevice.findUnique({
      where: { id: parseInt(id) }
    });

    if (!device) {
      return res.status(404).json({ success: false, message: 'Thiết bị không tồn tại' });
    }

    // Lấy thông tin cấu hình hiện tại của thiết bị
    let config = await prisma.configuration.findFirst({
      where: {
        userId: userId
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Nếu không có cấu hình, tạo cấu hình mặc định
    if (!config) {
      const defaultConfig = getDefaultConfig();
      
      // Kiểm tra xem đã có cấu hình mặc định này chưa
      const existingConfig = await prisma.configuration.findFirst({
        where: {
          userId: userId,
          soilMoistureMin: defaultConfig.soilMoisture.min,
          soilMoistureMax: defaultConfig.soilMoisture.max,
          temperatureMin: defaultConfig.temperature.min,
          temperatureMax: defaultConfig.temperature.max,
          humidityMin: defaultConfig.airHumidity.min,
          humidityMax: defaultConfig.airHumidity.max
        }
      });
    }

    // Định dạng dữ liệu để trả về API
    const responseData = {
      soilMoisture: {
        min: config.soilMoistureMin,
        max: config.soilMoistureMax
      },
      temperature: {
        min: config.temperatureMin,
        max: config.temperatureMax
      },
      airHumidity: {
        min: config.humidityMin,
        max: config.humidityMax
      }
    };

    return res.status(200).json({ success: true, data: responseData });
  } catch (error) {
    console.error('Lỗi khi lấy thông tin cấu hình thiết bị:', error);
    return res.status(500).json({ success: false, message: 'Đã xảy ra lỗi khi lấy thông tin cấu hình thiết bị', error: error.message });
  }
};

// Cập nhật cấu hình của thiết bị


// Gửi cấu hình đến thiết bị qua MQTT
const applyDeviceConfig = async (device, config, configData) => {
  try {
    console.log(`Áp dụng cấu hình cho thiết bị ${device.deviceCode} (ID: ${device.id})...`);
    
    // Lấy danh sách feed của thiết bị để gửi MQTT
    const feeds = await prisma.feed.findMany({
      where: {
        deviceId: device.id
      }
    });

    // Nếu không có feed nào, bỏ qua
    if (!feeds || feeds.length === 0) {
      console.log(`Thiết bị ${device.deviceCode} không có feed nào để gửi cấu hình.`);
      return;
    }

    console.log(`Tìm thấy ${feeds.length} feed cho thiết bị ${device.deviceCode}`);
    feeds.forEach(feed => {
      console.log(`- Feed ID: ${feed.id}, Name: ${feed.name}`);
    });

    // Chuyển đổi dữ liệu từ configData
    let soilMoistureMin = null;
    let soilMoistureMax = null;
    let temperatureMin = null;
    let temperatureMax = null;
    let humidityMin = null;
    let humidityMax = null;

    if (configData.soilMoisture) {
      soilMoistureMin = parseFloat(configData.soilMoisture.min) ;
      soilMoistureMax = parseFloat(configData.soilMoisture.max) ;
    }

    if (configData.temperature) {
      temperatureMin = parseFloat(configData.temperature.min) ;
      temperatureMax = parseFloat(configData.temperature.max) || 50;
    }

    if (configData.airHumidity) {
      humidityMin = parseFloat(configData.airHumidity.min) ;
      humidityMax = parseFloat(configData.airHumidity.max) ;
    }

    // Duyệt qua từng feed và gửi cấu hình tương ứng qua MQTT
    for (const feed of feeds) {
      let value = null;
      
      // Xác định giá trị cần gửi cho từng loại feed
      if (feed.name.includes('soil_moisture')) {
        if (feed.name.includes('min') && soilMoistureMin !== null) {
          value = soilMoistureMin;
        } else if (feed.name.includes('max') && soilMoistureMax !== null) {
          value = soilMoistureMax;
        }
      } else if (feed.name.includes('temperature')) {
        if (feed.name.includes('min') && temperatureMin !== null) {
          value = temperatureMin;
        } else if (feed.name.includes('max') && temperatureMax !== null) {
          value = temperatureMax;
        }
      } else if (feed.name.includes('humidity')) {
        if (feed.name.includes('min') && humidityMin !== null) {
          value = humidityMin;
        } else if (feed.name.includes('max') && humidityMax !== null) {
          value = humidityMax;
        }
      }

      // Nếu có giá trị, gửi đến thiết bị qua MQTT
      if (value !== null) {
        const topic = `${process.env.ADAFRUIT_USERNAME || 'your_username'}/feeds/${feed.feedKey}`;
        client.publish(topic, String(value), { qos: 1 }, (err) => {
          if (err) {
            console.error(`Lỗi khi gửi cấu hình đến feed ${feed.name}:`, err);
          } else {
            console.log(`Đã gửi cấu hình ${value} đến feed ${feed.name} qua MQTT`);
          }
        });
      }
    }

    console.log(`Đã áp dụng cấu hình đến thiết bị ${device.deviceCode}`);
  } catch (error) {
    console.error('Lỗi khi áp dụng cấu hình thiết bị qua MQTT:', error);
    throw error;
  }
};

// Khóa toàn cục để ngăn chặn các yêu cầu đồng thời
const configLock = {};

// Lưu cấu hình mới vào database
exports.saveConfiguration = async (req, res) => {
  const config = req.body;
  const userId = req.user.id;
  
  // Tạo khóa dựa trên userId và giá trị cấu hình
  const lockKey = `${userId}_${JSON.stringify(config)}`;
  
  // Kiểm tra xem có yêu cầu đang xử lý không
  if (configLock[lockKey]) {
    console.log(`Yêu cầu trùng lặp phát hiện với khóa: ${lockKey}. Đang đợi xử lý...`);
    return res.status(409).json({
      success: false,
      message: 'Yêu cầu đang được xử lý, vui lòng thử lại sau'
    });
  }
  
  // Đặt khóa để ngăn các yêu cầu khác với cùng dữ liệu
  configLock[lockKey] = true;
  
  try {
    console.log(`Đang lưu cấu hình mới:`, JSON.stringify(config));

    // Kiểm tra dữ liệu đầu vào và đảm bảo các giá trị là số hợp lệ
    // Nếu dữ liệu đầu vào có cấu trúc cũ (soilMoisture, temperature, airHumidity)
    let soilMoistureMin, soilMoistureMax, temperatureMin, temperatureMax, humidityMin, humidityMax;
    
    if (config.soilMoisture) {
      soilMoistureMin = parseFloat(config.soilMoisture.min);
      soilMoistureMax = parseFloat(config.soilMoisture.max);
    } else if (config.soilMoistureMin !== undefined) {
      // Nếu dữ liệu đầu vào có cấu trúc mới (soilMoistureMin, soilMoistureMax, etc.)
      soilMoistureMin = parseFloat(config.soilMoistureMin);
      soilMoistureMax = parseFloat(config.soilMoistureMax);
    }

    if (config.temperature) {
      temperatureMin = parseFloat(config.temperature.min);
      temperatureMax = parseFloat(config.temperature.max);
    } else if (config.temperatureMin !== undefined) {
      temperatureMin = parseFloat(config.temperatureMin);
      temperatureMax = parseFloat(config.temperatureMax);
    }

    if (config.airHumidity) {
      humidityMin = parseFloat(config.airHumidity.min);
      humidityMax = parseFloat(config.airHumidity.max);
    } else if (config.humidityMin !== undefined) {
      humidityMin = parseFloat(config.humidityMin);
      humidityMax = parseFloat(config.humidityMax);
    }

    // Kiểm tra và đặt giá trị mặc định nếu có giá trị NaN
    if (isNaN(soilMoistureMin)) soilMoistureMin = 20;
    if (isNaN(soilMoistureMax)) soilMoistureMax = 80;
    if (isNaN(temperatureMin)) temperatureMin = 20;
    if (isNaN(temperatureMax)) temperatureMax = 35;
    if (isNaN(humidityMin)) humidityMin = 40;
    if (isNaN(humidityMax)) humidityMax = 80;
    
    console.log('Cấu hình được xử lý:', {
      soilMoistureMin, soilMoistureMax, 
      temperatureMin, temperatureMax, 
      humidityMin, humidityMax
    });
    
    // Sử dụng transaction để đảm bảo tính nhất quán
    const newConfig = await prisma.$transaction(async (tx) => {
      // Luôn tạo bản ghi mới
      const newConfig = await tx.configuration.create({
        data: {
          soilMoistureMin,
          soilMoistureMax,
          temperatureMin,
          temperatureMax,
          humidityMin,
          humidityMax,
          createdAt: new Date(), // Đảm bảo thời gian tạo mới
          // Thêm mối quan hệ với user
          user: {
            connect: {
              id: userId
            }
          }
        }
      });
      
      console.log('Đã tạo bản ghi configuration mới với ID:', newConfig.id);
      return newConfig;
    });

    // Trả về kết quả
    return res.status(200).json({
      success: true,
      message: 'Lưu cấu hình thành công',
      configId: newConfig.id,
      config: {
        soilMoisture: {
          min: newConfig.soilMoistureMin,
          max: newConfig.soilMoistureMax
        },
        temperature: {
          min: newConfig.temperatureMin,
          max: newConfig.temperatureMax
        },
        airHumidity: {
          min: newConfig.humidityMin,
          max: newConfig.humidityMax
        }
      }
    });
  } catch (error) {
    console.error('Lỗi khi lưu cấu hình:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Lỗi khi lưu cấu hình', 
      error: error.message 
    });
  } finally {
    // Luôn giải phóng khóa sau khi hoàn thành
    delete configLock[lockKey];
    console.log(`Đã giải phóng khóa: ${lockKey}`);
  }
};

// Lấy cấu hình hiện tại của người dùng
exports.getCurrentConfig = async (req, res) => {
  try {
    const userId = req.user.id;

    // Lấy cấu hình mới nhất của người dùng
    const latestConfig = await prisma.configuration.findFirst({
      where: {
        userId: userId
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!latestConfig) {
      return res.status(404).json({ 
        success: false, 
        message: 'Không tìm thấy cấu hình' 
      });
    }

    // Trả về cấu hình đã được định dạng
    return res.status(200).json({
      success: true,
      configId: latestConfig.id,
      createdAt: latestConfig.createdAt,
      config: {
        soilMoisture: {
          min: latestConfig.soilMoistureMin,
          max: latestConfig.soilMoistureMax
        },
        temperature: {
          min: latestConfig.temperatureMin,
          max: latestConfig.temperatureMax
        },
        airHumidity: {
          min: latestConfig.humidityMin,
          max: latestConfig.humidityMax
        }
      }
    });
  } catch (error) {
    console.error('Lỗi khi lấy cấu hình:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Lỗi khi lấy cấu hình', 
      error: error.message 
    });
  }
};

// Lấy lịch sử cấu hình của người dùng
exports.getConfigHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 10;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;

    // Lấy lịch sử cấu hình của người dùng
    const configHistory = await prisma.configuration.findMany({
      where: {
        userId: userId
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: skip,
      take: limit
    });

    // Đếm tổng số bản ghi
    const totalCount = await prisma.configuration.count({
      where: {
        userId: userId
      }
    });

    // Định dạng kết quả trả về
    const formattedHistory = configHistory.map(config => ({
      id: config.id,
      createdAt: config.createdAt,
      config: {
        soilMoisture: {
          min: config.soilMoistureMin,
          max: config.soilMoistureMax
        },
        temperature: {
          min: config.temperatureMin,
          max: config.temperatureMax
        },
        airHumidity: {
          min: config.humidityMin,
          max: config.humidityMax
        }
      }
    }));

    return res.status(200).json({
      success: true,
      history: formattedHistory,
      pagination: {
        total: totalCount,
        page: page,
        limit: limit,
        pages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('Lỗi khi lấy lịch sử cấu hình:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Lỗi khi lấy lịch sử cấu hình', 
      error: error.message 
    });
  }
};

// Lấy cấu hình mặc định
exports.getDefaultConfig = (req, res) => {
  try {
    const defaultConfig = getDefaultConfig();
    return res.status(200).json(defaultConfig);
  } catch (error) {
    console.error('Lỗi khi lấy cấu hình mặc định:', error);
    return res.status(500).json({ success: false, message: 'Đã xảy ra lỗi khi lấy cấu hình mặc định', error: error.message });
  }
}; 