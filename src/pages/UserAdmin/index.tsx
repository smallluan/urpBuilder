import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Dialog, Empty, Input, Select, Table, Tag } from 'tdesign-react';
import { DeleteIcon, RefreshIcon, SearchIcon, UserIcon } from 'tdesign-icons-react';
import type { PrimaryTableCol } from 'tdesign-react/es/table/type';
import { adminDeleteUserAccount, getAdminUserList } from '../../auth/api';
import type { AdminUserListParams, AuthUser } from '../../auth/types';
import { emitApiAlert } from '../../api/alertBus';
import { useAuth } from '../../auth/context';
import './style.less';

type UserRow = AuthUser & {
  displayName: string;
};

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

  const columns = useMemo<PrimaryTableCol<UserRow>[]>(() => [
    {
      colKey: 'displayName',
      title: '用户',
      minWidth: 220,
      cell: ({ row }) => (
        <div className="user-admin-page__user-cell">
          <span className="user-admin-page__user-icon"><UserIcon size="small" /></span>
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
      colKey: 'createdAt',
      title: '创建时间',
      minWidth: 180,
      cell: ({ row }) => formatDateText(row.createdAt),
    },
    {
      colKey: 'operations',
      title: '操作',
      width: 140,
      fixed: 'right',
      cell: ({ row }) => (
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
    <div className="user-admin-page">
      <div className="user-admin-page__toolbar">
        <Input
          placeholder="按用户名、昵称、邮箱搜索"
          value={query}
          onChange={(value) => setQuery(String(value ?? ''))}
          suffix={<SearchIcon />}
          clearable
          onEnter={handleSearch}
        />
        <Select
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
        <Button theme="default" variant="outline" icon={<SearchIcon />} onClick={handleSearch}>
          查询
        </Button>
        <Button theme="default" variant="outline" icon={<RefreshIcon />} onClick={() => fetchUsers({ page, pageSize, keyword: query.trim() || undefined })}>
          刷新
        </Button>
      </div>

      <div className="user-admin-page__table-wrap">
        <Table
          rowKey="id"
          className="user-admin-page__table"
          columns={columns}
          data={tableData}
          loading={loading}
          pagination={pagination}
          style={{ minWidth: '1120px' }}
        />
      </div>

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
