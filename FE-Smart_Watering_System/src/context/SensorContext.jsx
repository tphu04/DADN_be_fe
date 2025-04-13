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
              status: parsedData.pumpWater?.status || 'Inactive',
              speed: typeof parsedData.pumpWater?.speed === 'number' ? parsedData.pumpWater.speed : 0
            },
            light: {
              status: parsedData.light?.status || 'Off',
              brightness: typeof parsedData.light?.brightness === 'number' ? parsedData.light.brightness : 0
            },
            loading: false,
            error: null
          };
          
          console.log('SensorContext: Using saved sensor data:', validData);
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
    status: 'Inactive',
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
  // if (!isLocalStorageAvailable()) return false;

  // console.log(data)
  
  try {
    const serialized = JSON.stringify(data);
    localStorage.setItem(key, serialized);
    console.log(`SensorContext: Successfully saved data to ${key}:`, data);
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

  // Xử lý dữ liệu từ WebSocket
  const handleSensorUpdate = (data) => {
    console.log('SensorContext: Received sensor update:', data);
    
    // Lưu dữ liệu cũ trước khi cập nhật
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

    // Cập nhật dữ liệu mới dựa trên loại cảm biến
    if (data.type === 'temperature_humidity') {
      setSensorData(prev => {
        const updated = {
          ...prev,
          temperature: data.data.temperature !== undefined ? data.data.temperature : prev.temperature,
          airHumidity: data.data.humidity !== undefined ? data.data.humidity : prev.airHumidity,
          loading: false
        };
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
        return updated;
      });
    }
    else if (data.type === 'pump_water' || data.type === 'pump_status' || data.type === 'pump-water' || data.type === 'pump-status') {
      console.log('SensorContext: Processing pump data:', data);
      setSensorData(prev => {
        const updated = {
          ...prev,
          pumpWater: {
            ...prev.pumpWater,
            status: data.data.status !== undefined ? data.data.status : (prev.pumpWater?.status || 'Inactive'),
            speed: data.data.pumpSpeed !== undefined ? data.data.pumpSpeed : (prev.pumpWater?.speed || 0)
          },
          loading: false
        };
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
        return updated;
      });
    }
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
    
    // Thêm phương thức để cập nhật từ API
    updateFromAPI: async (apiService) => {
      try {
        const result = await apiService.getLatestSensorData();
        console.log('SensorContext: API result:', result);
        
        if (result.success && result.data && result.data.length > 0) {
          // Lưu dữ liệu trước đó
          setPrevData({
            soilMoisture: sensorData.soilMoisture || 0,
            temperature: sensorData.temperature || 0,
            airHumidity: sensorData.airHumidity || 0,
            pumpWater: {
              speed: sensorData.pumpWater?.speed || 0
            },
            light: {
              status: sensorData.light?.status || 'Off'
            }
          });
          
          // Khởi tạo dữ liệu mới từ dữ liệu hiện tại
          let newSensorData = {
            soilMoisture: 0,
            temperature: 0,
            airHumidity: 0,
            pumpWater: {
              status: 'Inactive',
              speed: 0
            },
            light: {
              status: 'Off'
            },
            loading: false,
            error: null
          };
          
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
              newSensorData.pumpWater = {
                status: sensor.status || 'Inactive',
                speed: sensor.pumpSpeed || 0
              };
            } else if (sensor.deviceType === 'light') {
              newSensorData.light = {
                status: sensor.status || 'Off'
              };
            }
          }
          
          // Cập nhật state
          setSensorData(newSensorData);
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