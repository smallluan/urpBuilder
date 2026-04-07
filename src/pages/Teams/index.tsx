import React, { useEffect, useMemo, useState } from 'react';
import { Avatar, Button, Dialog, Empty, Input, Tabs, Tag, Upload } from 'tdesign-react';
import { AddIcon, DeleteIcon, RefreshIcon } from 'tdesign-icons-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { emitApiAlert } from '../../api/alertBus';
import { useAuth } from '../../auth/context';
import { getTeamAssetSnapshot } from '../../team/api';
import { useTeam } from '../../team/context';
import type { TeamAssetItem, TeamAssetSnapshot, TeamDetail, TeamMember } from '../../team/types';
import { fileToDataUrl, resolveTeamAvatar, resolveUserAvatar } from '../../utils/avatar';
import './style.less';

const { TabPanel } = Tabs;

const roleMap = {
  owner: { text: '拥有者', theme: 'primary' as const },
  admin: { text: '管理员', theme: 'warning' as const },
  member: { text: '成员', theme: 'default' as const },
};

const formatDateTimeText = (value?: string) => {
  if (!value) return '暂无记录';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

const TeamsPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    teams,
    currentTeamId,
    currentTeam,
    workspaceMode,
    setWorkspaceMode,
    loading,
    refreshTeams,
    getTeamDetail,
    createTeam,
    removeMember,
  } = useTeam();
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<TeamDetail | null>(null);
  const [createVisible, setCreateVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [teamCode, setTeamCode] = useState('');
  const [teamDescription, setTeamDescription] = useState('');
  const [teamAvatar, setTeamAvatar] = useState('');
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
        if (active) setDetail(nextDetail);
      } finally {
        if (active) setDetailLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [currentTeamId, getTeamDetail]);

  useEffect(() => {
    if (!currentTeamId) {
      setAssetSnapshot({ members: [], pages: [], components: [], documents: [], apis: [] });
      return;
    }
    let active = true;
    const loadAssets = async () => {
      setAssetLoading(true);
      try {
        const snapshot = await getTeamAssetSnapshot(currentTeamId);
        if (active) setAssetSnapshot(snapshot);
      } catch {
        if (active) setAssetSnapshot({ members: [], pages: [], components: [], documents: [], apis: [] });
      } finally {
        if (active) setAssetLoading(false);
      }
    };
    loadAssets();
    return () => { active = false; };
  }, [currentTeamId]);

  const canManageMembers = (detail?.role ?? currentTeam?.role) === 'owner' || (detail?.role ?? currentTeam?.role) === 'admin';

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('create') !== '1') return;
    setCreateVisible(true);
    params.delete('create');
    navigate(params.toString() ? `/teams?${params.toString()}` : '/teams', { replace: true });
  }, [location.search, navigate]);

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
    if (!file) return;
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

  const handleRemoveMember = async (member: TeamMember) => {
    if (!currentTeamId) return;
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

  const assetStats = useMemo(() => ({
    members: detail?.memberCount ?? assetSnapshot.members.length,
    pages: assetSnapshot.pages.length,
    components: assetSnapshot.components.length,
    documents: assetSnapshot.documents.length,
    apis: assetSnapshot.apis.length,
  }), [assetSnapshot, detail?.memberCount]);

  const activeAssets = useMemo(() => {
    if (assetTab === 'component') return assetSnapshot.components;
    if (assetTab === 'document') return assetSnapshot.documents;
    if (assetTab === 'api') return assetSnapshot.apis;
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

  return (
    <div className="teams-page app-shell-page">
      <div className="teams-page__header">
        <Button size="small" variant="outline" icon={<RefreshIcon />} loading={loading} onClick={() => refreshTeams()}>
          刷新
        </Button>
      </div>

      {workspaceMode !== 'team' ? (
        <div className="teams-page__empty-panel">
          <Empty description="当前为个人空间，请先切换到团队空间查看团队看板" />
          <div className="teams-page__empty-actions">
            <Button size="small" theme="primary" onClick={() => setWorkspaceMode('team')} disabled={!teams.length}>
              切换到团队空间
            </Button>
          </div>
        </div>
      ) : null}

      {workspaceMode === 'team' && !currentTeamId ? (
        <div className="teams-page__empty-panel">
          <Empty description="你还没有可用团队，先创建一个团队吧" />
          <div className="teams-page__empty-actions">
            <Button size="small" theme="primary" icon={<AddIcon />} onClick={() => setCreateVisible(true)}>
              创建团队
            </Button>
          </div>
        </div>
      ) : null}

      {workspaceMode === 'team' && currentTeamId && detail ? (
        <>
          <div className="tile-hero">
            <Avatar className="tile-hero__avatar" image={resolveTeamAvatar({ id: detail.id, name: detail.name, code: detail.code, avatar: detail.avatar })} size="56px" />
            <div className="tile-hero__info">
              <div className="tile-hero__title-row">
                <h2 className="tile-hero__name">{detail.name}</h2>
                <Tag size="small" theme={roleMap[detail.role].theme} variant="light">
                  {roleMap[detail.role].text}
                </Tag>
              </div>
              <p className="tile-hero__desc">{detail.description || '暂无介绍'}</p>
              <div className="tile-hero__meta">
                {detail.code && <span className="tile-hero__meta-item">标识: {detail.code}</span>}
                <span className="tile-hero__meta-item">{detail.memberCount} 位成员</span>
              </div>
            </div>
            {canManageMembers ? null : null}
          </div>

          <div className="tile-stats">
            <div className="tile-stats__item">
              <div className="tile-stats__value">{assetStats.members}</div>
              <div className="tile-stats__label">成员</div>
            </div>
            <div className="tile-stats__item">
              <div className="tile-stats__value">{assetStats.pages}</div>
              <div className="tile-stats__label">页面</div>
            </div>
            <div className="tile-stats__item">
              <div className="tile-stats__value">{assetStats.components}</div>
              <div className="tile-stats__label">组件</div>
            </div>
            <div className="tile-stats__item">
              <div className="tile-stats__value">{assetStats.apis}</div>
              <div className="tile-stats__label">接口</div>
            </div>
          </div>

          <div className="tile-section">
            <div className="tile-section__header">
              <div>
                <h3 className="tile-section__title">团队资产</h3>
              </div>
              <div>
                <Button size="small" variant="outline" onClick={() => window.open(`${window.location.origin}/build-page`, '_blank')}>
                  页面
                </Button>
                <Button size="small" variant="outline" onClick={() => window.open(`${window.location.origin}/build-component`, '_blank')} style={{ marginLeft: 8 }}>
                  组件
                </Button>
              </div>
            </div>

            <Tabs size="medium" value={assetTab} onChange={(value) => setAssetTab(String(value) as 'page' | 'component' | 'document' | 'api')}>
              <TabPanel value="page" label={`页面 ${assetStats.pages}`} />
              <TabPanel value="component" label={`组件 ${assetStats.components}`} />
              <TabPanel value="api" label={`接口 ${assetStats.apis}`} />
            </Tabs>

            {assetLoading ? (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--td-font-gray-4)' }}>加载中...</div>
            ) : activeAssets.length ? (
              <div className="asset-grid">
                {activeAssets.map((asset) => (
                  <div key={`${asset.kind}-${asset.id}`} className="asset-grid__item" onClick={() => handleOpenAsset(asset)}>
                    <div className="asset-grid__title">{asset.name}</div>
                    <div className="asset-grid__id">ID: {asset.id}</div>
                    <div className="asset-grid__foot">{formatDateTimeText(asset.updatedAt)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <Empty description="暂无资产" />
            )}
          </div>

          <div className="tile-section">
            <div className="tile-section__header">
              <div>
                <h3 className="tile-section__title">团队成员 ({detail.members.length})</h3>
              </div>
            </div>

            {detailLoading ? (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--td-font-gray-4)' }}>加载中...</div>
            ) : (
              <div className="member-grid">
                {detail.members.map((member) => {
                  const roleConfig = roleMap[member.role] || roleMap.member;
                  return (
                    <div key={member.userId} className="member-grid__item">
                      <Avatar
                        className="member-grid__avatar"
                        image={resolveUserAvatar({
                          id: member.userId,
                          username: member.username,
                          nickname: member.nickname,
                          avatar: member.avatar,
                        })}
                        size="32px"
                      />
                      <div className="member-grid__info">
                        <div className="member-grid__name">{member.nickname || member.username}</div>
                        <div className="member-grid__email">{member.email || member.username}</div>
                      </div>
                      <Tag size="small" theme={roleConfig.theme} variant="light">{roleConfig.text}</Tag>
                      {canManageMembers && member.userId !== user?.id && member.role !== 'owner' && (
                        <Button size="small" theme="danger" variant="text" icon={<DeleteIcon />} onClick={() => handleRemoveMember(member)} />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      ) : null}

      {workspaceMode === 'team' && currentTeamId && !detail ? (
        <div className="teams-page__empty-panel">
          <Empty description="请选择一个团队" />
        </div>
      ) : null}

      <Dialog
        visible={createVisible}
        header="创建团队"
        confirmBtn={{ content: '创建', loading: submitting }}
        cancelBtn={{ content: '取消', disabled: submitting }}
        onClose={() => { setCreateVisible(false); setTeamAvatar(''); }}
        onConfirm={handleCreateTeam}
      >
        <div className="form">
          <div className="teams-page__team-avatar-row">
            <Avatar className="teams-page__create-team-avatar" image={teamAvatar || resolveTeamAvatar({ name: teamName || 'new-team', code: teamCode })} size="48px" />
            <Upload autoUpload={false} max={1} accept="image/*" onSelectChange={handleUploadTeamAvatar}>
              <Button size="small" variant="outline">上传头像</Button>
            </Upload>
          </div>
          <Input value={teamName} placeholder="团队名称" onChange={(value) => setTeamName(String(value ?? ''))} />
          <Input value={teamCode} placeholder="团队编码（可选）" onChange={(value) => setTeamCode(String(value ?? ''))} />
          <Input value={teamDescription} placeholder="团队描述（可选）" onChange={(value) => setTeamDescription(String(value ?? ''))} />
        </div>
      </Dialog>
    </div>
  );
};

export default TeamsPage;
