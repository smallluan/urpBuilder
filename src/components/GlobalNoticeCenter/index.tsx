import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Badge, Button, Drawer, MessagePlugin, Space, Tabs, Tag } from 'tdesign-react';
import { MailIcon, RefreshIcon } from 'tdesign-icons-react';
import { emitApiAlert } from '../../api/alertBus';
import { useAuth } from '../../auth/context';
import { useTeam } from '../../team/context';
import type { TeamInvitation } from '../../team/types';
import './style.less';

const { TabPanel } = Tabs;
const READ_STORAGE_PREFIX = 'urp-builder-message-read';

type MessageCategory = 'team_invitation';

type MessageItem = {
  id: string;
  category: MessageCategory;
  title: string;
  description: string;
  sourceName: string;
  targetName: string;
  sourceUserId?: string;
  targetUserId?: string;
  teamName: string;
  role: TeamInvitation['role'];
  status: TeamInvitation['status'];
  createdAt?: string;
  raw: TeamInvitation;
};

const roleTextMap: Record<TeamInvitation['role'], string> = {
  admin: '管理员',
  member: '成员',
};

const statusTextMap: Record<TeamInvitation['status'], string> = {
  pending: '待处理',
  accepted: '已接受',
  rejected: '已拒绝',
  canceled: '已取消',
  expired: '已过期',
};

const statusThemeMap: Record<TeamInvitation['status'], 'primary' | 'success' | 'danger' | 'warning' | 'default'> = {
  pending: 'warning',
  accepted: 'success',
  rejected: 'danger',
  canceled: 'default',
  expired: 'default',
};

const getReadStorageKey = (userId?: string) => `${READ_STORAGE_PREFIX}:${userId || 'anonymous'}`;

const readStoredIds = (userId?: string): string[] => {
  if (!userId) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(getReadStorageKey(userId));
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
};

const writeStoredIds = (userId: string | undefined, ids: string[]) => {
  if (!userId) {
    return;
  }

  try {
    window.localStorage.setItem(getReadStorageKey(userId), JSON.stringify(ids));
  } catch {
    // noop
  }
};

