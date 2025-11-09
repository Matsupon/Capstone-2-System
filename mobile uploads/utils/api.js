import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.137.223:8000/api';

// Log the API URL being used (for debugging)
console.log('API Base URL:', API_URL);
console.log('EXPO_PUBLIC_API_URL:', process.env.EXPO_PUBLIC_API_URL);

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  timeout: 60000, // Increased to 60 seconds for weak network connections
  headers: {
    'Accept': 'application/json',
  },
});

// Retry configuration for network errors (useful for weak/intermittent connections)
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second delay between retries

// Note: Retry logic is now handled directly in the error interceptor
// to avoid modifying read-only config objects

api.interceptors.request.use(async (config) => {
  try {
    const token = await AsyncStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Check if data is FormData (React Native FormData or browser FormData)
    // React Native FormData: has append method and is an object
    // Browser FormData: instanceof FormData works
    const isFormData = config.data instanceof FormData || 
                       (config.data && 
                        typeof config.data.append === 'function' && 
                        typeof config.data === 'object' &&
                        !Array.isArray(config.data));
    
    // For FormData, don't set Content-Type - let axios set it automatically with boundary
    // This is crucial for multipart/form-data to work correctly
    if (isFormData) {
      // Remove Content-Type if it was set in headers to let axios handle it
      if (config.headers) {
        delete config.headers['Content-Type'];
        delete config.headers['content-type'];
      }
    } else if (!config.headers['Content-Type'] && !config.headers['content-type']) {
      // For non-FormData requests, set Content-Type to application/json if not already set
      config.headers['Content-Type'] = 'application/json';
    }
    
    const fullUrl = `${config.baseURL}${config.url}`;
    console.log('API Request:', {
      method: config.method?.toUpperCase(),
      fullUrl: fullUrl,
      url: config.url,
      hasToken: !!token,
      baseURL: config.baseURL,
      isFormData: isFormData,
      contentType: config.headers['Content-Type'] || config.headers['content-type'] || 'auto',
    });
  } catch (error) {
    console.error('Error getting token:', error);
  }
  return config;
}, (error) => {
  console.error('Request Error:', error);
  return Promise.reject(error);
});

api.interceptors.response.use(
  (response) => {
    console.log('API Response Success:', {
      status: response.status,
      url: response.config.url,
      fullUrl: `${response.config.baseURL}${response.config.url}`,
    });
    return response;
  },
  async (error) => {
    const config = error.config;
    const fullUrl = config ? `${config.baseURL || ''}${config.url || ''}` : 'Unknown URL';
    
    // Track retry count without modifying the original config
    const retryCount = config?.__retryCount || 0;
    const isNetworkError = error.code === 'ERR_NETWORK' || 
                          error.code === 'NETWORK_ERROR' || 
                          error.message === 'Network Error';
    
    // Check if retries are disabled (useful for FormData uploads where retries can cause issues)
    const retriesDisabled = config?.__disableRetry === true;
    
    // Check if data is FormData (React Native FormData or browser FormData)
    // React Native FormData: has append method and is an object (but not array)
    // Browser FormData: instanceof FormData works
    const isFormData = config?.data instanceof FormData || 
                       (config?.data && 
                        typeof config?.data.append === 'function' && 
                        typeof config?.data === 'object' &&
                        !Array.isArray(config?.data));
    
    // Don't retry FormData uploads by default (they can cause issues with FormData preservation)
    // FormData cannot be easily recreated, so retries usually fail
    // Only retry if explicitly enabled via __enableFormDataRetry flag
    const shouldRetry = isNetworkError && 
                       retryCount < MAX_RETRIES && 
                       !retriesDisabled &&
                       !(isFormData && !config?.__enableFormDataRetry);
    
    // Log FormData detection for debugging
    if (isFormData) {
      console.log('📦 FormData detected - retries disabled by default');
    }
    
    // Check if we should retry this request
    if (shouldRetry) {
      const newRetryCount = retryCount + 1;
      
      console.log(`🔄 Retrying request (${newRetryCount}/${MAX_RETRIES}): ${config?.method?.toUpperCase()} ${config?.url}`);
      
      // Wait before retrying (linear backoff: 1s, 2s, 3s)
      const delay = RETRY_DELAY * newRetryCount;
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Create a new config object for retry (don't modify the original)
      const retryConfig = {
        ...config,
        __retryCount: newRetryCount,
      };
      
      try {
        // Make a fresh request with the retry config
        // Note: FormData retries are already filtered out by shouldRetry condition above
        return await api.request(retryConfig);
      } catch (retryError) {
        // If retry also failed, use the retry error for final handling
        error = retryError;
      }
    }
    
    // Handle final error (after retries exhausted or non-retryable error)
    const finalRetryCount = error.config?.__retryCount || retryCount;
    
    if (error.code === 'ERR_NETWORK' || error.code === 'NETWORK_ERROR' || error.message === 'Network Error') {
      // Get the server URL from the API instance
      const serverURL = error.config?.baseURL || config?.baseURL || api.defaults.baseURL || API_URL;
      const serverHost = serverURL ? serverURL.replace('/api', '').replace(/\/$/, '') : 'the server';
      
      console.error('⚠️ Network Error: Server may not be accessible. Check if backend is running at:', serverHost);
      console.error('Network Error Details:', {
        message: error.message,
        code: error.code,
        fullUrl: fullUrl,
        baseURL: error.config?.baseURL || config?.baseURL || api.defaults.baseURL,
        url: error.config?.url || config?.url,
        requestMethod: error.config?.method || config?.method,
        retriesAttempted: finalRetryCount,
      });
    } else {
      console.error('API Error:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        message: error.message,
        code: error.code,
        fullUrl: fullUrl,
        url: error.config?.url || config?.url,
        responseData: error.response?.data,
      });
    }
    
    return Promise.reject(error);
  }
);

export default api;
