import React from 'react';
import { Empty, Space, Typography } from 'tdesign-react';
import { useTeam } from '../../team/context';

const { Text } = Typography;

const DataApi: React.FC = () => {
  const { workspaceMode, currentTeamId, currentTeam } = useTeam();

  const hint =
    workspaceMode === 'personal'
      ? '当前为个人空间：此处仅配置与你个人相关的数据 API（与团队 API 隔离）。能力开发中。'
      : currentTeamId
        ? `当前为团队空间：此处仅配置团队「${currentTeam?.name || currentTeamId}」下的数据 API（与个人 API 隔离）。能力开发中。`
        : '当前为团队空间：请先在侧栏空间切换器中选择团队，再配置该团队的数据 API。';

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 24px 48px' }}>
      <Typography.Title level="h4" style={{ marginBottom: 8 }}>
        数据 API
      </Typography.Title>
      <Text style={{ display: 'block', marginBottom: 20, color: 'var(--td-text-color-secondary)', fontSize: 13 }}>
        管理页面/组件可调用的 HTTP 接口配置。个人空间与团队空间下的配置互不相通，随侧栏空间切换，无需在本页再选「个人/团队」。
      </Text>

      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <Text style={{ fontSize: 13 }}>{hint}</Text>
        {workspaceMode === 'team' && !currentTeamId ? (
          <Empty description="请先选择团队" />
        ) : (
          <Empty description="功能开发中" />
        )}
      </Space>
    </div>
  );
};

export default DataApi;
