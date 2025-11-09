import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

/**
 * Test server connectivity from the mobile device
 * This helps diagnose network connectivity issues
 */
export const testServerConnection = async () => {
  const results = {
    serverUrl: api.defaults.baseURL,
    tests: [],
    allPassed: false,
  };

  // Test 1: Basic connectivity (no auth required)
  try {
    const response = await api.get('/test', { timeout: 10000 });
    results.tests.push({
      name: 'Basic API Connectivity',
      passed: true,
      message: 'Server is reachable',
      data: response.data,
    });
  } catch (error) {
    results.tests.push({
      name: 'Basic API Connectivity',
      passed: false,
      message: error.message || 'Cannot reach server',
      error: {
        code: error.code,
        message: error.message,
      },
    });
    results.allPassed = false;
    return results;
  }

  // Test 2: Authenticated endpoint (requires login)
  try {
    const token = await AsyncStorage.getItem('authToken');
    if (!token) {
      results.tests.push({
        name: 'Authentication Check',
        passed: false,
        message: 'No auth token found. Please login first.',
      });
      results.allPassed = false;
      return results;
    }

    const response = await api.get('/user', { timeout: 10000 });
    results.tests.push({
      name: 'Authenticated Endpoint',
      passed: true,
      message: 'Authentication is working',
      data: { userId: response.data?.id, email: response.data?.email },
    });
  } catch (error) {
    results.tests.push({
      name: 'Authenticated Endpoint',
      passed: false,
      message: error.response?.status === 401 ? 'Authentication failed' : error.message,
      error: {
        code: error.code,
        status: error.response?.status,
        message: error.message,
      },
    });
    results.allPassed = false;
    return results;
  }

  // Test 3: Appointments endpoint accessibility
  try {
    const response = await api.get('/appointments/test', { timeout: 10000 });
    results.tests.push({
      name: 'Appointments Endpoint',
      passed: true,
      message: 'Appointments endpoint is accessible',
      data: response.data,
    });
  } catch (error) {
    results.tests.push({
      name: 'Appointments Endpoint',
      passed: false,
      message: error.message || 'Cannot access appointments endpoint',
      error: {
        code: error.code,
        status: error.response?.status,
        message: error.message,
      },
    });
  }

  results.allPassed = results.tests.every(test => test.passed);
  return results;
};

export default testServerConnection;

