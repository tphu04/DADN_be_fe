// API base URL
// const API_BASE_URL = 'http://localhost:3000';
const API_BASE_URL = import.meta.env.VITE_API_URL;

// Ghi log thông tin URL để kiểm tra
console.log('API Base URL được sử dụng:', API_BASE_URL);

// API Endpoints
const API_ENDPOINTS = {
  AUTH: {
    LOGIN: `${API_BASE_URL}/api/auth/login`,
    REGISTER: `${API_BASE_URL}/api/auth/register`,
    LOGOUT: `${API_BASE_URL}/api/auth/logout`,
    PROFILE: `${API_BASE_URL}/api/auth/profile`,
  },
  USER: {
    GET_ALL: `${API_BASE_URL}/api/users`,
    GET_BY_ID: (id) => `${API_BASE_URL}/api/users/${id}`,
    UPDATE: (id) => `${API_BASE_URL}/api/users/${id}`,
    DELETE: (id) => `${API_BASE_URL}/api/users/${id}`,
    ACCEPT: (id) => `${API_BASE_URL}/api/users/${id}/accept`,
  },
  DEVICES: {
    GET_ALL: `${API_BASE_URL}/api/devices`,
    GET_BY_FEED_ID: (feedId) => `${API_BASE_URL}/api/feeds/${feedId}/devices`,
    GET_BY_ID: (id) => `${API_BASE_URL}/api/devices/${id}`,
    GET_STATUS: (id) => `${API_BASE_URL}/api/devices/${id}/status`,
    ADD: `${API_BASE_URL}/api/devices`,
    REMOVE: (id) => `${API_BASE_URL}/api/devices/${id}`,
    UPDATE: (id) => `${API_BASE_URL}/api/devices/${id}`,
    COMMAND: (id) => `${API_BASE_URL}/api/devices/${id}/control`, // Sửa từ command thành control
    GET_TEMPERATURE: (id) => `${API_BASE_URL}/api/devices/${id}/temperature`,
    GET_SOIL_MOISTURE: (id) => `${API_BASE_URL}/api/devices/${id}/soil`,
    GET_PUMP_WATER: (id) => `${API_BASE_URL}/api/devices/${id}/pump`,
    GET_LIGHT: (id) => `${API_BASE_URL}/api/devices/${id}/light`,
    GET_CONFIG: (id) => `${API_BASE_URL}/api/device-config/${id}`,
    UPDATE_CONFIG: (id) => `${API_BASE_URL}/api/device-config/${id}`,
    SAVE_CONFIG: `${API_BASE_URL}/api/device-config/save`,
    CONTROL: (id) => `${API_BASE_URL}/api/devices/${id}/control`,
  },
  FEEDS: {
    GET_ALL: `${API_BASE_URL}/api/feeds`,
    GET_BY_ID: (id) => `${API_BASE_URL}/api/feeds/${id}`,
    CREATE: `${API_BASE_URL}/api/feeds`,
    UPDATE: (id) => `${API_BASE_URL}/api/feeds/${id}`,
    DELETE: (id) => `${API_BASE_URL}/api/feeds/${id}`,
  },
  NOTIFICATIONS: {
    GET_ALL: `${API_BASE_URL}/api/notifications`,
    GET_BY_ID: (id) => `${API_BASE_URL}/api/notifications/${id}`,
    CREATE: `${API_BASE_URL}/api/notifications`,
    UPDATE: (id) => `${API_BASE_URL}/api/notifications/${id}`,
    DELETE: (id) => `${API_BASE_URL}/api/notifications/${id}`,
    MARK_READ: (id) => `${API_BASE_URL}/api/notifications/mark-read/${id}`,
    GET_UNREAD: `${API_BASE_URL}/api/notifications/unread`,
  },
  SCHEDULES: {
    GET_ALL: `${API_BASE_URL}/api/schedules`,
    GET_BY_ID: (id) => `${API_BASE_URL}/api/schedules/${id}`,
    GET_BY_DEVICE: (deviceId) => `${API_BASE_URL}/api/schedules/device/${deviceId}`,
    CREATE: `${API_BASE_URL}/api/schedules`,
    UPDATE: (id) => `${API_BASE_URL}/api/schedules/${id}`,
    DELETE: (id) => `${API_BASE_URL}/api/schedules/${id}`,
    TOGGLE: (id) => `${API_BASE_URL}/api/schedules/${id}/toggle`,
    SET_ENABLED: (id, enabled) => `${API_BASE_URL}/api/schedules/${id}/set-enabled?enabled=${enabled}`,
  },
  ADMIN: {
    DASHBOARD: `${API_BASE_URL}/api/admin/dashboard`,
    GET_ALL_USERS: `${API_BASE_URL}/api/admin/users`,
    GET_ALL_DEVICES: `${API_BASE_URL}/api/admin/devices`,
    SYSTEM_STATS: `${API_BASE_URL}/api/admin/stats`,
  }
};

export { API_ENDPOINTS };
export default API_ENDPOINTS;