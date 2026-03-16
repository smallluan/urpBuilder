export type TeamRole = 'owner' | 'admin' | 'member';

export interface TeamSummary {
  id: string;
  name: string;
  code?: string;
  description?: string;
  role: TeamRole;
  memberCount: number;
  ownerId?: string;
  ownerName?: string;
}

export interface TeamMember {
  userId: string;
  username: string;
  nickname?: string;
  email?: string;
  role: TeamRole;
  joinedAt?: string;
}

export interface TeamDetail extends TeamSummary {
  members: TeamMember[];
}

export interface CreateTeamPayload {
  name: string;
  code?: string;
  description?: string;
}

export interface InviteTeamMemberPayload {
  identity: string;
  role?: Exclude<TeamRole, 'owner'>;
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
  inviteMember: (teamId: string, payload: InviteTeamMemberPayload) => Promise<void>;
  removeMember: (teamId: string, userId: string) => Promise<void>;
}
