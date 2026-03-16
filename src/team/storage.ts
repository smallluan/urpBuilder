const CURRENT_TEAM_STORAGE_KEY = 'urp-builder.current-team-id';

export const getStoredCurrentTeamId = () => {
  try {
    return window.localStorage.getItem(CURRENT_TEAM_STORAGE_KEY);
  } catch {
    return null;
  }
};

export const persistCurrentTeamId = (teamId: string | null) => {
  try {
    if (teamId) {
      window.localStorage.setItem(CURRENT_TEAM_STORAGE_KEY, teamId);
      return;
    }

    window.localStorage.removeItem(CURRENT_TEAM_STORAGE_KEY);
  } catch {
    // noop
  }
};
