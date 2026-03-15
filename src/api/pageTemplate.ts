import requestClient from './request';
import type {
  ApiResponse,
  PageTemplateBaseInfo,
  PageBaseInfo,
  PageDetail,
  PageTemplateListParams,
  PublishPagePayload,
  SavePageDraftPayload,
  UpdateTemplateVisibilityPayload,
  UpdatePageDraftPayload,
  WithdrawTemplatePayload,
} from './types';

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
  const response = await requestClient.post<ApiResponse<{ version: number }>>('/page-template/draft', payload);
  return response.data;
};

export const updatePageDraft = async (pageId: string, payload: UpdatePageDraftPayload) => {
  const response = await requestClient.put<ApiResponse<{ version: number }>>(`/page-template/${pageId}`, payload);
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
  return response.data;
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
