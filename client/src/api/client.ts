/**
 * Axios API client — configured with base URL, auth interceptors,
 * and token refresh logic.
 */
import axios from 'axios';
import { NativeModules, Platform } from 'react-native';
import { useAppStore } from '../store/useAppStore';

// For development: point to your local server.
// Change this when deploying.
function getDevHostFromExpo(): string | null {
  const scriptURL: string | undefined = NativeModules?.SourceCode?.scriptURL;
  if (!scriptURL) return null;

  const hostMatch = scriptURL.match(/\/\/([^/:]+)/);
  return hostMatch?.[1] || null;
}

const expoDevHost = getDevHostFromExpo();
const DEV_DEFAULT_BASE_URL =
  expoDevHost
    ? `http://${expoDevHost}:3000/v1`
    : Platform.OS === 'android'
      ? 'http://10.0.2.2:3000/v1'
      : 'http://localhost:3000/v1';

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  (__DEV__ ? DEV_DEFAULT_BASE_URL : 'https://api.yeenatweg.com/v1');

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Request Interceptor: Attach Bearer Token ────────────

api.interceptors.request.use(
  (config) => {
    const token = useAppStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Set Accept-Language header based on user preference
    const language = useAppStore.getState().language;
    config.headers['Accept-Language'] = language;

    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor: Handle 401 → Refresh Token ────

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and we haven't already tried to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = useAppStore.getState().refreshToken;
        if (!refreshToken) {
          useAppStore.getState().clearAuth();
          return Promise.reject(error);
        }

        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        });

        const { access_token, refresh_token } = response.data;
        const user = useAppStore.getState().user;

        if (user) {
          useAppStore.getState().setAuth(user, access_token, refresh_token);
        }

        // Retry the original request with the new token
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return api(originalRequest);
      } catch (refreshError) {
        useAppStore.getState().clearAuth();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
