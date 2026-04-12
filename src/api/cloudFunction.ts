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

export interface ExecuteCloudFunctionPayload {
  payload?: unknown;
}

export interface ExecuteCloudFunctionResult {
  executionId?: string;
  functionId?: string;
  functionName?: string;
  durationMs?: number;
  output?: unknown;
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

export interface CloudFunctionInvocationDailyPoint {
  date: string;
  successCount: number;
  failureCount: number;
  /** success + failure */
  count: number;
}

export interface CloudFunctionInvocationStats {
  daily: CloudFunctionInvocationDailyPoint[];
  totalCount: number;
  successTotal: number;
  failureTotal: number;
  rangeDays: number;
}

export const getCloudFunctionInvocationStats = async (
  params: CloudFunctionListParams & { rangeDays?: number },
): Promise<CloudFunctionInvocationStats> => {
  const response = await requestClient.get<ApiResponse<CloudFunctionInvocationStats>>('/cloud-functions/stats/invocations', {
    params: {
      ownerType: params.ownerType,
      ...(params.ownerTeamId ? { ownerTeamId: params.ownerTeamId } : {}),
      ...(typeof params.rangeDays === 'number' ? { rangeDays: params.rangeDays } : { rangeDays: 365 }),
    },
    skipGlobalLoading: true,
    skipErrorToast: true,
  });
  const data = response.data.data;
  const rawDaily: unknown[] = Array.isArray(data?.daily) ? data.daily : [];
  const daily: CloudFunctionInvocationDailyPoint[] = rawDaily.map((row: unknown) => {
    const rec = row as Record<string, unknown>;
    const date = String(rec.date ?? '').slice(0, 10);
    const successCount = typeof rec.successCount === 'number' ? rec.successCount : 0;
    const failureCount = typeof rec.failureCount === 'number' ? rec.failureCount : 0;
    const legacy = typeof rec.count === 'number' ? rec.count : 0;
    const ok = successCount + failureCount > 0 ? successCount : legacy;
    const fail = successCount + failureCount > 0 ? failureCount : 0;
    return {
      date,
      successCount: ok,
      failureCount: fail,
      count: ok + fail,
    };
  });
  return {
    daily,
    totalCount: typeof data?.totalCount === 'number' ? data.totalCount : daily.reduce((s, x) => s + x.count, 0),
    successTotal: typeof data?.successTotal === 'number' ? data.successTotal : daily.reduce((s, x) => s + x.successCount, 0),
    failureTotal: typeof data?.failureTotal === 'number' ? data.failureTotal : daily.reduce((s, x) => s + x.failureCount, 0),
    rangeDays: typeof data?.rangeDays === 'number' ? data.rangeDays : 365,
  };
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

export const executeCloudFunction = async (
  functionIdOrName: string,
  payload: ExecuteCloudFunctionPayload,
  accessContext: CloudFunctionAccessContext,
): Promise<ExecuteCloudFunctionResult> => {
  const response = await requestClient.post<ApiResponse<ExecuteCloudFunctionResult>>(
    `/cloud-functions/${encodeURIComponent(functionIdOrName)}/execute`,
    payload,
    {
      params: accessContext,
    },
  );
  return response.data.data ?? {};
};
