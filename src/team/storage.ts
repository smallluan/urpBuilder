const CURRENT_TEAM_STORAGE_KEY = 'urp-builder.current-team-id';
const WORKSPACE_MODE_STORAGE_KEY = 'urp-builder.workspace-mode';

export type WorkspaceMode = 'personal' | 'team';

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

export const getStoredWorkspaceMode = (): WorkspaceMode => {
  try {
    const raw = window.localStorage.getItem(WORKSPACE_MODE_STORAGE_KEY);
    return raw === 'team' ? 'team' : 'personal';
  } catch {
    return 'personal';
  }
};

export const persistWorkspaceMode = (mode: WorkspaceMode) => {
  try {
    window.localStorage.setItem(WORKSPACE_MODE_STORAGE_KEY, mode);
  } catch {
    // noop
  }
};
