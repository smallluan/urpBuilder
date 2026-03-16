import requestClient from '../api/request';
import type { ApiResponse } from '../api/types';
import type {
  CreateTeamPayload,
  InviteTeamMemberPayload,
  TeamDetail,
  TeamInvitation,
  TeamInvitationStatus,
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
