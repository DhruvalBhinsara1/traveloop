import axios from 'axios';

import { getAuthToken } from './tokenStorage';
export { AUTH_TOKEN_KEY, LEGACY_AUTH_TOKEN_KEY } from './tokenStorage';

declare const process: {
  env: Record<string, string | undefined>;
};

export const getApiBaseUrl = () => (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000').replace(/\/$/, '');

export const apiBaseURL = getApiBaseUrl();

export const client = axios.create({
  baseURL: apiBaseURL,
  timeout: 10000
});

client.interceptors.request.use(async (config) => {
  const token = await getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const getErrorMessage = (error: unknown, fallback = 'Something went wrong') => {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message ?? error.response?.data?.error ?? error.message ?? fallback;
  }
  return error instanceof Error ? error.message : fallback;
};

export const getApiErrorMessage = getErrorMessage;

export default client;
