import React, { createContext, useContext, useState, useEffect } from 'react';
import socketService from '../services/socketService';

// Tên khóa để lưu dữ liệu vào localStorage
const SENSOR_DATA_KEY = 'smart_watering_system_sensor_data';
const PREV_DATA_KEY = 'smart_watering_system_prev_data';

// Kiểm tra khả năng sử dụng localStorage
const isLocalStorageAvailable = () => {
  // try {
  //   const testKey = '__test_key__';
  //   localStorage.setItem(testKey, testKey);
  //   localStorage.removeItem(testKey);
  //   return true;
  // } catch (e) {
  //   console.error('localStorage not available:', e);
  //   return false;
  // }

  return true;
};

// Lấy dữ liệu cảm biến đã lưu từ localStorage
const getSavedSensorData = () => {
  try {
    const savedData = localStorage.getItem(SENSOR_DATA_KEY);
    console.log('SensorContext: Trying to load saved data:', savedData);
    
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        console.log('SensorContext: Successfully loaded saved sensor data:', parsedData);
        
        // Kiểm tra tính hợp lệ của dữ liệu
        if (parsedData && typeof parsedData === 'object') {
          // Đảm bảo dữ liệu có cấu trúc hợp lệ và ưu tiên dữ liệu đã lưu
          const validData = {
            soilMoisture: typeof parsedData.soilMoisture === 'number' ? parsedData.soilMoisture : 0,
            temperature: typeof parsedData.temperature === 'number' ? parsedData.temperature : 0,
            airHumidity: typeof parsedData.airHumidity === 'number' ? parsedData.airHumidity : 0,
            pumpWater: {
              // Ensure we properly extract the pump speed
              speed: parsedData.pumpWater && typeof parsedData.pumpWater.speed === 'number' 
                ? parsedData.pumpWater.speed 
                : 0
            },
            light: {
              status: parsedData.light?.status || 'Off',
              brightness: typeof parsedData.light?.brightness === 'number' ? parsedData.light.brightness : 0
            },
            loading: false,
            error: null
          };
          
          // Always derive pump status from speed
          validData.pumpWater.status = validData.pumpWater.speed > 0 ? 'On' : 'Off';
          
          console.log('SensorContext: Using saved sensor data:', validData);
          console.log('SensorContext: Pump water data loaded:', validData.pumpWater);
          return validData;
        }
      } catch (parseError) {
        console.error('SensorContext: Error parsing saved sensor data:', parseError);
      }
    }
  } catch (e) {
    console.error('SensorContext: Error accessing localStorage:', e);
  }
  
  console.log('SensorContext: No valid saved data found, using default sensor data');
  return getDefaultSensorData();
};

// Giá trị mặc định cho dữ liệu cảm biến
const getDefaultSensorData = () => ({
  soilMoisture: 0,
  temperature: 0,
  airHumidity: 0,
  pumpWater: {
    status: 'Off',
    speed: 0
  },
  light: {
    status: 'Off'
  },
  loading: true,
  error: null
});

// Lấy dữ liệu cảm biến trước đó từ localStorage
const getSavedPrevData = () => {
  if (!isLocalStorageAvailable()) {
    return getDefaultPrevData();
  }

  try {
    const savedData = localStorage.getItem(PREV_DATA_KEY);
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        console.log('SensorContext: Successfully loaded previous sensor data:', parsedData);
        
        if (parsedData && typeof parsedData === 'object') {
          const validData = {
            soilMoisture: typeof parsedData.soilMoisture === 'number' ? parsedData.soilMoisture : 0,
            temperature: typeof parsedData.temperature === 'number' ? parsedData.temperature : 0,
            airHumidity: typeof parsedData.airHumidity === 'number' ? parsedData.airHumidity : 0,
            pumpWater: {
              speed: typeof parsedData.pumpWater?.speed === 'number' ? parsedData.pumpWater.speed : 0
            },
            light: {
              status: parsedData.light?.status || 'Off'
            }
          };
          return validData;
        }
      } catch (parseError) {
        console.error('SensorContext: Error parsing saved previous data:', parseError);
      }
    }
  } catch (e) {
    console.error('SensorContext: Error accessing localStorage for previous data:', e);
  }
  
  return getDefaultPrevData();
};

// Giá trị mặc định cho dữ liệu trước đó
const getDefaultPrevData = () => ({
  soilMoisture: 0,
  temperature: 0,
  airHumidity: 0,
  pumpWater: {
    speed: 0
  },
  light: {
    status: 'Off'
  }
});

// Lưu dữ liệu vào localStorage an toàn
const saveToLocalStorage = (key, data) => {
  try {
    // Make sure the pump water data is properly structured
    const processedData = { ...data };
    
    // Ensure pumpWater has both status and speed if it exists
    if (processedData.pumpWater) {
      const speed = processedData.pumpWater.speed !== undefined ? processedData.pumpWater.speed : 0;
      const status = speed > 0 ? 'On' : 'Off';
      
      processedData.pumpWater = {
        status: status,
        speed: speed
      };
      
      console.log(`SensorContext: Processed pump data for storage:`, processedData.pumpWater);
    }
    
    const serialized = JSON.stringify(processedData);
    localStorage.setItem(key, serialized);
    console.log(`SensorContext: Successfully saved data to ${key}:`, processedData);
    return true;
  } catch (e) {
    console.error(`SensorContext: Error saving data to ${key}:`, e);
    return false;
  }
};

