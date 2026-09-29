import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { tokenStorage } from '../storage/tokenStorage';

const getBaseUrl = (): string => {
  // 1. Explicit environment variable takes precedence
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // 2. Automatically resolve host IP when running on Expo Go or a physical device/emulator
  const hostUri = Constants.expoConfig?.hostUri || (Constants as { manifest?: { debuggerHost?: string } })?.manifest?.debuggerHost;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip) {
      return `http://${ip}:5000/api`;
    }
  }

  // 3. Android emulator loopback fallback
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5000/api';
  }

  // 4. Default localhost for web and iOS simulator
  return 'http://localhost:5000/api';
};

export const apiClient = axios.create({
  baseURL: getBaseUrl(),
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach JWT Token
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await tokenStorage.getToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Format Error Messages
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error: AxiosError<{ message?: string; errors?: Array<{ field?: string; message: string }> }>) => {
    let customMessage = 'An unexpected network error occurred';

    if (error.response?.data?.message) {
      customMessage = error.response.data.message;
    } else if (error.message) {
      customMessage = error.message;
    }

    const enhancedError = new Error(customMessage) as Error & {
      statusCode?: number;
      errors?: Array<{ field?: string; message: string }>;
      originalError?: AxiosError;
    };

    enhancedError.statusCode = error.response?.status;
    enhancedError.errors = error.response?.data?.errors;
    enhancedError.originalError = error;

    return Promise.reject(enhancedError);
  }
);

export default apiClient;
