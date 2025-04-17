const prisma = require('../../config/database');
const notificationService = require('./notificationService');
const mqttService = require('./mqtt.service');

class AutomationService {
  constructor() {
    this.isEnabled = true;
    this.io = null;
    this.deviceStates = new Map(); // Lưu trạng thái hiện tại của các thiết bị
    console.log('✅ AutomationService đã được khởi tạo');
    console.log('🚨 Automation is ENABLED by default. Current automation status:', this.isEnabled ? 'ON' : 'OFF');
  }
  
  // Lấy trạng thái tự động hóa
  getStatus() {
    return {
      enabled: this.isEnabled,
      deviceStates: this._formatDeviceStates(),
      lastUpdated: new Date().toISOString()
    };
  }

  // Bật/tắt tự động hóa
  toggleAutomation(enabled) {
    const previousState = this.isEnabled;
    this.isEnabled = enabled;
    
    if (previousState !== enabled) {
      console.log(`${enabled ? '🟢 ĐÃ BẬT' : '🔴 ĐÃ TẮT'} tự động hóa`);
    } else {
      console.log(`ℹ️ Tự động hóa đã ${enabled ? 'bật' : 'tắt'} từ trước`);
    }
    
    // Lưu lại thời điểm thay đổi
    this.lastToggled = new Date().toISOString();
    
    // Trả về trạng thái đầy đủ
    return {
      ...this.getStatus(),
      lastToggled: this.lastToggled
    };
  }
  