// Tạo context
const SensorContext = createContext();

// Hook để sử dụng SensorContext
export const useSensorData = () => {
  return useContext(SensorContext);
};

// Provider component
export const SensorProvider = ({ children }) => {
  // Khởi tạo state với dữ liệu từ localStorage
  const [sensorData, setSensorData] = useState(getSavedSensorData());
  const [prevData, setPrevData] = useState(getSavedPrevData());
  const [socketConnected, setSocketConnected] = useState(false);
  const [storageAvailable] = useState(isLocalStorageAvailable());
  
  // Thêm state theo dõi trạng thái ngưỡng của các cảm biến
  const [thresholdAlerts, setThresholdAlerts] = useState({
    soilMoisture: { high: false, low: false, timestamp: null },
    temperature: { high: false, low: false, timestamp: null },
    airHumidity: { high: false, low: false, timestamp: null }
  });
  
  // Thêm state để theo dõi lý do thiết bị được bật
  const [deviceTriggers, setDeviceTriggers] = useState({
    pump: {
      soilMoistureLow: false,
      temperatureHigh: false,
      airHumidityLow: false
    },
    light: {
      soilMoistureHigh: false,
      temperatureHigh: false,
      temperatureLow: false,
      airHumidityHigh: false
    }
  });
  
  // Thêm state để lưu trữ cấu hình ngưỡng
  const [thresholdConfig, setThresholdConfig] = useState({
    soilMoisture: { min: 0, max: 100 },  // Giá trị mặc định rộng để tránh cảnh báo sai
    temperature: { min: 0, max: 50 },
    airHumidity: { min: 0, max: 100 }
  });

  // Lưu dữ liệu cảm biến vào localStorage khi có thay đổi
  useEffect(() => {
    if (sensorData.loading || sensorData.error) return;

    // Chuẩn bị dữ liệu để lưu
    const dataToSave = {
      soilMoisture: sensorData.soilMoisture,
      temperature: sensorData.temperature,
      airHumidity: sensorData.airHumidity,
      pumpWater: sensorData.pumpWater,
      light: sensorData.light
    };

    console.log('SensorContext: Auto saving data on change:', dataToSave);
    
    // Lưu vào localStorage
    saveToLocalStorage(SENSOR_DATA_KEY, dataToSave);
  }, [sensorData]);

  // Lưu dữ liệu trước đó vào localStorage
  // useEffect(() => {
  //   if (!storageAvailable) return;
  //   saveToLocalStorage(PREV_DATA_KEY, prevData);
  // }, [prevData, storageAvailable]);

  // Hàm tính phần trăm thay đổi
  const calculatePercentChange = (current, previous) => {
    if (previous === 0) return 0;
    return Math.round(((current - previous) / previous) * 100);
  };
  
  // Check thresholds function
  const checkThresholds = (data) => {
    console.log('SensorContext: Checking thresholds for data:', data);
    console.log('SensorContext: Current thresholdAlerts:', thresholdAlerts);
    console.log('SensorContext: Using threshold config:', thresholdConfig);

    // Make sure we have valid data and thresholds to check
    if (!data) {
      console.warn('SensorContext: Missing data for threshold check');
      return false;
    }
    
    if (!thresholdConfig) {
      console.warn('SensorContext: Missing threshold config for check, using fallback thresholds');
      
      // Use sensible fallback thresholds if none available
      const fallbackConfig = {
        soilMoisture: { min: 20, max: 80 },   // Agriculture typically needs 20-80% moisture
        temperature: { min: 18, max: 32 },     // Most plants thrive between 18-32°C
        airHumidity: { min: 40, max: 80 }     // 40-80% is good for most plants
      };
      
      // Set the fallback config
      setThresholdConfig(fallbackConfig);
      
      // Continue with the fallback thresholds
      return checkThresholds(data);
    }

    // Create a new object to track changes (start with current alerts)
    let newAlerts = { ...thresholdAlerts };
    let newTriggers = { ...deviceTriggers };
    let alertsChanged = false;
    let triggersChanged = false;

    // Soil Moisture Check - Ảnh hưởng máy bơm và đèn
    if (data.soilMoisture !== undefined && thresholdConfig.soilMoisture) {
      const currentValue = Number(data.soilMoisture);
      const minThreshold = Number(thresholdConfig.soilMoisture.min);
      const maxThreshold = Number(thresholdConfig.soilMoisture.max);
      
      console.log(`SensorContext: Soil moisture check - Current: ${currentValue}, Min: ${minThreshold}, Max: ${maxThreshold}`);

      // Check against thresholds
      const isTooLow = !isNaN(currentValue) && !isNaN(minThreshold) && currentValue < minThreshold;
      const isTooHigh = !isNaN(currentValue) && !isNaN(maxThreshold) && currentValue > maxThreshold;
      const isNormal = !isTooLow && !isTooHigh;
      
      // Log the result of the check with more detail
      console.log(`SensorContext: Soil moisture threshold check result - Below Min: ${isTooLow}, Above Max: ${isTooHigh}, Normal: ${isNormal}`);
      
      // Cập nhật triggers cho máy bơm và đèn
      if (isTooLow !== newTriggers.pump.soilMoistureLow) {
        newTriggers.pump.soilMoistureLow = isTooLow;
        triggersChanged = true;
        console.log(`SensorContext: Pump trigger (soil moisture low) updated to: ${isTooLow}`);
      }
      
      if (isTooHigh !== newTriggers.light.soilMoistureHigh) {
        newTriggers.light.soilMoistureHigh = isTooHigh;
        triggersChanged = true;
        console.log(`SensorContext: Light trigger (soil moisture high) updated to: ${isTooHigh}`);
      }
      
      // Update alert status if different from current
      if (isTooLow !== newAlerts.soilMoisture.low || isTooHigh !== newAlerts.soilMoisture.high) {
        newAlerts.soilMoisture = {
          low: isTooLow,
          high: isTooHigh,
          timestamp: new Date().toISOString()
        };
        alertsChanged = true;
        console.log(`SensorContext: Soil moisture alert updated - Low: ${isTooLow}, High: ${isTooHigh}`);
      }
    }

    // Temperature Check - Ảnh hưởng máy bơm (cao) và đèn (thấp)
    if (data.temperature !== undefined && thresholdConfig.temperature) {
      const currentValue = Number(data.temperature);
      const minThreshold = Number(thresholdConfig.temperature.min);
      const maxThreshold = Number(thresholdConfig.temperature.max);
      
      console.log(`SensorContext: Temperature check - Current: ${currentValue}, Min: ${minThreshold}, Max: ${maxThreshold}`);

      // Check against thresholds
      const isTooLow = !isNaN(currentValue) && !isNaN(minThreshold) && currentValue < minThreshold;
      const isTooHigh = !isNaN(currentValue) && !isNaN(maxThreshold) && currentValue > maxThreshold;
      const isNormal = !isTooLow && !isTooHigh;
      
      // Log the result of the check with more detail
      console.log(`SensorContext: Temperature threshold check result - Below Min: ${isTooLow}, Above Max: ${isTooHigh}, Normal: ${isNormal}`);
      
      // Cập nhật triggers cho máy bơm (nhiệt độ cao) và đèn (nhiệt độ thấp)
      if (isTooHigh !== newTriggers.pump.temperatureHigh) {
        newTriggers.pump.temperatureHigh = isTooHigh;
        triggersChanged = true;
        console.log(`SensorContext: Pump trigger (temperature high) updated to: ${isTooHigh}`);
      }
      
      if (isTooLow !== newTriggers.light.temperatureLow) {
        newTriggers.light.temperatureLow = isTooLow;
        triggersChanged = true;
        console.log(`SensorContext: Light trigger (temperature low) updated to: ${isTooLow}`);
      }
      
      // Update alert status if different from current
      if (isTooLow !== newAlerts.temperature.low || isTooHigh !== newAlerts.temperature.high) {
        newAlerts.temperature = {
          low: isTooLow,
          high: isTooHigh,
          timestamp: new Date().toISOString()
        };
        alertsChanged = true;
        console.log(`SensorContext: Temperature alert updated - Low: ${isTooLow}, High: ${isTooHigh}`);
      }
    }

    // Air Humidity Check - Ảnh hưởng máy bơm (thấp) và đèn (cao)
    if (data.airHumidity !== undefined && thresholdConfig.airHumidity) {
      const currentValue = Number(data.airHumidity);
      const minThreshold = Number(thresholdConfig.airHumidity.min);
      const maxThreshold = Number(thresholdConfig.airHumidity.max);
      
      console.log(`SensorContext: Air humidity check - Current: ${currentValue}, Min: ${minThreshold}, Max: ${maxThreshold}`);

      // Check against thresholds
      const isTooLow = !isNaN(currentValue) && !isNaN(minThreshold) && currentValue < minThreshold;
      const isTooHigh = !isNaN(currentValue) && !isNaN(maxThreshold) && currentValue > maxThreshold;
      const isNormal = !isTooLow && !isTooHigh;
      
      // Log the result of the check with more detail
      console.log(`SensorContext: Air humidity threshold check result - Below Min: ${isTooLow}, Above Max: ${isTooHigh}, Normal: ${isNormal}`);
      
      // Cập nhật triggers cho máy bơm (độ ẩm thấp) và đèn (độ ẩm cao)
      if (isTooLow !== newTriggers.pump.airHumidityLow) {
        newTriggers.pump.airHumidityLow = isTooLow;
        triggersChanged = true;
        console.log(`SensorContext: Pump trigger (air humidity low) updated to: ${isTooLow}`);
      }
      
      if (isTooHigh !== newTriggers.light.airHumidityHigh) {
        newTriggers.light.airHumidityHigh = isTooHigh;
        triggersChanged = true;
        console.log(`SensorContext: Light trigger (air humidity high) updated to: ${isTooHigh}`);
      }
      
      // Update alert status if different from current
      if (isTooLow !== newAlerts.airHumidity.low || isTooHigh !== newAlerts.airHumidity.high) {
        newAlerts.airHumidity = {
          low: isTooLow,
          high: isTooHigh,
          timestamp: new Date().toISOString()
        };
        alertsChanged = true;
        console.log(`SensorContext: Air humidity alert updated - Low: ${isTooLow}, High: ${isTooHigh}`);
      }
    }

    // Tóm tắt trạng thái cảnh báo
    console.log('SensorContext: Threshold alert summary:', newAlerts);
    console.log('SensorContext: Device trigger summary:', newTriggers);

    // Cập nhật state nếu có thay đổi
    if (alertsChanged) {
      console.log('SensorContext: Updating threshold alerts');
      console.log('SensorContext: Old alerts:', thresholdAlerts);
      console.log('SensorContext: New alerts:', newAlerts);
      setThresholdAlerts(newAlerts);
    }
    
    if (triggersChanged) {
      console.log('SensorContext: Updating device triggers');
      console.log('SensorContext: Old triggers:', deviceTriggers);
      console.log('SensorContext: New triggers:', newTriggers);
      setDeviceTriggers(newTriggers);
      
      // Cập nhật trạng thái thiết bị dựa trên triggers mới
      updateDevicesBasedOnTriggers(newTriggers);
    }

    return true;
  };
  
  // Hàm cập nhật trạng thái các thiết bị dựa trên triggers
  const updateDevicesBasedOnTriggers = (triggers) => {
    console.log('SensorContext: Updating devices based on triggers:', triggers);
    
    // Xử lý máy bơm - bật khi: đất/không khí khô hoặc nhiệt độ cao
    const shouldPumpBeOn = triggers.pump.soilMoistureLow || 
                           triggers.pump.airHumidityLow || 
                           triggers.pump.temperatureHigh;
    
    // Xử lý đèn - bật khi: đất/không khí ẩm hoặc nhiệt độ thấp
    const shouldLightBeOn = triggers.light.soilMoistureHigh || 
                            triggers.light.airHumidityHigh || 
                            triggers.light.temperatureLow;
    
    console.log(`SensorContext: Pump should be ${shouldPumpBeOn ? 'ON' : 'OFF'}`);
    console.log(`SensorContext: Light should be ${shouldLightBeOn ? 'ON' : 'OFF'}`);
    
    // Lấy trạng thái hiện tại của các thiết bị
    const currentPumpStatus = sensorData.pumpWater?.status || 'Off';
    const currentPumpSpeed = sensorData.pumpWater?.speed || 0;
    const currentLightStatus = sensorData.light?.status || 'Off';
    
    // Quyết định trạng thái mới cho máy bơm
    let newPumpStatus = currentPumpStatus;
    let newPumpSpeed = currentPumpSpeed;
    let pumpChanged = false;
    
    if (shouldPumpBeOn && (currentPumpStatus !== 'On' || currentPumpSpeed === 0)) {
      newPumpStatus = 'On';
      newPumpSpeed = 100; // Tốc độ mặc định khi bật máy bơm
      pumpChanged = true;
      console.log('SensorContext: BẬT máy bơm theo triggers');
    } else if (!shouldPumpBeOn && currentPumpStatus === 'On') {
      newPumpStatus = 'Off';
      newPumpSpeed = 0;
      pumpChanged = true;
      console.log('SensorContext: TẮT máy bơm vì không còn triggers kích hoạt');
    }
    
    // Quyết định trạng thái mới cho đèn
    let newLightStatus = currentLightStatus;
    let lightChanged = false;
    
    if (shouldLightBeOn && currentLightStatus !== 'On') {
      newLightStatus = 'On';
      lightChanged = true;
      console.log('SensorContext: BẬT đèn theo triggers');
    } else if (!shouldLightBeOn && currentLightStatus === 'On') {
      newLightStatus = 'Off';
      lightChanged = true;
      console.log('SensorContext: TẮT đèn vì không còn triggers kích hoạt');
    }
    
    // Chỉ cập nhật state nếu có thay đổi
    if (pumpChanged || lightChanged) {
      setSensorData(prev => {
        const updated = {
          ...prev,
          pumpWater: {
            ...prev.pumpWater,
            status: newPumpStatus,
            speed: newPumpSpeed
          },
          light: {
            ...prev.light,
            status: newLightStatus
          }
        };
        
        console.log('SensorContext: Updated devices state:', {
          pump: `${newPumpStatus} (${newPumpSpeed}%)`,
          light: newLightStatus
        });
        
        return updated;
      });
    } else {
      console.log('SensorContext: No changes needed for devices');
    }
  };

  // Thêm hàm mới để cập nhật dữ liệu từ socket
  const updateFromSocketData = (socketData) => {
    console.log('SensorContext: Updating from socket data:', socketData);
    
    // Lưu dữ liệu cũ trước khi cập nhật - use sensorData not socketData
    setPrevData({
      soilMoisture: sensorData.soilMoisture,
      temperature: sensorData.temperature,
      airHumidity: sensorData.airHumidity,
      pumpWater: {
        speed: sensorData.pumpWater?.speed 
      },
      light: {
        status: sensorData.light?.status || 'Off'
      }
    });
    
    // Tạo object dữ liệu mới để cập nhật và kiểm tra ngưỡng
    const updatedData = { ...sensorData };
    
    // Cập nhật các giá trị mới từ socketData
    if (socketData.soilMoisture !== undefined) {
      updatedData.soilMoisture = socketData.soilMoisture;
    }
    
    if (socketData.temperature !== undefined) {
      updatedData.temperature = socketData.temperature;
    }
    
    if (socketData.airHumidity !== undefined) {
      updatedData.airHumidity = socketData.airHumidity;
    }
    
    if (socketData.pumpWater) {
      // Get the speed value - handle both field names
      const pumpSpeed = socketData.pumpWater.speed !== undefined ? socketData.pumpWater.speed : 
                      (socketData.pumpWater.pumpSpeed !== undefined ? socketData.pumpWater.pumpSpeed : updatedData.pumpWater?.speed);
      
      // Always derive status from speed
      const pumpStatus = pumpSpeed > 0 ? 'On' : 'Off';
      
      updatedData.pumpWater = {
        ...updatedData.pumpWater,
        status: pumpStatus,
        speed: pumpSpeed
      };
      
      console.log('SensorContext: Updated pump data from socket:', updatedData.pumpWater);
    }
    
    if (socketData.light) {
      updatedData.light = {
        ...updatedData.light,
        ...socketData.light
      };
    }
    
    // Cập nhật loading và error status
    updatedData.loading = false;
    updatedData.error = null;
    
    // Cập nhật state với dữ liệu mới
    setSensorData(updatedData);
    
    // Đánh dấu rằng đã kết nối socket
    setSocketConnected(true);
    
    // Kiểm tra ngưỡng ngay lập tức với dữ liệu mới
    console.log('SensorContext: Kiểm tra ngưỡng sau khi cập nhật từ socket');
    checkThresholds(updatedData);
    
    return true;
  };

  // Xử lý dữ liệu từ WebSocket
  const handleSensorUpdate = (data) => {
    console.log('SensorContext: Received sensor update:', data);
    
    // Lưu dữ liệu cũ trước khi cập nhật
    setPrevData({
      soilMoisture: sensorData.soilMoisture,
      temperature: sensorData.temperature,
      airHumidity: sensorData.airHumidity,
      pumpWater: {
        speed: sensorData.pumpWater?.speed 
      },
      light: {
        status: sensorData.light?.status || 'Off'
      }
    });

    let updatedData = { ...sensorData };

    // Cập nhật dữ liệu mới dựa trên loại cảm biến
    if (data.type === 'temperature_humidity') {
      setSensorData(prev => {
        const updated = {
          ...prev,
          temperature: data.data.temperature !== undefined ? data.data.temperature : prev.temperature,
          airHumidity: data.data.humidity !== undefined ? data.data.humidity : prev.airHumidity,
          loading: false
        };
        updatedData = updated;
        return updated;
      });
    } 
    else if (data.type === 'soil_moisture') {
      setSensorData(prev => {
        const updated = {
          ...prev,
          soilMoisture: data.data.soilMoisture !== undefined ? data.data.soilMoisture : prev.soilMoisture,
          loading: false
        };
        updatedData = updated;
        return updated;
      });
    }
    else if (data.type === 'pump_water' || data.type === 'pump_status' || data.type === 'pump-water' || data.type === 'pump-status') {
      console.log('SensorContext: Processing pump data:', data);
      setSensorData(prev => {
        // Đảm bảo lấy được giá trị speed chính xác từ dữ liệu đến
        // Handling both pumpSpeed (from API) and speed (from context)
        const pumpSpeed = data.data.pumpSpeed !== undefined ? data.data.pumpSpeed : 
                         (data.data.speed !== undefined ? data.data.speed : prev.pumpWater?.speed );
        
        // Luôn xác định status dựa trên speed - speed là giá trị chính
        // Nếu speed > 0 thì pump đang hoạt động (On), ngược lại là Off
        const pumpStatus = pumpSpeed > 0 ? 'On' : 'Off';
        
        const updated = {
          ...prev,
          pumpWater: {
            ...prev.pumpWater,
            status: pumpStatus,
            speed: pumpSpeed
          },
          loading: false
        };
        
        updatedData = updated;
        console.log('SensorContext: Updated pump data:', updated.pumpWater);
        return updated;
      });
    }
    else if (data.type === 'light') {
      setSensorData(prev => {
        const updated = {
          ...prev,
          light: {
            status: data.data.status !== undefined ? data.data.status : (prev.light?.status || 'Off')
          },
          loading: false
        };
        updatedData = updated;
        return updated;
      });
    }
    
    // Thêm việc kiểm tra ngưỡng sau khi cập nhật dữ liệu
    // Sử dụng setTimeout để đảm bảo dữ liệu đã được cập nhật trong state
    setTimeout(() => {
      checkThresholds(updatedData);
    }, 100);
  };

  // Thiết lập WebSocket connection - chỉ kết nối một lần ở cấp ứng dụng
  useEffect(() => {
    console.log('SensorContext: Setting up persistent WebSocket connection');
    
    // Khởi tạo kết nối WebSocket nếu chưa được kết nối
    socketService.connect();
    
    // Đăng ký lắng nghe sự kiện cập nhật từ server
    socketService.on('sensor-update', handleSensorUpdate);
    socketService.on('sensor_update', handleSensorUpdate);
    
    // Kiểm tra trạng thái kết nối định kỳ
    const checkSocketConnection = setInterval(() => {
      const connected = socketService.isSocketConnected();
      setSocketConnected(connected);
      if (!connected) {
        console.log('SensorContext: Trying to reconnect WebSocket...');
        socketService.connect();
      }
    }, 5000);
    
    // Cleanup khi unmount
    return () => {
      clearInterval(checkSocketConnection);
      socketService.off('sensor-update', handleSensorUpdate);
      socketService.off('sensor_update', handleSensorUpdate);
      // KHÔNG disconnect socketService để duy trì kết nối khi chuyển route
    };
  }, []);

  // Tải dữ liệu từ API khi component mount và định kỳ
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        console.log('SensorContext: Loading initial data from SensorServices');
        const SensorServices = (await import('../services/SensorServices')).default;
        await contextValue.updateFromAPI(SensorServices);
      } catch (error) {
        console.error('SensorContext: Error loading initial data:', error);
      }
    };

    // Tải dữ liệu ban đầu
    if (sensorData.loading) {
      loadInitialData();
    }

    // Thiết lập interval để tải dữ liệu định kỳ khi không có WebSocket
    const dataRefreshInterval = setInterval(async () => {
      if (!socketConnected) {
        console.log('SensorContext: WebSocket disconnected, refreshing data from API');
        try {
          const SensorServices = (await import('../services/SensorServices')).default;
          await contextValue.updateFromAPI(SensorServices);
        } catch (error) {
          console.error('SensorContext: Error refreshing data:', error);
        }
      }
    }, 60000); // Cập nhật mỗi 1 phút nếu không có WebSocket

    return () => {
      clearInterval(dataRefreshInterval);
    };
  }, [socketConnected, sensorData.loading]);

  // Hàm buộc lưu dữ liệu
  const forceSaveData = () => {
    // if (!storageAvailable) {
    //   console.warn('SensorContext: Cannot force save, localStorage not available');
    //   return false;
    // }
    
    if (sensorData.loading) {
      console.warn('SensorContext: Cannot force save while loading data');
      return false;
    }
    
    // Chuẩn bị dữ liệu để lưu
    const dataToSave = {
      soilMoisture: sensorData.soilMoisture,
      temperature: sensorData.temperature,
      airHumidity: sensorData.airHumidity,
      pumpWater: sensorData.pumpWater,
      light: sensorData.light
    };
    
    // Lưu vào localStorage
    console.log('SensorContext: Force saving data:', dataToSave);
    return saveToLocalStorage(SENSOR_DATA_KEY, dataToSave);
  };

  // Hàm xóa dữ liệu đã lưu
  const clearSavedData = () => {
    if (!storageAvailable) {
      console.warn('SensorContext: Cannot clear data, localStorage not available');
      return false;
    }
    
    try {
      localStorage.removeItem(SENSOR_DATA_KEY);
      localStorage.removeItem(PREV_DATA_KEY);
      console.log('SensorContext: Successfully cleared saved data');
      return true;
    } catch (e) {
      console.error('SensorContext: Error clearing saved data:', e);
      return false;
    }
  };

  // Giá trị context
  const contextValue = {
    sensorData,
    setSensorData,
    prevData,
    setPrevData,
    socketConnected,
    calculatePercentChange,
    forceSaveData,
    clearSavedData,
    
    // Thêm trạng thái ngưỡng và cấu hình
    thresholdAlerts,
    thresholdConfig,
    setThresholdConfig,
    
    // Hàm cập nhật cấu hình ngưỡng từ Dashboard
    updateThresholdConfig: (dashboardThresholds) => {
      console.log('SensorContext: Đang cập nhật ngưỡng...');
      console.log('SensorContext: Ngưỡng hiện tại:', thresholdConfig);
      console.log('SensorContext: Ngưỡng mới từ Dashboard:', dashboardThresholds);
      
      // Chuyển đổi định dạng từ Dashboard sang định dạng của SensorContext
      const newConfig = {
        soilMoisture: {
          min: dashboardThresholds.SOIL_MOISTURE.min,
          max: dashboardThresholds.SOIL_MOISTURE.max
        },
        temperature: {
          min: dashboardThresholds.TEMPERATURE.min,
          max: dashboardThresholds.TEMPERATURE.max
        },
        airHumidity: {
          min: dashboardThresholds.AIR_HUMIDITY.min,
          max: dashboardThresholds.AIR_HUMIDITY.max
        }
      };
      
      // Log để kiểm tra sự khác biệt
      const hasChanges = JSON.stringify(thresholdConfig) !== JSON.stringify(newConfig);
      console.log('SensorContext: Có sự thay đổi về ngưỡng:', hasChanges);
      
      // Cập nhật config mới
      setThresholdConfig(newConfig);
      
      // Kiểm tra lại ngưỡng với cấu hình mới
      setTimeout(() => {
        console.log('SensorContext: Ngưỡng sau khi cập nhật:', newConfig);
        console.log('SensorContext: Kiểm tra lại các ngưỡng với dữ liệu hiện tại');
        checkThresholds(sensorData);
      }, 100);
    },
    
    // Thêm các hàm mới
    checkThresholds,
    updateDevicesBasedOnTriggers,
    updateFromSocketData,
    
    // Thêm phương thức để cập nhật từ API
    updateFromAPI: async (apiService) => {
      try {
        // Get latest data from API
        const result = await apiService.getLatestSensorData();
        console.log('SensorContext: API result:', result);
        
        // Check if we're using fallback data (indicating API errors)
        const isUsingFallbackData = result.hasFallbackData === true;
        if (isUsingFallbackData) {
          console.warn('SensorContext: API returned fallback data, some or all sensors are using cached/fallback values');
        }
        
        // Tải cấu hình ngưỡng từ API nếu có thể
        try {
          const axios = (await import('axios')).default;
          const API_ENDPOINTS = (await import('../services/ApiEndpoints')).default;
          
          // Check if user is approved before attempting to fetch config
          const userData = JSON.parse(localStorage.getItem('userData'));
          if (!userData || !userData.isAccepted) {
            console.log('SensorContext: User not approved yet, skipping config fetch');
            
            // If we can't load config from API, use sensible defaults
            if (!thresholdConfig || Object.keys(thresholdConfig).length === 0) {
              console.warn('SensorContext: Setting default threshold config due to unapproved user');
              const fallbackThresholds = {
                soilMoisture: { min: 20, max: 80 },  // Agriculture typically needs 20-80% moisture
                temperature: { min: 18, max: 32 },    // Most plants thrive between 18-32°C
                airHumidity: { min: 40, max: 80 }     // 40-80% is good for most plants
              };
              setThresholdConfig(fallbackThresholds);
            }
          } else {
            // Only attempt to load config if user is approved
            try {
              const configResponse = await axios.get(API_ENDPOINTS.DEVICES.GET_CONFIG('current'), {
                headers: {
                  Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
                timeout: 5000 // Add timeout to prevent hanging
              });
              
              if (configResponse.data && configResponse.data.success && configResponse.data.config) {
                console.log('SensorContext: Nhận được cấu hình từ API, nhưng sẽ để Dashboard cập nhật ngưỡng.');
                // Không ghi đè cấu hình ngưỡng ở đây, để Dashboard đồng bộ các giá trị
                // Việc cập nhật sẽ được thực hiện thông qua hàm updateThresholdConfig
              }
            } catch (configError) {
              console.error('SensorContext: Lỗi khi tải cấu hình ngưỡng:', configError);
              
              // If we can't load config from API, use sensible defaults
              if (!thresholdConfig || Object.keys(thresholdConfig).length === 0) {
                console.warn('SensorContext: Setting default threshold config due to API error');
                const fallbackThresholds = {
                  soilMoisture: { min: 20, max: 80 },  // Agriculture typically needs 20-80% moisture
                  temperature: { min: 18, max: 32 },    // Most plants thrive between 18-32°C
                  airHumidity: { min: 40, max: 80 }     // 40-80% is good for most plants
                };
                setThresholdConfig(fallbackThresholds);
              }
            }
          }
          
          if (result && result.success && result.data && result.data.length > 0) {
            // Lưu dữ liệu trước đó
            setPrevData({
              soilMoisture: sensorData.soilMoisture,
              temperature: sensorData.temperature,
              airHumidity: sensorData.airHumidity,
              pumpWater: {
                speed: sensorData.pumpWater?.speed || 0
              },
              light: {
                status: sensorData.light?.status || 'Off'
              }
            });
            
            // Khởi tạo dữ liệu mới, sử dụng giá trị hiện tại cho các giá trị không được cập nhật
            let newSensorData = {
              soilMoisture: sensorData.soilMoisture,
              temperature: sensorData.temperature,
              airHumidity: sensorData.airHumidity,
              pumpWater: {
                status: sensorData.pumpWater?.status || 'Off',
                speed: sensorData.pumpWater?.speed || 0
              },
              light: {
                status: sensorData.light?.status || 'Off'
              },
              loading: false,
              error: null
            };
            
            // Flag để theo dõi xem các loại dữ liệu đã được cập nhật chưa
            let pumpUpdated = false;
            let temperatureUpdated = false;
            let humidityUpdated = false;
            let soilMoistureUpdated = false;
            let lightUpdated = false;
            
            // Dữ liệu từ API đã được lọc cho user hiện tại, vì backend đã check userId
            for (const sensor of result.data) {
              // Check if this sensor data is a fallback (not from real API)
              const isFallback = sensor.isFallback === true;
              if (isFallback) {
                console.warn(`SensorContext: Using fallback data for ${sensor.deviceType}`);
              }
              
              if (sensor?.deviceType === 'soil_moisture' && 'soilMoisture' in sensor) {
                newSensorData.soilMoisture = sensor.soilMoisture;
                soilMoistureUpdated = true;
                console.log(`SensorContext: Updated soil moisture from ${isFallback ? 'fallback' : 'API'}: ${sensor.soilMoisture}%`);
              } else if (sensor?.deviceType === 'temperature_humidity') {
                if ('temperature' in sensor) {
                  newSensorData.temperature = sensor.temperature;
                  temperatureUpdated = true;
                  console.log(`SensorContext: Updated temperature from ${isFallback ? 'fallback' : 'API'}: ${sensor.temperature}°C`);
                }
                if ('airHumidity' in sensor) {
                  newSensorData.airHumidity = sensor.airHumidity;
                  humidityUpdated = true;
                  console.log(`SensorContext: Updated air humidity from ${isFallback ? 'fallback' : 'API'}: ${sensor.airHumidity}%`);
                }
              } else if (sensor?.deviceType === 'pump_water') {
                pumpUpdated = true;
                // Get the pump speed value - handle both pumpSpeed (from API) and speed (from context) field names
                const pumpSpeed = sensor.pumpSpeed !== undefined ? sensor.pumpSpeed : 
                                (sensor.speed !== undefined ? sensor.speed : 0);
                
                // Always derive status from speed
                const pumpStatus = pumpSpeed > 0 ? 'On' : 'Off';
                
                // Set values with status derived from speed
                newSensorData.pumpWater = {
                  status: pumpStatus,
                  speed: pumpSpeed
                };
                
                console.log(`SensorContext: Updated pump data from ${isFallback ? 'fallback' : 'API'}: ${pumpStatus} (${pumpSpeed}%)`);
              } else if (sensor?.deviceType === 'light') {
                newSensorData.light = {
                  status: sensor.status || 'Off'
                };
                lightUpdated = true;
                console.log(`SensorContext: Updated light status from ${isFallback ? 'fallback' : 'API'}: ${sensor.status}`);
              }
            }
            
            // Log what data was updated vs. not updated
            if (!soilMoistureUpdated) console.warn('SensorContext: No soil moisture data updated from API');
            if (!temperatureUpdated) console.warn('SensorContext: No temperature data updated from API');
            if (!humidityUpdated) console.warn('SensorContext: No humidity data updated from API');
            if (!pumpUpdated) console.warn('SensorContext: No pump data updated from API, keeping existing values:', newSensorData.pumpWater);
            if (!lightUpdated) console.warn('SensorContext: No light status updated from API');
            
            // Check if any data was updated at all
            const anyUpdated = soilMoistureUpdated || temperatureUpdated || humidityUpdated || pumpUpdated || lightUpdated;
            if (!anyUpdated) {
              console.warn('SensorContext: No data was updated from API call');
            }
            
            // Cập nhật state
            setSensorData(newSensorData);
            
            // Kiểm tra ngưỡng với dữ liệu mới
            if (checkThresholds) {
              setTimeout(() => {
                checkThresholds(newSensorData);
              }, 100);
            }
            
            // Ensure data is saved to localStorage immediately
            saveToLocalStorage(SENSOR_DATA_KEY, {
              soilMoisture: newSensorData.soilMoisture,
              temperature: newSensorData.temperature,
              airHumidity: newSensorData.airHumidity,
              pumpWater: newSensorData.pumpWater,
              light: newSensorData.light
            });
            
            return newSensorData;
          } else {
            console.log('SensorContext: No sensor data or data format issue from API, keeping existing data');
            
            // Mark loading as complete, but keep existing data
            setSensorData(prev => ({ ...prev, loading: false }));
            
            // Still check thresholds with existing data
            if (checkThresholds) {
              setTimeout(() => {
                checkThresholds(sensorData);
              }, 100);
            }
            
            return sensorData;
          }
        } catch (error) {
          console.error('SensorContext: Error fetching sensor data from API:', error);
          
          // Set error state but keep existing sensor data
          setSensorData(prev => ({ 
            ...prev, 
            loading: false,
            error: error.message || 'Failed to fetch sensor data'
          }));
          
          // Still check thresholds with existing data
          if (checkThresholds) {
            setTimeout(() => {
              checkThresholds(sensorData);
            }, 100);
          }
          
          return sensorData;
        }
      } catch (error) {
        console.error('SensorContext: Error fetching sensor data from API:', error);
        
        // Set error state but keep existing sensor data
        setSensorData(prev => ({ 
          ...prev, 
          loading: false,
          error: error.message || 'Failed to fetch sensor data'
        }));
        
        // Still check thresholds with existing data
        if (checkThresholds) {
          setTimeout(() => {
            checkThresholds(sensorData);
          }, 100);
        }
        
        return sensorData;
      }
    }
  };

  return (
    <SensorContext.Provider value={contextValue}>
      {children}
    </SensorContext.Provider>
  );
};

export default SensorContext; 