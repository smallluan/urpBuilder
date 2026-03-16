import React, { useEffect, useMemo, useState } from 'react';
import { Button, Dialog, Empty, Input, List, Select, Table, Tabs, Tag } from 'tdesign-react';
import { AddIcon, DeleteIcon, LockOnIcon, RefreshIcon, SearchIcon } from 'tdesign-icons-react';
import type { PrimaryTableCol } from 'tdesign-react/es/table/type';
import { emitApiAlert } from '../../api/alertBus';
import { useAuth } from '../../auth/context';
import { adminDeleteTeam, adminDisableTeam, adminEnableTeam, getAdminTeams } from '../../team/api';
import { useTeam } from '../../team/context';
import type { AdminTeamDisablePayload, AdminTeamListParams, TeamDetail, TeamMember, TeamSummary, TeamUserCandidate } from '../../team/types';
import './style.less';

const { ListItem } = List;
const { TabPanel } = Tabs;

type DisablePresetUnit = 'hour' | 'day' | 'month';

const roleMap = {
  owner: { text: '拥有者', theme: 'primary' as const },
  admin: { text: '管理员', theme: 'warning' as const },
  member: { text: '成员', theme: 'default' as const },
};

const getInitials = (value?: string) => {
  const normalized = String(value || '').trim().replace(/\s+/g, '');
  return (normalized.slice(0, 2) || 'T').toUpperCase();
};

const formatDateText = (value?: string) => {
  if (!value) {
    return '暂无记录';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString();
};

const resolveStatusMeta = (status?: string) => {
  if (status === 'disabled') {
    return { text: '已禁用', theme: 'warning' as const };
  }
  if (status === 'deleted') {
    return { text: '已删除', theme: 'danger' as const };
  }
  return { text: '正常', theme: 'success' as const };
};

const buildDisabledUntil = (mode: 'duration' | 'until', value: string, unit: DisablePresetUnit) => {
  if (mode === 'until') {
    return value ? new Date(value).toISOString() : '';
  }

  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    return '';
  }

  const target = new Date();
  if (unit === 'hour') {
    target.setHours(target.getHours() + amount);
  } else if (unit === 'day') {
    target.setDate(target.getDate() + amount);
  } else {
    target.setMonth(target.getMonth() + amount);
  }

  return target.toISOString();
};

