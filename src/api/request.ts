import axios, { AxiosError, type AxiosRequestConfig, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { loading as showLoadingPlugin } from 'tdesign-react';
import { emitApiAlert } from './alertBus';
import type { ApiResponse } from './types';
import { emitUnauthorized } from '../auth/events';
import { getAccessToken, migrateLegacyToken } from '../auth/storage';

declare module 'axios' {
  interface AxiosRequestConfig {
    /** 为 true 时不触发全屏请求 Loading */
    skipGlobalLoading?: boolean;
  }
}

const API_TIMEOUT = 15000;

/** 延迟展示全屏 Loading，避免短请求反复显隐闪屏（对应 TDesign Loading 的 delay） */
const GLOBAL_LOADING_DELAY_MS = 320;

let globalLoadingActiveCount = 0;
let globalLoadingInstance: { hide: () => void } | null = null;

const beginGlobalLoading = () => {
  globalLoadingActiveCount += 1;
  if (globalLoadingActiveCount === 1) {
    globalLoadingInstance = showLoadingPlugin({
      fullscreen: true,
      delay: GLOBAL_LOADING_DELAY_MS,
      showOverlay: true,
      preventScrollThrough: true,
    });
  }
};

const endGlobalLoading = () => {
  globalLoadingActiveCount -= 1;
  if (globalLoadingActiveCount < 0) {
    globalLoadingActiveCount = 0;
  }
  if (globalLoadingActiveCount === 0 && globalLoadingInstance) {
    globalLoadingInstance.hide();
    globalLoadingInstance = null;
  }
};

const resolveErrorMessage = (error: AxiosError<ApiResponse>) => {
  if (error.response?.data?.message) {
    return error.response.data.message;
  }

  if (error.response?.status === 403) {
    return '无权限访问该资源';
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
    const token = getAccessToken() || migrateLegacyToken();

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
    if (error.response?.status === 401) {
      emitUnauthorized();
    }

    const errorMessage = resolveErrorMessage(error);
    emitApiAlert('接口请求失败', errorMessage);
    return Promise.reject(error);
  },
);

const rawRequest = requestClient.request.bind(requestClient);
requestClient.request = function requestWithGlobalLoading<T = unknown, R = AxiosResponse<T>, D = unknown>(
  config: AxiosRequestConfig<D>,
): Promise<R> {
  if (config?.skipGlobalLoading) {
    return rawRequest(config);
  }

  beginGlobalLoading();
  return rawRequest(config).finally(() => {
    endGlobalLoading();
  }) as Promise<R>;
};

export default requestClient;
