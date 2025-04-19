import axios from "axios";

// const API_URL = 'http://localhost:3000/api';
const API_URL = `${import.meta.env.VITE_API_URL}/api`;

console.log('API URL:', API_URL); // Log the API URL for debugging

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  timeout: 30000, // Increase timeout to 30 seconds for slow responses
  // Add headers to help with CORS
  headers: {
    'Content-Type': 'application/json',
  }
});

// Add a request interceptor
api.interceptors.request.use(
  function (config) {
    // Get token from localStorage
    const token = localStorage.getItem('token');
    // If token exists, add it to request headers
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log(`Request to: ${config.url}`, config); // Log request for debugging
    return config;
  },
  function (error) {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Track if we're already redirecting to prevent multiple redirects
let isRedirecting = false;

// Add a response interceptor
api.interceptors.response.use(
  function (response) {
    // Any status code that lie within the range of 2xx cause this function to trigger
    return response;
  },
  function (error) {
    // Only log detailed error information for non-device endpoints or non-404 errors
    const isDeviceEndpoint = error.config && error.config.url && (
      error.config.url.includes('/devices/') ||
      error.config.url.includes('/temperature') ||
      error.config.url.includes('/soil') ||
      error.config.url.includes('/pump') ||
      error.config.url.includes('/light')
    );
    
    const is404Error = error.response && error.response.status === 404;
    
    // Log less verbose error for 404s on device endpoints
    if (isDeviceEndpoint && is404Error) {
      console.warn(`API 404 Error: Resource not found at ${error.config.url}`);
    } else {
      // Log detailed error information for debugging other errors
      console.error('API Error:', {
        message: error.message,
        code: error.code,
        response: error.response ? {
          status: error.response.status,
          data: error.response.data
        } : 'No response',
        request: error.request ? 'Request sent but no response' : 'No request sent'
      });
    }
    
    // Any status codes that falls outside the range of 2xx cause this function to trigger
    if (error.response && error.response.status === 401) {
      // Only redirect if not already in progress and not on login page
      if (!isRedirecting && !window.location.pathname.includes('/login')) {
        isRedirecting = true;
        console.log('Authentication token expired or invalid. Redirecting to login...');
        
        // Clear authentication data
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Use setTimeout to allow current request stack to complete
        setTimeout(() => {
          window.location.href = '/login';
          isRedirecting = false;
        }, 100);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
