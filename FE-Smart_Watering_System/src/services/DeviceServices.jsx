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
  { readingTime: new Date(Date.now() - 3600000).toISOString(), status: 'Off', pumpSpeed: 0 },
  { readingTime: new Date(Date.now() - 7200000).toISOString(), status: 'Active', pumpSpeed: 80 }
];

const sampleLightData = [
  { readingTime: new Date().toISOString(), status: 'On', brightness: 100 },
  { readingTime: new Date(Date.now() - 3600000).toISOString(), status: 'Off', brightness: 0 },
  { readingTime: new Date(Date.now() - 7200000).toISOString(), status: 'On', brightness: 100 }
];

// Export sample data để có thể sử dụng trong các component khác
export { sampleTemperatureHumidityData, sampleSoilMoistureData, samplePumpData, sampleLightData };

const DeviceServices = {
  // Lấy tất cả thiết bị
  getAllDevices: async () => {
    try {
      console.log('Fetching all devices');
      const response = await axios.get('/devices');
      console.log('All devices response:', response.data);

      // Kiểm tra cấu trúc phản hồi
      if (response.data && response.data.success && response.data.data) {
        return response.data.data;
      }

      // Trả về response.data nếu không có cấu trúc data nested
      return response.data;
    } catch (error) {
      console.error('Error fetching devices:', error);
      // Return empty array instead of throwing error to prevent UI crashes
      return [];
    }
  },

  // Lấy thiết bị của người dùng đang đăng nhập
  getDevices: async () => {
    try {
      console.log('Fetching devices for current user');
      // Gọi API route đặc biệt cho thiết bị của người dùng hiện tại
      const response = await axios.get('/devices');
      console.log('User devices response:', response.data);

      // Kiểm tra cấu trúc phản hồi
      if (response.data && response.data.success && response.data.data) {
        return response.data.data;
      }

      return response.data;
    } catch (error) {
      console.error('Error fetching user devices:', error);
      return [];
    }
  },

  // Thêm thiết bị mới
  addDevice: async (deviceData) => {
    try {
      console.log('Adding new device:', deviceData);
      const response = await axios.post('/devices', deviceData);
      console.log('Add device response:', response.data);

      if (response.data && response.data.success) {
        return {
          success: true,
          data: response.data.data,
          message: response.data.message || 'Thêm thiết bị thành công'
        };
      }

      return {
        success: false,
        message: response.data.message || 'Lỗi khi thêm thiết bị'
      };
    } catch (error) {
      console.error('Error adding device:', error);
      let errorMessage = 'Lỗi kết nối đến máy chủ';

      if (error.response) {
        errorMessage = error.response.data.message || `Lỗi: ${error.response.status}`;
      }

      return {
        success: false,
        message: errorMessage
      };
    }
  },

  // Lấy thông tin chi tiết của một thiết bị
  getDeviceById: async (deviceId) => {
    try {
      console.log('Fetching device by ID:', deviceId);
      const response = await axios.get(`/devices/${deviceId}`);
      console.log('Device detail response:', response.data);

      // Kiểm tra cấu trúc phản hồi
      if (response.data && response.data.success && response.data.device) {
        // Trả về thiết bị với trạng thái đã được lấy từ backend
        return response.data.device;
      }

      // Nếu không có cấu trúc device trong response, thử kiểm tra data
      if (response.data && response.data.data) {
        return response.data.data;
      }

      return response.data;
    } catch (error) {
      console.error(`Error fetching device ${deviceId}:`, error);
      // Return a sample device instead of throwing error
      return {
        id: deviceId,
        deviceCode: `Device-${deviceId}`,
        description: 'Sample device (API error fallback)',
        deviceType: 'temperature_humidity',
        status: 'Off', // Trạng thái mặc định
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

      // Kiểm tra nếu response là HTML (bắt đầu với <!doctype hoặc <html)
      if (typeof response.data === 'string' && 
          (response.data.toLowerCase().includes('<!doctype') || 
           response.data.toLowerCase().includes('<html'))) {
        console.error('Server returned HTML instead of JSON for temperature-humidity data. Using sample data.');
        return sampleTemperatureHumidityData;
      }

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
      
      // Kiểm tra token trước khi gọi API
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found. This may cause 401 errors.');
      } else {
        // Log token expiry info for debugging (không log toàn bộ token vì lý do bảo mật)
        try {
          const tokenParts = token.split('.');
          if (tokenParts.length === 3) {
            const payload = JSON.parse(atob(tokenParts[1]));
            if (payload.exp) {
              const expiry = new Date(payload.exp * 1000);
              const now = new Date();
              console.log(`Token expires at: ${expiry.toLocaleString()}, Now: ${now.toLocaleString()}, Valid: ${expiry > now}`);
            }
          }
        } catch (e) {
          console.error('Error parsing token:', e);
        }
      }

      // Log full URL for debugging
      const API_URL = import.meta.env.VITE_API_URL;
      const fullUrl = `${API_URL}/api/devices/${deviceId}/soil-moisture`;
      console.log('Full API URL:', fullUrl);
      
      // Sử dụng phương thức GET với timeout để ngăn chặn pending quá lâu
      const response = await axios.get(`/devices/${deviceId}/soil-moisture`, {
        timeout: 10000, // 10 seconds timeout
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Soil moisture data response status:', response.status);
      console.log('Soil moisture data response headers:', response.headers);
      console.log('Soil moisture data response data:', response.data);

      // Kiểm tra nếu response là HTML (bắt đầu với <!doctype hoặc <html)
      if (typeof response.data === 'string' && 
          (response.data.toLowerCase().includes('<!doctype') || 
           response.data.toLowerCase().includes('<html'))) {
        console.error('Server returned HTML instead of JSON for soil moisture data. Using sample data.');
        // Log thêm nội dung HTML để debug
        console.error('HTML content (first 200 chars):', response.data.substring(0, 200));
        return sampleSoilMoistureData;
      }

      // Check if API returned expected format with data property
      if (response.data && response.data.data) {
        return response.data.data;
      }

      return response.data;
    } catch (error) {
      console.error('Error fetching soil moisture data:', error);
      // Add more detailed error logging
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response headers:', error.response.headers);
        console.error('Response data:', error.response.data);
        
        // Check for common status codes
        if (error.response.status === 401) {
          console.error('Authentication error: Your token may be invalid or expired');
        } else if (error.response.status === 403) {
          console.error('Authorization error: You do not have permission to access this resource');
        } else if (error.response.status === 404) {
          console.error('API endpoint not found: Check if /api/devices/${deviceId}/soil-moisture exists');
        } else if (error.response.status === 500) {
          console.error('Server error: The backend server encountered an error');
        }
      } else if (error.request) {
        console.error('No response received:', error.request);
        console.error('Network error: Server might be down or CORS issue');
      } else {
        console.error('Error setting up request:', error.message);
      }
      
      // Log API config cho debug
      if (error.config) {
        console.log('API Request URL:', error.config.url);
        console.log('API Request Method:', error.config.method);
        console.log('API Request Headers:', error.config.headers);
      }

      // Return sample data instead of throwing error
      console.log('Using sample soil moisture data due to API error');
      return sampleSoilMoistureData;
    }
  },

  // Lấy dữ liệu máy bơm
  getPumpWaterData: async (deviceId) => {
    try {
      console.log('Fetching pump water data for device:', deviceId);
      
      // Kiểm tra token trước khi gọi API
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found. This may cause 401 errors.');
      } else {
        // Log token expiry info for debugging (không log toàn bộ token vì lý do bảo mật)
        try {
          const tokenParts = token.split('.');
          if (tokenParts.length === 3) {
            const payload = JSON.parse(atob(tokenParts[1]));
            if (payload.exp) {
              const expiry = new Date(payload.exp * 1000);
              const now = new Date();
              console.log(`Token expires at: ${expiry.toLocaleString()}, Now: ${now.toLocaleString()}, Valid: ${expiry > now}`);
            }
          }
        } catch (e) {
          console.error('Error parsing token:', e);
        }
      }

      // Log full URL for debugging
      const API_URL = import.meta.env.VITE_API_URL;
      const fullUrl = `${API_URL}/api/devices/${deviceId}/pump-water`;
      console.log('Full API URL:', fullUrl);
      
      // Sử dụng phương thức GET với timeout để ngăn chặn pending quá lâu
      const response = await axios.get(`/devices/${deviceId}/pump-water`, {
        timeout: 10000, // 10 seconds timeout
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Pump water data response status:', response.status);
      console.log('Pump water data response headers:', response.headers);
      console.log('Pump water data response data:', response.data);

      // Kiểm tra nếu response là HTML (bắt đầu với <!doctype hoặc <html)
      if (typeof response.data === 'string' && 
          (response.data.toLowerCase().includes('<!doctype') || 
           response.data.toLowerCase().includes('<html'))) {
        console.error('Server returned HTML instead of JSON for pump data. Using sample data.');
        // Log thêm nội dung HTML để debug
        console.error('HTML content (first 200 chars):', response.data.substring(0, 200));
        return samplePumpData;
      }

      // Check if API returned expected format with data property
      if (response.data && response.data.data) {
        return response.data.data;
      }

      return response.data;
    } catch (error) {
      console.error('Error fetching pump water data:', error);
      // Add more detailed error logging
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response headers:', error.response.headers);
        console.error('Response data:', error.response.data);
        
        // Check for common status codes
        if (error.response.status === 401) {
          console.error('Authentication error: Your token may be invalid or expired');
        } else if (error.response.status === 403) {
          console.error('Authorization error: You do not have permission to access this resource');
        } else if (error.response.status === 404) {
          console.error('API endpoint not found: Check if /api/devices/${deviceId}/pump-water exists');
        } else if (error.response.status === 500) {
          console.error('Server error: The backend server encountered an error');
        }
      } else if (error.request) {
        console.error('No response received:', error.request);
        console.error('Network error: Server might be down or CORS issue');
      } else {
        console.error('Error setting up request:', error.message);
      }
      
      // Log API config cho debug
      if (error.config) {
        console.log('API Request URL:', error.config.url);
        console.log('API Request Method:', error.config.method);
        console.log('API Request Headers:', error.config.headers);
      }

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

      // Kiểm tra nếu response là HTML (bắt đầu với <!doctype hoặc <html)
      if (typeof response.data === 'string' && 
          (response.data.toLowerCase().includes('<!doctype') || 
           response.data.toLowerCase().includes('<html'))) {
        console.error('Server returned HTML instead of JSON for light data. Using sample data.');
        return sampleLightData;
      }

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
  },

  // Cập nhật thiết bị
  updateDevice: async (deviceId, deviceData) => {
    try {
      console.log('Updating device:', deviceId, deviceData);
      const response = await axios.put(`/devices/${deviceId}`, deviceData);
      console.log('Update device response:', response.data);

      if (response.data && response.data.success) {
        return {
          success: true,
          data: response.data.data,
          message: response.data.message || 'Cập nhật thiết bị thành công'
        };
      }

      return {
        success: false,
        message: response.data.message || 'Lỗi khi cập nhật thiết bị'
      };
    } catch (error) {
      console.error('Error updating device:', error);
      let errorMessage = 'Lỗi kết nối đến máy chủ';

      if (error.response) {
        errorMessage = error.response.data.message || `Lỗi: ${error.response.status}`;
      }

      return {
        success: false,
        message: errorMessage
      };
    }
  },

  // Kích hoạt thiết bị (kết nối MQTT) sau khi tạo mới
  activateDevice: async (deviceId) => {
    try {
      console.log('Activating device:', deviceId);
      const response = await axios.post(`/devices/${deviceId}/activate`);
      console.log('Device activation response:', response.data);

      if (response.data && response.data.success) {
        return {
          success: true,
          message: response.data.message || 'Kích hoạt thiết bị thành công'
        };
      }

      return {
        success: false,
        message: response.data.message || 'Kích hoạt thiết bị không thành công'
      };
    } catch (error) {
      console.error('Error activating device:', error);
      let errorMessage = 'Lỗi kết nối đến máy chủ';

      if (error.response) {
        errorMessage = error.response.data.message || `Lỗi: ${error.response.status}`;
      }

      return {
        success: false,
        message: errorMessage
      };
    }
  },

  // Xóa thiết bị
  deleteDevice: async (deviceId) => {
    try {
      console.log('Deleting device:', deviceId);
      const response = await axios.delete(`/devices/${deviceId}`);
      console.log('Delete device response:', response.data);

      if (response.data && response.data.success) {
        return {
          success: true,
          message: response.data.message || 'Xóa thiết bị thành công'
        };
      }

      return {
        success: false,
        message: response.data.message || 'Lỗi khi xóa thiết bị'
      };
    } catch (error) {
      console.error('Error deleting device:', error);
      let errorMessage = 'Lỗi kết nối đến máy chủ';

      if (error.response) {
        errorMessage = error.response.data.message || `Lỗi: ${error.response.status}`;
      }

      return {
        success: false,
        message: errorMessage
      };
    }
  }
};

export default DeviceServices; 