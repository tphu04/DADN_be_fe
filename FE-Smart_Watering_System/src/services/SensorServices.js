import axios from 'axios';
import API_ENDPOINTS from './ApiEndpoints';

class SensorServices {
  // Lấy dữ liệu cảm biến mới nhất từ API
  static async getLatestSensorData() {
    try {
      console.log('SensorService: Fetching latest sensor data from API');
      
      // Chuẩn bị mảng kết quả
      const result = {
        success: true,
        data: []
      };
      
      // Lấy danh sách thiết bị của người dùng
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
          
          // Xác định endpoint và cách xử lý dữ liệu dựa vào loại thiết bị
          switch (device.deviceType) {
            case 'soil_moisture':
              endpoint = API_ENDPOINTS.DEVICES.GET_SOIL_MOISTURE(device.id);
              dataProcessor = (responseData) => {
                if (responseData && responseData.data && responseData.data.length > 0) {
                  return {
                    deviceType: 'soil_moisture',
                    deviceId: device.id,
                    soilMoisture: responseData.data[0].moistureValue || 0
                  };
                }
                return null;
              };
              break;
              
            case 'temperature_humidity':
              endpoint = API_ENDPOINTS.DEVICES.GET_TEMPERATURE(device.id);
              dataProcessor = (responseData) => {
                if (responseData && responseData.data && responseData.data.length > 0) {
                  return {
                    deviceType: 'temperature_humidity',
                    deviceId: device.id,
                    temperature: responseData.data[0].temperature || 0,
                    airHumidity: responseData.data[0].humidity || 0
                  };
                }
                return null;
              };
              break;
              
            case 'pump_water':
              endpoint = API_ENDPOINTS.DEVICES.GET_PUMP_WATER(device.id);
              dataProcessor = (responseData) => {
                if (responseData && responseData.data && responseData.data.length > 0) {
                  return {
                    deviceType: 'pump_water',
                    deviceId: device.id,
                    status: responseData.data[0].status || 'Inactive',
                    pumpSpeed: responseData.data[0].pumpSpeed || 0
                  };
                }
                return null;
              };
              break;
              
            case 'light':
              endpoint = API_ENDPOINTS.DEVICES.GET_LIGHT(device.id);
              dataProcessor = (responseData) => {
                if (responseData && responseData.data && responseData.data.length > 0) {
                  return {
                    deviceType: 'light',
                    deviceId: device.id,
                    status: responseData.data[0].status || 'Off'
                  };
                }
                return null;
              };
              break;
              
            default:
              console.warn(`SensorService: Unknown device type: ${device.deviceType}`);
              continue;
          }
          
          // Lấy dữ liệu cho thiết bị
          if (endpoint && dataProcessor) {
            const response = await axios.get(endpoint);
            
            if (response.data && response.data.success) {
              const processedData = dataProcessor(response.data);
              if (processedData) {
                result.data.push(processedData);
                console.log(`SensorService: Successfully fetched data for ${device.deviceType} device (ID: ${device.id})`);
              }
            } else {
              console.warn(`SensorService: Failed to fetch data for ${device.deviceType} device (ID: ${device.id})`);
            }
          }
        } catch (deviceError) {
          console.error(`SensorService: Error fetching data for device ${device.id}:`, deviceError);
          // Tiếp tục với thiết bị tiếp theo
        }
      }
      
      console.log(`SensorService: Successfully fetched data for ${result.data.length} devices`);
      return result;
      
    } catch (error) {
      console.error('SensorService: Error fetching sensor data:', error);
      return {
        success: false,
        message: error.message || 'Lỗi khi lấy dữ liệu cảm biến',
        data: []
      };
    }
  }
}

export default SensorServices; 