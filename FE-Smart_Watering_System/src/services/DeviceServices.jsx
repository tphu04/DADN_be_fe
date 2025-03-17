import axios from './CustomizeAxios';

const DeviceServices = {
  // Lấy tất cả thiết bị
  getAllDevices: async () => {
    try {
      const response = await axios.get('/devices');
      return response.data;
    } catch (error) {
      console.error('Error fetching devices:', error);
      throw error;
    }
  },

  // Lấy thông tin chi tiết của một thiết bị
  getDeviceById: async (deviceId) => {
    try {
      const response = await axios.get(`/devices/${deviceId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching device ${deviceId}:`, error);
      throw error;
    }
  },

  // Lấy dữ liệu nhiệt độ và độ ẩm của thiết bị
  getTemperatureHumidityData: async (deviceId) => {
    try {
      const response = await axios.get(`/devices/${deviceId}/temperature-humidity`);
      return response.data;
    } catch (error) {
      console.error('Error fetching temperature humidity data:', error);
      throw error;
    }
  },

  // Lấy dữ liệu độ ẩm đất của thiết bị
  getSoilMoistureData: async (deviceId) => {
    try {
      const response = await axios.get(`/devices/${deviceId}/soil-moisture`);
      return response.data;
    } catch (error) {
      console.error('Error fetching soil moisture data:', error);
      throw error;
    }
  },

  // Lấy dữ liệu máy bơm
  getPumpWaterData: async (deviceId) => {
    try {
      const response = await axios.get(`/devices/${deviceId}/pump-water`);
      return response.data;
    } catch (error) {
      console.error('Error fetching pump water data:', error);
      throw error;
    }
  }
};

export default DeviceServices; 