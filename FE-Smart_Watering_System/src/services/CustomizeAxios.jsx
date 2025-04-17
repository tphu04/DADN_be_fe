import axios from "axios";

// const API_URL = 'http://localhost:3000/api';
const API_URL = `${import.meta.env.VITE_API_URL}/api`;


const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
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
    return config;
  },
  function (error) {
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
