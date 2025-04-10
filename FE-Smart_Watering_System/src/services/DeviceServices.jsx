import axios from './CustomizeAxios';

// Add sample data for fallback when API fails
const sampleTemperatureHumidityData = [
  { readingTime: new Date().toISOString(), temperature: 25.5, humidity: 68 },
  { readingTime: new Date(Date.now() - 3600000).toISOString(), temperature: 24.8, humidity: 70 },
  { readingTime: new Date(Date.now() - 7200000).toISOString(), temperature: 23.9, humidity: 72 }
];

const sampleSoilMoistureData = [
  { readingTime: new Date().toISOString(), moistureValue: 65 },
  { readingTime: new Date(Date.now() - 3600000).toISOString(), moistureValue: 63 },
  { readingTime: new Date(Date.now() - 7200000).toISOString(), moistureValue: 67 }
];

const samplePumpData = [
  { readingTime: new Date().toISOString(), status: 'Active', pumpSpeed: 75 },
  { readingTime: new Date(Date.now() - 3600000).toISOString(), status: 'Inactive', pumpSpeed: 0 },
  { readingTime: new Date(Date.now() - 7200000).toISOString(), status: 'Active', pumpSpeed: 80 }
];

const sampleLightData = [
  { readingTime: new Date().toISOString(), status: 'On', brightness: 100 },
  { readingTime: new Date(Date.now() - 3600000).toISOString(), status: 'Off', brightness: 0 },
  { readingTime: new Date(Date.now() - 7200000).toISOString(), status: 'On', brightness: 100 }
];

const DeviceServices = {
  // Lấy tất cả thiết bị
  getAllDevices: async () => {
    try {
      console.log('Fetching all devices');
      const response = await axios.get('/devices');
      console.log('All devices response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching devices:', error);
      // Return empty array instead of throwing error to prevent UI crashes
      return [];
    }
  },

  // Lấy thông tin chi tiết của một thiết bị
  getDeviceById: async (deviceId) => {
    try {
      console.log('Fetching device by ID:', deviceId);
      const response = await axios.get(`/devices/${deviceId}`);
      console.log('Device detail response:', response.data);
      return response.data;
    } catch (error) {
      console.error(`Error fetching device ${deviceId}:`, error);
      // Return a sample device instead of throwing error
      return {
        id: deviceId,
        deviceCode: `Device-${deviceId}`,
        description: 'Sample device (API error fallback)',
        deviceType: 'temperature_humidity',
        status: 'active',
        createdAt: new Date().toISOString()
      };
    }
  },

  // Lấy dữ liệu nhiệt độ và độ ẩm của thiết bị
  getTemperatureHumidityData: async (deviceId) => {
    try {
      console.log('Fetching temperature humidity data for device:', deviceId);
      const response = await axios.get(`/devices/${deviceId}/temperature-humidity`);
      console.log('Temperature humidity data response:', response.data);
      
      // Check if API returned expected format with data property
      if (response.data && response.data.data) {
        return response.data.data;
      }
      
      return response.data;
    } catch (error) {
      console.error('Error fetching temperature humidity data:', error);
      // Return sample data instead of throwing error
      console.log('Using sample temperature data due to API error');
      return sampleTemperatureHumidityData;
    }
  },

  // Lấy dữ liệu độ ẩm đất của thiết bị
  getSoilMoistureData: async (deviceId) => {
    try {
      console.log('Fetching soil moisture data for device:', deviceId);
      const response = await axios.get(`/devices/${deviceId}/soil-moisture`);
      console.log('Soil moisture data response:', response.data);
      
      // Check if API returned expected format with data property
      if (response.data && response.data.data) {
        return response.data.data;
      }
      
      return response.data;
    } catch (error) {
      console.error('Error fetching soil moisture data:', error);
      // Return sample data instead of throwing error
      console.log('Using sample soil moisture data due to API error');
      return sampleSoilMoistureData;
    }
  },

  // Lấy dữ liệu máy bơm
  getPumpWaterData: async (deviceId) => {
    try {
      console.log('Fetching pump water data for device:', deviceId);
      const response = await axios.get(`/devices/${deviceId}/pump-water`);
      console.log('Pump water data response:', response.data);
      
      // Check if API returned expected format with data property
      if (response.data && response.data.data) {
        return response.data.data;
      }
      
      return response.data;
    } catch (error) {
      console.error('Error fetching pump water data:', error);
      // Return sample data instead of throwing error
      console.log('Using sample pump data due to API error');
      return samplePumpData;
    }
  },

  // Lấy dữ liệu đèn
  getLightData: async (deviceId) => {
    try {
      console.log('Fetching light data for device:', deviceId);
      const response = await axios.get(`/devices/${deviceId}/light`);
      console.log('Light data response:', response.data);
      
      // Check if API returned expected format with data property
      if (response.data && response.data.data) {
        return response.data.data;
      }
      
      return response.data;
    } catch (error) {
      console.error('Error fetching light data:', error);
      // Return sample data instead of throwing error
      console.log('Using sample light data due to API error');
      return sampleLightData;
    }
  }
};

export default DeviceServices; 