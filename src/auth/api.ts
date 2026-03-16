import requestClient from '../api/request';
import type { ApiResponse } from '../api/types';
import type {
  AdminUserListParams,
  AdminUserListResult,
  AuthSession,
  AuthUser,
  LoginPayload,
  LogoutPayload,
  RegisterPayload,
} from './types';

export const loginByPassword = async (payload: LoginPayload) => {
  const response = await requestClient.post<ApiResponse<AuthSession>>('/auth/login', payload);
  return response.data.data;
};

export const registerByPassword = async (payload: RegisterPayload) => {
  const response = await requestClient.post<ApiResponse<AuthSession>>('/auth/register', payload);
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

export const deleteMyAccount = async () => {
  const response = await requestClient.delete<ApiResponse<null>>('/auth/me');
  return response.data;
};

export const getAdminUserList = async (params?: AdminUserListParams) => {
  const response = await requestClient.get<ApiResponse<AdminUserListResult>>('/admin/users', {
    params,
  });
  return response.data.data;
};

export const adminDeleteUserAccount = async (userId: string) => {
  const response = await requestClient.delete<ApiResponse<null>>(`/admin/users/${userId}`);
  return response.data;
};