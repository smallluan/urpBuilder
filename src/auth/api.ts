import requestClient from '../api/request';
import type { ApiResponse } from '../api/types';
import type { AuthSession, AuthUser, LoginPayload, LogoutPayload } from './types';

export const loginByPassword = async (payload: LoginPayload) => {
  const response = await requestClient.post<ApiResponse<AuthSession>>('/auth/login', payload);
  return response.data.data;
};

export const getCurrentUser = async () => {
  const response = await requestClient.get<ApiResponse<AuthUser>>('/auth/me');
  return response.data.data;
};

export const logoutCurrentSession = async (payload?: LogoutPayload) => {
  const response = await requestClient.post<ApiResponse<null>>('/auth/logout', payload ?? {});
  return response.data;
};