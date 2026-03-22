import requestClient from './request';
import type { ApiResponse, ResourceOwnerType } from './types';

export type DataConstantValueType = 'string' | 'number' | 'boolean' | 'object' | 'array';

export interface DataConstantRecord {
  id: string;
  name: string;
  description?: string;
  valueType: DataConstantValueType;
  value: unknown;
  ownerType: ResourceOwnerType;
  ownerId?: string;
  ownerName?: string;
  ownerTeamId?: string;
  ownerTeamName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DataConstantListParams {
  ownerType: ResourceOwnerType;
  ownerTeamId?: string;
  keyword?: string;
  valueType?: DataConstantValueType;
  page?: number;
  pageSize?: number;
}

export interface CreateDataConstantPayload {
  name: string;
  description?: string;
  valueType: DataConstantValueType;
  value: unknown;
  ownerType: ResourceOwnerType;
  ownerTeamId?: string;
}

export interface DataConstantListResult {
  list: DataConstantRecord[];
  total: number;
}

export const getDataConstantList = async (params: DataConstantListParams): Promise<DataConstantListResult> => {
  const response = await requestClient.get<ApiResponse<{ list?: DataConstantRecord[]; total?: number } | DataConstantRecord[]>>(
    '/data-constants/list',
    { params },
  );

  const rawData = response.data.data;
  if (Array.isArray(rawData)) {
    return {
      list: rawData,
      total: rawData.length,
    };
  }

  const list = Array.isArray(rawData?.list) ? rawData.list : [];
  const total = typeof rawData?.total === 'number' ? rawData.total : list.length;

  return {
    list,
    total,
  };
};

export const createDataConstant = async (payload: CreateDataConstantPayload): Promise<DataConstantRecord> => {
  const response = await requestClient.post<ApiResponse<DataConstantRecord>>('/data-constants', payload);
  return response.data.data;
};
