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

/** 更新常量（与创建相比不含 owner，通过 query 传递作用域） */
export interface UpdateDataConstantPayload {
  name: string;
  description?: string;
  valueType: DataConstantValueType;
  value: unknown;
}

export interface DataConstantListResult {
  list: DataConstantRecord[];
  total: number;
}

const VALID_DATA_CONSTANT_VALUE_TYPES: DataConstantValueType[] = ['string', 'number', 'boolean', 'object', 'array'];

function inferValueTypeFromValue(value: unknown): DataConstantValueType | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }
  if (Array.isArray(value)) {
    return 'array';
  }
  if (typeof value === 'object') {
    return 'object';
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return 'number';
  }
  if (typeof value === 'boolean') {
    return 'boolean';
  }
  if (typeof value === 'string') {
    return 'string';
  }
  return undefined;
}

/**
 * 兼容网关/旧接口返回 snake_case，或 value 落在 value_json 上的情况。
 */
export function coerceApiDataConstantRecord(raw: unknown): DataConstantRecord {
  const r = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const vtRaw = r.valueType ?? r.value_type;
  const value = r.value !== undefined ? r.value : r.value_json;
  const declared =
    typeof vtRaw === 'string' && VALID_DATA_CONSTANT_VALUE_TYPES.includes(vtRaw as DataConstantValueType)
      ? (vtRaw as DataConstantValueType)
      : undefined;
  const inferred = inferValueTypeFromValue(value);
  const valueType: DataConstantValueType = declared ?? inferred ?? 'string';

  return {
    id: String(r.id ?? ''),
    name: String(r.name ?? ''),
    description: r.description != null && r.description !== '' ? String(r.description) : undefined,
    valueType,
    value,
    ownerType: r.ownerType === 'team' || r.owner_type === 'team' ? 'team' : 'user',
    ownerId: r.ownerId != null ? String(r.ownerId) : r.owner_id != null ? String(r.owner_id) : undefined,
    ownerName: r.ownerName != null ? String(r.ownerName) : r.owner_name != null ? String(r.owner_name) : undefined,
    ownerTeamId:
      r.ownerTeamId != null ? String(r.ownerTeamId) : r.owner_team_id != null ? String(r.owner_team_id) : undefined,
    ownerTeamName:
      r.ownerTeamName != null
        ? String(r.ownerTeamName)
        : r.owner_team_name != null
          ? String(r.owner_team_name)
          : undefined,
    createdAt: r.createdAt != null ? String(r.createdAt) : r.created_at != null ? String(r.created_at) : undefined,
    updatedAt: r.updatedAt != null ? String(r.updatedAt) : r.updated_at != null ? String(r.updated_at) : undefined,
  };
}

/**
 * 后端常把 array/object 存成 JSON 文本；列表接口可能原样返回字符串。
 * 在使用前解析，避免 Array.isArray / 对象字段访问误判。
 */
export function parseDataConstantStoredValue(
  valueType: DataConstantValueType,
  value: unknown,
): unknown {
  if (valueType !== 'array' && valueType !== 'object') {
    return value;
  }
  if (typeof value !== 'string') {
    return value;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return valueType === 'array' ? [] : {};
  }
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return value;
  }
}

function normalizeDataConstantRecord(record: DataConstantRecord): DataConstantRecord {
  const nextValue = parseDataConstantStoredValue(record.valueType, record.value);
  if (nextValue === record.value) {
    return record;
  }
  return { ...record, value: nextValue };
}

function normalizeIncomingRecord(raw: unknown): DataConstantRecord {
  return normalizeDataConstantRecord(coerceApiDataConstantRecord(raw));
}

export const getDataConstantList = async (params: DataConstantListParams): Promise<DataConstantListResult> => {
  const response = await requestClient.get<ApiResponse<{ list?: DataConstantRecord[]; total?: number } | DataConstantRecord[]>>(
    '/data-constants/list',
    { params },
  );

  const rawData = response.data.data;
  if (Array.isArray(rawData)) {
    return {
      list: rawData.map(normalizeIncomingRecord),
      total: rawData.length,
    };
  }

  const list = Array.isArray(rawData?.list) ? rawData.list.map(normalizeIncomingRecord) : [];
  const total = typeof rawData?.total === 'number' ? rawData.total : list.length;

  return {
    list,
    total,
  };
};

export const createDataConstant = async (payload: CreateDataConstantPayload): Promise<DataConstantRecord> => {
  const response = await requestClient.post<ApiResponse<DataConstantRecord>>('/data-constants', payload);
  return normalizeIncomingRecord(response.data.data);
};

export const updateDataConstant = async (
  id: string,
  payload: UpdateDataConstantPayload,
  scope: Pick<DataConstantListParams, 'ownerType' | 'ownerTeamId'>,
): Promise<DataConstantRecord> => {
  const response = await requestClient.put<ApiResponse<DataConstantRecord>>(
    `/data-constants/${encodeURIComponent(id)}`,
    payload,
    { params: scope },
  );
  return normalizeIncomingRecord(response.data.data);
};

export const deleteDataConstant = async (
  id: string,
  scope: Pick<DataConstantListParams, 'ownerType' | 'ownerTeamId'>,
): Promise<void> => {
  await requestClient.delete<ApiResponse<null>>(`/data-constants/${encodeURIComponent(id)}`, { params: scope });
};
