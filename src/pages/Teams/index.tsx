import React, { useEffect, useMemo, useState } from 'react';
import { Button, Card, Dialog, Empty, Input, Select, Table, Tag } from 'tdesign-react';
import type { PrimaryTableCol } from 'tdesign-react/es/table/type';
import { AddIcon, DeleteIcon, RefreshIcon } from 'tdesign-icons-react';
import { emitApiAlert } from '../../api/alertBus';
import { useAuth } from '../../auth/context';
import { useTeam } from '../../team/context';
import type { TeamDetail, TeamMember } from '../../team/types';
import './style.less';

const TeamsPage: React.FC = () => {
  const { user } = useAuth();
  const {
    teams,
    currentTeamId,
    currentTeam,
    loading,
    selectTeam,
    refreshTeams,
    getTeamDetail,
    createTeam,
    inviteMember,
    removeMember,
  } = useTeam();
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<TeamDetail | null>(null);
  const [createVisible, setCreateVisible] = useState(false);
  const [inviteVisible, setInviteVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [teamCode, setTeamCode] = useState('');
  const [teamDescription, setTeamDescription] = useState('');
  const [inviteIdentity, setInviteIdentity] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');

  useEffect(() => {
    if (!currentTeamId) {
      setDetail(null);
      return;
    }

    let active = true;
    const load = async () => {
      setDetailLoading(true);
      try {
        const nextDetail = await getTeamDetail(currentTeamId);
        if (active) {
          setDetail(nextDetail);
        }
      } finally {
        if (active) {
          setDetailLoading(false);
        }
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [currentTeamId, getTeamDetail]);

  const canManageMembers = (detail?.role ?? currentTeam?.role) === 'owner' || (detail?.role ?? currentTeam?.role) === 'admin';

  const handleCreateTeam = async () => {
    const name = teamName.trim();
    if (!name) {
      emitApiAlert('创建失败', '请输入团队名称');
      return;
    }

    setSubmitting(true);
    try {
      const created = await createTeam({
        name,
        code: teamCode.trim() || undefined,
        description: teamDescription.trim() || undefined,
      });
      setDetail(created);
      emitApiAlert('创建成功', `团队 ${created.name} 已创建`, 'success');
      setCreateVisible(false);
      setTeamName('');
      setTeamCode('');
      setTeamDescription('');
    } finally {
      setSubmitting(false);
    }
  };

  const handleInviteMember = async () => {
    if (!currentTeamId) {
      return;
    }

    const identity = inviteIdentity.trim();
    if (!identity) {
      emitApiAlert('邀请失败', '请输入用户名或邮箱');
      return;
    }

    setSubmitting(true);
    try {
      await inviteMember(currentTeamId, {
        identity,
        role: inviteRole,
      });
      emitApiAlert('邀请成功', `已邀请 ${identity} 加入团队`, 'success');
      setInviteVisible(false);
      setInviteIdentity('');
      setInviteRole('member');
      const nextDetail = await getTeamDetail(currentTeamId);
      setDetail(nextDetail);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveMember = async (member: TeamMember) => {
    if (!currentTeamId) {
      return;
    }

    if (member.role === 'owner') {
      emitApiAlert('操作失败', '团队拥有者不能被移除');
      return;
    }

    setSubmitting(true);
    try {
      await removeMember(currentTeamId, member.userId);
      emitApiAlert('移除成功', `${member.nickname || member.username} 已移出团队`, 'success');
      const nextDetail = await getTeamDetail(currentTeamId);
      setDetail(nextDetail);
    } finally {
      setSubmitting(false);
    }
  };

  const memberColumns = useMemo<PrimaryTableCol<TeamMember>[]>(() => [
    {
      colKey: 'username',
      title: '成员',
      minWidth: 220,
      cell: ({ row }) => (
        <div className="teams-page__member-cell">
          <span className="teams-page__member-name">{row.nickname || row.username}</span>
          <span className="teams-page__member-sub">{row.email || row.username}</span>
        </div>
      ),
    },
    {
      colKey: 'role',
      title: '身份',
      width: 140,
      cell: ({ row }) => {
        const map = {
          owner: { text: '拥有者', theme: 'primary' as const },
          admin: { text: '管理员', theme: 'warning' as const },
          member: { text: '成员', theme: 'default' as const },
        };
        const config = map[row.role] || map.member;
        return <Tag size="small" theme={config.theme} variant="light">{config.text}</Tag>;
      },
    },
    {
      colKey: 'joinedAt',
      title: '加入时间',
      minWidth: 180,
      cell: ({ row }) => row.joinedAt || '-',
    },
    {
      colKey: 'operations',
      title: '操作',
      width: 120,
      cell: ({ row }) => (
        canManageMembers && row.userId !== user?.id ? (
          <Button
            size="small"
            theme="danger"
            variant="outline"
            icon={<DeleteIcon />}
            disabled={submitting || row.role === 'owner'}
            onClick={() => handleRemoveMember(row)}
          >
            移出
          </Button>
        ) : null
      ),
    },
  ], [canManageMembers, submitting, user?.id]);

  return (
    <div className="teams-page">
      <div className="teams-page__header">
        <div>
          <h2>团队管理</h2>
          <p>这里维护团队、成员和当前协作上下文。第二阶段再把资源归属接进来。</p>
        </div>
        <div className="teams-page__header-actions">
          <Button variant="outline" icon={<RefreshIcon />} loading={loading} onClick={() => refreshTeams()}>
            刷新
          </Button>
          <Button theme="primary" icon={<AddIcon />} onClick={() => setCreateVisible(true)}>
            创建团队
          </Button>
        </div>
      </div>

      <div className="teams-page__body">
        <Card className="teams-page__sidebar" title="我的团队">
          {teams.length ? (
            <div className="teams-page__team-list">
              {teams.map((team) => {
                const active = team.id === currentTeamId;
                return (
                  <button
                    key={team.id}
                    type="button"
                    className={`teams-page__team-card${active ? ' is-active' : ''}`}
                    onClick={() => selectTeam(team.id)}
                  >
                    <div className="teams-page__team-card-title">{team.name}</div>
                    <div className="teams-page__team-card-meta">
                      <span>{team.memberCount} 人</span>
                      <Tag size="small" theme={team.role === 'owner' ? 'primary' : 'default'} variant="light">
                        {team.role === 'owner' ? '拥有者' : team.role === 'admin' ? '管理员' : '成员'}
                      </Tag>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <Empty description="还没有团队，先创建一个吧" />
          )}
        </Card>

        <Card
          className="teams-page__main"
          title={detail?.name || '团队详情'}
          subtitle={detail?.description || '选择团队后可查看成员并进行管理'}
          actions={canManageMembers ? (
            <Button theme="primary" variant="outline" onClick={() => setInviteVisible(true)} disabled={!currentTeamId}>
              邀请成员
            </Button>
          ) : undefined}
        >
          {detail ? (
            <div className="teams-page__detail">
              <div className="teams-page__stats">
                <div className="teams-page__stat-item">
                  <span className="teams-page__stat-label">团队标识</span>
                  <strong>{detail.code || '-'}</strong>
                </div>
                <div className="teams-page__stat-item">
                  <span className="teams-page__stat-label">当前身份</span>
                  <strong>{detail.role === 'owner' ? '拥有者' : detail.role === 'admin' ? '管理员' : '成员'}</strong>
                </div>
                <div className="teams-page__stat-item">
                  <span className="teams-page__stat-label">成员数</span>
                  <strong>{detail.memberCount}</strong>
                </div>
              </div>

              <Table
                rowKey="userId"
                loading={detailLoading}
                data={detail.members}
                columns={memberColumns}
              />
            </div>
          ) : (
            <Empty description="请选择一个团队" />
          )}
        </Card>
      </div>

      <Dialog
        visible={createVisible}
        header="创建团队"
        confirmBtn={{ content: '创建', loading: submitting }}
        cancelBtn={{ content: '取消', disabled: submitting }}
        onClose={() => setCreateVisible(false)}
        onConfirm={handleCreateTeam}
      >
        <div className="teams-page__form">
          <Input value={teamName} placeholder="团队名称" onChange={(value) => setTeamName(String(value ?? ''))} />
          <Input value={teamCode} placeholder="团队编码（可选）" onChange={(value) => setTeamCode(String(value ?? ''))} />
          <Input value={teamDescription} placeholder="团队描述（可选）" onChange={(value) => setTeamDescription(String(value ?? ''))} />
        </div>
      </Dialog>

      <Dialog
        visible={inviteVisible}
        header="邀请成员"
        confirmBtn={{ content: '发送邀请', loading: submitting }}
        cancelBtn={{ content: '取消', disabled: submitting }}
        onClose={() => setInviteVisible(false)}
        onConfirm={handleInviteMember}
      >
        <div className="teams-page__form">
          <Input value={inviteIdentity} placeholder="用户名或邮箱" onChange={(value) => setInviteIdentity(String(value ?? ''))} />
          <Select
            value={inviteRole}
            options={[
              { label: '成员', value: 'member' },
              { label: '管理员', value: 'admin' },
            ]}
            onChange={(value) => setInviteRole(value === 'admin' ? 'admin' : 'member')}
          />
        </div>
      </Dialog>
    </div>
  );
};

export default TeamsPage;
