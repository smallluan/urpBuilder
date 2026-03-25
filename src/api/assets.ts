import requestClient from './request';
import type { ApiResponse, TeamAssetDTO, TeamAssetListParams, TeamAssetListResult, TeamAssetPatchPayload } from './types';

const teamBasePath = (teamId: string) => `/v1/teams/${encodeURIComponent(teamId)}/assets`;

/** 个人素材库（与团队接口隔离，见 docs/backend-team-assets-api.md） */
const PERSONAL_ASSETS_BASE = '/v1/me/assets';

const listParams = (params?: TeamAssetListParams) => ({
  page: params?.page ?? 1,
  pageSize: params?.pageSize ?? 20,
  keyword: params?.keyword?.trim() || undefined,
  type: params?.type || undefined,
});

export const listPersonalAssets = async (params?: TeamAssetListParams) => {
  const response = await requestClient.get<ApiResponse<TeamAssetListResult>>(PERSONAL_ASSETS_BASE, {
    params: listParams(params),
  });
  return response.data;
};

export const getPersonalAsset = async (assetId: string) => {
  const response = await requestClient.get<ApiResponse<TeamAssetDTO>>(
    `${PERSONAL_ASSETS_BASE}/${encodeURIComponent(assetId)}`,
  );
  return response.data;
};

export const patchPersonalAsset = async (assetId: string, payload: TeamAssetPatchPayload) => {
  const response = await requestClient.patch<ApiResponse<TeamAssetDTO>>(
    `${PERSONAL_ASSETS_BASE}/${encodeURIComponent(assetId)}`,
    payload,
  );
  return response.data;
};

export const deletePersonalAsset = async (assetId: string) => {
  const response = await requestClient.delete<ApiResponse<unknown>>(
    `${PERSONAL_ASSETS_BASE}/${encodeURIComponent(assetId)}`,
  );
  return response.data;
};

export const uploadPersonalAsset = async (file: File, name?: string) => {
  const formData = new FormData();
  formData.append('file', file);
  if (name?.trim()) {
    formData.append('name', name.trim());
  }
  const response = await requestClient.post<ApiResponse<TeamAssetDTO>>(`${PERSONAL_ASSETS_BASE}/upload`, formData);
  return response.data;
};

export const listTeamAssets = async (teamId: string, params?: TeamAssetListParams) => {
  const response = await requestClient.get<ApiResponse<TeamAssetListResult>>(teamBasePath(teamId), {
    params: listParams(params),
  });
  return response.data;
};

export const getTeamAsset = async (teamId: string, assetId: string) => {
  const response = await requestClient.get<ApiResponse<TeamAssetDTO>>(`${teamBasePath(teamId)}/${encodeURIComponent(assetId)}`);
  return response.data;
};

export const patchTeamAsset = async (teamId: string, assetId: string, payload: TeamAssetPatchPayload) => {
  const response = await requestClient.patch<ApiResponse<TeamAssetDTO>>(
    `${teamBasePath(teamId)}/${encodeURIComponent(assetId)}`,
    payload,
  );
  return response.data;
};

export const deleteTeamAsset = async (teamId: string, assetId: string) => {
  const response = await requestClient.delete<ApiResponse<unknown>>(`${teamBasePath(teamId)}/${encodeURIComponent(assetId)}`);
  return response.data;
};

/** multipart 上传，后端返回完整 AssetDTO（含 url） */
export const uploadTeamAsset = async (teamId: string, file: File, name?: string) => {
  const formData = new FormData();
  formData.append('file', file);
  if (name?.trim()) {
    formData.append('name', name.trim());
  }
  const response = await requestClient.post<ApiResponse<TeamAssetDTO>>(`${teamBasePath(teamId)}/upload`, formData);
  return response.data;
};
