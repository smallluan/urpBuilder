import requestClient from './request';
import type { ApiResponse } from './types';

export type PlatformBroadcastDTO = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  createdBy: string;
  createdByName?: string;
  read: boolean;
};

export const listPlatformBroadcasts = async () => {
  const response = await requestClient.get<ApiResponse<{ items: PlatformBroadcastDTO[] }>>(
    '/platform-broadcasts',
    { skipGlobalLoading: true }
  );
  return response.data.data.items;
};

export const createPlatformBroadcast = async (payload: { title: string; body: string }) => {
  const response = await requestClient.post<ApiResponse<PlatformBroadcastDTO>>('/platform-broadcasts', payload);
  return response.data.data;
};

export const markPlatformBroadcastRead = async (id: string) => {
  const response = await requestClient.post<ApiResponse<null>>(`/platform-broadcasts/${encodeURIComponent(id)}/read`, {});
  return response.data;
};