  // Xử lý dữ liệu cảm biến và thực hiện tự động hóa
  async processSensorData(deviceId, sensorData) {
    // Nếu tự động hóa bị tắt, không xử lý
    if (!this.isEnabled) {
      console.log('🚫 Tự động hóa đang bị tắt, bỏ qua xử lý dữ liệu cảm biến');
      return false;
    }

    try {
      console.log(`🔴 AUTOMATION SERVICE ĐANG XỬ LÝ 🔴 dữ liệu cảm biến cho thiết bị ${deviceId}:`, JSON.stringify(sensorData));
      
      // Kiểm tra xem dữ liệu cảm biến có hợp lệ không
      if (!sensorData || Object.keys(sensorData).length === 0) {
        console.error('❌ Dữ liệu cảm biến không hợp lệ hoặc rỗng');
        return false;
      }
      
      // Tìm thiết bị
      const device = await prisma.iotdevice.findUnique({
        where: { id: parseInt(deviceId) },
        include: {
          feed: true
        }
      });
      
      if (!device) {
        console.error(`❌ Không tìm thấy thiết bị với ID ${deviceId}`);
        return false;
      }
      
      console.log(`✅ Đã tìm thấy thiết bị: ${device.deviceCode} (ID: ${deviceId})`);
      
      // Lấy cấu hình ngưỡng mới nhất từ bảng configuration
      let thresholds = this._getDefaultThresholds();
      
      try {
        // Lấy cấu hình mới nhất từ bảng configuration
        const latestConfig = await prisma.configuration.findFirst({
          orderBy: { updatedAt: 'desc' }
        });
        
        if (latestConfig) {
          console.log(`✅ Đã tìm thấy cấu hình mới nhất (ID: ${latestConfig.id}, Ngày cập nhật: ${latestConfig.updatedAt})`);
          
          thresholds = {
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
          };
        } else {
          console.log('⚠️ Không tìm thấy cấu hình nào, sử dụng ngưỡng mặc định');
        }
      } catch (configErr) {
        console.error('❌ Lỗi khi lấy cấu hình từ bảng configuration:', configErr);
        console.log('⚠️ Sử dụng ngưỡng mặc định');
      }
      
      console.log(`📊 Ngưỡng hiện tại:`, JSON.stringify(thresholds));
      
      // Xác định các thiết bị cần điều khiển
      let shouldTurnOnPump = false;
      let shouldTurnOnLight = false;
      
      // Kiểm tra độ ẩm không khí
      if (sensorData.airHumidity !== undefined) {
        console.log(`🌡️ Độ ẩm không khí: ${sensorData.airHumidity}%, Ngưỡng: ${thresholds.airHumidity.min}% - ${thresholds.airHumidity.max}%`);
        
        if (sensorData.airHumidity < thresholds.airHumidity.min) {
          console.log(`🌧️ Độ ẩm không khí ${sensorData.airHumidity}% < ngưỡng tối thiểu ${thresholds.airHumidity.min}% -> Bật máy bơm`);
          shouldTurnOnPump = true;
          await this._createThresholdNotification(device, 'airHumidity', 'below', sensorData.airHumidity, thresholds.airHumidity.min);
        } else if (sensorData.airHumidity > thresholds.airHumidity.max) {
          console.log(`☀️ Độ ẩm không khí ${sensorData.airHumidity}% > ngưỡng tối đa ${thresholds.airHumidity.max}% -> Bật đèn`);
          shouldTurnOnLight = true;
          await this._createThresholdNotification(device, 'airHumidity', 'above', sensorData.airHumidity, thresholds.airHumidity.max);
        } else {
          console.log(`✅ Độ ẩm không khí ${sensorData.airHumidity}% nằm trong ngưỡng cho phép`);
        }
      }
      
      // Kiểm tra nhiệt độ
      if (sensorData.temperature !== undefined) {
        console.log(`🌡️ Nhiệt độ: ${sensorData.temperature}°C, Ngưỡng: ${thresholds.temperature.min}°C - ${thresholds.temperature.max}°C`);
        
        if (sensorData.temperature < thresholds.temperature.min) {
          console.log(`❄️ Nhiệt độ ${sensorData.temperature}°C < ngưỡng tối thiểu ${thresholds.temperature.min}°C -> BẬT ĐÈN`);
          shouldTurnOnLight = true;
          await this._createThresholdNotification(device, 'temperature', 'below', sensorData.temperature, thresholds.temperature.min);
        } else if (sensorData.temperature > thresholds.temperature.max) {
          console.log(`🔥 Nhiệt độ ${sensorData.temperature}°C > ngưỡng tối đa ${thresholds.temperature.max}°C -> BẬT MÁY BƠM`);
          shouldTurnOnPump = true;
          await this._createThresholdNotification(device, 'temperature', 'above', sensorData.temperature, thresholds.temperature.max);
        } else {
          console.log(`✅ Nhiệt độ ${sensorData.temperature}°C nằm trong ngưỡng cho phép`);
        }
      }
      
      // Kiểm tra độ ẩm đất
      if (sensorData.soilMoisture !== undefined) {
        console.log(`🌡️ Độ ẩm đất: ${sensorData.soilMoisture}%, Ngưỡng: ${thresholds.soilMoisture.min}% - ${thresholds.soilMoisture.max}%`);
        
        if (sensorData.soilMoisture < thresholds.soilMoisture.min) {
          console.log(`🏜️ Độ ẩm đất ${sensorData.soilMoisture}% < ngưỡng tối thiểu ${thresholds.soilMoisture.min}% -> Bật đèn`);
          shouldTurnOnPump = true;
          await this._createThresholdNotification(device, 'soilMoisture', 'below', sensorData.soilMoisture, thresholds.soilMoisture.min);
        } else if (sensorData.soilMoisture > thresholds.soilMoisture.max) {
          console.log(`💧 Độ ẩm đất ${sensorData.soilMoisture}% > ngưỡng tối đa ${thresholds.soilMoisture.max}% -> Bật máy bơm`);
          shouldTurnOnLight = true;
          await this._createThresholdNotification(device, 'soilMoisture', 'above', sensorData.soilMoisture, thresholds.soilMoisture.max);
        } else {
          console.log(`✅ Độ ẩm đất ${sensorData.soilMoisture}% nằm trong ngưỡng cho phép`);
        }
      }
      
      // Kiểm tra xem tất cả các giá trị đều trong khoảng cho phép không
      const allValuesInRange = this._checkAllValuesInRange(sensorData, thresholds);
      console.log(`🔍 Tất cả giá trị ${allValuesInRange ? 'đã' : 'chưa'} nằm trong ngưỡng cho phép`);
      
      // Lấy danh sách thiết bị máy bơm và đèn
      console.log(`🔍 Tìm thiết bị máy bơm (deviceType='pump_water')...`);
      const pumpDevices = await prisma.iotdevice.findMany({
        where: {
          deviceType: 'pump_water'
        }
      });
      
      console.log(`🔍 Tìm thiết bị đèn (deviceType='light')...`);
      const lightDevices = await prisma.iotdevice.findMany({
        where: {
          deviceType: 'light'
        }
      });
      
      console.log(`📋 Tìm thấy ${pumpDevices.length} thiết bị máy bơm và ${lightDevices.length} thiết bị đèn`);
      
      // Hiển thị chi tiết các thiết bị tìm được để gỡ lỗi
      if (pumpDevices.length > 0) {
        console.log(`📋 Chi tiết thiết bị máy bơm: ID=${pumpDevices[0].id}, Code=${pumpDevices[0].deviceCode}`);
      }
      
      if (lightDevices.length > 0) {
        console.log(`📋 Chi tiết thiết bị đèn: ID=${lightDevices[0].id}, Code=${lightDevices[0].deviceCode}`);
      }
      
      // Lấy trạng thái hiện tại từ các bảng dữ liệu
      let currentPumpState = false;
      let currentLightState = false;
      
      if (pumpDevices.length > 0) {
        try {
          // Lấy dữ liệu mới nhất từ bảng pumpwaterdata
          const latestPumpData = await prisma.pumpwaterdata.findFirst({
            where: { deviceId: pumpDevices[0].id },
            orderBy: { readingTime: 'desc' }
          });
          
          if (latestPumpData) {
            currentPumpState = latestPumpData.status === 'On';
            console.log(`📊 Trạng thái máy bơm từ pumpwaterdata: ${latestPumpData.status} (${currentPumpState ? 'On' : 'Off'}), thời điểm: ${latestPumpData.readingTime}`);
          } else {
            console.log(`⚠️ Không tìm thấy dữ liệu máy bơm, giả định trạng thái: Off`);
            currentPumpState = false;
          }
        } catch (err) {
          console.error(`❌ Lỗi khi lấy dữ liệu máy bơm:`, err);
          currentPumpState = false;
        }
      }
      
      if (lightDevices.length > 0) {
        try {
          // Lấy dữ liệu mới nhất từ bảng lightdata
          const latestLightData = await prisma.lightdata.findFirst({
            where: { deviceId: lightDevices[0].id },
            orderBy: { readingTime: 'desc' }
          });
          
          if (latestLightData) {
            currentLightState = latestLightData.status === 'On';
            console.log(`📊 Trạng thái đèn từ lightdata: ${latestLightData.status} (${currentLightState ? 'On' : 'Off'}), thời điểm: ${latestLightData.readingTime}`);
          } else {
            console.log(`⚠️ Không tìm thấy dữ liệu đèn, giả định trạng thái: Off`);
            currentLightState = false;
          }
        } catch (err) {
          console.error(`❌ Lỗi khi lấy dữ liệu đèn:`, err);
          currentLightState = false;
        }
      }
      
      console.log(`📊 Trạng thái hiện tại của thiết bị: Máy bơm=${currentPumpState ? 'On' : 'Off'}, Đèn=${currentLightState ? 'On' : 'Off'}`);
      
      // Điều khiển máy bơm nếu cần thiết
      if (shouldTurnOnPump && !currentPumpState) {
        console.log(`🚰 Thực hiện bật máy bơm...`);
        const pumpResult = await this._controlDevice(device, 'pump', true);
        console.log(`${pumpResult ? '✅' : '❌'} Kết quả bật máy bơm: ${pumpResult ? 'thành công' : 'thất bại'}`);
      } else if (!shouldTurnOnPump && currentPumpState && allValuesInRange) {
        console.log(`🚰 Thực hiện tắt máy bơm...`);
        const pumpResult = await this._controlDevice(device, 'pump', false);
        console.log(`${pumpResult ? '✅' : '❌'} Kết quả tắt máy bơm: ${pumpResult ? 'thành công' : 'thất bại'}`);
      } else {
        console.log(`🚰 Giữ nguyên trạng thái máy bơm: ${currentPumpState ? 'On' : 'Off'}`);
      }
      
      // Điều khiển đèn nếu cần thiết
      if (shouldTurnOnLight && !currentLightState) {
        console.log(`💡 Thực hiện bật đèn...`);
        const lightResult = await this._controlDevice(device, 'light', true);
        console.log(`${lightResult ? '✅' : '❌'} Kết quả bật đèn: ${lightResult ? 'thành công' : 'thất bại'}`);
      } else if (!shouldTurnOnLight && currentLightState && allValuesInRange) {
        console.log(`💡 Thực hiện tắt đèn...`);
        const lightResult = await this._controlDevice(device, 'light', false);
        console.log(`${lightResult ? '✅' : '❌'} Kết quả tắt đèn: ${lightResult ? 'thành công' : 'thất bại'}`);
      } else {
        console.log(`💡 Giữ nguyên trạng thái đèn: ${currentLightState ? 'On' : 'Off'}`);
      }
      
      // Cập nhật lại map trạng thái nội bộ để phù hợp với database
      const deviceKey = `device_${device.id}`;
      this.deviceStates.set(deviceKey, { 
        pump: currentPumpState, 
        light: currentLightState 
      });
      
      // Hiển thị trạng thái cập nhật
      const updatedState = this.deviceStates.get(deviceKey);
      console.log(`📊 Trạng thái đã cập nhật của thiết bị: Máy bơm=${updatedState.pump ? 'On' : 'Off'}, Đèn=${updatedState.light ? 'On' : 'Off'}`);
      
      return true;
    } catch (error) {
      console.error('❌ Lỗi xử lý dữ liệu cảm biến cho tự động hóa:', error);
      return false;
    }
  }
  
