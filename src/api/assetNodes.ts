/**
 * 素材节点 API（文件夹 + 文件统一模型）
 * 对应文档：docs/backend-assets-nodes-api.md
 */

import requestClient from './request';
import type {
  ApiResponse,
  MediaNodeDTO,
  MediaNodeListResult,
  MediaNodeChildrenParams,
  MediaNodeCreateFolderPayload,
  MediaNodePatchPayload,
  MediaNodeSearchResult,
  MediaNodeScope,
} from './types';

const teamBasePath = (teamId: string) => `/v1/teams/${encodeURIComponent(teamId)}/asset-nodes`;
const PERSONAL_BASE = '/v1/me/asset-nodes';

// ===================== 子节点（懒加载） =====================

export const listPersonalNodeChildren = async (
  params?: MediaNodeChildrenParams,
): Promise<ApiResponse<MediaNodeListResult>> => {
  const response = await requestClient.get<ApiResponse<MediaNodeListResult>>(`${PERSONAL_BASE}/children`, {
    params: {
      parentId: params?.parentId ?? '',
      page: params?.page ?? 1,
      pageSize: params?.pageSize ?? 20,
      keyword: params?.keyword?.trim() || undefined,
    },
  });
  return response.data;
};

export const listTeamNodeChildren = async (
  teamId: string,
  params?: MediaNodeChildrenParams,
): Promise<ApiResponse<MediaNodeListResult>> => {
  const response = await requestClient.get<ApiResponse<MediaNodeListResult>>(`${teamBasePath(teamId)}/children`, {
    params: {
      parentId: params?.parentId ?? '',
      page: params?.page ?? 1,
      pageSize: params?.pageSize ?? 20,
      keyword: params?.keyword?.trim() || undefined,
    },
  });
  return response.data;
};

// ===================== 文件夹 CRUD =====================

export const createPersonalFolder = async (
  payload: MediaNodeCreateFolderPayload,
): Promise<ApiResponse<MediaNodeDTO>> => {
  const response = await requestClient.post<ApiResponse<MediaNodeDTO>>(`${PERSONAL_BASE}/folder`, payload);
  return response.data;
};

export const createTeamFolder = async (
  teamId: string,
  payload: MediaNodeCreateFolderPayload,
): Promise<ApiResponse<MediaNodeDTO>> => {
  const response = await requestClient.post<ApiResponse<MediaNodeDTO>>(`${teamBasePath(teamId)}/folder`, payload);
  return response.data;
};

export const patchPersonalNode = async (
  nodeId: string,
  payload: MediaNodePatchPayload,
): Promise<ApiResponse<MediaNodeDTO>> => {
  const response = await requestClient.patch<ApiResponse<MediaNodeDTO>>(`${PERSONAL_BASE}/${encodeURIComponent(nodeId)}`, payload);
  return response.data;
};

export const patchTeamNode = async (
  teamId: string,
  nodeId: string,
  payload: MediaNodePatchPayload,
): Promise<ApiResponse<MediaNodeDTO>> => {
  const response = await requestClient.patch<ApiResponse<MediaNodeDTO>>(
    `${teamBasePath(teamId)}/${encodeURIComponent(nodeId)}`,
    payload,
  );
  return response.data;
};

export const deletePersonalNode = async (nodeId: string): Promise<ApiResponse<unknown>> => {
  const response = await requestClient.delete<ApiResponse<unknown>>(`${PERSONAL_BASE}/${encodeURIComponent(nodeId)}`);
  return response.data;
};

export const deleteTeamNode = async (teamId: string, nodeId: string): Promise<ApiResponse<unknown>> => {
  const response = await requestClient.delete<ApiResponse<unknown>>(
    `${teamBasePath(teamId)}/${encodeURIComponent(nodeId)}`,
  );
  return response.data;
};

// ===================== 文件上传 =====================

export const uploadPersonalNodeFile = async (
  file: File,
  options?: { name?: string; parentId?: string | null; type?: string },
): Promise<ApiResponse<MediaNodeDTO>> => {
  const formData = new FormData();
  formData.append('file', file);
  if (options?.name?.trim()) {
    formData.append('name', options.name.trim());
  }
  if (options?.parentId) {
    formData.append('parentId', options.parentId);
  }
  if (options?.type) {
    formData.append('type', options.type);
  }
  const response = await requestClient.post<ApiResponse<MediaNodeDTO>>(`${PERSONAL_BASE}/upload`, formData);
  return response.data;
};

