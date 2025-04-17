import axios from './CustomizeAxios';
import { toast } from 'react-toastify';

// Fallback sample data when API fails
// const sampleSensorData = {
//   success: true,
//   message: "Dữ liệu mẫu (không có kết nối với máy chủ)",
//   data: [
//     {
//       deviceId: 1,
//       deviceType: "temperature_humidity",
//       temperature: 25.5,
//       airHumidity: 70
//     },
//     {
//       deviceId: 2,
//       deviceType: "soil_moisture",
//       soilMoisture: 65
//     }
//   ]
// };

const SensorServices = {
  // Lấy dữ liệu mới nhất từ tất cả các cảm biến của user hiện tại
  getLatestSensorData: async () => {
    try {
      console.log('SensorServices: Fetching latest sensor data for current user');
      const response = await axios.get('/sensors/latest');
      console.log('SensorServices: Response from API:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching latest sensor data:', error);
      
      // Log detailed error information
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
        
        // If it's an authentication error, let the interceptor handle redirection
        if (error.response.status === 401) {
          console.warn('Authentication error when fetching sensor data');
          throw error; // Let the Axios interceptor handle 401 errors
        }
      } else if (error.request) {
        console.error('No response received:', error.request);
      } else {
        console.error('Error setting up request:', error.message);
      }
      
      // For non-authentication errors, return fallback data
      if (error.code === 'ERR_NETWORK') {
        toast.warning('Sử dụng dữ liệu mẫu do không thể kết nối đến máy chủ');
        return sampleSensorData;
      }
      
      // Other errors
      toast.error('Lỗi khi lấy dữ liệu cảm biến. Đang hiển thị dữ liệu mẫu.');
      return sampleSensorData;
    }
  },

  // Lấy dữ liệu lịch sử của một cảm biến cụ thể
  getSensorHistory: async (deviceId, timeRange = 'day', limit = 24) => {
    try {
      const response = await axios.get(`/sensors/history/${deviceId}`, {
        params: { timeRange, limit }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching sensor history:', error);
      
      // Log detailed error information
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
        
        // If it's an authentication error, let the interceptor handle redirection
        if (error.response.status === 401) {
          console.warn('Authentication error when fetching sensor history');
          throw error; // Let the Axios interceptor handle 401 errors
        }
      }
      
      // Return empty data rather than throwing for non-auth errors
      return {
        success: false,
        message: 'Không thể tải dữ liệu lịch sử',
        data: []
      };
    }
  }
};

export default SensorServices; 