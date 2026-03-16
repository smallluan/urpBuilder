import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/context';
import {
  createTeam as createTeamRequest,
  getMyTeams,
  getTeamDetail as getTeamDetailRequest,
  inviteTeamMember,
  removeTeamMember,
  setCurrentTeam as setCurrentTeamRequest,
} from './api';
import { getStoredCurrentTeamId, persistCurrentTeamId } from './storage';
import type {
  CreateTeamPayload,
  InviteTeamMemberPayload,
  TeamContextValue,
  TeamSummary,
} from './types';

const TeamContext = createContext<TeamContextValue | null>(null);

const resolveNextCurrentTeamId = (teams: TeamSummary[], preferredTeamId?: string | null) => {
  if (preferredTeamId && teams.some((item) => item.id === preferredTeamId)) {
    return preferredTeamId;
  }

  const storedTeamId = getStoredCurrentTeamId();
  if (storedTeamId && teams.some((item) => item.id === storedTeamId)) {
    return storedTeamId;
  }

  return teams[0]?.id ?? null;
};

export const TeamProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const { user, isAuthenticated, initialized: authInitialized } = useAuth();
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [currentTeamId, setCurrentTeamId] = useState<string | null>(null);

  const refreshTeams = async () => {
    if (!isAuthenticated || !user?.id) {
      setTeams([]);
      setCurrentTeamId(null);
      persistCurrentTeamId(null);
      return;
    }

    setLoading(true);
    try {
      const nextTeams = await getMyTeams();
      setTeams(nextTeams);
      const nextCurrentTeamId = resolveNextCurrentTeamId(nextTeams, currentTeamId);
      setCurrentTeamId(nextCurrentTeamId);
      persistCurrentTeamId(nextCurrentTeamId);
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  };

  useEffect(() => {
    if (!authInitialized) {
      return;
    }

    if (!isAuthenticated || !user?.id) {
      setTeams([]);
      setCurrentTeamId(null);
      persistCurrentTeamId(null);
      setInitialized(true);
      return;
    }

    refreshTeams();
  }, [authInitialized, isAuthenticated, user?.id]);

  const selectTeam = async (teamId: string) => {
    await setCurrentTeamRequest(teamId);
    setCurrentTeamId(teamId);
    persistCurrentTeamId(teamId);
  };

  const getTeamDetail = async (teamId: string) => getTeamDetailRequest(teamId);

  const createTeam = async (payload: CreateTeamPayload) => {
    const team = await createTeamRequest(payload);
    const nextTeams = [team, ...teams.filter((item) => item.id !== team.id)];
    setTeams(nextTeams);
    setCurrentTeamId(team.id);
    persistCurrentTeamId(team.id);
    return team;
  };

  const inviteMember = async (teamId: string, payload: InviteTeamMemberPayload) => {
    await inviteTeamMember(teamId, payload);
  };

  const removeMember = async (teamId: string, userId: string) => {
    await removeTeamMember(teamId, userId);
  };

  const currentTeam = useMemo(
    () => teams.find((item) => item.id === currentTeamId) ?? null,
    [currentTeamId, teams],
  );

  const value = useMemo<TeamContextValue>(() => ({
    initialized,
    loading,
    teams,
    currentTeamId,
    currentTeam,
    selectTeam,
    refreshTeams,
    getTeamDetail,
    createTeam,
    inviteMember,
    removeMember,
  }), [initialized, loading, teams, currentTeamId, currentTeam]);

  return <TeamContext.Provider value={value}>{children}</TeamContext.Provider>;
};

export const useTeam = () => {
  const context = useContext(TeamContext);
  if (!context) {
    throw new Error('useTeam must be used within TeamProvider');
  }
  return context;
};
