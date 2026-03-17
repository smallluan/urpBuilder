import React, { useEffect, useMemo, useState } from 'react';
import { Avatar, Button, Dialog, Empty, Input, List, Select, Tabs, Tag, Upload } from 'tdesign-react';
import { AddIcon, DeleteIcon, RefreshIcon, SearchIcon } from 'tdesign-icons-react';
import { emitApiAlert } from '../../api/alertBus';
import { useAuth } from '../../auth/context';
import { getTeamAssetSnapshot } from '../../team/api';
import { useTeam } from '../../team/context';
import type { TeamAssetItem, TeamAssetSnapshot, TeamDetail, TeamMember, TeamUserCandidate } from '../../team/types';
import { fileToDataUrl, resolveTeamAvatar, resolveUserAvatar } from '../../utils/avatar';
import './style.less';

const { ListItem } = List;
const { TabPanel } = Tabs;

const roleMap = {
  owner: { text: '拥有者', theme: 'primary' as const },
  admin: { text: '管理员', theme: 'warning' as const },
  member: { text: '成员', theme: 'default' as const },
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

const formatDateTimeText = (value?: string) => {
  if (!value) {
    return '暂无记录';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
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
  const [teamAvatar, setTeamAvatar] = useState('');
  const [inviteIdentity, setInviteIdentity] = useState('');
  const [inviteCandidates, setInviteCandidates] = useState<TeamUserCandidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<TeamUserCandidate | null>(null);
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [teamTab, setTeamTab] = useState<'joined' | 'created' | 'managed'>('joined');
  const [teamSearchKeyword, setTeamSearchKeyword] = useState('');
  const [assetLoading, setAssetLoading] = useState(false);
  const [assetTab, setAssetTab] = useState<'page' | 'component' | 'document' | 'api'>('page');
  const [assetSnapshot, setAssetSnapshot] = useState<TeamAssetSnapshot>({
    members: [],
    pages: [],
    components: [],
    documents: [],
    apis: [],
  });

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

  useEffect(() => {
    if (!currentTeamId) {
      setAssetSnapshot({
        members: [],
        pages: [],
        components: [],
        documents: [],
        apis: [],
      });
      return;
    }

    let active = true;
    const loadAssets = async () => {
      setAssetLoading(true);
      try {
        const snapshot = await getTeamAssetSnapshot(currentTeamId);
        if (active) {
          setAssetSnapshot(snapshot);
        }
      } catch {
        if (active) {
          setAssetSnapshot({
            members: [],
            pages: [],
            components: [],
            documents: [],
            apis: [],
          });
        }
      } finally {
        if (active) {
          setAssetLoading(false);
        }
      }
    };

    loadAssets();
    return () => {
      active = false;
    };
  }, [currentTeamId]);

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
        avatar: teamAvatar || undefined,
        avatarSource: teamAvatar ? 'upload' : undefined,
      });
      setDetail(created);
      emitApiAlert('创建成功', `团队 ${created.name} 已创建`, 'success');
      setCreateVisible(false);
      setTeamName('');
      setTeamCode('');
      setTeamDescription('');
      setTeamAvatar('');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUploadTeamAvatar = async (files: any[]) => {
    const file = files?.[0]?.raw as File | undefined;
    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      emitApiAlert('上传失败', '仅支持图片文件');
      return;
    }

    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      emitApiAlert('上传失败', '头像大小不能超过 2MB');
      return;
    }

    try {
      const avatarData = await fileToDataUrl(file);
      if (!avatarData) {
        emitApiAlert('上传失败', '头像读取失败，请重试');
        return;
      }
      setTeamAvatar(avatarData);
      emitApiAlert('上传成功', '团队头像已设置', 'success');
    } catch {
      emitApiAlert('上传失败', '头像读取失败，请重试');
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

  const assetStats = useMemo(() => {
    return {
      members: detail?.memberCount ?? assetSnapshot.members.length,
      pages: assetSnapshot.pages.length,
      components: assetSnapshot.components.length,
      documents: assetSnapshot.documents.length,
      apis: assetSnapshot.apis.length,
    };
  }, [assetSnapshot, detail?.memberCount]);

  const activeAssets = useMemo(() => {
    if (assetTab === 'component') {
      return assetSnapshot.components;
    }
    if (assetTab === 'document') {
      return assetSnapshot.documents;
    }
    if (assetTab === 'api') {
      return assetSnapshot.apis;
    }
    return assetSnapshot.pages;
  }, [assetSnapshot, assetTab]);

  const handleOpenAsset = (asset: TeamAssetItem) => {
    if (asset.kind === 'page') {
      window.open(`${window.location.origin}/create-page?id=${encodeURIComponent(asset.id)}`, '_blank');
      return;
    }

    if (asset.kind === 'component') {
      window.open(`${window.location.origin}/create-component?id=${encodeURIComponent(asset.id)}`, '_blank');
      return;
    }

    emitApiAlert('敬请期待', '该资产类型即将接入在线查看能力');
  };

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
                      <Avatar className="teams-page__team-card-avatar" image={resolveTeamAvatar({ id: team.id, name: team.name, code: team.code, avatar: team.avatar })} size="32px" />
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
                  <Avatar className="teams-page__hero-avatar" image={resolveTeamAvatar({ id: detail.id, name: detail.name, code: detail.code, avatar: detail.avatar })} size="42px" />
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
                    <div className="teams-page__section-title">团队资产</div>
                    <div className="teams-page__section-subtitle">
                      成员 {assetStats.members} · 页面 {assetStats.pages} · 组件 {assetStats.components} · 文档 {assetStats.documents} · 接口 {assetStats.apis}
                    </div>
                  </div>
                  <div className="teams-page__asset-actions">
                    <Button size="small" variant="outline" onClick={() => window.open(`${window.location.origin}/build-page`, '_blank')}>
                      页面资产
                    </Button>
                    <Button size="small" variant="outline" onClick={() => window.open(`${window.location.origin}/build-component`, '_blank')}>
                      组件资产
                    </Button>
                  </div>
                </div>

                <Tabs
                  size="medium"
                  value={assetTab}
                  onChange={(value) => setAssetTab(String(value) as 'page' | 'component' | 'document' | 'api')}
                >
                  <TabPanel value="page" label={`页面 ${assetStats.pages}`} />
                  <TabPanel value="component" label={`组件 ${assetStats.components}`} />
                  <TabPanel value="document" label={`文档 ${assetStats.documents}`} />
                  <TabPanel value="api" label={`接口 ${assetStats.apis}`} />
                </Tabs>

                {assetLoading ? <div className="teams-page__empty">资产加载中...</div> : null}
                {!assetLoading ? (
                  activeAssets.length ? (
                    <div className="teams-page__asset-list">
                      {activeAssets.map((asset) => (
                        <article key={`${asset.kind}-${asset.id}`} className="teams-page__asset-card">
                          <div className="teams-page__asset-card-head">
                            <div className="teams-page__asset-card-main">
                              <div className="teams-page__asset-card-title">{asset.name}</div>
                              <div className="teams-page__asset-card-sub">ID: {asset.id}</div>
                            </div>
                            {asset.status ? (
                              <Tag size="small" theme={asset.status === 'published' ? 'success' : 'warning'} variant="light">
                                {asset.status === 'published' ? '已发布' : '草稿'}
                              </Tag>
                            ) : null}
                          </div>
                          <div className="teams-page__asset-card-foot">
                            <span>更新于 {formatDateTimeText(asset.updatedAt)}</span>
                            <Button size="small" variant="text" theme="primary" onClick={() => handleOpenAsset(asset)}>
                              查看
                            </Button>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <Empty description="当前分类下还没有资产" />
                  )
                ) : null}
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
                            <Avatar
                              className="teams-page__member-avatar"
                              image={resolveUserAvatar({
                                id: member.userId,
                                username: member.username,
                                nickname: member.nickname,
                                avatar: member.avatar,
                              })}
                              size="34px"
                            />
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
        onClose={() => {
          setCreateVisible(false);
          setTeamAvatar('');
        }}
        onConfirm={handleCreateTeam}
      >
        <div className="teams-page__form">
          <div className="teams-page__team-avatar-row">
            <Avatar className="teams-page__create-team-avatar" image={teamAvatar || resolveTeamAvatar({ name: teamName || 'new-team', code: teamCode })} size="52px" />
            <Upload
              autoUpload={false}
              max={1}
              accept="image/*"
              showUploadProgress={false}
              onSelectChange={handleUploadTeamAvatar}
            >
              <Button size="small" variant="outline" theme="default">上传团队头像</Button>
            </Upload>
            {teamAvatar ? (
              <Button size="small" variant="text" theme="default" onClick={() => setTeamAvatar('')}>使用默认头像</Button>
            ) : null}
          </div>
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
