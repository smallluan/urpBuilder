import requestClient from './request';
import type {
  ApiResponse,
  PageTemplateBaseInfo,
  PageBaseInfo,
  PageDetail,
  PageTemplateListParams,
  PublishPagePayload,
  ResourceOwnerType,
  SavePageDraftPayload,
  UpdateTemplateVisibilityPayload,
  UpdatePageDraftPayload,
  WithdrawTemplatePayload,
} from './types';
import { hydratePageDetailFromApi } from '../builder/template/propsHydration';

const isLikelyPageItem = (item: PageBaseInfo) => {
  if (item.entityType) {
    return item.entityType === 'page';
  }

  const routeConfig = 'routeConfig' in item ? item.routeConfig : undefined;
  if (!routeConfig) {
    return false;
  }

  return Boolean(
    routeConfig.routePath
    || routeConfig.routeName
    || routeConfig.pageTitle
    || routeConfig.menuTitle
    || typeof routeConfig.useLayout === 'boolean',
  );
};

export const savePageDraft = async (payload: SavePageDraftPayload) => {
  const response = await requestClient.post<ApiResponse<{ version: number }>>('/page-template/draft', payload, {
    params: {
      entityType: 'page',
    },
  });
  return response.data;
};

export const updatePageDraft = async (pageId: string, payload: UpdatePageDraftPayload) => {
  const response = await requestClient.put<ApiResponse<{ version: number }>>(`/page-template/${pageId}`, payload, {
    params: {
      entityType: 'page',
    },
  });
  return response.data;
};

export const deletePageTemplate = async (pageId: string) => {
  const response = await requestClient.delete<ApiResponse<{ version?: number }>>(`/page-template/${pageId}`, {
    params: {
      entityType: 'page',
    },
  });
  return response.data;
};

export const getPageTemplateDetail = async (pageId: string) => {
  const response = await requestClient.get<ApiResponse<PageDetail>>(`/page-template/${pageId}`, {
    params: {
      entityType: 'page',
    },
  });
  const payload = response.data;
  if (payload?.data?.template) {
    const hydrated = await hydratePageDetailFromApi(payload.data);
    return { ...payload, data: hydrated };
  }
  return payload;
};

export const getPageDetail = getPageTemplateDetail;

export const publishPage = async (payload: PublishPagePayload) => {
  const response = await requestClient.post<ApiResponse<{ version: number }>>('/page-template/publish', {
    ...payload,
    entityType: 'page',
    templateId: payload.pageId,
  }, {
    params: {
      entityType: 'page',
    },
  });
  return response.data;
};

export const updatePageVisibility = async (payload: UpdateTemplateVisibilityPayload) => {
  const response = await requestClient.patch<ApiResponse<{ version?: number }>>('/page-template/visibility', {
    ...payload,
    entityType: 'page',
    templateId: payload.pageId,
  }, {
    params: {
      entityType: 'page',
    },
  });
  return response.data;
};

export const withdrawPageToDraft = async (payload: WithdrawTemplatePayload) => {
  const response = await requestClient.post<ApiResponse<{ version?: number }>>('/page-template/unpublish', {
    ...payload,
    entityType: 'page',
    templateId: payload.pageId,
    status: 'draft',
  }, {
    params: {
      entityType: 'page',
    },
  });
  return response.data;
};

export const getPageTemplateBaseList = async (params?: PageTemplateListParams) => {
  const response = await requestClient.get<ApiResponse<{ list: PageBaseInfo[]; total: number }>>('/page-base/list', {
    params: {
      ...(params ?? {}),
      entityType: 'page',
    },
  });

  const rawList = Array.isArray(response.data.data?.list) ? response.data.data.list : [];
  const filteredList = rawList.filter(isLikelyPageItem) as PageTemplateBaseInfo[];

  return {
    ...response.data,
    data: {
      ...(response.data.data ?? { total: 0 }),
      list: filteredList,
      total: filteredList.length,
    },
  };
};

export const getPageBaseList = getPageTemplateBaseList;

export type WorkspaceDailyEditPoint = {
  date: string;
  newCount: number;
  saveCount: number;
  total: number;
};

export type WorkspaceDailyEditStats = {
  daily: WorkspaceDailyEditPoint[];
  totalNew: number;
  totalSave: number;
  rangeDays: number;
  /** 与 rangeDays 对应的起止（YYYY-MM-DD），按区间查询时由后端返回 */
  fromDate?: string;
  toDate?: string;
};

export const getWorkspaceDailyEditStats = async (params: {
  ownerType: ResourceOwnerType;
  ownerTeamId?: string;
  rangeDays?: number;
  /** 与 toDate 同时传入时优先按闭区间统计，例如本年年初至今 */
  fromDate?: string;
  toDate?: string;
}): Promise<WorkspaceDailyEditStats> => {
  const response = await requestClient.get<ApiResponse<WorkspaceDailyEditStats>>('/page-base/stats/daily-edits', {
    params: {
      ownerType: params.ownerType,
      ...(params.ownerTeamId ? { ownerTeamId: params.ownerTeamId } : {}),
      ...(typeof params.fromDate === 'string' && typeof params.toDate === 'string'
        ? { fromDate: params.fromDate, toDate: params.toDate }
        : typeof params.rangeDays === 'number'
          ? { rangeDays: params.rangeDays }
          : { rangeDays: 365 }),
    },
    skipGlobalLoading: true,
    skipErrorToast: true,
  });
  const data = response.data.data;
  return {
    daily: Array.isArray(data?.daily) ? data.daily : [],
    totalNew: typeof data?.totalNew === 'number' ? data.totalNew : 0,
    totalSave: typeof data?.totalSave === 'number' ? data.totalSave : 0,
    rangeDays: typeof data?.rangeDays === 'number' ? data.rangeDays : 365,
    fromDate: typeof data?.fromDate === 'string' ? data.fromDate.slice(0, 10) : undefined,
    toDate: typeof data?.toDate === 'string' ? data.toDate.slice(0, 10) : undefined,
  };
};
