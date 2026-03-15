import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { emitApiAlert } from './alertBus';
import type { ApiResponse } from './types';

const API_TIMEOUT = 15000;

const resolveErrorMessage = (error: AxiosError<ApiResponse>) => {
  if (error.response?.data?.message) {
    return error.response.data.message;
  }

  if (error.code === 'ECONNABORTED') {
    return '请求超时，请稍后重试';
  }

  if (error.message) {
    return error.message;
  }

  return '请求失败，请稍后重试';
};

const requestClient = axios.create({
  baseURL:
    import.meta.env.VITE_API_BASE_URL
    || (import.meta.env.PROD ? 'http://39.105.227.198:9090/api' : 'http://localhost:3333/api'),
  timeout: API_TIMEOUT,
});

requestClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    emitApiAlert('请求发送失败', '请检查请求参数后重试');
    return Promise.reject(error);
  },
);

requestClient.interceptors.response.use(
  (response) => {
    const payload = response.data as ApiResponse | undefined;

    if (payload && typeof payload.code === 'number' && payload.code !== 0) {
      emitApiAlert('接口返回异常', payload.message || '服务端返回错误');
      return Promise.reject(new Error(payload.message || '服务端返回错误'));
    }

    return response;
  },
  (error: AxiosError<ApiResponse>) => {
    const errorMessage = resolveErrorMessage(error);
    emitApiAlert('接口请求失败', errorMessage);
    return Promise.reject(error);
  },
);

export default requestClient;