const formatTime = (value?: string) => {
  if (!value) {
    return '--';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
};

const sortMessages = (items: MessageItem[]) => {
  return [...items].sort((left, right) => {
    const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
    const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0;
    return rightTime - leftTime;
  });
};

const GlobalNoticeCenter: React.FC = () => {
  const { user } = useAuth();
  const { getMyInvitations, getMySentInvitations, respondInvitation, refreshTeams } = useTeam();
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [received, setReceived] = useState<TeamInvitation[]>([]);
  const [sent, setSent] = useState<TeamInvitation[]>([]);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [readIds, setReadIds] = useState<string[]>([]);
  const notifiedCountRef = useRef(0);

  useEffect(() => {
    setReadIds(readStoredIds(user?.id));
  }, [user?.id]);

  useEffect(() => {
    writeStoredIds(user?.id, readIds);
  }, [readIds, user?.id]);

  const readIdSet = useMemo(() => new Set(readIds), [readIds]);

  const receivedMessages = useMemo<MessageItem[]>(() => {
    return sortMessages(received.map((item) => ({
      id: item.id,
      category: 'team_invitation',
      title: `${item.teamName || item.teamId} 团队邀请`,
      description: `${item.inviterName || '某成员'} 邀请你以${roleTextMap[item.role]}身份加入 ${item.teamName || item.teamId}`,
      sourceName: item.inviterName || '-',
      targetName: item.inviteeName || item.inviteeIdentity || '-',
      sourceUserId: item.inviterId,
      targetUserId: item.inviteeUserId,
      teamName: item.teamName || item.teamId,
      role: item.role,
      status: item.status,
      createdAt: item.createdAt,
      raw: item,
    })));
  }, [received]);

  const sentMessages = useMemo<MessageItem[]>(() => {
    return sortMessages(sent.map((item) => ({
      id: item.id,
      category: 'team_invitation',
      title: `${item.teamName || item.teamId} 团队邀请`,
      description: `你邀请 ${item.inviteeName || item.inviteeIdentity || '对方'} 以${roleTextMap[item.role]}身份加入 ${item.teamName || item.teamId}`,
      sourceName: item.inviterName || '-',
      targetName: item.inviteeName || item.inviteeIdentity || '-',
      sourceUserId: item.inviterId,
      targetUserId: item.inviteeUserId,
      teamName: item.teamName || item.teamId,
      role: item.role,
      status: item.status,
      createdAt: item.createdAt,
      raw: item,
    })));
  }, [sent]);

  const unreadMessages = useMemo(() => {
    return receivedMessages.filter((item) => item.status === 'pending' && !readIdSet.has(item.id));
  }, [readIdSet, receivedMessages]);

  const readMessages = useMemo(() => {
    return receivedMessages.filter((item) => item.status !== 'pending' || readIdSet.has(item.id));
  }, [readIdSet, receivedMessages]);

  const syncUnreadCount = useCallback((items: TeamInvitation[], knownReadIds = readIdSet) => {
    const nextCount = items.filter((item) => item.status === 'pending' && !knownReadIds.has(item.id)).length;
    setPendingCount(nextCount);
    return nextCount;
  }, [readIdSet]);

  const refreshPendingSummary = useCallback(async (showToastForIncrease = false) => {
    const mine = await getMyInvitations();
    setReceived(mine);
    const nextCount = syncUnreadCount(mine);

    const previousCount = notifiedCountRef.current;
    if (showToastForIncrease && nextCount > previousCount) {
      MessagePlugin.info(`你有 ${nextCount} 条未读消息`);
    }
    notifiedCountRef.current = nextCount;

    return mine;
  }, [getMyInvitations, syncUnreadCount]);

  const loadMessages = useCallback(async () => {
    setLoading(true);
    try {
      const [mine, mySent] = await Promise.all([
        getMyInvitations(),
        getMySentInvitations(),
      ]);
      setReceived(mine);
      setSent(mySent);
      const nextCount = syncUnreadCount(mine);
      notifiedCountRef.current = nextCount;
    } finally {
      setLoading(false);
    }
  }, [getMyInvitations, getMySentInvitations, syncUnreadCount]);

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      try {
        const mine = await refreshPendingSummary(false);
        if (!active) {
          return;
        }
        const initialUnread = mine.filter((item) => item.status === 'pending' && !readIdSet.has(item.id)).length;
        if (initialUnread > 0) {
          MessagePlugin.info(`你有 ${initialUnread} 条未读消息`);
        }
      } catch {
        // noop
      }
    };

    bootstrap();

    const timer = window.setInterval(() => {
      refreshPendingSummary(true).catch(() => {
        // noop
      });
    }, 30000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [readIdSet, refreshPendingSummary]);

  const openDrawer = async () => {
    setVisible(true);
    await loadMessages();
  };

  const updateReadState = (messageId: string, shouldRead: boolean) => {
    setReadIds((previous) => {
      const next = shouldRead
        ? Array.from(new Set([...previous, messageId]))
        : previous.filter((item) => item !== messageId);

      const nextSet = new Set(next);
      syncUnreadCount(received, nextSet);
      notifiedCountRef.current = received.filter((item) => item.status === 'pending' && !nextSet.has(item.id)).length;

      return next;
    });
  };

  const handleRespond = async (invitationId: string, action: 'accept' | 'reject') => {
    setRespondingId(invitationId);
    try {
      await respondInvitation(invitationId, action);
      emitApiAlert('处理成功', action === 'accept' ? '已接受邀请' : '已拒绝邀请', 'success');
      updateReadState(invitationId, true);
      await Promise.all([loadMessages(), refreshTeams()]);
    } finally {
      setRespondingId(null);
    }
  };

  const renderPerson = (name: string, userId?: string) => {
    return (
      <span className="global-notice-center__inline-user">
        <span>{name}</span>
        {userId === user?.id ? <Tag size="small" theme="primary" variant="light">我</Tag> : null}
      </span>
    );
  };

  const renderMessageCard = (message: MessageItem, mode: 'unread' | 'read' | 'sent') => {
    const isUnread = mode === 'unread';
    const actionLoading = respondingId === message.id;

    return (
      <article key={`${mode}-${message.id}`} className={`global-notice-center__card global-notice-center__card--${message.category} ${isUnread ? 'is-unread' : 'is-read'}`}>
        <div className="global-notice-center__card-head">
          <div className="global-notice-center__card-flags">
            <Tag size="small" theme="default" variant="light-outline">团队邀请</Tag>
            {isUnread ? <span className="global-notice-center__card-dot">未读</span> : null}
          </div>
          <Tag size="small" theme={statusThemeMap[message.status]} variant="light-outline">
            {statusTextMap[message.status]}
          </Tag>
        </div>
        <div className="global-notice-center__card-title">{message.title}</div>
        <div className="global-notice-center__card-desc">{message.description}</div>
        <div className="global-notice-center__card-meta">
          <span>发起人 {renderPerson(message.sourceName, message.sourceUserId)}</span>
          <span>接收人 {renderPerson(message.targetName, message.targetUserId)}</span>
          <span>角色 {roleTextMap[message.role]}</span>
          <span>{formatTime(message.createdAt)}</span>
        </div>
        <div className="global-notice-center__card-footer">
          <span className="global-notice-center__card-team">{message.teamName}</span>
          <Space size={8}>
            {mode !== 'sent' ? (
              <Button variant="text" size="small" onClick={() => updateReadState(message.id, mode === 'unread')}>
                {mode === 'unread' ? '标为已读' : '标为未读'}
              </Button>
            ) : null}
            {message.category === 'team_invitation' && mode !== 'sent' && message.status === 'pending' ? (
              <>
                <Button size="small" theme="primary" loading={actionLoading} onClick={() => handleRespond(message.raw.id, 'accept')}>
                  接受
                </Button>
                <Button size="small" variant="outline" theme="danger" loading={actionLoading} onClick={() => handleRespond(message.raw.id, 'reject')}>
                  拒绝
                </Button>
              </>
            ) : null}
          </Space>
        </div>
      </article>
    );
  };

  const renderMessageList = (items: MessageItem[], mode: 'unread' | 'read' | 'sent') => {
    if (loading) {
      return <div className="global-notice-center__empty">加载中...</div>;
    }

    if (!items.length) {
      return <div className="global-notice-center__empty">暂无消息</div>;
    }

    return <div className="global-notice-center__list">{items.map((item) => renderMessageCard(item, mode))}</div>;
  };

  return (
    <>
      <Badge count={pendingCount} className="global-notice-center__badge">
        <Button variant="text" shape="circle" icon={<MailIcon />} title="消息中心" onClick={openDrawer} />
      </Badge>

      <Drawer
        visible={visible}
        placement="right"
        size="540px"
        header={(
          <div className="global-notice-center__drawer-header">
            <div>
              <div className="global-notice-center__drawer-title">消息中心</div>
              <div className="global-notice-center__drawer-subtitle">{pendingCount} 条未读</div>
            </div>
            <Button variant="text" shape="circle" icon={<RefreshIcon />} loading={loading} onClick={loadMessages} />
          </div>
        )}
        onClose={() => setVisible(false)}
        footer={false}
        className="global-notice-center__drawer"
      >
        <Tabs defaultValue="unread" size="medium" className="global-notice-center__tabs">
          <TabPanel value="unread" label={`未读 ${unreadMessages.length}`}>
            {renderMessageList(unreadMessages, 'unread')}
          </TabPanel>
          <TabPanel value="read" label={`已读 ${readMessages.length}`}>
            {renderMessageList(readMessages, 'read')}
          </TabPanel>
          <TabPanel value="sent" label={`已发 ${sentMessages.length}`}>
            {renderMessageList(sentMessages, 'sent')}
          </TabPanel>
        </Tabs>
      </Drawer>
    </>
  );
};

export default GlobalNoticeCenter;
