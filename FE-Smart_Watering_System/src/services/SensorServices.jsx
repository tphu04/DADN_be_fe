import axios from './CustomizeAxios';

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
      throw error;
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
      throw error;
    }
  }
};

export default SensorServices; 