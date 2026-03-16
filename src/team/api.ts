import requestClient from '../api/request';
import type { ApiResponse } from '../api/types';
import type { CreateTeamPayload, InviteTeamMemberPayload, TeamDetail, TeamSummary } from './types';

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
  const response = await requestClient.post<ApiResponse<null>>(`/teams/${teamId}/members`, payload);
  return response.data;
};

export const removeTeamMember = async (teamId: string, userId: string) => {
  const response = await requestClient.delete<ApiResponse<null>>(`/teams/${teamId}/members/${userId}`);
  return response.data;
};
