import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

// Use a default API URL if environment variable is not set
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.137.170:8000/api';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  timeout: 30000, // 30 second timeout
});

// Automatically add token to requests
api.interceptors.request.use(async (config) => {
  try {
    const token = await AsyncStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log('API Request:', {
      method: config.method,
      url: config.url,
      hasToken: !!token
    });
  } catch (error) {
    console.error('Error getting token:', error);
  }
  return config;
});

// Add response interceptor for better error handling
api.interceptors.response.use(
  (response) => {
    console.log('API Response:', {
      status: response.status,
      url: response.config.url
    });
    return response;
  },
  (error) => {
    console.error('API Error:', {
      status: error.response?.status,
      message: error.message,
      url: error.config?.url
    });
    return Promise.reject(error);
  }
);

export default api;