  // Kiểm tra xem tất cả các giá trị đều nằm trong khoảng cho phép không
  _checkAllValuesInRange(sensorData, thresholds) {
    let airHumidityInRange = true;
    let temperatureInRange = true;
    let soilMoistureInRange = true;
    
    if (sensorData.airHumidity !== undefined) {
      airHumidityInRange = (
        sensorData.airHumidity >= thresholds.airHumidity.min && 
        sensorData.airHumidity <= thresholds.airHumidity.max
      );
    }
    
    if (sensorData.temperature !== undefined) {
      temperatureInRange = (
        sensorData.temperature >= thresholds.temperature.min && 
        sensorData.temperature <= thresholds.temperature.max
      );
    }
    
    if (sensorData.soilMoisture !== undefined) {
      soilMoistureInRange = (
        sensorData.soilMoisture >= thresholds.soilMoisture.min && 
        sensorData.soilMoisture <= thresholds.soilMoisture.max
      );
    }
    
    return airHumidityInRange && temperatureInRange && soilMoistureInRange;
  }
  
  // Điều khiển thiết bị
  async _controlDevice(device, deviceType, turnOn) {
    try {
      console.log(`🔧 BẮT ĐẦU ĐIỀU KHIỂN ${deviceType === 'pump' ? 'MÁY BƠM' : 'ĐÈN'} [${turnOn ? 'BẬT' : 'TẮT'}] cho thiết bị ${device.deviceCode}...`);
      
      // Kiểm tra lại để đảm bảo dùng đúng đầu vào
      if (!device || !device.id) {
        console.error(`❌ Thiết bị không hợp lệ hoặc thiếu ID`);
        return false;
      }
      
      // Find the appropriate device to control (pump or light)
      let deviceToControl = null;
      
      try {
        console.log(`🔍 Tìm thiết bị ${deviceType} trong database...`);
        
        // Find the device by type
        deviceToControl = await prisma.iotdevice.findFirst({
          where: {
            deviceType: deviceType === 'pump' ? 'pump_water' : 'light'
          },
          include: {
            feed: true
          }
        });
        
        if (!deviceToControl) {
          console.warn(`⚠️ Không tìm thấy thiết bị ${deviceType} trong database, thử tìm theo deviceCode...`);
          
          // Try to find by device code if not found by type
          deviceToControl = await prisma.iotdevice.findFirst({
            where: {
              OR: [
                { deviceCode: { contains: deviceType === 'pump' ? 'pump' : 'light' } },
                { deviceCode: { contains: deviceType === 'pump' ? 'bom' : 'den' } }
              ]
            },
            include: {
              feed: true
            }
          });
        }
        
        if (!deviceToControl) {
          console.error(`❌ Không tìm thấy thiết bị ${deviceType} nào trong hệ thống!`);
          return false;
        }
        
        console.log(`✅ Đã tìm thấy thiết bị ${deviceType}: ${deviceToControl.deviceCode} (ID: ${deviceToControl.id})`);
        
        // Kiểm tra feed của thiết bị
        if (deviceToControl.feed && deviceToControl.feed.length > 0) {
          console.log(`📡 Thiết bị có ${deviceToControl.feed.length} feed:`);
          deviceToControl.feed.forEach((f, index) => {
            console.log(`   - Feed #${index+1}: ${f.name || 'Không tên'} (${f.feedKey})`);
          });
        } else {
          console.warn(`⚠️ Thiết bị không có feed nào!`);
        }
      } catch (err) {
        console.error(`❌ Lỗi khi tìm thiết bị ${deviceType}:`, err);
        return false;
      }
      
      // Tạo lệnh điều khiển
      const command = {
        status: turnOn ? 'On' : 'Off',
        value: turnOn ? 100 : 0
      };
      
      console.log(`📤 Gửi lệnh điều khiển qua MQTT: ${JSON.stringify(command)}`);
      
      // Gửi lệnh điều khiển qua MQTT - Tránh circular dependency
      let mqttResult = false;
      try {
        // Import MQTT service một cách an toàn
        const mqttServiceModule = require('./mqtt.service');
        
        if (typeof mqttServiceModule.publishToDevice === 'function') {
          console.log(`✅ Tìm thấy phương thức publishToDevice trong module MQTT`);
          mqttResult = await mqttServiceModule.publishToDevice(deviceToControl.id, deviceType, command);
        } else {
          // Sử dụng MQTT client trực tiếp nếu cần
          console.warn(`⚠️ Không tìm thấy phương thức publishToDevice trong module MQTT, sử dụng phương pháp thay thế`);
          
          // Tìm feed phù hợp
          let targetFeed = null;
          if (deviceToControl.feed && deviceToControl.feed.length > 0) {
            if (deviceType === 'pump') {
              targetFeed = deviceToControl.feed.find(f => 
                f.feedKey?.toLowerCase().includes('pump') || 
                f.feedKey?.toLowerCase().includes('bom')
              );
            } else {
              targetFeed = deviceToControl.feed.find(f => 
                f.feedKey?.toLowerCase().includes('light') || 
                f.feedKey?.toLowerCase().includes('den')
              );
            }
            
            // Nếu không tìm thấy, dùng feed đầu tiên
            if (!targetFeed) targetFeed = deviceToControl.feed[0];
          }
          
          if (targetFeed) {
            console.log(`📡 Sử dụng feed: ${targetFeed.feedKey} để gửi lệnh`);
            
            if (mqttServiceModule.publishToMQTT) {
              mqttResult = await mqttServiceModule.publishToMQTT(
                deviceToControl.id, 
                targetFeed.feedKey, 
                command.status === 'On' ? (deviceType === 'pump' ? '100' : '1') : '0'
              );
            } else {
              console.error(`❌ Không tìm thấy phương thức gửi MQTT nào!`);
              mqttResult = false;
            }
          } else {
            console.error(`❌ Không tìm thấy feed cho thiết bị ${deviceType}!`);
            mqttResult = false;
          }
        }
      } catch (err) {
        console.error(`❌ Lỗi khi gửi lệnh MQTT:`, err);
        mqttResult = false;
      }
      
      if (!mqttResult) {
        console.error(`❌ Gửi lệnh MQTT thất bại`);
        return false;
      }
      
      console.log(`✅ Đã gửi lệnh MQTT thành công`);
      
      // Kiểm tra lại trạng thái thiết bị sau khi điều khiển
      setTimeout(async () => {
        try {
          if (deviceType === 'pump') {
            // Kiểm tra trạng thái máy bơm từ bảng pumpwaterdata
            const latestPumpData = await prisma.pumpwaterdata.findFirst({
              where: { deviceId: deviceToControl.id },
              orderBy: { readingTime: 'desc' }
            });
            
            if (latestPumpData) {
              console.log(`📋 Trạng thái máy bơm sau khi điều khiển: ${latestPumpData.status} (Tốc độ: ${latestPumpData.pumpSpeed}%), thời điểm: ${latestPumpData.readingTime}`);
            } else {
              console.log(`⚠️ Không tìm thấy dữ liệu máy bơm sau khi điều khiển`);
            }
          } else if (deviceType === 'light') {
            // Kiểm tra trạng thái đèn từ bảng lightdata
            const latestLightData = await prisma.lightdata.findFirst({
              where: { deviceId: deviceToControl.id },
              orderBy: { readingTime: 'desc' }
            });
            
            if (latestLightData) {
              console.log(`📋 Trạng thái đèn sau khi điều khiển: ${latestLightData.status} (Cường độ: ${latestLightData.intensity}%), thời điểm: ${latestLightData.readingTime}`);
            } else {
              console.log(`⚠️ Không tìm thấy dữ liệu đèn sau khi điều khiển`);
            }
          }
        } catch (err) {
          console.error(`❌ Không thể kiểm tra trạng thái sau khi điều khiển:`, err);
        }
      }, 2000);
      
      // Cập nhật map trạng thái nội bộ dựa trên dữ liệu database
      const deviceKey = `device_${device.id}`;
      let currentState = this.deviceStates.get(deviceKey) || { pump: false, light: false };
      
      if (deviceType === 'pump') {
        currentState.pump = turnOn;
      } else if (deviceType === 'light') {
        currentState.light = turnOn;
      }
      
      this.deviceStates.set(deviceKey, currentState);
      
      console.log(`✅ Đã cập nhật trạng thái thiết bị trong bộ nhớ: ${JSON.stringify(currentState)}`);
      
      // Tạo thông báo
      try {
        const actionType = deviceType === 'pump' ? 'PUMP' : 'LIGHT';
        const message = `Đã ${turnOn ? 'bật' : 'tắt'} ${deviceType === 'pump' ? 'máy bơm' : 'đèn'} ${deviceToControl.deviceCode} do cảm biến ${device.deviceCode} ${turnOn ? 'vượt' : 'trở về'} ngưỡng`;
        
        // Lấy userId từ thiết bị điều khiển hoặc thiết bị cảm biến
        let userId = deviceToControl.userId || device.userId;
        if (!userId) {
          console.log(`⚠️ Không tìm thấy userId, sử dụng ID mặc định`);
          userId = 1; // ID mặc định hoặc admin
        }
        
        await notificationService.createNotification({
          userId: userId,
          deviceId: device.id,
          type: 'AUTOMATION',
          message,
          source: deviceToControl.deviceCode,
          isRead: false,
          value: JSON.stringify(command)
        });
        
        console.log(`✅ Đã tạo thông báo`);
      } catch (notifyError) {
        console.error(`⚠️ Lỗi khi tạo thông báo (không ảnh hưởng đến điều khiển thiết bị):`, notifyError);
      }
      
      console.log(`🤖 Tự động hóa: Đã ${turnOn ? 'bật' : 'tắt'} ${deviceType} cho thiết bị ${device.id}`);
      
      return true;
    } catch (error) {
      console.error(`❌ Lỗi khi điều khiển thiết bị ${deviceType}:`, error);
      return false;
    }
  }
  
