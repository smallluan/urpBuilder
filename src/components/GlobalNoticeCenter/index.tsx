import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Badge, Button, Dialog, Drawer, MessagePlugin, Space, Tabs, Tag } from 'tdesign-react';
import { MailIcon, RefreshIcon } from 'tdesign-icons-react';
import { emitApiAlert } from '../../api/alertBus';
import {
  listPlatformBroadcasts,
  markPlatformBroadcastRead,
  type PlatformBroadcastDTO,
} from '../../api/platformBroadcast';
import { useAuth } from '../../auth/context';
import { useTeam } from '../../team/context';
import type { TeamInvitation } from '../../team/types';
import './style.less';

const { TabPanel } = Tabs;
const READ_STORAGE_PREFIX = 'urp-builder-message-read';

/** 抽屉标题：邮箱造型 + 信封（品牌渐变） */
const MessageCenterMailboxIcon: React.FC = () => {
  const uid = React.useId().replace(/:/g, '');
  return (
    <svg
      className="global-notice-center__header-mail-icon"
      width="28"
      height="28"
      viewBox="0 0 32 32"
      aria-hidden
    >
      <defs>
        <linearGradient id={`${uid}-m`} x1="4" y1="5" x2="28" y2="27" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0034a8" />
          <stop offset="0.5" stopColor="#0052d9" />
          <stop offset="1" stopColor="#5d9eff" />
        </linearGradient>
      </defs>
      <path fill={`url(#${uid}-m)`} d="M4 14 L16 5 L28 14 V27 H4 Z" opacity={0.96} />
      <rect x="7" y="15" width="18" height="11" rx="1.2" fill="#fff" opacity={0.98} />
      <path
        fill="none"
        stroke="#0052d9"
        strokeWidth="1.05"
        strokeLinejoin="round"
        d="M7 15 L16 21 L25 15"
      />
    </svg>
  );
};

