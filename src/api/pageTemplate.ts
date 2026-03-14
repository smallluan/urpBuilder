import requestClient from './request';
import type {
  ApiResponse,
  PageBaseInfo,
  PageDetail,
  PublishPagePayload,
  SavePageDraftPayload,
  UpdatePageDraftPayload,
} from './types';

export const savePageDraft = async (payload: SavePageDraftPayload) => {
  const response = await requestClient.post<ApiResponse<{ version: number }>>('/page-template/draft', payload);
  return response.data;
};

export const updatePageDraft = async (pageId: string, payload: UpdatePageDraftPayload) => {
  const response = await requestClient.put<ApiResponse<{ version: number }>>(`/page-template/${pageId}`, payload);
  return response.data;
};

export const getPageDetail = async (pageId: string) => {
  const response = await requestClient.get<ApiResponse<PageDetail>>(`/page-template/${pageId}`);
  return response.data;
};

export const publishPage = async (payload: PublishPagePayload) => {
  const response = await requestClient.post<ApiResponse<{ version: number }>>('/page-template/publish', payload);
  return response.data;
};

export const getPageBaseList = async (params?: {
  pageName?: string;
  status?: PageBaseInfo['status'];
  entityType?: PageBaseInfo['entityType'];
  routePath?: string;
  page?: number;
  pageSize?: number;
}) => {
  const response = await requestClient.get<ApiResponse<{ list: PageBaseInfo[]; total: number }>>('/page-base/list', {
    params,
  });

  return response.data;
};
