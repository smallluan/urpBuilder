export type ComponentDataSourceType = 'static' | 'constant' | 'dataTable' | 'cloudFunction';

export interface ComponentDataSourceConfig {
  type: ComponentDataSourceType;
  constantId?: string;
  tableId?: string;
  functionId?: string;
  page?: number;
  pageSize?: number;
  responsePath?: string;
  payload?: unknown;
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

export const normalizeDataSourceConfig = (value: unknown): ComponentDataSourceConfig => {
  if (!isPlainObject(value)) {
    return { type: 'static' };
  }

  const typeRaw = String(value.type ?? '').trim();
  const type: ComponentDataSourceType =
    typeRaw === 'constant' || typeRaw === 'dataTable' || typeRaw === 'cloudFunction'
      ? typeRaw
      : 'static';

  const pageRaw = Number(value.page);
  const page = Number.isFinite(pageRaw) ? Math.max(1, Math.round(pageRaw)) : undefined;
  const pageSizeRaw = Number(value.pageSize);
  const pageSize = Number.isFinite(pageSizeRaw) ? Math.max(1, Math.round(pageSizeRaw)) : undefined;

  return {
    type,
    constantId: typeof value.constantId === 'string' ? value.constantId.trim() : undefined,
    tableId: typeof value.tableId === 'string' ? value.tableId.trim() : undefined,
    functionId: typeof value.functionId === 'string' ? value.functionId.trim() : undefined,
    page,
    pageSize,
    responsePath: typeof value.responsePath === 'string' ? value.responsePath.trim() : undefined,
    payload: value.payload,
  };
};

export const pickByPath = (source: unknown, path: string): unknown => {
  const normalizedPath = String(path ?? '').trim();
  if (!normalizedPath) {
    return source;
  }

  return normalizedPath
    .split('.')
    .filter(Boolean)
    .reduce<unknown>((current, segment) => {
      if (!isPlainObject(current)) {
        return undefined;
      }
      return current[segment];
    }, source);
};
