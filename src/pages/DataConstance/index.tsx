import React from 'react';
import { Button, Empty } from 'tdesign-react';
import { useTeam } from '../../team/context';

const DataConstance: React.FC = () => {
  const { workspaceMode, setWorkspaceMode, currentTeamId } = useTeam();

  if (workspaceMode !== 'team') {
    return (
      <div>
        <h1>数据常量</h1>
        <Empty description="当前为个人空间，数据常量管理将在团队空间下使用。" />
        <div style={{ marginTop: 12 }}>
          <Button size="small" theme="primary" onClick={() => setWorkspaceMode('team')}>
            切换到团队空间
          </Button>
        </div>
      </div>
    );
  }

  if (!currentTeamId) {
    return (
      <div>
        <h1>数据常量</h1>
        <Empty description="当前未选择团队，请先在侧边栏空间切换器中选择团队。" />
      </div>
    );
  }

  return (
    <div>
      <h1>数据常量</h1>
      <p>当前团队空间（{currentTeamId}）数据常量管理能力开发中。</p>
    </div>
  );
};

export default DataConstance;