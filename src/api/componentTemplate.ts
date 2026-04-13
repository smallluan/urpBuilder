import requestClient from './request';
import type {
  ApiResponse,
  PageBaseInfo,
  ComponentDetail,
  ComponentTemplateBaseInfo,
  ComponentTemplateListParams,
  ComponentMetaBatchRequest,
  ComponentMetaBatchResult,
  ComponentVersionListResult,
  PublishComponentPayload,
  SaveComponentDraftPayload,
  UpdateTemplateVisibilityPayload,
  UpdateComponentDraftPayload,
  WithdrawTemplatePayload,
} from './types';
import { hydrateComponentDetailFromApi } from '../builder/template/propsHydration';

const isLikelyComponentItem = (item: PageBaseInfo) => {
  if (item.entityType) {
    return item.entityType === 'component';
  }

  return !('routeConfig' in item && item.routeConfig);
};

export const saveComponentDraft = async (payload: SaveComponentDraftPayload) => {
  const response = await requestClient.post<ApiResponse<{ version: number }>>('/page-template/draft', payload, {
    params: {
      entityType: 'component',
    },
  });
  return response.data;
};

export const updateComponentDraft = async (componentId: string, payload: UpdateComponentDraftPayload) => {
  const response = await requestClient.put<ApiResponse<{ version: number }>>(`/page-template/${componentId}`, payload, {
    params: {
      entityType: 'component',
    },
  });
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

export const getComponentVersionList = async (componentId: string) => {
  const id = String(componentId ?? '').trim();
  const response = await requestClient.get<ApiResponse<ComponentVersionListResult>>(
    `/page-template/${encodeURIComponent(id)}/versions`,
    {
      params: { entityType: 'component' },
    },
  );
  return response.data;
};

export const getComponentTemplateDetail = async (
  componentId: string,
  options?: { version?: number | null; skipErrorToast?: boolean; skipGlobalLoading?: boolean },
) => {
  const normalizedVersion = Number(options?.version);
  const response = await requestClient.get<ApiResponse<ComponentDetail>>(`/page-template/${componentId}`, {
    params: {
      entityType: 'component',
      ...(Number.isFinite(normalizedVersion) && normalizedVersion > 0
        ? { version: Math.floor(normalizedVersion) }
        : {}),
    },
    skipErrorToast: options?.skipErrorToast === true,
    skipGlobalLoading: options?.skipGlobalLoading === true,
  });
  const payload = response.data;
  if (payload?.data?.template) {
    const hydrated = await hydrateComponentDetailFromApi(payload.data);
    return { ...payload, data: hydrated };
  }
  return payload;
};

/** 版本对比用：不水合 props，避免无关 schema 差异干扰 diff */
export const getComponentTemplateDetailRaw = async (componentId: string, options?: { version?: number | null }) => {
  const normalizedVersion = Number(options?.version);
  const response = await requestClient.get<ApiResponse<ComponentDetail>>(`/page-template/${componentId}`, {
    params: {
      entityType: 'component',
      ...(Number.isFinite(normalizedVersion) && normalizedVersion > 0
        ? { version: Math.floor(normalizedVersion) }
        : {}),
    },
  });
  return response.data;
};

export const batchGetComponentMeta = async (payload: ComponentMetaBatchRequest) => {
  const response = await requestClient.post<ApiResponse<ComponentMetaBatchResult>>('/v1/components/meta:batch', payload);
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

export const updateComponentVisibility = async (payload: UpdateTemplateVisibilityPayload) => {
  const response = await requestClient.patch<ApiResponse<{ version?: number }>>('/page-template/visibility', {
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

export const withdrawComponentToDraft = async (payload: WithdrawTemplatePayload) => {
  const response = await requestClient.post<ApiResponse<{ version?: number }>>('/page-template/unpublish', {
    ...payload,
    entityType: 'component',
    componentId: payload.pageId,
    templateId: payload.pageId,
    status: 'draft',
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