  // Tạo thông báo khi vượt ngưỡng
  async _createThresholdNotification(device, sensorType, thresholdType, value, threshold) {
    try {
      const sensorNames = {
        airHumidity: 'độ ẩm không khí',
        temperature: 'nhiệt độ',
        soilMoisture: 'độ ẩm đất'
      };
      
      const message = `${sensorNames[sensorType]} ${thresholdType === 'above' ? 'vượt quá' : 'thấp hơn'} ngưỡng: ${value} ${sensorType === 'temperature' ? '°C' : '%'} (Ngưỡng: ${threshold} ${sensorType === 'temperature' ? '°C' : '%'})`;
      
      console.log(`📣 Tạo thông báo vượt ngưỡng: ${message}`);
      
      // Tìm user ID nếu không có trong thiết bị
      let userId = device.userId;
      if (!userId) {
        console.log(`⚠️ Không tìm thấy userId trong thiết bị, sử dụng ID mặc định hoặc admin`);
        // Nếu không có userId, có thể sử dụng ID admin hoặc ID mặc định
        userId = 1; // Giả sử ID 1 là admin hoặc hệ thống 
      }
      
      await notificationService.createNotification({
        userId: userId,
        deviceId: device.id,
        type: 'THRESHOLD',
        message,
        source: device.deviceCode,
        isRead: false,
        value: JSON.stringify({ sensorType, value, threshold, thresholdType })
      });
      
      console.log(`✅ Đã tạo thông báo vượt ngưỡng thành công`);
      return true;
    } catch (error) {
      console.error(`❌ Lỗi khi tạo thông báo vượt ngưỡng:`, error);
      return false;
    }
  }
  
  // Ngưỡng mặc định nếu không tìm thấy cấu hình
  _getDefaultThresholds() {
    return {
      soilMoisture: { min: 20, max: 80 },
      temperature: { min: 20, max: 35 },
      airHumidity: { min: 40, max: 80 }
    };
  }
  
  // Chuyển đổi Map thành định dạng có thể gửi cho client
  _formatDeviceStates() {
    const result = {};
    
    for (const [deviceKey, state] of this.deviceStates.entries()) {
      const deviceId = deviceKey.replace('device_', '');
      result[deviceId] = state;
    }
    
    // Trả về định dạng đơn giản chỉ với pump và light nếu không có thiết bị nào
    if (Object.keys(result).length === 0) {
      return {
        pump: false,
        light: false
      };
    }
    
    return result;
  }
  
  // Thiết lập đối tượng Socket.IO
  setSocketIO(io) {
    this.io = io;
    console.log('✅ Đã thiết lập Socket.IO cho AutomationService');
  }
}

// Singleton instance
const automationService = new AutomationService();

module.exports = automationService; 