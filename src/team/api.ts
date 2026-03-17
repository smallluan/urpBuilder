import requestClient from '../api/request';
import type { ApiResponse } from '../api/types';
import { getComponentBaseList } from '../api/componentTemplate';
import { getPageTemplateBaseList } from '../api/pageTemplate';
import type {
  AdminTeamDisablePayload,
  AdminTeamListParams,
  AdminTeamListResult,
  CreateTeamPayload,
  InviteTeamMemberPayload,
  TeamDetail,
  TeamInvitation,
  TeamInvitationStatus,
  TeamAssetSnapshot,
  TeamAssetItem,
  TeamSummary,
  TeamUserCandidate,
} from './types';

export const getMyTeams = async () => {
  const response = await requestClient.get<ApiResponse<TeamSummary[]>>('/teams/mine');
  return Array.isArray(response.data.data) ? response.data.data : [];
};

export const getTeamDetail = async (teamId: string) => {
  const response = await requestClient.get<ApiResponse<TeamDetail>>(`/teams/${teamId}`);
  return response.data.data;
};

export const createTeam = async (payload: CreateTeamPayload) => {
  const response = await requestClient.post<ApiResponse<TeamDetail>>('/teams', payload);
  return response.data.data;
};

export const setCurrentTeam = async (teamId: string) => {
  const response = await requestClient.put<ApiResponse<null>>('/teams/current', { teamId });
  return response.data;
};

export const inviteTeamMember = async (teamId: string, payload: InviteTeamMemberPayload) => {
  const response = await requestClient.post<ApiResponse<null>>(`/teams/${teamId}/invitations`, payload);
  return response.data;
};

export const removeTeamMember = async (teamId: string, userId: string) => {
  const response = await requestClient.delete<ApiResponse<null>>(`/teams/${teamId}/members/${userId}`);
  return response.data;
};

export const searchTeamCandidates = async (keyword: string) => {
  const response = await requestClient.get<ApiResponse<TeamUserCandidate[]>>('/users/search', {
    params: {
      keyword,
    },
  });
  return Array.isArray(response.data.data) ? response.data.data : [];
};

export const getTeamInvitations = async (teamId: string, status?: TeamInvitationStatus) => {
  const response = await requestClient.get<ApiResponse<TeamInvitation[]>>(`/teams/${teamId}/invitations`, {
    params: {
      status,
    },
  });
  return Array.isArray(response.data.data) ? response.data.data : [];
};

export const getMyInvitations = async (status?: TeamInvitationStatus) => {
  const response = await requestClient.get<ApiResponse<TeamInvitation[]>>('/team-invitations/mine', {
    params: {
      status,
    },
  });
  return Array.isArray(response.data.data) ? response.data.data : [];
};

export const getMySentInvitations = async (status?: TeamInvitationStatus) => {
  const response = await requestClient.get<ApiResponse<TeamInvitation[]>>('/team-invitations/sent', {
    params: {
      status,
    },
  });
  return Array.isArray(response.data.data) ? response.data.data : [];
};

export const respondTeamInvitation = async (invitationId: string, action: 'accept' | 'reject') => {
  const response = await requestClient.post<ApiResponse<null>>(`/team-invitations/${invitationId}/respond`, {
    action,
  });
  return response.data;
};

export const getAdminTeams = async (params?: AdminTeamListParams) => {
  const response = await requestClient.get<ApiResponse<AdminTeamListResult>>('/admin/teams', {
    params,
  });
  return response.data.data;
};

export const adminDisableTeam = async (teamId: string, payload: AdminTeamDisablePayload) => {
  const response = await requestClient.patch<ApiResponse<null>>(`/admin/teams/${teamId}/disable`, payload);
  return response.data;
};

export const adminEnableTeam = async (teamId: string) => {
  const response = await requestClient.patch<ApiResponse<null>>(`/admin/teams/${teamId}/enable`);
  return response.data;
};

export const adminDeleteTeam = async (teamId: string) => {
  const response = await requestClient.delete<ApiResponse<null>>(`/admin/teams/${teamId}`);
  return response.data;
};

const mapTemplateAssetItem = (item: {
  pageId?: string;
  pageName?: string;
  status?: string;
  visibility?: 'private' | 'public';
  updatedAt?: string;
  ownerName?: string;
  routeConfig?: { routePath?: string };
}, kind: 'page' | 'component'): TeamAssetItem | null => {
  const id = String(item.pageId || '').trim();
  if (!id) {
    return null;
  }

  return {
    id,
    name: String(item.pageName || id),
    kind,
    status: item.status,
    visibility: item.visibility,
    updatedAt: item.updatedAt,
    ownerName: item.ownerName,
    routePath: kind === 'page' ? item.routeConfig?.routePath : undefined,
  };
};

export const getTeamAssetSnapshot = async (teamId: string): Promise<TeamAssetSnapshot> => {
  const [detail, pageResult, componentResult] = await Promise.all([
    getTeamDetail(teamId),
    getPageTemplateBaseList({
      ownerType: 'team',
      ownerTeamId: teamId,
      page: 1,
      pageSize: 100,
    }),
    getComponentBaseList({
      ownerType: 'team',
      ownerTeamId: teamId,
      page: 1,
      pageSize: 100,
    }),
  ]);

  const pages = (Array.isArray(pageResult.data?.list) ? pageResult.data.list : [])
    .map((item) => mapTemplateAssetItem(item, 'page'))
    .filter((item): item is TeamAssetItem => Boolean(item));

  const components = (Array.isArray(componentResult.data?.list) ? componentResult.data.list : [])
    .map((item) => mapTemplateAssetItem(item, 'component'))
    .filter((item): item is TeamAssetItem => Boolean(item));

  return {
    members: Array.isArray(detail.members) ? detail.members : [],
    pages,
    components,
    documents: [],
    apis: [],
  };
};