const isPlatformAdmin = (roles?: string[]) => {
  const roleSet = new Set((roles ?? []).map((item) => String(item).toLowerCase()));
  return roleSet.has('admin') || roleSet.has('super_admin') || roleSet.has('platform_admin') || roleSet.has('root');
};

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
    searchInviteCandidates,
    inviteMember,
    removeMember,
  } = useTeam();
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<TeamDetail | null>(null);
  const [createVisible, setCreateVisible] = useState(false);
  const [inviteVisible, setInviteVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchingCandidates, setSearchingCandidates] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [teamCode, setTeamCode] = useState('');
  const [teamDescription, setTeamDescription] = useState('');
  const [inviteIdentity, setInviteIdentity] = useState('');
  const [inviteCandidates, setInviteCandidates] = useState<TeamUserCandidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<TeamUserCandidate | null>(null);
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [teamTab, setTeamTab] = useState<'joined' | 'created' | 'managed'>('joined');
  const [teamSearchKeyword, setTeamSearchKeyword] = useState('');
  const [adminTeamQuery, setAdminTeamQuery] = useState('');
  const [adminTeamStatus, setAdminTeamStatus] = useState<'all' | 'active' | 'disabled' | 'deleted'>('all');
  const [adminTeamLoading, setAdminTeamLoading] = useState(false);
  const [adminTeams, setAdminTeams] = useState<TeamSummary[]>([]);
  const [adminTeamPage, setAdminTeamPage] = useState(1);
  const [adminTeamPageSize, setAdminTeamPageSize] = useState(10);
  const [adminTeamTotal, setAdminTeamTotal] = useState(0);
  const [disableTeamTarget, setDisableTeamTarget] = useState<TeamSummary | null>(null);
  const [disableTeamMode, setDisableTeamMode] = useState<'manual' | 'timed'>('manual');
  const [disableTeamScheduleMode, setDisableTeamScheduleMode] = useState<'duration' | 'until'>('duration');
  const [disableTeamDurationValue, setDisableTeamDurationValue] = useState('1');
  const [disableTeamDurationUnit, setDisableTeamDurationUnit] = useState<DisablePresetUnit>('day');
  const [disableTeamUntil, setDisableTeamUntil] = useState('');
  const [disableTeamReason, setDisableTeamReason] = useState('');
  const [disablingTeam, setDisablingTeam] = useState(false);
  const [enableTeamTarget, setEnableTeamTarget] = useState<TeamSummary | null>(null);
  const [enablingTeam, setEnablingTeam] = useState(false);
  const [deleteTeamTarget, setDeleteTeamTarget] = useState<TeamSummary | null>(null);
  const [deletingTeam, setDeletingTeam] = useState(false);

  const canGovernTeams = isPlatformAdmin(user?.roles);

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

  useEffect(() => {
    if (!inviteVisible) {
      setInviteCandidates([]);
      setSelectedCandidate(null);
      return;
    }

    const keyword = inviteIdentity.trim();
    if (!keyword || keyword.length < 2) {
      setInviteCandidates([]);
      return;
    }

    let active = true;
    const timer = window.setTimeout(async () => {
      setSearchingCandidates(true);
      try {
        const result = await searchInviteCandidates(keyword);
        if (active) {
          setInviteCandidates(result);
        }
      } finally {
        if (active) {
          setSearchingCandidates(false);
        }
      }
    }, 260);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [inviteIdentity, inviteVisible, searchInviteCandidates]);

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
    if (!identity && !selectedCandidate?.userId) {
      emitApiAlert('邀请失败', '请输入用户名或邮箱');
      return;
    }

    setSubmitting(true);
    try {
      await inviteMember(currentTeamId, {
        identity: selectedCandidate ? (selectedCandidate.email || selectedCandidate.username) : identity,
        inviteeUserId: selectedCandidate?.userId,
        role: inviteRole,
      });
      const displayName = selectedCandidate?.nickname || selectedCandidate?.username || identity;
      emitApiAlert('邀请已发送', `已向 ${displayName} 发送入队邀请，等待对方确认`, 'success');
      setInviteVisible(false);
      setInviteIdentity('');
      setInviteRole('member');
      setInviteCandidates([]);
      setSelectedCandidate(null);
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

  const memberStats = useMemo(() => {
    const members = detail?.members || [];
    return {
      ownerCount: members.filter((item) => item.role === 'owner').length,
      adminCount: members.filter((item) => item.role === 'admin').length,
      memberCount: members.filter((item) => item.role === 'member').length,
    };
  }, [detail?.members]);

  const fetchAdminTeams = React.useCallback(async (params: { page: number; pageSize: number; keyword?: string }) => {
    if (!canGovernTeams) {
      setAdminTeams([]);
      setAdminTeamTotal(0);
      return;
    }

    setAdminTeamLoading(true);
    try {
      const requestParams: AdminTeamListParams = {
        ...params,
        status: adminTeamStatus,
      };
      const result = await getAdminTeams(requestParams);
      setAdminTeams(Array.isArray(result?.list) ? result.list : []);
      setAdminTeamTotal(typeof result?.total === 'number' ? result.total : 0);
    } catch {
      setAdminTeams([]);
      setAdminTeamTotal(0);
    } finally {
      setAdminTeamLoading(false);
    }
  }, [adminTeamStatus, canGovernTeams]);

  useEffect(() => {
    fetchAdminTeams({
      page: adminTeamPage,
      pageSize: adminTeamPageSize,
      keyword: adminTeamQuery.trim() || undefined,
    });
  }, [fetchAdminTeams, adminTeamPage, adminTeamPageSize, adminTeamStatus]);

  const handleSearchAdminTeams = () => {
    setAdminTeamPage(1);
    fetchAdminTeams({
      page: 1,
      pageSize: adminTeamPageSize,
      keyword: adminTeamQuery.trim() || undefined,
    });
  };

  const resetDisableTeamForm = () => {
    setDisableTeamMode('manual');
    setDisableTeamScheduleMode('duration');
    setDisableTeamDurationValue('1');
    setDisableTeamDurationUnit('day');
    setDisableTeamUntil('');
    setDisableTeamReason('');
  };

  const handleConfirmDisableTeam = async () => {
    if (!disableTeamTarget?.id || disablingTeam) {
      return;
    }

    const payload: AdminTeamDisablePayload = {
      mode: disableTeamMode,
      reason: disableTeamReason.trim() || undefined,
    };

    if (disableTeamMode === 'timed') {
      const disabledUntil = buildDisabledUntil(
        disableTeamScheduleMode,
        disableTeamScheduleMode === 'until' ? disableTeamUntil : disableTeamDurationValue,
        disableTeamDurationUnit,
      );
      if (!disabledUntil) {
        emitApiAlert('禁用失败', '请填写有效的禁用时长或截止时间');
        return;
      }
      payload.disabledUntil = disabledUntil;
    }

    setDisablingTeam(true);
    try {
      await adminDisableTeam(disableTeamTarget.id, payload);
      emitApiAlert('操作成功', `团队 ${disableTeamTarget.name} 已禁用`, 'success');
      setDisableTeamTarget(null);
      resetDisableTeamForm();
      fetchAdminTeams({ page: adminTeamPage, pageSize: adminTeamPageSize, keyword: adminTeamQuery.trim() || undefined });
    } finally {
      setDisablingTeam(false);
    }
  };

  const handleConfirmEnableTeam = async () => {
    if (!enableTeamTarget?.id || enablingTeam) {
      return;
    }

    setEnablingTeam(true);
    try {
      await adminEnableTeam(enableTeamTarget.id);
      emitApiAlert('操作成功', `团队 ${enableTeamTarget.name} 已恢复`, 'success');
      setEnableTeamTarget(null);
      fetchAdminTeams({ page: adminTeamPage, pageSize: adminTeamPageSize, keyword: adminTeamQuery.trim() || undefined });
    } finally {
      setEnablingTeam(false);
    }
  };

  const handleConfirmDeleteTeam = async () => {
    if (!deleteTeamTarget?.id || deletingTeam) {
      return;
    }

    setDeletingTeam(true);
    try {
      await adminDeleteTeam(deleteTeamTarget.id);
      emitApiAlert('操作成功', `团队 ${deleteTeamTarget.name} 已删除`, 'success');
      setDeleteTeamTarget(null);
      fetchAdminTeams({ page: adminTeamPage, pageSize: adminTeamPageSize, keyword: adminTeamQuery.trim() || undefined });
    } finally {
      setDeletingTeam(false);
    }
  };

  const adminTeamColumns = useMemo<PrimaryTableCol<TeamSummary>[]>(() => [
    {
      colKey: 'name',
      title: '团队',
      minWidth: 220,
      cell: ({ row }) => (
        <div className="teams-page__govern-team-cell">
          <span className="teams-page__govern-team-avatar">{getInitials(row.name)}</span>
          <div className="teams-page__govern-team-main">
            <span className="teams-page__govern-team-name">{row.name}</span>
            <span className="teams-page__govern-team-sub">{row.code || row.id}</span>
          </div>
        </div>
      ),
    },
    {
      colKey: 'ownerName',
      title: '拥有者',
      minWidth: 160,
      cell: ({ row }) => row.ownerName || '-',
    },
    {
      colKey: 'memberCount',
      title: '成员数',
      width: 100,
    },
    {
      colKey: 'status',
      title: '状态',
      width: 120,
      cell: ({ row }) => {
        const status = resolveStatusMeta(row.status);
        return <Tag size="small" theme={status.theme} variant="light">{status.text}</Tag>;
      },
    },
    {
      colKey: 'disableInfo',
      title: '禁用信息',
      minWidth: 180,
      cell: ({ row }) => {
        if (row.status !== 'disabled') {
          return '-';
        }
        if (row.disableType === 'timed' && row.disabledUntil) {
          return `定时至 ${formatDateText(row.disabledUntil)}`;
        }
        return '手动禁用';
      },
    },
    {
      colKey: 'operations',
      title: '操作',
      width: 320,
      fixed: 'right',
      cell: ({ row }) => (
        <div className="teams-page__govern-action-row">
          {row.status === 'disabled' ? (
            <Button size="small" theme="success" variant="outline" onClick={() => setEnableTeamTarget(row)}>解禁</Button>
          ) : (
            <Button size="small" theme="warning" variant="outline" icon={<LockOnIcon />} onClick={() => setDisableTeamTarget(row)}>禁用</Button>
          )}
          <Button size="small" theme="danger" variant="outline" icon={<DeleteIcon />} disabled={row.status === 'deleted'} onClick={() => setDeleteTeamTarget(row)}>
            删除
          </Button>
        </div>
      ),
    },
  ], []);

  const adminTeamPagination = useMemo(() => ({
    current: adminTeamPage,
    pageSize: adminTeamPageSize,
    total: adminTeamTotal,
    showJumper: true,
    showPageSize: true,
    onCurrentChange: (nextPage: number) => setAdminTeamPage(nextPage),
    onPageSizeChange: (nextPageSize: number) => {
      setAdminTeamPage(1);
      setAdminTeamPageSize(nextPageSize);
    },
  }), [adminTeamPage, adminTeamPageSize, adminTeamTotal]);

  const filteredTeams = useMemo(() => {
    const keyword = teamSearchKeyword.trim().toLowerCase();

    return teams.filter((team) => {
      if (teamTab === 'created') {
        const isCreator = (team.ownerId && user?.id && team.ownerId === user.id) || team.role === 'owner';
        if (!isCreator) {
          return false;
        }
      } else if (teamTab === 'managed') {
        const canManage = team.role === 'owner' || team.role === 'admin';
        if (!canManage) {
          return false;
        }
      }

      if (!keyword) {
        return true;
      }

      const name = String(team.name || '').toLowerCase();
      const code = String(team.code || '').toLowerCase();
      return name.includes(keyword) || code.includes(keyword);
    });
  }, [teamSearchKeyword, teamTab, teams, user?.id]);

  const teamTabCount = useMemo(() => {
    const createdCount = teams.filter((team) => ((team.ownerId && user?.id && team.ownerId === user.id) || team.role === 'owner')).length;
    const managedCount = teams.filter((team) => team.role === 'owner' || team.role === 'admin').length;

    return {
      joined: teams.length,
      created: createdCount,
      managed: managedCount,
    };
  }, [teams, user?.id]);

  return (
    <div className="teams-page">
      <div className="teams-page__header">
        <div className="teams-page__header-actions">
          <Button size="small" variant="outline" icon={<RefreshIcon />} loading={loading} onClick={() => refreshTeams()}>
            刷新
          </Button>
          <Button size="small" theme="primary" icon={<AddIcon />} onClick={() => setCreateVisible(true)}>
            新建团队
          </Button>
        </div>
      </div>

      <div className="teams-page__body">
        <section className="teams-page__sidebar">
          <div className="teams-page__panel-header">
            <div>
              <div className="teams-page__panel-title">我的团队</div>
            </div>
          </div>
          <div className="teams-page__team-filters">
            <Tabs
              size="medium"
              className="teams-page__team-tabs"
              value={teamTab}
              onChange={(value) => setTeamTab(String(value) as 'joined' | 'created' | 'managed')}
            >
              <TabPanel value="joined" label={`我加入的 ${teamTabCount.joined}`} />
              <TabPanel value="created" label={`我创建的 ${teamTabCount.created}`} />
              <TabPanel value="managed" label={`我管理的 ${teamTabCount.managed}`} />
            </Tabs>
            <Input
              size="small"
              value={teamSearchKeyword}
              placeholder="按名称或 Key 搜索"
              suffix={<SearchIcon />}
              clearable
              onChange={(value) => setTeamSearchKeyword(String(value ?? ''))}
            />
          </div>
          {filteredTeams.length ? (
            <List split={false} className="teams-page__team-list">
              {filteredTeams.map((team) => {
                const active = team.id === currentTeamId;
                return (
                  <ListItem key={team.id} className="teams-page__team-list-item">
                    <button
                      type="button"
                      className={`teams-page__team-card${active ? ' is-active' : ''}`}
                      onClick={() => selectTeam(team.id)}
                    >
                      <span className="teams-page__team-card-avatar">{getInitials(team.name)}</span>
                      <div className="teams-page__team-card-body">
                        <div className="teams-page__team-card-row">
                          <span className="teams-page__team-card-title">{team.name}</span>
                          {active ? <span className="teams-page__team-card-current">当前</span> : null}
                        </div>
                        <div className="teams-page__team-card-meta">
                          <span>{roleMap[team.role].text}</span>
                          <span>{team.memberCount} 人</span>
                        </div>
                      </div>
                    </button>
                  </ListItem>
                );
              })}
            </List>
          ) : (
            <Empty description={teams.length ? '当前筛选条件下没有匹配团队' : '还没有团队，先创建一个吧'} />
          )}
        </section>

        <section className="teams-page__main-column">
          {detail ? (
            <>
              <section className="teams-page__hero">
                <div className="teams-page__hero-main">
                  <span className="teams-page__hero-avatar">{getInitials(detail.name)}</span>
                  <div className="teams-page__hero-copy">
                    <div className="teams-page__hero-title-row">
                      <h3>{detail.name}</h3>
                      <Tag size="small" theme={roleMap[detail.role].theme} variant="light">
                        {roleMap[detail.role].text}
                      </Tag>
                    </div>
                    <p>{detail.description || '当前团队还没有补充介绍。'}</p>
                    <div className="teams-page__hero-meta">
                      {detail.code ? <span>标识 {detail.code}</span> : null}
                      <span>{detail.memberCount} 位成员</span>
                      <span>当前团队</span>
                    </div>
                  </div>
                </div>
                {canManageMembers ? (
                  <div className="teams-page__hero-actions">
                    <Button size="small" theme="primary" onClick={() => setInviteVisible(true)} disabled={!currentTeamId}>
                      邀请成员
                    </Button>
                  </div>
                ) : null}
              </section>

              <section className="teams-page__metrics">
                <div className="teams-page__metric-item">
                  <span>拥有者</span>
                  <strong>{memberStats.ownerCount}</strong>
                </div>
                <div className="teams-page__metric-item">
                  <span>管理员</span>
                  <strong>{memberStats.adminCount}</strong>
                </div>
                <div className="teams-page__metric-item">
                  <span>成员</span>
                  <strong>{memberStats.memberCount}</strong>
                </div>
              </section>

              <section className="teams-page__section">
                <div className="teams-page__section-header">
                  <div>
                    <div className="teams-page__section-title">成员</div>
                    <div className="teams-page__section-subtitle">{detail.members.length} 位团队成员</div>
                  </div>
                </div>
                {detailLoading ? <div className="teams-page__empty">加载中...</div> : null}
                {!detailLoading ? (
                  <div className="teams-page__member-grid">
                    {detail.members.map((member) => {
                      const roleConfig = roleMap[member.role] || roleMap.member;
                      return (
                        <article key={member.userId} className="teams-page__member-card">
                          <div className="teams-page__member-card-head">
                            <span className="teams-page__member-avatar">{getInitials(member.nickname || member.username)}</span>
                            <div className="teams-page__member-main">
                              <div className="teams-page__member-name-row">
                                <span className="teams-page__member-name">{member.nickname || member.username}</span>
                                {member.userId === user?.id ? <Tag size="small" theme="primary" variant="light">我</Tag> : null}
                              </div>
                              <span className="teams-page__member-sub">{member.email || member.username}</span>
                            </div>
                            <Tag size="small" theme={roleConfig.theme} variant="light">{roleConfig.text}</Tag>
                          </div>
                          <div className="teams-page__member-foot">
                            <span>加入于 {formatDateText(member.joinedAt)}</span>
                            {canManageMembers && member.userId !== user?.id ? (
                              <Button
                                size="small"
                                theme="danger"
                                variant="text"
                                icon={<DeleteIcon />}
                                disabled={submitting || member.role === 'owner'}
                                onClick={() => handleRemoveMember(member)}
                              >
                                移出
                              </Button>
                            ) : null}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : null}
              </section>

              {canGovernTeams ? (
                <section className="teams-page__section">
                  <div className="teams-page__section-header">
                    <div>
                      <div className="teams-page__section-title">团队治理</div>
                      <div className="teams-page__section-subtitle">平台管理员可禁用、解禁或删除团队</div>
                    </div>
                  </div>
                  <div className="teams-page__govern-toolbar">
                    <Input
                      value={adminTeamQuery}
                      placeholder="按团队名称或 Key 搜索"
                      suffix={<SearchIcon />}
                      clearable
                      onChange={(value) => setAdminTeamQuery(String(value ?? ''))}
                      onEnter={handleSearchAdminTeams}
                    />
                    <Select
                      value={adminTeamStatus}
                      style={{ width: 140 }}
                      options={[
                        { label: '全部状态', value: 'all' },
                        { label: '正常', value: 'active' },
                        { label: '已禁用', value: 'disabled' },
                        { label: '已删除', value: 'deleted' },
                      ]}
                      onChange={(value) => {
                        const nextStatus = value === 'active' || value === 'disabled' || value === 'deleted' ? value : 'all';
                        setAdminTeamPage(1);
                        setAdminTeamStatus(nextStatus);
                      }}
                    />
                    <Button size="small" theme="default" variant="outline" icon={<SearchIcon />} onClick={handleSearchAdminTeams}>查询</Button>
                    <Button size="small" theme="default" variant="outline" icon={<RefreshIcon />} onClick={() => fetchAdminTeams({ page: adminTeamPage, pageSize: adminTeamPageSize, keyword: adminTeamQuery.trim() || undefined })}>刷新</Button>
                  </div>
                  <div className="teams-page__govern-table-wrap">
                    <Table
                      rowKey="id"
                      columns={adminTeamColumns}
                      data={adminTeams}
                      loading={adminTeamLoading}
                      pagination={adminTeamPagination}
                      style={{ minWidth: '1100px' }}
                    />
                  </div>
                </section>
              ) : null}

            </>
          ) : (
            <section className="teams-page__empty-panel">
              <Empty description="请选择一个团队" />
            </section>
          )}
        </section>
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
        onClose={() => {
          setInviteVisible(false);
          setInviteIdentity('');
          setInviteCandidates([]);
          setSelectedCandidate(null);
        }}
        onConfirm={handleInviteMember}
      >
        <div className="teams-page__form">
          <Input
            value={inviteIdentity}
            placeholder="输入用户名或邮箱（支持搜索）"
            suffix={<SearchIcon />}
            onChange={(value) => {
              setInviteIdentity(String(value ?? ''));
              setSelectedCandidate(null);
            }}
          />
          {inviteCandidates.length ? (
            <div className="teams-page__candidate-list">
              {inviteCandidates.map((candidate) => {
                const active = selectedCandidate?.userId === candidate.userId;
                return (
                  <button
                    key={candidate.userId}
                    type="button"
                    className={`teams-page__candidate-item${active ? ' is-active' : ''}`}
                    onClick={() => {
                      setSelectedCandidate(candidate);
                      setInviteIdentity(candidate.email || candidate.username);
                    }}
                  >
                    <span className="teams-page__candidate-name">{candidate.nickname || candidate.username}</span>
                    <span className="teams-page__candidate-sub">{candidate.email || candidate.username}</span>
                  </button>
                );
              })}
            </div>
          ) : null}
          {searchingCandidates ? <div className="teams-page__hint">正在搜索成员...</div> : null}
          <div className="teams-page__hint">邀请将发送给对方，需对方确认后才会加入团队。</div>
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

      <Dialog
        visible={Boolean(disableTeamTarget)}
        header="禁用团队"
        confirmBtn={{ content: '确认禁用', theme: 'warning', loading: disablingTeam }}
        cancelBtn={{ content: '取消', disabled: disablingTeam }}
        onClose={() => {
          setDisableTeamTarget(null);
          resetDisableTeamForm();
        }}
        onConfirm={handleConfirmDisableTeam}
      >
        <div className="teams-page__form">
          <Select
            value={disableTeamMode}
            options={[
              { label: '手动禁用', value: 'manual' },
              { label: '定时禁用', value: 'timed' },
            ]}
            onChange={(value) => setDisableTeamMode(value === 'timed' ? 'timed' : 'manual')}
          />
          {disableTeamMode === 'timed' ? (
            <>
              <Select
                value={disableTeamScheduleMode}
                options={[
                  { label: '按时长', value: 'duration' },
                  { label: '截至指定时间', value: 'until' },
                ]}
                onChange={(value) => setDisableTeamScheduleMode(value === 'until' ? 'until' : 'duration')}
              />
              {disableTeamScheduleMode === 'duration' ? (
                <div className="teams-page__duration-row">
                  <Input value={disableTeamDurationValue} onChange={(value) => setDisableTeamDurationValue(String(value ?? ''))} />
                  <Select
                    value={disableTeamDurationUnit}
                    options={[
                      { label: '小时', value: 'hour' },
                      { label: '天', value: 'day' },
                      { label: '月', value: 'month' },
                    ]}
                    onChange={(value) => setDisableTeamDurationUnit(value === 'hour' || value === 'month' ? value : 'day')}
                  />
                </div>
              ) : (
                <input
                  className="teams-page__native-datetime"
                  type="datetime-local"
                  value={disableTeamUntil}
                  onChange={(event) => setDisableTeamUntil(event.target.value)}
                />
              )}
            </>
          ) : null}
          <Input value={disableTeamReason} placeholder="禁用原因（可选）" onChange={(value) => setDisableTeamReason(String(value ?? ''))} />
        </div>
      </Dialog>

      <Dialog
        visible={Boolean(enableTeamTarget)}
        header="确认解禁团队"
        confirmBtn={{ content: '确认解禁', theme: 'success', loading: enablingTeam }}
        cancelBtn={{ content: '取消', disabled: enablingTeam }}
        onClose={() => setEnableTeamTarget(null)}
        onConfirm={handleConfirmEnableTeam}
      >
        <div>确认恢复团队“{enableTeamTarget?.name || '-'}”吗？</div>
      </Dialog>

      <Dialog
        visible={Boolean(deleteTeamTarget)}
        header="确认删除团队"
        confirmBtn={{ content: '确认删除', theme: 'danger', loading: deletingTeam }}
        cancelBtn={{ content: '取消', disabled: deletingTeam }}
        onClose={() => setDeleteTeamTarget(null)}
        onConfirm={handleConfirmDeleteTeam}
      >
        <div>确认删除团队“{deleteTeamTarget?.name || '-'}”吗？该操作不可恢复。</div>
      </Dialog>
    </div>
  );
};

export default TeamsPage;
