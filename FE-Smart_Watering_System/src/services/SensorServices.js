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
      
      // Check for previously encountered 404 devices to avoid repeatedly hitting them
      let knownDeletedDevices = [];
      try {
        const deletedDevicesString = localStorage.getItem('unavailable_devices');
        if (deletedDevicesString) {
          knownDeletedDevices = JSON.parse(deletedDevicesString);
          console.log('SensorService: Found previously unavailable devices:', knownDeletedDevices);
        }
      } catch (error) {
        console.error('SensorService: Error loading unavailable devices list:', error);
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
        
        // Track new unavailable devices in this request
        const newlyUnavailableDevices = [];
        
        // Lấy dữ liệu từng loại thiết bị
        for (const device of devices) {
          // Skip device if we know it's unavailable
          if (knownDeletedDevices.includes(device.id.toString())) {
            console.log(`SensorService: Skipping known unavailable device ${device.id}`);
            
            // Add fallback data for known unavailable device
            if (savedData) {
              // Use the same logic as below to add fallback data
              if (device.deviceType === 'soil_moisture' && savedData.soilMoisture !== undefined) {
                result.data.push({
                  deviceType: 'soil_moisture',
                  deviceId: device.id,
                  soilMoisture: savedData.soilMoisture,
                  isFallback: true
                });
              } else if (device.deviceType === 'temperature_humidity' && 
                        savedData.temperature !== undefined && savedData.airHumidity !== undefined) {
                result.data.push({
                  deviceType: 'temperature_humidity',
                  deviceId: device.id,
                  temperature: savedData.temperature,
                  airHumidity: savedData.airHumidity,
                  isFallback: true
                });
              } else if (device.deviceType === 'pump_water' && savedData.pumpWater) {
                const pumpSpeed = savedData.pumpWater.speed || 0;
                result.data.push({
                  deviceType: 'pump_water',
                  deviceId: device.id,
                  status: savedData.pumpWater.status || 'Off',
                  pumpSpeed: pumpSpeed,
                  speed: pumpSpeed,
                  isFallback: true
                });
              } else if (device.deviceType === 'light' && savedData.light) {
                result.data.push({
                  deviceType: 'light',
                  deviceId: device.id,
                  status: savedData.light.status || 'Off',
                  isFallback: true
                });
              }
            }
            
            continue;
          }
          
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
                  soilMoisture: savedData?.soilMoisture,
                  isFallback: true  // Add flag to indicate this is fallback data
                };
                dataProcessor = (responseData) => {
                  if (responseData && responseData.data && responseData.data.length > 0) {
                    return {
                      deviceType: 'soil_moisture',
                      deviceId: device.id,
                      soilMoisture: responseData.data[0].moistureValue,
                      isFallback: false  // Real data from API
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
                  temperature: savedData?.temperature,
                  airHumidity: savedData?.airHumidity,
                  isFallback: true  // Add flag to indicate this is fallback data
                };
                dataProcessor = (responseData) => {
                  if (responseData && responseData.data && responseData.data.length > 0) {
                    return {
                      deviceType: 'temperature_humidity',
                      deviceId: device.id,
                      temperature: responseData.data[0].temperature,
                      airHumidity: responseData.data[0].humidity,
                      isFallback: false  // Real data from API
                    };
                  }
                  return fallbackData;
                };
                break;
                
              case 'pump_water':
                endpoint = API_ENDPOINTS.DEVICES.GET_PUMP_WATER(device.id);
                const pumpSpeed = savedData && savedData.pumpWater ? savedData.pumpWater.speed : 0;
                fallbackData = {
                  deviceType: 'pump_water',
                  deviceId: device.id,
                  status: pumpSpeed > 0 ? 'On' : 'Off',
                  pumpSpeed: pumpSpeed,
                  speed: pumpSpeed,
                  isFallback: true  // Add flag to indicate this is fallback data
                };
                dataProcessor = (responseData) => {
                  if (responseData && responseData.data && responseData.data.length > 0) {
                    const processedData = {
                      deviceType: 'pump_water',
                      deviceId: device.id,
                      status: responseData.data[0].status || 'Off',
                      pumpSpeed: responseData.data[0].pumpSpeed,
                      speed: responseData.data[0].pumpSpeed,
                      isFallback: false  // Real data from API
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
                  status: savedData && savedData.light ? savedData.light.status || 'Off' : 'Off',
                  isFallback: true  // Add flag to indicate this is fallback data
                };
                dataProcessor = (responseData) => {
                  if (responseData && responseData.data && responseData.data.length > 0) {
                    return {
                      deviceType: 'light',
                      deviceId: device.id,
                      status: responseData.data[0].status || 'Off',
                      isFallback: false  // Real data from API
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
                // Track and store 404 errors to avoid repeat requests
                if (deviceRequestError.response && deviceRequestError.response.status === 404) {
                  console.warn(`SensorService: Device data not found for ${device.deviceType} (ID: ${device.id}), using fallback data`);
                  
                  // Add to the list of unavailable devices
                  if (!knownDeletedDevices.includes(device.id.toString())) {
                    newlyUnavailableDevices.push(device.id.toString());
                  }
                } else {
                  console.error(`SensorService: Error fetching data for device ${device.id}:`, deviceRequestError);
                }
                
                // Try to use localStorage data first before sample data
                if (savedData && device.deviceType === 'soil_moisture' && savedData.soilMoisture !== undefined) {
                  result.data.push({
                    deviceType: 'soil_moisture',
                    deviceId: device.id,
                    soilMoisture: savedData.soilMoisture,
                    isFallback: true  // Add flag to indicate this is fallback data
                  });
                  console.log(`SensorService: Using localStorage data for soil_moisture: ${savedData.soilMoisture}`);
                } else if (savedData && device.deviceType === 'temperature_humidity' && 
                          savedData.temperature !== undefined && savedData.airHumidity !== undefined) {
                  result.data.push({
                    deviceType: 'temperature_humidity',
                    deviceId: device.id,
                    temperature: savedData.temperature,
                    airHumidity: savedData.airHumidity,
                    isFallback: true  // Add flag to indicate this is fallback data
                  });
                  console.log(`SensorService: Using localStorage data for temperature_humidity: ${savedData.temperature}°C, ${savedData.airHumidity}%`);
                } else if (savedData && device.deviceType === 'pump_water' && savedData.pumpWater) {
                  const pumpSpeed = savedData.pumpWater.speed || 0;
                  result.data.push({
                    deviceType: 'pump_water',
                    deviceId: device.id,
                    status: savedData.pumpWater.status || 'Off',
                    pumpSpeed: pumpSpeed,  // Use pumpSpeed for API compatibility
                    speed: pumpSpeed,       // Use speed for frontend compatibility
                    isFallback: true  // Add flag to indicate this is fallback data
                  });
                  console.log(`SensorService: Using localStorage data for pump_water: ${savedData.pumpWater.status}, ${pumpSpeed}%`);
                } else if (savedData && device.deviceType === 'light' && savedData.light) {
                  result.data.push({
                    deviceType: 'light',
                    deviceId: device.id,
                    status: savedData.light.status || 'Off',
                    isFallback: true  // Add flag to indicate this is fallback data
                  });
                  console.log(`SensorService: Using localStorage data for light: ${savedData.light.status}`);
                } else {
                  // Fallback to sample data only if localStorage data isn't available
                  result.data.push(fallbackData);
                  console.log(`SensorService: Using fallback data for ${device.deviceType} device (ID: ${device.id})`);
                }
              }
            }
          } catch (deviceError) {
            console.error(`SensorService: Error processing device ${device.id}:`, deviceError);
            // Continue with next device but mark as fallback data
            if (fallbackData) {
              result.data.push({...fallbackData, isFallback: true});
            }
          }
        }
        
        // Update the unavailable devices list
        if (newlyUnavailableDevices.length > 0) {
          const combinedUnavailableDevices = [...new Set([...knownDeletedDevices, ...newlyUnavailableDevices])];
          try {
            localStorage.setItem('unavailable_devices', JSON.stringify(combinedUnavailableDevices));
            console.log('SensorService: Updated unavailable devices list:', combinedUnavailableDevices);
          } catch (error) {
            console.error('SensorService: Error saving unavailable devices list:', error);
          }
        }
        
        console.log(`SensorService: Returned data for ${result.data.length} devices`);
        
        // Check if we're using fallback data for any device
        const usingFallback = result.data.some(device => device.isFallback);
        if (usingFallback) {
          console.warn('SensorService: Using fallback data for some or all devices');
          result.hasFallbackData = true;
          result.message = 'Một số dữ liệu hiển thị có thể không phải dữ liệu thực tế do lỗi kết nối API';
        }
        
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
            data: [],
            hasFallbackData: true
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
              data: [],
              hasFallbackData: true
            };
            
            // Add soil_moisture device if we have data
            if (savedData.soilMoisture !== undefined) {
              fallbackResult.data.push({
                deviceType: 'soil_moisture',
                deviceId: 'local-1',
                soilMoisture: savedData.soilMoisture,
                isFallback: true
              });
            }
            
            // Add temperature_humidity device if we have data
            if (savedData.temperature !== undefined && savedData.airHumidity !== undefined) {
              fallbackResult.data.push({
                deviceType: 'temperature_humidity',
                deviceId: 'local-2',
                temperature: savedData.temperature,
                airHumidity: savedData.airHumidity,
                isFallback: true
              });
            }
            
            // Add pump_water device if we have data
            if (savedData.pumpWater) {
              const pumpSpeed = savedData.pumpWater.speed;
              fallbackResult.data.push({
                deviceType: 'pump_water',
                deviceId: 'local-3',
                status: savedData.pumpWater.status || 'Off',
                pumpSpeed: pumpSpeed,  // Use pumpSpeed for API compatibility
                speed: pumpSpeed,      // Use speed for frontend compatibility
                isFallback: true
              });
            }
            
            // Add light device if we have data
            if (savedData.light) {
              fallbackResult.data.push({
                deviceType: 'light',
                deviceId: 'local-4',
                status: savedData.light.status || 'Off',
                isFallback: true
              });
            }
            
            console.log('SensorService: Generated fallback data from localStorage:', fallbackResult);
            return fallbackResult;
          } else {
            // If no localStorage data, fall back to sample data
            console.warn('SensorService: No localStorage data available, using default values');
            
            // Create fallback data with default values - use local-* IDs instead of numeric IDs
            // to avoid conflicts with actual device IDs on the server
            const fallbackResult = {
              success: true,
              message: 'Đang hiển thị dữ liệu mặc định do không thể kết nối với máy chủ và không có dữ liệu lưu trữ',
              data: [
                {
                  deviceType: 'temperature_humidity',
                  deviceId: 'local-temp-1',
                  temperature: 0,
                  airHumidity: 0,
                  isFallback: true
                },
                {
                  deviceType: 'soil_moisture',
                  deviceId: 'local-soil-1',
                  soilMoisture: 0,
                  isFallback: true
                },
                {
                  deviceType: 'pump_water',
                  deviceId: 'local-pump-1',
                  status: 'Off',
                  pumpSpeed: 0,
                  speed: 0,
                  isFallback: true
                },
                {
                  deviceType: 'light',
                  deviceId: 'local-light-1',
                  status: 'Off',
                  isFallback: true
                }
              ],
              hasFallbackData: true
            };
            
            return fallbackResult;
          }
        }
        
        // For other errors
        return {
          success: false,
          message: devicesError.message || 'Lỗi khi lấy danh sách thiết bị',
          data: [],
          hasFallbackData: true
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
        data: [],
        hasFallbackData: true
      };
    }
  }
}

export default SensorServices; 