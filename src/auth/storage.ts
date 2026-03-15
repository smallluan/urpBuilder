import type { AuthSession } from './types';

const ACCESS_TOKEN_KEY = 'urp_builder_access_token';
const REFRESH_TOKEN_KEY = 'urp_builder_refresh_token';

export const getAccessToken = () => localStorage.getItem(ACCESS_TOKEN_KEY) ?? '';

export const getRefreshToken = () => localStorage.getItem(REFRESH_TOKEN_KEY) ?? '';

export const persistAuthSession = (session: AuthSession) => {
  localStorage.setItem(ACCESS_TOKEN_KEY, session.accessToken);
  if (session.refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, session.refreshToken);
  } else {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
};

export const clearAuthSession = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem('token');
};

export const migrateLegacyToken = () => {
  const accessToken = getAccessToken();
  if (accessToken) {
    return accessToken;
  }

  const legacyToken = localStorage.getItem('token') ?? '';
  if (legacyToken) {
    localStorage.setItem(ACCESS_TOKEN_KEY, legacyToken);
  }

  return legacyToken;
};