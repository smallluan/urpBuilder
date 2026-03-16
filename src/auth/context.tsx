import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { deleteMyAccount, getCurrentUser, loginByPassword, logoutCurrentSession, registerByPassword } from './api';
import { onUnauthorized } from './events';
import { clearAuthSession, getAccessToken, getRefreshToken, migrateLegacyToken, persistAuthSession } from './storage';
import type { AuthContextValue, AuthUser, LoginPayload, RegisterPayload } from './types';

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [initialized, setInitialized] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);

  const resetSession = () => {
    clearAuthSession();
    setUser(null);
  };

  const refreshCurrentUser = async () => {
    const accessToken = migrateLegacyToken();
    if (!accessToken) {
      setUser(null);
      return null;
    }

    const currentUser = await getCurrentUser();
    setUser(currentUser);
    return currentUser;
  };

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      try {
        await refreshCurrentUser();
      } catch {
        if (active) {
          resetSession();
        }
      } finally {
        if (active) {
          setInitialized(true);
        }
      }
    };

    bootstrap();

    const unsubscribe = onUnauthorized(() => {
      if (!active) {
        return;
      }
      resetSession();
      setInitialized(true);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const login = async (payload: LoginPayload) => {
    setAuthenticating(true);
    try {
      const session = await loginByPassword(payload);
      persistAuthSession(session);
      setUser(session.user);
      return session.user;
    } finally {
      setAuthenticating(false);
      setInitialized(true);
    }
  };

  const register = async (payload: RegisterPayload) => {
    setAuthenticating(true);
    try {
      const session = await registerByPassword(payload);
      persistAuthSession(session);
      setUser(session.user);
      return session.user;
    } finally {
      setAuthenticating(false);
      setInitialized(true);
    }
  };

  const logout = async () => {
    try {
      const refreshToken = getRefreshToken();
      await logoutCurrentSession(refreshToken ? { refreshToken } : undefined);
    } catch {
      // noop
    } finally {
      resetSession();
    }
  };

  const deleteAccount = async () => {
    await deleteMyAccount();
    resetSession();
    setInitialized(true);
  };

  const value = useMemo<AuthContextValue>(() => ({
    initialized,
    authenticating,
    isAuthenticated: Boolean(user && getAccessToken()),
    user,
    login,
    register,
    logout,
    deleteAccount,
    refreshCurrentUser,
  }), [authenticating, initialized, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};