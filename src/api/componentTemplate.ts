import requestClient from './request';
import type {
  ApiResponse,
  PageBaseInfo,
  ComponentDetail,
  ComponentTemplateBaseInfo,
  ComponentTemplateListParams,
  PublishComponentPayload,
  SaveComponentDraftPayload,
  UpdateComponentDraftPayload,
} from './types';

const isLikelyComponentItem = (item: PageBaseInfo) => {
  if (item.entityType) {
    return item.entityType === 'component';
  }

  return !('routeConfig' in item && item.routeConfig);
};

export const saveComponentDraft = async (payload: SaveComponentDraftPayload) => {
  const response = await requestClient.post<ApiResponse<{ version: number }>>('/page-template/draft', payload);
  return response.data;
};

export const updateComponentDraft = async (componentId: string, payload: UpdateComponentDraftPayload) => {
  const response = await requestClient.put<ApiResponse<{ version: number }>>(`/page-template/${componentId}`, payload);
  return response.data;
};

export const deleteComponentTemplate = async (componentId: string) => {
  const response = await requestClient.delete<ApiResponse<{ version?: number }>>(`/page-template/${componentId}`, {
    params: {
      entityType: 'component',
    },
  });
  return response.data;
};

export const getComponentTemplateDetail = async (componentId: string) => {
  const response = await requestClient.get<ApiResponse<ComponentDetail>>(`/page-template/${componentId}`, {
    params: {
      entityType: 'component',
    },
  });
  return response.data;
};

export const publishComponent = async (payload: PublishComponentPayload) => {
  const response = await requestClient.post<ApiResponse<{ version: number }>>('/page-template/publish', {
    ...payload,
    entityType: 'component',
    componentId: payload.pageId,
    templateId: payload.pageId,
  }, {
    params: {
      entityType: 'component',
    },
  });
  return response.data;
};

export const getComponentBaseList = async (params?: ComponentTemplateListParams) => {
  const response = await requestClient.get<ApiResponse<{ list: PageBaseInfo[]; total: number }>>('/page-base/list', {
    params: {
      ...(params ?? {}),
      entityType: 'component',
    },
  });

  const rawList = Array.isArray(response.data.data?.list) ? response.data.data.list : [];
  const filteredList = rawList.filter(isLikelyComponentItem) as ComponentTemplateBaseInfo[];

  return {
    ...response.data,
    data: {
      ...(response.data.data ?? { total: 0 }),
      list: filteredList,
      total: filteredList.length,
    },
  };
};
