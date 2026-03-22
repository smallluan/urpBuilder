import requestClient from './request';
import type { ApiResponse, ResourceOwnerType } from './types';

export type DataTableFieldType = 'string' | 'number' | 'boolean' | 'object' | 'array' | 'date';

export interface DataTableFieldRecord {
  id: string;
  name: string;
  type: DataTableFieldType;
  required?: boolean;
  description?: string;
  defaultValue?: unknown;
  updatedAt?: string;
  createdAt?: string;
}

export interface DataTableRecord {
  id: string;
  name: string;
  description?: string;
  ownerType: ResourceOwnerType;
  ownerId?: string;
  ownerName?: string;
  ownerTeamId?: string;
  ownerTeamName?: string;
  fieldCount?: number;
  recordCount?: number;
  updatedAt?: string;
  createdAt?: string;
  fields?: DataTableFieldRecord[];
}

export interface DataTableListParams {
  ownerType: ResourceOwnerType;
  ownerTeamId?: string;
  keyword?: string;
  page?: number;
  pageSize?: number;
}

export interface DataTableListResult {
  list: DataTableRecord[];
  total: number;
}

export interface DataTableAccessContext {
  ownerType: ResourceOwnerType;
  ownerTeamId?: string;
}

export interface DataTableRuntimeRecord {
  id: number;
  tableId: string;
  data: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export interface DataTableRecordListResult {
  list: DataTableRuntimeRecord[];
  total: number;
}

export interface CreateDataTablePayload {
  name: string;
  description?: string;
  ownerType: ResourceOwnerType;
  ownerTeamId?: string;
}

export interface UpdateDataTablePayload {
  name?: string;
  description?: string;
}

export interface CreateDataTableFieldPayload {
  name: string;
  type: DataTableFieldType;
  required?: boolean;
  description?: string;
  defaultValue?: unknown;
}

export interface UpdateDataTableFieldPayload {
  name?: string;
  type?: DataTableFieldType;
  required?: boolean;
  description?: string;
  defaultValue?: unknown;
}

export interface CreateDataTableRecordPayload {
  data: Record<string, unknown>;
}

export interface UpdateDataTableRecordPayload {
  data: Record<string, unknown>;
}

const normalizeListResult = (rawData: unknown): DataTableListResult => {
  if (Array.isArray(rawData)) {
    return {
      list: rawData as DataTableRecord[],
      total: rawData.length,
    };
  }

  const payload = (rawData ?? {}) as { list?: DataTableRecord[]; total?: number };
  const list = Array.isArray(payload.list) ? payload.list : [];
  return {
    list,
    total: typeof payload.total === 'number' ? payload.total : list.length,
  };
};

export const getDataTableList = async (params: DataTableListParams): Promise<DataTableListResult> => {
  const response = await requestClient.get<ApiResponse<unknown>>('/data-tables/list', {
    params,
  });
  return normalizeListResult(response.data.data);
};

export const getDataTableDetail = async (
  tableId: string,
  accessContext: DataTableAccessContext,
): Promise<DataTableRecord> => {
  const response = await requestClient.get<ApiResponse<DataTableRecord>>(`/data-tables/${tableId}`, {
    params: accessContext,
  });
  return response.data.data;
};

export const createDataTable = async (payload: CreateDataTablePayload): Promise<DataTableRecord> => {
  const response = await requestClient.post<ApiResponse<DataTableRecord>>('/data-tables', payload);
  return response.data.data;
};

export const updateDataTable = async (
  tableId: string,
  payload: UpdateDataTablePayload,
  accessContext: DataTableAccessContext,
): Promise<DataTableRecord> => {
  const response = await requestClient.put<ApiResponse<DataTableRecord>>(`/data-tables/${tableId}`, payload, {
    params: accessContext,
  });
  return response.data.data;
};

export const deleteDataTable = async (
  tableId: string,
  accessContext: DataTableAccessContext,
): Promise<void> => {
  await requestClient.delete<ApiResponse<null>>(`/data-tables/${tableId}`, {
    params: accessContext,
  });
};

export const createDataTableField = async (
  tableId: string,
  payload: CreateDataTableFieldPayload,
  accessContext: DataTableAccessContext,
): Promise<DataTableFieldRecord> => {
  const response = await requestClient.post<ApiResponse<DataTableFieldRecord>>(`/data-tables/${tableId}/fields`, payload, {
    params: accessContext,
  });
  return response.data.data;
};

export const updateDataTableField = async (
  tableId: string,
  fieldId: string,
  payload: UpdateDataTableFieldPayload,
  accessContext: DataTableAccessContext,
): Promise<DataTableFieldRecord> => {
  const response = await requestClient.put<ApiResponse<DataTableFieldRecord>>(`/data-tables/${tableId}/fields/${fieldId}`, payload, {
    params: accessContext,
  });
  return response.data.data;
};

export const deleteDataTableField = async (
  tableId: string,
  fieldId: string,
  accessContext: DataTableAccessContext,
): Promise<void> => {
  await requestClient.delete<ApiResponse<null>>(`/data-tables/${tableId}/fields/${fieldId}`, {
    params: accessContext,
  });
};

export const getDataTableRecords = async (
  tableId: string,
  params: DataTableAccessContext & { page?: number; pageSize?: number },
): Promise<DataTableRecordListResult> => {
  const response = await requestClient.get<ApiResponse<DataTableRecordListResult>>(`/data-tables/${tableId}/records`, {
    params,
  });
  const payload = response.data.data ?? { list: [], total: 0 };
  return {
    list: Array.isArray(payload.list) ? payload.list : [],
    total: typeof payload.total === 'number' ? payload.total : 0,
  };
};

export const createDataTableRecord = async (
  tableId: string,
  payload: CreateDataTableRecordPayload,
  accessContext: DataTableAccessContext,
): Promise<DataTableRuntimeRecord> => {
  const response = await requestClient.post<ApiResponse<DataTableRuntimeRecord>>(`/data-tables/${tableId}/records`, payload, {
    params: accessContext,
  });
  return response.data.data;
};

export const updateDataTableRecord = async (
  tableId: string,
  recordId: number,
  payload: UpdateDataTableRecordPayload,
  accessContext: DataTableAccessContext,
): Promise<DataTableRuntimeRecord> => {
  const response = await requestClient.put<ApiResponse<DataTableRuntimeRecord>>(
    `/data-tables/${tableId}/records/${recordId}`,
    payload,
    {
      params: accessContext,
    },
  );
  return response.data.data;
};

export const deleteDataTableRecord = async (
  tableId: string,
  recordId: number,
  accessContext: DataTableAccessContext,
): Promise<void> => {
  await requestClient.delete<ApiResponse<null>>(`/data-tables/${tableId}/records/${recordId}`, {
    params: accessContext,
  });
};
