import axios from './CustomizeAxios';
import API_ENDPOINTS from './ApiEndpoints';
import { toast } from 'react-toastify';

// Fallback sample data for when API fails
// const sampleData = {
//   temperature_humidity: {
//     temperature: 25.5,
//     airHumidity: 70
//   },
//   soil_moisture: {
//     soilMoisture: 65
//   },
//   pump_water: {
//     status: 'Off',
//     pumpSpeed: 0
//   },
//   light: {
//     status: 'Off'
//   }
// };

class SensorServices {
  // Helper function to normalize field names between API and app
  static normalizeDeviceData(data) {
    // Make a copy to avoid modifying original data
    const normalizedData = { ...data };
    
    // Handle pump_water field name inconsistency (API uses pumpSpeed, app uses speed)
    if (data.deviceType === 'pump_water' && data.pumpSpeed !== undefined) {
      normalizedData.speed = data.pumpSpeed;
      console.log('SensorService: Normalized pump data - mapped pumpSpeed to speed:', normalizedData);
    }
    
    return normalizedData;
  }

  // Lấy dữ liệu cảm biến mới nhất từ API
  static async getLatestSensorData() {
    try {
      console.log('SensorService: Fetching latest sensor data from API');
      
      // Kiểm tra token trước khi thực hiện request
      const token = localStorage.getItem('token');
      if (!token) {
        console.warn('SensorService: No authentication token found');
        return { 
          success: false, 
          message: 'Bạn cần đăng nhập để xem dữ liệu cảm biến',
          data: []
        };
      }
      
      // Get existing data from localStorage to use as backup instead of sample data
      let savedData = null;
      try {
        const savedDataString = localStorage.getItem('smart_watering_system_sensor_data');
        if (savedDataString) {
          savedData = JSON.parse(savedDataString);
          console.log('SensorService: Found saved data in localStorage:', savedData);
        }
      } catch (localStorageError) {
        console.error('SensorService: Error accessing localStorage:', localStorageError);
      }
      
      // Chuẩn bị mảng kết quả
      const result = {
        success: true,
        data: []
      };
      
      // Lấy danh sách thiết bị của người dùng
      try {
        const devicesResponse = await axios.get(API_ENDPOINTS.DEVICES.GET_ALL);
        if (!devicesResponse.data.success || !devicesResponse.data.data) {
          console.warn('SensorService: No devices found or error fetching devices');
          return { success: false, message: 'Không tìm thấy thiết bị' };
        }
        
        const devices = devicesResponse.data.data;
        console.log(`SensorService: Found ${devices.length} devices`);
        
        // Lấy dữ liệu từng loại thiết bị
        for (const device of devices) {
          try {
            let endpoint;
            let dataProcessor;
            let fallbackData;
            
            // Xác định endpoint và cách xử lý dữ liệu dựa vào loại thiết bị
            switch (device.deviceType) {
              case 'soil_moisture':
                endpoint = API_ENDPOINTS.DEVICES.GET_SOIL_MOISTURE(device.id);
                fallbackData = {
                  deviceType: 'soil_moisture',
                  deviceId: device.id,
                  soilMoisture: savedData?.soilMoisture 
                };
                dataProcessor = (responseData) => {
                  if (responseData && responseData.data && responseData.data.length > 0) {
                    return {
                      deviceType: 'soil_moisture',
                      deviceId: device.id,
                      soilMoisture: responseData.data[0].moistureValue 
                    };
                  }
                  return fallbackData;
                };
                break;
                
              case 'temperature_humidity':
                endpoint = API_ENDPOINTS.DEVICES.GET_TEMPERATURE(device.id);
                fallbackData = {
                  deviceType: 'temperature_humidity',
                  deviceId: device.id,
                  temperature: savedData?.temperature ,
                  airHumidity: savedData?.airHumidity 
                };
                dataProcessor = (responseData) => {
                  if (responseData && responseData.data && responseData.data.length > 0) {
                    return {
                      deviceType: 'temperature_humidity',
                      deviceId: device.id,
                      temperature: responseData.data[0].temperature ,
                      airHumidity: responseData.data[0].humidity 
                    };
                  }
                  return fallbackData;
                };
                break;
                
              case 'pump_water':
                endpoint = API_ENDPOINTS.DEVICES.GET_PUMP_WATER(device.id);
                const pumpSpeed = savedData && savedData.pumpWater ? savedData.pumpWater.speed  : 0;
                fallbackData = {
                  deviceType: 'pump_water',
                  deviceId: device.id,
                  status: pumpSpeed > 0 ? 'On' : 'Off',
                  pumpSpeed: pumpSpeed,
                  speed: pumpSpeed
                };
                dataProcessor = (responseData) => {
                  if (responseData && responseData.data && responseData.data.length > 0) {
                    const processedData = {
                      deviceType: 'pump_water',
                      deviceId: device.id,
                      status: responseData.data[0].status || 'Off',
                      pumpSpeed: responseData.data[0].pumpSpeed ,
                      speed: responseData.data[0].pumpSpeed 
                    };
                    // Return normalized data
                    return SensorServices.normalizeDeviceData(processedData);
                  }
                  return SensorServices.normalizeDeviceData(fallbackData);
                };
                break;
                
              case 'light':
                endpoint = API_ENDPOINTS.DEVICES.GET_LIGHT(device.id);
                fallbackData = {
                  deviceType: 'light',
                  deviceId: device.id,
                  status: savedData && savedData.light ? savedData.light.status || 'Off' : 'Off'
                };
                dataProcessor = (responseData) => {
                  if (responseData && responseData.data && responseData.data.length > 0) {
                    return {
                      deviceType: 'light',
                      deviceId: device.id,
                      status: responseData.data[0].status || 'Off'
                    };
                  }
                  return fallbackData;
                };
                break;
                
              default:
                console.warn(`SensorService: Unknown device type: ${device.deviceType}`);
                continue;
            }
            
            // Lấy dữ liệu cho thiết bị
            if (endpoint && dataProcessor) {
              try {
                const response = await axios.get(endpoint);
                
                if (response.data && response.data.success) {
                  const processedData = dataProcessor(response.data);
                  if (processedData) {
                    result.data.push(processedData);
                    console.log(`SensorService: Successfully fetched data for ${device.deviceType} device (ID: ${device.id})`);
                  }
                } else {
                  console.warn(`SensorService: Failed to fetch data for ${device.deviceType} device (ID: ${device.id})`);
                  // Use fallback data instead
                  result.data.push(fallbackData);
                  console.log(`SensorService: Using fallback data for ${device.deviceType} device (ID: ${device.id})`);
                }
              } catch (deviceRequestError) {
                console.error(`SensorService: Error fetching data for device ${device.id}:`, deviceRequestError);
                
                // Try to use localStorage data first before sample data
                if (savedData && device.deviceType === 'soil_moisture' && savedData.soilMoisture !== undefined) {
                  result.data.push({
                    deviceType: 'soil_moisture',
                    deviceId: device.id,
                    soilMoisture: savedData.soilMoisture
                  });
                  console.log(`SensorService: Using localStorage data for soil_moisture: ${savedData.soilMoisture}`);
                } else if (savedData && device.deviceType === 'temperature_humidity' && 
                          savedData.temperature !== undefined && savedData.airHumidity !== undefined) {
                  result.data.push({
                    deviceType: 'temperature_humidity',
                    deviceId: device.id,
                    temperature: savedData.temperature,
                    airHumidity: savedData.airHumidity
                  });
                  console.log(`SensorService: Using localStorage data for temperature_humidity: ${savedData.temperature}°C, ${savedData.airHumidity}%`);
                } else if (savedData && device.deviceType === 'pump_water' && savedData.pumpWater) {
                  const pumpSpeed = savedData.pumpWater.speed ;
                  result.data.push({
                    deviceType: 'pump_water',
                    deviceId: device.id,
                    status: savedData.pumpWater.status || 'Off',
                    pumpSpeed: pumpSpeed,  // Use pumpSpeed for API compatibility
                    speed: pumpSpeed       // Use speed for frontend compatibility
                  });
                  console.log(`SensorService: Using localStorage data for pump_water: ${savedData.pumpWater.status}, ${pumpSpeed}%`);
                } else if (savedData && device.deviceType === 'light' && savedData.light) {
                  result.data.push({
                    deviceType: 'light',
                    deviceId: device.id,
                    status: savedData.light.status || 'Off'
                  });
                  console.log(`SensorService: Using localStorage data for light: ${savedData.light.status}`);
                } else {
                  // Fallback to sample data only if localStorage data isn't available
                  result.data.push(fallbackData);
                  console.log(`SensorService: Using sample fallback data for ${device.deviceType} device (ID: ${device.id}) due to request error`);
                }
              }
            }
          } catch (deviceError) {
            console.error(`SensorService: Error processing device ${device.id}:`, deviceError);
            // Tiếp tục với thiết bị tiếp theo
          }
        }
        
        console.log(`SensorService: Returned data for ${result.data.length} devices`);
        return result;
        
      } catch (devicesError) {
        console.error('SensorService: Error fetching devices list:', devicesError);
        
        // Log thêm thông tin chi tiết về lỗi
        if (devicesError.response) {
          console.error('Response status:', devicesError.response.status);
          console.error('Response data:', devicesError.response.data);
        } else if (devicesError.request) {
          console.error('SensorService: Không nhận được phản hồi từ máy chủ. Chi tiết:', devicesError.request);
        } else {
          console.error('SensorService: Lỗi cấu hình request. Chi tiết:', devicesError.message);
        }
        
        // Kiểm tra xem API URL có được cấu hình đúng không
        console.log('API URL được sử dụng:', API_ENDPOINTS.DEVICES.GET_ALL);
        
        if (devicesError.response && devicesError.response.status === 401) {
          // If unauthorized, provide appropriate message but don't redirect (CustomizeAxios will handle that)
          console.warn('SensorService: Authentication error when fetching devices');
          return {
            success: false,
            message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
            data: []
          };
        }
        
        // For network errors, return fallback data
        if (devicesError.code === 'ERR_NETWORK') {
          console.warn('SensorService: Network error when fetching devices, trying to use localStorage data');
          
          if (savedData) {
            // Create fallback result from localStorage data instead of sample data
            const fallbackResult = {
              success: true,
              message: 'Đang hiển thị dữ liệu lưu trữ cục bộ do không thể kết nối với máy chủ',
              data: []
            };
            
            // Add soil_moisture device if we have data
            if (savedData.soilMoisture !== undefined) {
              fallbackResult.data.push({
                deviceType: 'soil_moisture',
                deviceId: 'local-1',
                soilMoisture: savedData.soilMoisture
              });
            }
            
            // Add temperature_humidity device if we have data
            if (savedData.temperature !== undefined && savedData.airHumidity !== undefined) {
              fallbackResult.data.push({
                deviceType: 'temperature_humidity',
                deviceId: 'local-2',
                temperature: savedData.temperature,
                airHumidity: savedData.airHumidity
              });
            }
            
            // Add pump_water device if we have data
            if (savedData.pumpWater) {
              const pumpSpeed = savedData.pumpWater.speed ;
              fallbackResult.data.push({
                deviceType: 'pump_water',
                deviceId: 'local-3',
                status: savedData.pumpWater.status || 'Off',
                pumpSpeed: pumpSpeed,  // Use pumpSpeed for API compatibility
                speed: pumpSpeed       // Use speed for frontend compatibility
              });
            }
            
            // Add light device if we have data
            if (savedData.light) {
              fallbackResult.data.push({
                deviceType: 'light',
                deviceId: 'local-4',
                status: savedData.light.status || 'Off'
              });
            }
            
            console.log('SensorService: Generated fallback data from localStorage:', fallbackResult);
            return fallbackResult;
          } else {
            // If no localStorage data, fall back to sample data
            console.warn('SensorService: No localStorage data available, using default values');
            
            // Create fallback data with default values
            const fallbackResult = {
              success: true,
              message: 'Đang hiển thị dữ liệu mặc định do không thể kết nối với máy chủ và không có dữ liệu lưu trữ',
              data: [
                {
                  deviceType: 'temperature_humidity',
                  deviceId: 1,
                  temperature: 0,
                  airHumidity: 0
                },
                {
                  deviceType: 'soil_moisture',
                  deviceId: 2,
                  soilMoisture: 0
                },
                {
                  deviceType: 'pump_water',
                  deviceId: 3,
                  status: 'Off',
                  pumpSpeed: 0,
                  speed: 0
                },
                {
                  deviceType: 'light',
                  deviceId: 4,
                  status: 'Off'
                }
              ]
            };
            
            return fallbackResult;
          }
        }
        
        // For other errors
        return {
          success: false,
          message: devicesError.message || 'Lỗi khi lấy danh sách thiết bị',
          data: []
        };
      }
      
    } catch (error) {
      console.error('SensorService: Error fetching sensor data:', error);
      // Don't show toast for 401 errors as they will be handled by the interceptor
      if (!(error.response && error.response.status === 401)) {
        toast.error('Không thể kết nối đến máy chủ dữ liệu cảm biến');
      }
      
      return {
        success: false,
        message: error.message || 'Lỗi khi lấy dữ liệu cảm biến',
        data: []
      };
    }
  }
}

export default SensorServices; 