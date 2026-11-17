import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

// Token storage keys (shared with stores/authStore.ts).
export const ACCESS_KEY = 'vica_auth_token';
export const REFRESH_KEY = 'vica_refresh_token';
export const USER_KEY = 'vica_auth_user';
/** Fired when the session cannot be refreshed; authStore listens and signs the user out. */
export const AUTH_EXPIRED_EVENT = 'vica:auth-expired';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(ACCESS_KEY);
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Endpoints that must never trigger a token refresh (they are how you get tokens in the first place).
const PUBLIC_AUTH_PATHS = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/google',
  '/auth/forgot-password', '/auth/reset-password', '/auth/verify-email'];

// Several requests may expire at once: only one /auth/refresh call is made, the others wait for it.
let refreshPromise: Promise<string> | null = null;

function refreshAccessToken(): Promise<string> {
  const refreshToken = localStorage.getItem(REFRESH_KEY);
  if (!refreshToken) return Promise.reject(new Error('No refresh token'));
  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${API_BASE_URL}/auth/refresh`, { refreshToken })
      .then((res) => {
        const token: string = res.data.data.accessToken;
        localStorage.setItem(ACCESS_KEY, token);
        return token;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

function clearSession() {
  [ACCESS_KEY, REFRESH_KEY, USER_KEY].forEach((key) => localStorage.removeItem(key));
  window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    const isPublicAuthCall = PUBLIC_AUTH_PATHS.some((path) => original?.url?.includes(path));

    // Expired access token: refresh once, then replay the original request.
    if (error.response?.status === 401 && original && !original._retry && !isPublicAuthCall
        && localStorage.getItem(REFRESH_KEY)) {
      original._retry = true;
      try {
        const token = await refreshAccessToken();
        original.headers.Authorization = `Bearer ${token}`;
        return apiClient(original);
      } catch {
        clearSession(); // refresh token expired or revoked
      }
    }

    if (error.response) {
      console.error(`API Error [${error.response.status}]:`, error.response.data);
    } else if (error.request) {
      console.error('API Network Error: No response received', error.message);
    } else {
      console.error('API Configuration Error:', error.message);
    }
    return Promise.reject(error);
  }
);

