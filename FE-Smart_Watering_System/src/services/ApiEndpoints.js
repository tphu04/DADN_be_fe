// API base URL
const API_BASE_URL = 'http://localhost:3000';

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
    GET_BY_ID: (id) => `${API_BASE_URL}/api/devices/${id}`,
    CREATE: `${API_BASE_URL}/api/devices`,
    UPDATE: (id) => `${API_BASE_URL}/api/devices/${id}`,
    DELETE: (id) => `${API_BASE_URL}/api/devices/${id}`,
    GET_BY_USER: (userId) => `${API_BASE_URL}/api/devices/user/${userId}`,
    GET_TEMPERATURE: (id) => `${API_BASE_URL}/api/devices/${id}/temperature`,
    GET_SOIL_MOISTURE: (id) => `${API_BASE_URL}/api/devices/${id}/soil`,
    GET_PUMP_WATER: (id) => `${API_BASE_URL}/api/devices/${id}/pump`,
    GET_LIGHT: (id) => `${API_BASE_URL}/api/devices/${id}/light`,
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
    MARK_READ: (id) => `${API_BASE_URL}/api/notifications/${id}/read`,
    GET_UNREAD: `${API_BASE_URL}/api/notifications/unread`,
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