import React from 'react';
import { useTeam } from '../../team/context';
import WorkspaceModePanel from '../../components/WorkspaceModePanel';

const DataConstance: React.FC = () => {
  const { workspaceMode, setWorkspaceMode, currentTeamId, currentTeam } = useTeam();

  if (workspaceMode !== 'team') {
    return (
      <WorkspaceModePanel
        title="数据常量"
        description="当前为个人空间，数据常量管理将在团队空间下使用。"
        actionText="切换到团队空间"
        onAction={() => setWorkspaceMode('team')}
      />
    );
  }

  if (!currentTeamId) {
    return (
      <WorkspaceModePanel
        title="数据常量"
        description="当前未选择团队，请先在侧边栏空间切换器中选择团队。"
      />
    );
  }

  return (
    <div>
      <h1>数据常量</h1>
      <p>当前团队空间（{currentTeam?.name || currentTeamId}）数据常量管理能力开发中。</p>
    </div>
  );
};

export default DataConstance;