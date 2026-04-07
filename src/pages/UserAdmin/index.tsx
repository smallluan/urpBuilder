import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Avatar, Button, Dialog, Empty, Input, Select, Table, Tag } from 'tdesign-react';
import { DeleteIcon, LockOnIcon, RefreshIcon, SearchIcon } from 'tdesign-icons-react';
import type { PrimaryTableCol } from 'tdesign-react/es/table/type';
import { adminDeleteUserAccount, adminDisableUserAccount, adminEnableUserAccount, getAdminUserList } from '../../auth/api';
import type { AdminUserDisablePayload, AdminUserListParams, AuthUser } from '../../auth/types';
import { emitApiAlert } from '../../api/alertBus';
import { useAuth } from '../../auth/context';
import { resolveUserAvatar } from '../../utils/avatar';
import './style.less';

type UserRow = AuthUser & {
  displayName: string;
};

type DisablePresetUnit = 'hour' | 'day' | 'month';

const formatDateText = (value?: string) => {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('zh-CN', { hour12: false });
};

const resolveUserStatus = (value?: string) => {
  if (value === 'disabled') {
    return { text: '已禁用', theme: 'warning' as const };
  }

  if (value === 'deleted') {
    return { text: '已注销', theme: 'danger' as const };
  }

  return { text: '正常', theme: 'success' as const };
};

const formatDisableDetail = (row: UserRow) => {
  if (row.status !== 'disabled') {
    return '-';
  }

  if (row.disableType === 'timed' && row.disabledUntil) {
    return `定时至 ${formatDateText(row.disabledUntil)}`;
  }

  return '手动禁用';
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
  const roleSet = new Set((roles ?? []).map((item) => item.toLowerCase()));
  return roleSet.has('admin') || roleSet.has('super_admin') || roleSet.has('platform_admin') || roleSet.has('root');
};