type TeamInvitationMessage = {
  category: 'team_invitation';
  id: string;
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

type PlatformBroadcastMessage = {
  category: 'platform_broadcast';
  id: string;
  title: string;
  description: string;
  body: string;
  senderName?: string;
  createdAt?: string;
  read: boolean;
  raw: PlatformBroadcastDTO;
};

type MessageItem = TeamInvitationMessage | PlatformBroadcastMessage;

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

const welcomeUnreadToastShownUserIds = new Set<string>();
let welcomeUnreadToastMutex: Promise<void> = Promise.resolve();

const enqueueWelcomeUnreadToast = (userId: string, unreadCount: number) => {
  welcomeUnreadToastMutex = welcomeUnreadToastMutex
    .then(() => {
      if (welcomeUnreadToastShownUserIds.has(userId)) {
        return;
      }
      welcomeUnreadToastShownUserIds.add(userId);
      MessagePlugin.info({
        content: `你有 ${unreadCount} 条未读消息，点击右上角消息中心查看`,
        duration: 4000,
        closeBtn: true,
      });
    })
    .catch(() => {
      // keep chain
    });
};

const GlobalNoticeCenter: React.FC = () => {
  const { user } = useAuth();
  const { getMyInvitations, getMySentInvitations, respondInvitation, refreshTeams } = useTeam();
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'unread' | 'read' | 'sent'>('unread');
  const [received, setReceived] = useState<TeamInvitation[]>([]);
  const [sent, setSent] = useState<TeamInvitation[]>([]);
  const [broadcasts, setBroadcasts] = useState<PlatformBroadcastDTO[]>([]);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [detailMessage, setDetailMessage] = useState<MessageItem | null>(null);
  const [readIds, setReadIds] = useState<string[]>([]);
  const notifiedCountRef = useRef(0);
  const readIdsRef = useRef(readIds);
  readIdsRef.current = readIds;
  /** 上一轮拉取已知的广播 id，用于识别「新出现的系统通知」 */
  const knownBroadcastIdsRef = useRef<Set<string>>(new Set());
  const broadcastInitialFetchDoneRef = useRef(false);

  useEffect(() => {
    setReadIds(readStoredIds(user?.id));
  }, [user?.id]);

  useEffect(() => {
    knownBroadcastIdsRef.current = new Set();
    broadcastInitialFetchDoneRef.current = false;
  }, [user?.id]);

  useEffect(() => {
    writeStoredIds(user?.id, readIds);
  }, [readIds, user?.id]);

  const readIdSet = useMemo(() => new Set(readIds), [readIds]);

  const receivedMessages = useMemo<TeamInvitationMessage[]>(() => {
    return received.map((item) => ({
      category: 'team_invitation',
      id: item.id,
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
    }));
  }, [received]);

  const platformMessages = useMemo<PlatformBroadcastMessage[]>(() => {
    return broadcasts.map((item) => ({
      category: 'platform_broadcast',
      id: item.id,
      title: item.title,
      description: item.body.length > 220 ? `${item.body.slice(0, 220)}…` : item.body,
      body: item.body,
      senderName: item.createdByName,
      createdAt: item.createdAt,
      read: item.read,
      raw: item,
    }));
  }, [broadcasts]);

  const sentMessages = useMemo<TeamInvitationMessage[]>(() => {
    return sent.map((item) => ({
      category: 'team_invitation',
      id: item.id,
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
    }));
  }, [sent]);

  const unreadMessages = useMemo(() => {
    const teamUnread = receivedMessages.filter((item) => item.status === 'pending' && !readIdSet.has(item.id));
    const platformUnread = platformMessages.filter((item) => !item.read);
    return sortMessages([...teamUnread, ...platformUnread]);
  }, [readIdSet, receivedMessages, platformMessages]);

  const readMessages = useMemo(() => {
    const teamRead = receivedMessages.filter((item) => item.status !== 'pending' || readIdSet.has(item.id));
    const platformRead = platformMessages.filter((item) => item.read);
    return sortMessages([...teamRead, ...platformRead]);
  }, [readIdSet, receivedMessages, platformMessages]);

  const unreadTotal = unreadMessages.length;

  const loadMessages = useCallback(async (options?: { notifyWelcomeUnread?: boolean; notifyIncrease?: boolean }) => {
    setLoading(true);
    try {
      const [mine, mySent, list] = await Promise.all([
        getMyInvitations(),
        getMySentInvitations(),
        listPlatformBroadcasts().catch(() => [] as PlatformBroadcastDTO[]),
      ]);
      setReceived(mine);
      setSent(mySent);
      setBroadcasts(list);

      const rid = readIdsRef.current;
      const nextUnread =
        mine.filter((item) => item.status === 'pending' && !rid.includes(item.id)).length
        + list.filter((b) => !b.read).length;

      const previousCount = notifiedCountRef.current;

      const currentBroadcastIds = new Set(list.map((b) => b.id));
      const prevKnownBroadcastIds = knownBroadcastIdsRef.current;
      let showedSystemBroadcastToast = false;
      const isFirstBroadcastFetch = !broadcastInitialFetchDoneRef.current;
      if (isFirstBroadcastFetch) {
        broadcastInitialFetchDoneRef.current = true;
      } else {
        const newlyAppearedBroadcastIds = [...currentBroadcastIds].filter((id) => !prevKnownBroadcastIds.has(id));
        if (newlyAppearedBroadcastIds.length > 0) {
          showedSystemBroadcastToast = true;
          MessagePlugin.info({
            content: '您收到一条系统通知',
            duration: 4000,
            closeBtn: true,
          });
        }
      }
      knownBroadcastIdsRef.current = currentBroadcastIds;

      if (options?.notifyWelcomeUnread && nextUnread > 0 && user?.id) {
        enqueueWelcomeUnreadToast(user.id, nextUnread);
      }

      if (
        options?.notifyIncrease
        && previousCount > 0
        && nextUnread > previousCount
        && !showedSystemBroadcastToast
      ) {
        MessagePlugin.info({
          content: `你有新消息：当前未读 ${nextUnread} 条，点击右上角消息中心查看`,
          duration: 3500,
          closeBtn: true,
        });
      }

      notifiedCountRef.current = nextUnread;
    } finally {
      setLoading(false);
    }
  }, [getMyInvitations, getMySentInvitations, user?.id]);

  useEffect(() => {
    if (!user?.id) {
      welcomeUnreadToastShownUserIds.clear();
      return undefined;
    }

    loadMessages({ notifyWelcomeUnread: true }).catch(() => {
      // noop
    });

    const timer = window.setInterval(() => {
      loadMessages({ notifyIncrease: true }).catch(() => {
        // noop
      });
    }, 30000);

    return () => {
      window.clearInterval(timer);
    };
  }, [loadMessages, user?.id]);

  const openDrawer = async () => {
    setVisible(true);
    await loadMessages();
  };

  const updateTeamReadState = (messageId: string, shouldRead: boolean) => {
    setReadIds((previous) => {
      const next = shouldRead
        ? Array.from(new Set([...previous, messageId]))
        : previous.filter((item) => item !== messageId);
      return next;
    });
  };

  const handleMarkPlatformRead = async (broadcastId: string) => {
    try {
      await markPlatformBroadcastRead(broadcastId);
      setBroadcasts((prev) => prev.map((b) => (b.id === broadcastId ? { ...b, read: true } : b)));
    } catch {
      emitApiAlert('操作失败', '标记已读失败', 'error');
    }
  };

  const handleRespond = async (invitationId: string, action: 'accept' | 'reject') => {
    setRespondingId(invitationId);
    try {
      await respondInvitation(invitationId, action);
      emitApiAlert('处理成功', action === 'accept' ? '已接受邀请' : '已拒绝邀请', 'success');
      updateTeamReadState(invitationId, true);
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

  const renderMessageItem = (message: MessageItem, mode: 'unread' | 'read' | 'sent') => {
    const isUnread = mode === 'unread';
    const actionLoading = respondingId === message.id;

    if (message.category === 'platform_broadcast') {
      return (
        <div
          key={`${mode}-pb-${message.id}`}
          className={`global-notice-center__item global-notice-center__item--platform ${isUnread ? 'is-unread' : ''}`}
        >
          <div className="global-notice-center__item-toolbar">
            <div className="global-notice-center__item-flags">
              <Tag size="small" theme="primary" variant="light-outline">
                系统通知
              </Tag>
              <Tag size="small" theme="default" variant="light-outline">
                广播
              </Tag>
              {isUnread ? <span className="global-notice-center__item-dot">未读</span> : null}
            </div>
            <time className="global-notice-center__item-time" dateTime={message.createdAt}>
              {formatTime(message.createdAt)}
            </time>
          </div>
          <div className="global-notice-center__item-title">{message.title}</div>
          <div className="global-notice-center__item-desc">{message.description}</div>
          <div className="global-notice-center__item-bottom">
            <span className="global-notice-center__item-sender">{message.senderName || '管理员'}</span>
            <Space size={4} className="global-notice-center__item-actions" align="center">
              <Button variant="text" size="small" onClick={() => setDetailMessage(message)}>
                详情
              </Button>
              {mode === 'unread' ? (
                <Button
                  variant="text"
                  size="small"
                  onClick={() => {
                    void handleMarkPlatformRead(message.id);
                  }}
                >
                  已读
                </Button>
              ) : null}
            </Space>
          </div>
        </div>
      );
    }

    return (
      <div
        key={`${mode}-${message.id}`}
        className={`global-notice-center__item global-notice-center__item--invite ${isUnread ? 'is-unread' : ''}`}
      >
        <div className="global-notice-center__item-toolbar">
          <div className="global-notice-center__item-flags">
            <Tag size="small" theme="default" variant="light-outline">
              团队邀请
            </Tag>
            <Tag size="small" theme={statusThemeMap[message.status]} variant="light-outline">
              {statusTextMap[message.status]}
            </Tag>
            {isUnread ? <span className="global-notice-center__item-dot">未读</span> : null}
          </div>
          <time className="global-notice-center__item-time" dateTime={message.createdAt}>
            {formatTime(message.createdAt)}
          </time>
        </div>
        <div className="global-notice-center__item-title">{message.title}</div>
        <div className="global-notice-center__item-desc">{message.description}</div>
        <div className="global-notice-center__item-bottom">
          <span className="global-notice-center__item-sender">{message.teamName}</span>
          <Space size={4} className="global-notice-center__item-actions" align="center">
            <Button variant="text" size="small" onClick={() => setDetailMessage(message)}>
              详情
            </Button>
            {mode !== 'sent' ? (
              <Button variant="text" size="small" onClick={() => updateTeamReadState(message.id, mode === 'unread')}>
                {mode === 'unread' ? '标已读' : '标未读'}
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
      </div>
    );
  };

  const renderMessageList = (items: MessageItem[], mode: 'unread' | 'read' | 'sent') => {
    if (loading) {
      return <div className="global-notice-center__empty">加载中...</div>;
    }

    if (!items.length) {
      return <div className="global-notice-center__empty">暂无消息</div>;
    }

    return <div className="global-notice-center__list">{items.map((item) => renderMessageItem(item, mode))}</div>;
  };

  return (
    <>
      <Badge count={unreadTotal} className="global-notice-center__badge">
        <MailIcon size={20} onClick={openDrawer}/>
      </Badge>
      <Drawer
        visible={visible}
        placement="right"
        size="400px"
        header={(
          <div className="global-notice-center__drawer-header">
            <MessageCenterMailboxIcon />
            <span className="global-notice-center__drawer-title">消息中心</span>
            <Button
              variant="text"
              shape="square"
              className="global-notice-center__drawer-refresh"
              icon={<RefreshIcon />}
              loading={loading}
              onClick={() => {
                void loadMessages();
              }}
            />
          </div>
        )}
        onClose={() => setVisible(false)}
        footer={false}
        className="global-notice-center__drawer"
      >
        <Tabs
          value={activeTab}
          onChange={(value) => setActiveTab(String(value) as 'unread' | 'read' | 'sent')}
          size="medium"
          theme="card"
          className="global-notice-center__tabs"
        >
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

      <Dialog
        visible={Boolean(detailMessage)}
        header="消息详情"
        confirmBtn={{ content: '知道了' }}
        cancelBtn={null}
        onConfirm={() => setDetailMessage(null)}
        onClose={() => setDetailMessage(null)}
      >
        {detailMessage?.category === 'platform_broadcast' ? (
          <div className="global-notice-center__detail">
            <div className="global-notice-center__detail-title">{detailMessage.title}</div>
            <div className="global-notice-center__detail-desc" style={{ whiteSpace: 'pre-wrap' }}>{detailMessage.body}</div>
            <div className="global-notice-center__detail-grid">
              <div>类型：系统广播</div>
              <div>发送方：{detailMessage.senderName || '管理员'}</div>
              <div>时间：{formatTime(detailMessage.createdAt)}</div>
            </div>
          </div>
        ) : detailMessage?.category === 'team_invitation' ? (
          <div className="global-notice-center__detail">
            <div className="global-notice-center__detail-title">{detailMessage.title}</div>
            <div className="global-notice-center__detail-desc">{detailMessage.description}</div>
            <div className="global-notice-center__detail-grid">
              <div>团队：{detailMessage.teamName}</div>
              <div>角色：{roleTextMap[detailMessage.role]}</div>
              <div>发起人：{renderPerson(detailMessage.sourceName, detailMessage.sourceUserId)}</div>
              <div>接收人：{renderPerson(detailMessage.targetName, detailMessage.targetUserId)}</div>
              <div>状态：{statusTextMap[detailMessage.status]}</div>
              <div>时间：{formatTime(detailMessage.createdAt)}</div>
            </div>
          </div>
        ) : null}
      </Dialog>
    </>
  );
};

export default GlobalNoticeCenter;