export const uploadTeamNodeFile = async (
  teamId: string,
  file: File,
  options?: { name?: string; parentId?: string | null; type?: string },
): Promise<ApiResponse<MediaNodeDTO>> => {
  const formData = new FormData();
  formData.append('file', file);
  if (options?.name?.trim()) {
    formData.append('name', options.name.trim());
  }
  if (options?.parentId) {
    formData.append('parentId', options.parentId);
  }
  if (options?.type) {
    formData.append('type', options.type);
  }
  const response = await requestClient.post<ApiResponse<MediaNodeDTO>>(`${teamBasePath(teamId)}/upload`, formData);
  return response.data;
};

// ===================== 搜索 =====================

export const searchPersonalNodes = async (
  keyword: string,
  page = 1,
  pageSize = 20,
  kind?: 'folder' | 'file',
): Promise<ApiResponse<MediaNodeSearchResult>> => {
  const response = await requestClient.get<ApiResponse<MediaNodeSearchResult>>(`${PERSONAL_BASE}/search`, {
    params: {
      keyword: keyword.trim(),
      page,
      pageSize,
      kind: kind || undefined,
    },
  });
  return response.data;
};

export const searchTeamNodes = async (
  teamId: string,
  keyword: string,
  page = 1,
  pageSize = 20,
  kind?: 'folder' | 'file',
): Promise<ApiResponse<MediaNodeSearchResult>> => {
  const response = await requestClient.get<ApiResponse<MediaNodeSearchResult>>(`${teamBasePath(teamId)}/search`, {
    params: {
      keyword: keyword.trim(),
      page,
      pageSize,
      kind: kind || undefined,
    },
  });
  return response.data;
};

// ===================== 统一封装（按 scope） =====================

export const listNodeChildren = (
  scope: MediaNodeScope,
  teamId: string | undefined,
  params?: MediaNodeChildrenParams,
): Promise<ApiResponse<MediaNodeListResult>> => {
  if (scope === 'personal') {
    return listPersonalNodeChildren(params);
  }
  if (!teamId) {
    return Promise.resolve({ code: 0, message: 'ok', data: { list: [], total: 0, page: 1, pageSize: 20 } } as ApiResponse<MediaNodeListResult>);
  }
  return listTeamNodeChildren(teamId, params);
};

export const createFolder = (
  scope: MediaNodeScope,
  teamId: string | undefined,
  payload: MediaNodeCreateFolderPayload,
): Promise<ApiResponse<MediaNodeDTO>> => {
  if (scope === 'personal') {
    return createPersonalFolder(payload);
  }
  if (!teamId) {
    return Promise.reject(new Error('团队 ID 不能为空'));
  }
  return createTeamFolder(teamId, payload);
};

export const patchNode = (
  scope: MediaNodeScope,
  teamId: string | undefined,
  nodeId: string,
  payload: MediaNodePatchPayload,
): Promise<ApiResponse<MediaNodeDTO>> => {
  if (scope === 'personal') {
    return patchPersonalNode(nodeId, payload);
  }
  if (!teamId) {
    return Promise.reject(new Error('团队 ID 不能为空'));
  }
  return patchTeamNode(teamId, nodeId, payload);
};

export const deleteNode = (
  scope: MediaNodeScope,
  teamId: string | undefined,
  nodeId: string,
): Promise<ApiResponse<unknown>> => {
  if (scope === 'personal') {
    return deletePersonalNode(nodeId);
  }
  if (!teamId) {
    return Promise.reject(new Error('团队 ID 不能为空'));
  }
  return deleteTeamNode(teamId, nodeId);
};

export const uploadNodeFile = (
  scope: MediaNodeScope,
  teamId: string | undefined,
  file: File,
  options?: { name?: string; parentId?: string | null; type?: string },
): Promise<ApiResponse<MediaNodeDTO>> => {
  if (scope === 'personal') {
    return uploadPersonalNodeFile(file, options);
  }
  if (!teamId) {
    return Promise.reject(new Error('团队 ID 不能为空'));
  }
  return uploadTeamNodeFile(teamId, file, options);
};

export const searchNodes = (
  scope: MediaNodeScope,
  teamId: string | undefined,
  keyword: string,
  page?: number,
  pageSize?: number,
  kind?: 'folder' | 'file',
): Promise<ApiResponse<MediaNodeSearchResult>> => {
  if (scope === 'personal') {
    return searchPersonalNodes(keyword, page, pageSize, kind);
  }
  if (!teamId) {
    return Promise.resolve({ code: 0, message: 'ok', data: { list: [], total: 0, page: 1, pageSize: 20 } } as ApiResponse<MediaNodeSearchResult>);
  }
  return searchTeamNodes(teamId, keyword, page, pageSize, kind);
};
