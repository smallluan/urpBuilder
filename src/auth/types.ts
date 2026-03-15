export interface AuthUser {
  id: string;
  username: string;
  nickname?: string;
  email?: string;
  avatar?: string;
  roles?: string[];
}

export interface LoginPayload {
  username: string;
  password: string;
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
  logout: () => Promise<void>;
  refreshCurrentUser: () => Promise<AuthUser | null>;
}