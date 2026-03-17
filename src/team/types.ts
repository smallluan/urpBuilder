export type TeamRole = 'owner' | 'admin' | 'member';

export interface TeamSummary {
  id: string;
  name: string;
  code?: string;
  description?: string;
  avatar?: string;
  role: TeamRole;
  status?: 'active' | 'disabled' | 'deleted';
  disableType?: 'manual' | 'timed';
  disabledUntil?: string;
  disableReason?: string;
  memberCount: number;
  ownerId?: string;
  ownerName?: string;
}

export interface TeamMember {
  userId: string;
  username: string;
  nickname?: string;
  email?: string;
  avatar?: string;
  role: TeamRole;
  joinedAt?: string;
}

export interface TeamDetail extends TeamSummary {
  members: TeamMember[];
}

export type TeamAssetKind = 'page' | 'component' | 'document' | 'api';

export interface TeamAssetItem {
  id: string;
  name: string;
  kind: TeamAssetKind;
  status?: string;
  visibility?: 'private' | 'public';
  updatedAt?: string;
  ownerName?: string;
  routePath?: string;
}

export interface TeamAssetSnapshot {
  members: TeamMember[];
  pages: TeamAssetItem[];
  components: TeamAssetItem[];
  documents: TeamAssetItem[];
  apis: TeamAssetItem[];
}

export interface CreateTeamPayload {
  name: string;
  code?: string;
  description?: string;
  avatar?: string;
  avatarSource?: 'preset' | 'upload';
}

export interface InviteTeamMemberPayload {
  identity?: string;
  inviteeUserId?: string;
  role?: Exclude<TeamRole, 'owner'>;
}

export type TeamInvitationStatus = 'pending' | 'accepted' | 'rejected' | 'canceled' | 'expired';

export interface TeamInvitation {
  id: string;
  teamId: string;
  teamName?: string;
  inviteeUserId?: string;
  inviteeIdentity?: string;
  inviteeName?: string;
  inviterId?: string;
  inviterName?: string;
  role: Exclude<TeamRole, 'owner'>;
  status: TeamInvitationStatus;
  createdAt?: string;
  respondedAt?: string;
}

export interface TeamUserCandidate {
  userId: string;
  username: string;
  nickname?: string;
  email?: string;
}

export interface TeamContextValue {
  initialized: boolean;
  loading: boolean;
  teams: TeamSummary[];
  currentTeamId: string | null;
  currentTeam: TeamSummary | null;
  selectTeam: (teamId: string) => Promise<void>;
  refreshTeams: () => Promise<void>;
  getTeamDetail: (teamId: string) => Promise<TeamDetail>;
  createTeam: (payload: CreateTeamPayload) => Promise<TeamDetail>;
  searchInviteCandidates: (keyword: string) => Promise<TeamUserCandidate[]>;
  inviteMember: (teamId: string, payload: InviteTeamMemberPayload) => Promise<void>;
  removeMember: (teamId: string, userId: string) => Promise<void>;
  getTeamInvitations: (teamId: string, status?: TeamInvitationStatus) => Promise<TeamInvitation[]>;
  getMyInvitations: (status?: TeamInvitationStatus) => Promise<TeamInvitation[]>;
  getMySentInvitations: (status?: TeamInvitationStatus) => Promise<TeamInvitation[]>;
  respondInvitation: (invitationId: string, action: 'accept' | 'reject') => Promise<void>;
}

export interface AdminTeamListParams {
  keyword?: string;
  status?: 'all' | 'active' | 'disabled' | 'deleted';
  page?: number;
  pageSize?: number;
}

export interface AdminTeamListResult {
  list: TeamSummary[];
  total: number;
}

export interface AdminTeamDisablePayload {
  mode: 'manual' | 'timed';
  reason?: string;
  disabledUntil?: string;
}
