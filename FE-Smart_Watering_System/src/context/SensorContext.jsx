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
    soilMoisture: false,
    temperature: false,
    airHumidity: false
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
  
  // Hàm kiểm tra và cập nhật trạng thái ngưỡng
  const checkThresholds = (newData) => {
    console.log('SensorContext: Kiểm tra ngưỡng cho dữ liệu mới:', newData);
    
    const newAlerts = { ...thresholdAlerts };
    let hasChanges = false;
    
    // Kiểm tra độ ẩm đất
    if (newData.soilMoisture !== undefined) {
      const soilMoistureExceedsThreshold = 
        newData.soilMoisture < thresholdConfig.soilMoisture.min || 
        newData.soilMoisture > thresholdConfig.soilMoisture.max;
      
      if (newAlerts.soilMoisture !== soilMoistureExceedsThreshold) {
        newAlerts.soilMoisture = soilMoistureExceedsThreshold;
        hasChanges = true;
        console.log(`SensorContext: Trạng thái ngưỡng độ ẩm đất: ${soilMoistureExceedsThreshold ? 'VƯỢT NGƯỠNG' : 'BÌNH THƯỜNG'}`);
      }
    }
    
    // Kiểm tra nhiệt độ
    if (newData.temperature !== undefined) {
      const temperatureExceedsThreshold = 
        newData.temperature < thresholdConfig.temperature.min || 
        newData.temperature > thresholdConfig.temperature.max;
      
      if (newAlerts.temperature !== temperatureExceedsThreshold) {
        newAlerts.temperature = temperatureExceedsThreshold;
        hasChanges = true;
        console.log(`SensorContext: Trạng thái ngưỡng nhiệt độ: ${temperatureExceedsThreshold ? 'VƯỢT NGƯỠNG' : 'BÌNH THƯỜNG'}`);
      }
    }
    
    // Kiểm tra độ ẩm không khí
    if (newData.airHumidity !== undefined) {
      const airHumidityExceedsThreshold = 
        newData.airHumidity < thresholdConfig.airHumidity.min || 
        newData.airHumidity > thresholdConfig.airHumidity.max;
      
      if (newAlerts.airHumidity !== airHumidityExceedsThreshold) {
        newAlerts.airHumidity = airHumidityExceedsThreshold;
        hasChanges = true;
        console.log(`SensorContext: Trạng thái ngưỡng độ ẩm không khí: ${airHumidityExceedsThreshold ? 'VƯỢT NGƯỠNG' : 'BÌNH THƯỜNG'}`);
      }
    }
    
    // Cập nhật state nếu có sự thay đổi
    if (hasChanges) {
      setThresholdAlerts(newAlerts);
      
      // Quyết định trạng thái máy bơm dựa trên ngưỡng
      updatePumpBasedOnThresholds(newData, newAlerts);
    }
    
    return newAlerts;
  };
  
  // Hàm cập nhật trạng thái máy bơm dựa trên các cảm biến
  const updatePumpBasedOnThresholds = (newData, alerts) => {
    console.log('SensorContext: Cập nhật trạng thái máy bơm dựa trên ngưỡng');
    
    // Kiểm tra xem có bất kỳ cảm biến nào vượt ngưỡng không
    const anyThresholdExceeded = alerts.soilMoisture || alerts.temperature || alerts.airHumidity;
    
    // Lấy trạng thái máy bơm hiện tại
    const currentPumpStatus = newData.pumpWater?.status;
    const currentPumpSpeed = newData.pumpWater?.speed ;
    
    // Quyết định trạng thái mới cho máy bơm
    let newPumpStatus = currentPumpStatus;
    let newPumpSpeed = currentPumpSpeed;
    
    // Nếu có bất kỳ cảm biến nào vượt ngưỡng, bật máy bơm (nếu chưa bật)
    if (anyThresholdExceeded) {
      if (currentPumpStatus !== 'On' || currentPumpSpeed === 0) {
        newPumpStatus = 'On';
        newPumpSpeed = 100; // Tốc độ mặc định khi bật máy bơm
        console.log('SensorContext: BẬT máy bơm do có cảm biến vượt ngưỡng');
      }
    } 
    // Chỉ tắt máy bơm khi TẤT CẢ các cảm biến đều trong ngưỡng an toàn
    else if (!anyThresholdExceeded && currentPumpStatus === 'On') {
      newPumpStatus = 'Off';
      newPumpSpeed = 0;
      console.log('SensorContext: TẮT máy bơm do tất cả cảm biến đều trong ngưỡng an toàn');
    }
    
    // Chỉ cập nhật nếu có thay đổi
    if (newPumpStatus !== currentPumpStatus || newPumpSpeed !== currentPumpSpeed) {
      setSensorData(prev => ({
        ...prev,
        pumpWater: {
          ...prev.pumpWater,
          status: newPumpStatus,
          speed: newPumpSpeed
        }
      }));
      
      console.log(`SensorContext: Đã cập nhật máy bơm: ${newPumpStatus} (${newPumpSpeed}%)`);
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
    
    // Cập nhật dữ liệu mới từ socket
    setSensorData(prev => {
      const updated = {
        ...prev,
        loading: false,
        error: null
      };
      
      // Chỉ cập nhật các giá trị được cung cấp
      if (socketData.soilMoisture !== undefined) {
        updated.soilMoisture = socketData.soilMoisture;
      }
      
      if (socketData.temperature !== undefined) {
        updated.temperature = socketData.temperature;
      }
      
      if (socketData.airHumidity !== undefined) {
        updated.airHumidity = socketData.airHumidity;
      }
      
      if (socketData.pumpWater) {
        // Get the speed value - handle both field names
        const pumpSpeed = socketData.pumpWater.speed !== undefined ? socketData.pumpWater.speed : 
                        (socketData.pumpWater.pumpSpeed !== undefined ? socketData.pumpWater.pumpSpeed : prev.pumpWater?.speed );
        
        // Always derive status from speed
        const pumpStatus = pumpSpeed > 0 ? 'On' : 'Off';
        
        updated.pumpWater = {
          ...prev.pumpWater,
          status: pumpStatus,
          speed: pumpSpeed
        };
        
        console.log('SensorContext: Updated pump data from socket:', updated.pumpWater);
      }
      
      if (socketData.light) {
        updated.light = {
          ...prev.light,
          ...socketData.light
        };
      }
      
      return updated;
    });
    
    // Đánh dấu rằng đã kết nối socket
    setSocketConnected(true);
    
    // Thêm việc kiểm tra ngưỡng sau khi cập nhật dữ liệu
    // Sử dụng setTimeout để đảm bảo dữ liệu đã được cập nhật trong state
    setTimeout(() => {
      checkThresholds(sensorData);
    }, 100);
    
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
    updatePumpBasedOnThresholds,
    updateFromSocketData,
    
    // Thêm phương thức để cập nhật từ API
    updateFromAPI: async (apiService) => {
      try {
        const result = await apiService.getLatestSensorData();
        console.log('SensorContext: API result:', result);
        
        // Tải cấu hình ngưỡng từ API nếu có thể
        try {
          const axios = (await import('axios')).default;
          const API_ENDPOINTS = (await import('../services/ApiEndpoints')).default;
          
          const configResponse = await axios.get(API_ENDPOINTS.DEVICES.GET_CONFIG('current'), {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          });
          
          if (configResponse.data && configResponse.data.success && configResponse.data.config) {
            console.log('SensorContext: Nhận được cấu hình từ API, nhưng sẽ để Dashboard cập nhật ngưỡng.');
            // Không ghi đè cấu hình ngưỡng ở đây, để Dashboard đồng bộ các giá trị
            // Việc cập nhật sẽ được thực hiện thông qua hàm updateThresholdConfig
          }
        } catch (configError) {
          console.error('SensorContext: Lỗi khi tải cấu hình ngưỡng:', configError);
        }
        
        if (result.success && result.data && result.data.length > 0) {
          // Lưu dữ liệu trước đó
          setPrevData({
            soilMoisture: sensorData.soilMoisture ,
            temperature: sensorData.temperature ,
            airHumidity: sensorData.airHumidity ,
            pumpWater: {
              speed: sensorData.pumpWater?.speed 
            },
            light: {
              status: sensorData.light?.status || 'Off'
            }
          });
          
          // Khởi tạo dữ liệu mới, sử dụng giá trị hiện tại cho các giá trị không được cập nhật
          let newSensorData = {
            soilMoisture: sensorData.soilMoisture ,
            temperature: sensorData.temperature ,
            airHumidity: sensorData.airHumidity ,
            pumpWater: {
              status: sensorData.pumpWater?.status || 'Off',
              speed: sensorData.pumpWater?.speed 
            },
            light: {
              status: sensorData.light?.status || 'Off'
            },
            loading: false,
            error: null
          };
          
          // Flag để theo dõi xem các loại dữ liệu đã được cập nhật chưa
          let pumpUpdated = false;
          
          // Dữ liệu từ API đã được lọc cho user hiện tại, vì backend đã check userId
          for (const sensor of result.data) {
            if (sensor.deviceType === 'soil_moisture' && 'soilMoisture' in sensor) {
              newSensorData.soilMoisture = sensor.soilMoisture;
            } else if (sensor.deviceType === 'temperature_humidity') {
              if ('temperature' in sensor) {
                newSensorData.temperature = sensor.temperature;
              }
              if ('airHumidity' in sensor) {
                newSensorData.airHumidity = sensor.airHumidity;
              }
            } else if (sensor.deviceType === 'pump_water') {
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
              
              console.log('SensorContext: Updated pump data from API:', newSensorData.pumpWater);
            } else if (sensor.deviceType === 'light') {
              newSensorData.light = {
                status: sensor.status || 'Off'
              };
            }
          }
          
          // If no pump data was updated from API, log this information
          if (!pumpUpdated) {
            console.log('SensorContext: No pump data in API response, keeping existing values:', newSensorData.pumpWater);
          }
          
          // Cập nhật state
          setSensorData(newSensorData);
          
          // Kiểm tra ngưỡng với dữ liệu mới
          setTimeout(() => {
            checkThresholds(newSensorData);
          }, 100);
          
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
          console.log('SensorContext: No sensor data or data format issue, keeping existing data');
          setSensorData(prev => ({ ...prev, loading: false }));
          return sensorData;
        }
      } catch (error) {
        console.error('SensorContext: Error fetching sensor data from API:', error);
        setSensorData(prev => ({ 
          ...prev, 
          loading: false,
          error: error.message || 'Failed to fetch sensor data'
        }));
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