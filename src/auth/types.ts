export interface AuthUser {
  id: string;
  username: string;
  nickname?: string;
  email?: string;
  avatar?: string;
  status?: 'active' | 'disabled' | 'deleted';
  disableType?: 'manual' | 'timed';
  disabledUntil?: string;
  disableReason?: string;
  createdAt?: string;
  updatedAt?: string;
  roles?: string[];
}

export interface AdminUserListParams {
  keyword?: string;
  status?: 'all' | 'active' | 'disabled' | 'deleted';
  page?: number;
  pageSize?: number;
}

export interface AdminUserListResult {
  list: AuthUser[];
  total: number;
}

export interface AdminUserDisablePayload {
  mode: 'manual' | 'timed';
  reason?: string;
  disabledUntil?: string;
}

export interface LoginPayload {
  username: string;
  password: string;
}

export interface RegisterPayload {
  username: string;
  password: string;
  nickname?: string;
  avatar?: string;
  avatarSource?: 'preset' | 'upload';
  avatarSeed?: string;
}

export interface UpdateProfilePayload {
  nickname?: string;
  avatar?: string;
  avatarSource?: 'preset' | 'upload';
  avatarSeed?: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export interface AuthSession {
  accessToken: string;
  refreshToken?: string;
  user: AuthUser;
  expiresIn?: number;
}

export interface LogoutPayload {
  refreshToken?: string;
}

export interface AuthContextValue {
  initialized: boolean;
  authenticating: boolean;
  isAuthenticated: boolean;
  user: AuthUser | null;
  login: (payload: LoginPayload) => Promise<AuthUser>;
  register: (payload: RegisterPayload) => Promise<AuthUser>;
  updateProfile: (payload: UpdateProfilePayload) => Promise<AuthUser>;
  changePassword: (payload: ChangePasswordPayload) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  refreshCurrentUser: () => Promise<AuthUser | null>;
}