import React, { useEffect, useMemo, useState } from 'react';
import { Button, Dialog, Empty, Input, List, Select, Tabs, Tag } from 'tdesign-react';
import { AddIcon, DeleteIcon, RefreshIcon, SearchIcon } from 'tdesign-icons-react';
import { emitApiAlert } from '../../api/alertBus';
import { useAuth } from '../../auth/context';
import { useTeam } from '../../team/context';
import type { TeamDetail, TeamMember, TeamUserCandidate } from '../../team/types';
import './style.less';

const { ListItem } = List;
const { TabPanel } = Tabs;

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
    </div>
  );
};

export default TeamsPage;
