import requestClient from './request';
import type { ApiResponse, ResourceOwnerType } from './types';

export type CloudFunctionRuntime = 'nodejs22';
export type CloudFunctionStatus = 'draft' | 'deployed' | 'deploying' | 'failed';

export interface CloudFunctionRecord {
  id: string;
  name: string;
  description?: string;
  runtime: CloudFunctionRuntime;
  entry: string;
  status: CloudFunctionStatus;
  ownerType: ResourceOwnerType;
  ownerId?: string;
  ownerTeamId?: string;
  ownerName?: string;
  ownerTeamName?: string;
  timeoutSeconds?: number;
  memorySize?: number;
  code?: string;
  updatedAt?: string;
  createdAt?: string;
  lastDeployedAt?: string;
}

export interface CloudFunctionListParams {
  ownerType: ResourceOwnerType;
  ownerTeamId?: string;
  keyword?: string;
  runtime?: CloudFunctionRuntime;
  status?: CloudFunctionStatus;
  page?: number;
  pageSize?: number;
}

export interface CloudFunctionListResult {
  list: CloudFunctionRecord[];
  total: number;
}

export interface CloudFunctionAccessContext {
  ownerType: ResourceOwnerType;
  ownerTeamId?: string;
}

export interface CreateCloudFunctionPayload {
  name: string;
  description?: string;
  runtime: CloudFunctionRuntime;
  timeoutSeconds: number;
  memorySize: number;
  code: string;
  ownerType: ResourceOwnerType;
  ownerTeamId?: string;
}

export interface UpdateCloudFunctionPayload {
  description?: string;
  runtime?: CloudFunctionRuntime;
  timeoutSeconds?: number;
  memorySize?: number;
  code?: string;
}

const normalizeListResult = (rawData: unknown): CloudFunctionListResult => {
  if (Array.isArray(rawData)) {
    return {
      list: rawData as CloudFunctionRecord[],
      total: rawData.length,
    };
  }

  const payload = (rawData ?? {}) as { list?: CloudFunctionRecord[]; total?: number };
  const list = Array.isArray(payload.list) ? payload.list : [];
  return {
    list,
    total: typeof payload.total === 'number' ? payload.total : list.length,
  };
};

export const getCloudFunctionList = async (params: CloudFunctionListParams): Promise<CloudFunctionListResult> => {
  const response = await requestClient.get<ApiResponse<unknown>>('/cloud-functions/list', {
    params,
  });
  return normalizeListResult(response.data.data);
};

export const getCloudFunctionDetail = async (
  functionId: string,
  accessContext: CloudFunctionAccessContext,
): Promise<CloudFunctionRecord> => {
  const response = await requestClient.get<ApiResponse<CloudFunctionRecord>>(`/cloud-functions/${functionId}`, {
    params: accessContext,
  });
  return response.data.data;
};

export const createCloudFunction = async (payload: CreateCloudFunctionPayload): Promise<CloudFunctionRecord> => {
  const response = await requestClient.post<ApiResponse<CloudFunctionRecord>>('/cloud-functions', payload);
  return response.data.data;
};

export const updateCloudFunction = async (
  functionId: string,
  payload: UpdateCloudFunctionPayload,
  accessContext: CloudFunctionAccessContext,
): Promise<CloudFunctionRecord> => {
  const response = await requestClient.put<ApiResponse<CloudFunctionRecord>>(`/cloud-functions/${functionId}`, payload, {
    params: accessContext,
  });
  return response.data.data;
};

export const deployCloudFunction = async (
  functionId: string,
  accessContext: CloudFunctionAccessContext,
): Promise<{ deploymentId?: string }> => {
  const response = await requestClient.post<ApiResponse<{ deploymentId?: string }>>(`/cloud-functions/${functionId}/deploy`, undefined, {
    params: accessContext,
  });
  return response.data.data ?? {};
};