const UserAdminPage: React.FC = () => {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'disabled' | 'deleted'>('all');
  const [loading, setLoading] = useState(false);
  const [tableData, setTableData] = useState<UserRow[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [disableTarget, setDisableTarget] = useState<UserRow | null>(null);
  const [disableMode, setDisableMode] = useState<'manual' | 'timed'>('manual');
  const [disableScheduleMode, setDisableScheduleMode] = useState<'duration' | 'until'>('duration');
  const [disableDurationValue, setDisableDurationValue] = useState('1');
  const [disableDurationUnit, setDisableDurationUnit] = useState<DisablePresetUnit>('day');
  const [disableUntil, setDisableUntil] = useState('');
  const [disableReason, setDisableReason] = useState('');
  const [disabling, setDisabling] = useState(false);
  const [enableTarget, setEnableTarget] = useState<UserRow | null>(null);
  const [enabling, setEnabling] = useState(false);

  const canManageUsers = isPlatformAdmin(user?.roles);

  const fetchUsers = useCallback(async (params: { page: number; pageSize: number; keyword?: string }) => {
    if (!canManageUsers) {
      setTableData([]);
      setTotal(0);
      return;
    }

    setLoading(true);
    try {
      const requestParams: AdminUserListParams = {
        ...params,
        status: statusFilter,
      };
      const result = await getAdminUserList(requestParams);
      const list = Array.isArray(result?.list) ? result.list : [];
      setTableData(list.map((item) => ({
        ...item,
        displayName: item.nickname || item.username || '-',
      })));
      setTotal(typeof result?.total === 'number' ? result.total : 0);
    } catch {
      setTableData([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [canManageUsers, statusFilter]);

  useEffect(() => {
    fetchUsers({
      page,
      pageSize,
      keyword: query.trim() || undefined,
    });
  }, [fetchUsers, page, pageSize, statusFilter]);

  const handleSearch = () => {
    setPage(1);
    fetchUsers({
      page: 1,
      pageSize,
      keyword: query.trim() || undefined,
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget?.id || deleting) {
      return;
    }

    setDeleting(true);
    try {
      await adminDeleteUserAccount(deleteTarget.id);
      emitApiAlert('注销成功', `账号 ${deleteTarget.username} 已注销`, 'success');
      setDeleteTarget(null);
      fetchUsers({
        page,
        pageSize,
        keyword: query.trim() || undefined,
      });
    } finally {
      setDeleting(false);
    }
  };

  const resetDisableForm = () => {
    setDisableMode('manual');
    setDisableScheduleMode('duration');
    setDisableDurationValue('1');
    setDisableDurationUnit('day');
    setDisableUntil('');
    setDisableReason('');
  };

  const handleConfirmDisable = async () => {
    if (!disableTarget?.id || disabling) {
      return;
    }

    const payload: AdminUserDisablePayload = {
      mode: disableMode,
      reason: disableReason.trim() || undefined,
    };

    if (disableMode === 'timed') {
      const disabledUntil = buildDisabledUntil(disableScheduleMode, disableScheduleMode === 'until' ? disableUntil : disableDurationValue, disableDurationUnit);
      if (!disabledUntil) {
        emitApiAlert('禁用失败', '请填写有效的禁用时长或截止时间');
        return;
      }
      payload.disabledUntil = disabledUntil;
    }

    setDisabling(true);
    try {
      await adminDisableUserAccount(disableTarget.id, payload);
      emitApiAlert('操作成功', `账号 ${disableTarget.username} 已禁用`, 'success');
      setDisableTarget(null);
      resetDisableForm();
      fetchUsers({ page, pageSize, keyword: query.trim() || undefined });
    } finally {
      setDisabling(false);
    }
  };

  const handleConfirmEnable = async () => {
    if (!enableTarget?.id || enabling) {
      return;
    }

    setEnabling(true);
    try {
      await adminEnableUserAccount(enableTarget.id);
      emitApiAlert('操作成功', `账号 ${enableTarget.username} 已恢复`, 'success');
      setEnableTarget(null);
      fetchUsers({ page, pageSize, keyword: query.trim() || undefined });
    } finally {
      setEnabling(false);
    }
  };

  const columns = useMemo<PrimaryTableCol<UserRow>[]>(() => [
    {
      colKey: 'displayName',
      title: '用户',
      minWidth: 220,
      cell: ({ row }) => (
        <div className="user-admin-page__user-cell">
          <Avatar
            className="user-admin-page__user-icon"
            image={resolveUserAvatar({
              id: row.id,
              username: row.username,
              nickname: row.nickname,
              avatar: row.avatar,
            })}
            size="24px"
          />
          <div className="user-admin-page__user-main">
            <span className="user-admin-page__user-name">{row.displayName}</span>
            <span className="user-admin-page__user-sub">{row.username}</span>
          </div>
        </div>
      ),
    },
    {
      colKey: 'email',
      title: '邮箱',
      minWidth: 220,
      cell: ({ row }) => row.email || '-',
    },
    {
      colKey: 'roles',
      title: '角色',
      minWidth: 180,
      cell: ({ row }) => {
        const roles = Array.isArray(row.roles) ? row.roles : [];
        if (roles.length === 0) {
          return '-';
        }

        return (
          <div className="user-admin-page__role-list">
            {roles.map((role) => (
              <Tag key={`${row.id}-${role}`} size="small" theme="primary" variant="light-outline">
                {role}
              </Tag>
            ))}
          </div>
        );
      },
    },
    {
      colKey: 'status',
      title: '状态',
      width: 120,
      cell: ({ row }) => {
        const status = resolveUserStatus(row.status);
        return (
          <Tag size="small" theme={status.theme} variant="light">
            {status.text}
          </Tag>
        );
      },
    },
    {
      colKey: 'disableDetail',
      title: '禁用信息',
      minWidth: 190,
      cell: ({ row }) => formatDisableDetail(row),
    },
    {
      colKey: 'createdAt',
      title: '创建时间',
      minWidth: 180,
      cell: ({ row }) => formatDateText(row.createdAt),
    },
    {
      colKey: 'operations',
      title: '操作',
      width: 320,
      fixed: 'right',
      cell: ({ row }) => (
        <div className="user-admin-page__action-row">
          {row.status === 'disabled' ? (
            <Button
              size="small"
              theme="success"
              variant="outline"
              disabled={!canManageUsers || row.id === user?.id}
              onClick={() => setEnableTarget(row)}
            >
              解禁
            </Button>
          ) : (
            <Button
              size="small"
              theme="warning"
              variant="outline"
              icon={<LockOnIcon />}
              disabled={!canManageUsers || row.id === user?.id || row.status === 'deleted'}
              onClick={() => setDisableTarget(row)}
            >
              禁用账号
            </Button>
          )}
          <Button
            size="small"
            theme="danger"
            variant="outline"
            icon={<DeleteIcon />}
            disabled={!canManageUsers || row.id === user?.id || row.status === 'deleted'}
            onClick={() => setDeleteTarget(row)}
          >
            注销账号
          </Button>
        </div>
      ),
    },
  ], [canManageUsers, user?.id]);

  const pagination = useMemo(
    () => ({
      current: page,
      pageSize,
      total,
      showJumper: true,
      showPageSize: true,
      onCurrentChange: (nextPage: number) => {
        setPage(nextPage);
      },
      onPageSizeChange: (nextPageSize: number) => {
        setPage(1);
        setPageSize(nextPageSize);
      },
    }),
    [page, pageSize, total],
  );

  if (!canManageUsers) {
    return (
      <div className="user-admin-page user-admin-page--empty">
        <Empty description="仅平台管理员可访问用户管理" />
      </div>
    );
  }

  return (
    <div className="user-admin-page app-shell-page">
      <div className="user-admin-page__toolbar app-shell-page__query">
        <div className="app-shell-page__query-inner">
        <Input
          size="small"
          placeholder="按用户名、昵称、邮箱搜索"
          value={query}
          onChange={(value) => setQuery(String(value ?? ''))}
          suffix={<SearchIcon />}
          clearable
          onEnter={handleSearch}
        />
        <Select
          size="small"
          value={statusFilter}
          options={[
            { label: '全部状态', value: 'all' },
            { label: '正常', value: 'active' },
            { label: '已禁用', value: 'disabled' },
            { label: '已注销', value: 'deleted' },
          ]}
          style={{ width: 140 }}
          onChange={(value) => {
            const nextStatus = value === 'active' || value === 'disabled' || value === 'deleted' ? value : 'all';
            setPage(1);
            setStatusFilter(nextStatus);
          }}
        />
        <Button size="small" theme="default" variant="outline" icon={<SearchIcon />} onClick={handleSearch}>
          查询
        </Button>
        <Button size="small" theme="default" variant="outline" icon={<RefreshIcon />} onClick={() => fetchUsers({ page, pageSize, keyword: query.trim() || undefined })}>
          刷新
        </Button>
        </div>
      </div>

      <div className="user-admin-page__table-wrap app-shell-page__body">
        <Table
          rowKey="id"
          className="user-admin-page__table"
          columns={columns}
          data={tableData}
          loading={loading}
          size="small"
          bordered={false}
          pagination={pagination}
          style={{ minWidth: '1120px' }}
        />
      </div>

      <Dialog
        visible={Boolean(disableTarget)}
        header="禁用账号"
        confirmBtn={{
          theme: 'warning',
          loading: disabling,
          content: '确认禁用',
        }}
        cancelBtn={{
          content: '取消',
          disabled: disabling,
        }}
        onClose={() => {
          setDisableTarget(null);
          resetDisableForm();
        }}
        onConfirm={handleConfirmDisable}
      >
        <div className="user-admin-page__dialog-form">
          <Select
            value={disableMode}
            options={[
              { label: '手动禁用', value: 'manual' },
              { label: '定时禁用', value: 'timed' },
            ]}
            onChange={(value) => setDisableMode(value === 'timed' ? 'timed' : 'manual')}
          />
          {disableMode === 'timed' ? (
            <>
              <Select
                value={disableScheduleMode}
                options={[
                  { label: '按时长', value: 'duration' },
                  { label: '截至指定时间', value: 'until' },
                ]}
                onChange={(value) => setDisableScheduleMode(value === 'until' ? 'until' : 'duration')}
              />
              {disableScheduleMode === 'duration' ? (
                <div className="user-admin-page__duration-row">
                  <Input value={disableDurationValue} onChange={(value) => setDisableDurationValue(String(value ?? ''))} />
                  <Select
                    value={disableDurationUnit}
                    options={[
                      { label: '小时', value: 'hour' },
                      { label: '天', value: 'day' },
                      { label: '月', value: 'month' },
                    ]}
                    onChange={(value) => setDisableDurationUnit(value === 'hour' || value === 'month' ? value : 'day')}
                  />
                </div>
              ) : (
                <input
                  className="user-admin-page__native-datetime"
                  type="datetime-local"
                  value={disableUntil}
                  onChange={(event) => setDisableUntil(event.target.value)}
                />
              )}
            </>
          ) : null}
          <Input
            value={disableReason}
            placeholder="禁用原因（可选）"
            onChange={(value) => setDisableReason(String(value ?? ''))}
          />
        </div>
      </Dialog>

      <Dialog
        visible={Boolean(enableTarget)}
        header="确认解禁账号"
        confirmBtn={{
          theme: 'success',
          loading: enabling,
          content: '确认解禁',
        }}
        cancelBtn={{
          content: '取消',
          disabled: enabling,
        }}
        onClose={() => setEnableTarget(null)}
        onConfirm={handleConfirmEnable}
      >
        <div>确认恢复账号“{enableTarget?.username || '-'}”吗？</div>
      </Dialog>

      <Dialog
        visible={Boolean(deleteTarget)}
        header="确认注销账号"
        confirmBtn={{
          theme: 'danger',
          loading: deleting,
          content: '确认注销',
        }}
        cancelBtn={{
          content: '取消',
          disabled: deleting,
        }}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      >
        <div>确认注销账号“{deleteTarget?.username || '-'}”吗？该操作不可恢复。</div>
      </Dialog>
    </div>
  );
};

export default UserAdminPage;
