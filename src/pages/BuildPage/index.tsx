import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Input, Button, Dialog, Select, Table, Tag } from 'tdesign-react';
import { AddIcon, SearchIcon, EditIcon, DeleteIcon, BrowseIcon, UserIcon } from 'tdesign-icons-react';
import type { PrimaryTableCol } from 'tdesign-react/es/table/type';
import {
  deletePageTemplate,
  getPageTemplateBaseList,
  publishPage,
  updatePageVisibility,
  withdrawPageToDraft,
} from '../../api/pageTemplate';
import type { PageTemplateBaseInfo, ResourceVisibility, TemplateStatus } from '../../api/types';
import { emitApiAlert } from '../../api/alertBus';
import { useAuth } from '../../auth/context';
import './style.less';

interface PageTemplateRow {
  id: string;
  pageId: string;
  pageName: string;
  ownerId: string;
  ownerName: string;
  visibility: string;
  status: PageTemplateBaseInfo['status'];
  currentVersion: number;
  routePath: string;
  pageTitle: string;
  menuTitle: string;
  useLayout: string;
  updatedAt: string;
}

const isValidTemplateId = (value: string) => {
  const normalized = value.trim().toLowerCase();
  return Boolean(normalized) && normalized !== 'undefined' && normalized !== 'null' && normalized !== '-';
};

const toSafeText = (value: unknown) => {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (value === null || value === undefined) {
    return '-';
  }

  try {
    return JSON.stringify(value);
  } catch {
    return '-';
  }
};

const toDisplayDate = (value?: unknown) => {
  if (!value) {
    return '-';
  }

  if (typeof value !== 'string' && typeof value !== 'number') {
    return toSafeText(value);
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return toSafeText(value);
  }

  return date.toLocaleString('zh-CN', { hour12: false });
};

const splitDateTimeText = (value: string) => {
  const normalized = String(value || '').trim();
  if (!normalized || normalized === '-') {
    return { date: '-', time: '' };
  }

  const firstSpaceIndex = normalized.indexOf(' ');
  if (firstSpaceIndex < 0) {
    return { date: normalized, time: '' };
  }

  return {
    date: normalized.slice(0, firstSpaceIndex),
    time: normalized.slice(firstSpaceIndex + 1),
  };
};

const BuildPage: React.FC = () => {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [tableData, setTableData] = useState<PageTemplateRow[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [scope, setScope] = useState<'mine' | 'all'>('mine');
  const [statusFilter, setStatusFilter] = useState<'all' | TemplateStatus>('all');
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | ResourceVisibility>('all');
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [visibilityChangingId, setVisibilityChangingId] = useState<string | null>(null);
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PageTemplateRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchPageList = useCallback(async (params: { page: number; pageSize: number; pageName?: string }) => {
    setLoading(true);
    try {
      const result = await getPageTemplateBaseList({
        ...params,
        mine: scope === 'mine',
        status: statusFilter === 'all' ? undefined : statusFilter,
        visibility: visibilityFilter === 'all' ? undefined : visibilityFilter,
      });
      const rawList = Array.isArray(result.data?.list) ? result.data.list : [];
      const nextList = rawList.map((item) => ({
        id: toSafeText(item.pageId),
        pageId: toSafeText(item.pageId),
        pageName: toSafeText(item.pageName),
        ownerId: toSafeText(item.ownerId),
        ownerName: toSafeText(item.ownerName || '-'),
        visibility: item.visibility === 'public' ? '公开' : '私有',
        status: (item.status === 'published' ? 'published' : 'draft') as PageTemplateRow['status'],
        currentVersion: typeof item.currentVersion === 'number' ? item.currentVersion : Number(item.currentVersion) || 0,
        routePath: toSafeText(item.routeConfig?.routePath || '-'),
        pageTitle: toSafeText(item.routeConfig?.pageTitle || '-'),
        menuTitle: toSafeText(item.routeConfig?.menuTitle || '-'),
        useLayout: item.routeConfig?.useLayout === false ? '否' : '是',
        updatedAt: toDisplayDate(item.updatedAt),
      }));

      setTableData(nextList);
      setTotal(typeof result.data?.total === 'number' ? result.data.total : Number(result.data?.total) || 0);
    } catch {
      setTableData([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [scope, statusFilter, visibilityFilter]);

  useEffect(() => {
    fetchPageList({
      page,
      pageSize,
      pageName: query.trim() || undefined,
    });
  }, [fetchPageList, page, pageSize, scope, statusFilter, visibilityFilter]);

  const canManageRow = (row: PageTemplateRow) => !row.ownerId || !user?.id || row.ownerId === user.id;

  const handleSearch = () => {
    setPage(1);
    fetchPageList({
      page: 1,
      pageSize,
      pageName: query.trim() || undefined,
    });
  };

  const handleCreate = () => {
    const url = `${window.location.origin}/create-page`;
    window.open(url, '_blank');
  };

  const handlePreview = (row: PageTemplateRow) => {
    if (!isValidTemplateId(row.pageId)) {
      emitApiAlert('操作失败', '当前记录缺少有效页面 ID，无法预览');
      return;
    }

    const routePath = row.routePath !== '-' ? row.routePath : '';
    const previewUrl = new URL(routePath ? `/site-preview${routePath}` : '/preview-engine', window.location.origin);
    previewUrl.searchParams.set('pageId', row.pageId);
    previewUrl.searchParams.set('entityType', 'page');
    window.open(previewUrl.toString(), '_blank');
  };

  const handleEdit = (row: PageTemplateRow) => {
    if (!isValidTemplateId(row.pageId)) {
      emitApiAlert('操作失败', '当前记录缺少有效页面 ID，无法进入编辑');
      return;
    }

    const editUrl = `${window.location.origin}/create-page?id=${encodeURIComponent(row.pageId)}`;
    window.open(editUrl, '_blank');
  };

  const handleDelete = (row: PageTemplateRow) => {
    setDeleteTarget(row);
  };

  const handlePublish = async (row: PageTemplateRow) => {
    if (!isValidTemplateId(row.pageId) || publishingId) {
      return;
    }

    setPublishingId(row.pageId);
    try {
      await publishPage({ pageId: row.pageId });
      emitApiAlert('发布成功', `页面 ${row.pageName} 已发布`, 'success');
      fetchPageList({
        page,
        pageSize,
        pageName: query.trim() || undefined,
      });
    } finally {
      setPublishingId(null);
    }
  };

  const handleToggleVisibility = async (row: PageTemplateRow) => {
    if (!isValidTemplateId(row.pageId) || visibilityChangingId || row.status !== 'published') {
      if (row.status !== 'published') {
        emitApiAlert('操作失败', '草稿页面不可设为公开，请先发布');
      }
      return;
    }

    const nextVisibility: ResourceVisibility = row.visibility === '公开' ? 'private' : 'public';
    setVisibilityChangingId(row.pageId);
    try {
      await updatePageVisibility({ pageId: row.pageId, visibility: nextVisibility });
      emitApiAlert('操作成功', `页面 ${row.pageName} 已${nextVisibility === 'public' ? '设为公开' : '设为私有'}`, 'success');
      fetchPageList({
        page,
        pageSize,
        pageName: query.trim() || undefined,
      });
    } finally {
      setVisibilityChangingId(null);
    }
  };

  const handleWithdrawToDraft = async (row: PageTemplateRow) => {
    if (!isValidTemplateId(row.pageId) || withdrawingId || row.status !== 'published') {
      return;
    }

    setWithdrawingId(row.pageId);
    try {
      await withdrawPageToDraft({ pageId: row.pageId });
      emitApiAlert('操作成功', `页面 ${row.pageName} 已收回为草稿`, 'success');
      fetchPageList({
        page,
        pageSize,
        pageName: query.trim() || undefined,
      });
    } finally {
      setWithdrawingId(null);
    }
  };

  const handleCancelDelete = () => {
    if (deleting) {
      return;
    }

    setDeleteTarget(null);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget?.pageId || deleting) {
      return;
    }

    if (!isValidTemplateId(deleteTarget.pageId)) {
      emitApiAlert('操作失败', '当前记录缺少有效页面 ID，无法删除');
      return;
    }

    setDeleting(true);
    try {
      await deletePageTemplate(deleteTarget.pageId);
      emitApiAlert('删除成功', `页面 ${deleteTarget.pageName} 已删除`, 'success');
      setDeleteTarget(null);
      fetchPageList({
        page,
        pageSize,
        pageName: query.trim() || undefined,
      });
    } finally {
      setDeleting(false);
    }
  };

  const buildColumns = useMemo<PrimaryTableCol<PageTemplateRow>[]>(
    () => [
      {
        colKey: 'pageName',
        title: '页面名称',
        minWidth: 220,
        cell: ({ row }) => (
          <div className="table-entity-cell">
            <span className="table-entity-cell__title">{row.pageName}</span>
            <span className="table-entity-cell__sub">{row.pageTitle !== '-' ? row.pageTitle : '未设置页面标题'}</span>
          </div>
        ),
      },
      {
        colKey: 'ownerName',
        title: '发布人',
        width: 170,
        cell: ({ row }) => (
          <div className="table-owner-cell">
            <span className="table-owner-cell__icon"><UserIcon size="small" /></span>
            <span className="table-owner-cell__name">{row.ownerName}</span>
          </div>
        ),
      },
      {
        colKey: 'visibility',
        title: '可见性',
        width: 120,
        cell: ({ row }) => (
          <Tag size="small" theme={row.visibility === '公开' ? 'primary' : 'default'} variant="light">
            {row.visibility}
          </Tag>
        ),
      },
      {
        colKey: 'pageId',
        title: '页面ID',
        minWidth: 220,
        cell: ({ row }) => <span className="table-id-chip">{row.pageId}</span>,
      },
      {
        colKey: 'status',
        title: '状态',
        width: 110,
        cell: ({ row }) => (
          <Tag size="small" theme={row.status === 'published' ? 'success' : 'warning'} variant="light">
            {row.status === 'published' ? '已发布' : '草稿'}
          </Tag>
        ),
      },
      { colKey: 'currentVersion', title: '当前版本', width: 110 },
      { colKey: 'routePath', title: '路由路径', minWidth: 180 },
      { colKey: 'pageTitle', title: '页面标题', minWidth: 160 },
      { colKey: 'menuTitle', title: '菜单名称', minWidth: 160 },
      { colKey: 'useLayout', title: '主布局', width: 100 },
      {
        colKey: 'updatedAt',
        title: '更新时间',
        minWidth: 190,
        cell: ({ row }) => {
          const { date, time } = splitDateTimeText(row.updatedAt);
          return (
            <div className="table-time-cell">
              <span className="table-time-cell__date">{date}</span>
              {time ? <span className="table-time-cell__time">{time}</span> : null}
            </div>
          );
        },
      },
      {
        colKey: 'operations',
        title: '操作',
        width: 520,
        fixed: 'right',
        cell: ({ row }) => {
          const manageable = canManageRow(row);
          const isPublished = row.status === 'published';
          const isPublic = row.visibility === '公开';
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Button size="small" variant="outline" icon={<BrowseIcon />} onClick={() => handlePreview(row)}>
                预览
              </Button>
              {manageable ? (
                <>
                  {!isPublished ? (
                    <Button
                      size="small"
                      theme="primary"
                      variant="outline"
                      loading={publishingId === row.pageId}
                      onClick={() => handlePublish(row)}
                    >
                      发布
                    </Button>
                  ) : null}
                  {isPublished ? (
                    <>
                      <Button
                        size="small"
                        variant="outline"
                        loading={visibilityChangingId === row.pageId}
                        onClick={() => handleToggleVisibility(row)}
                      >
                        {isPublic ? '设为私有' : '设为公开'}
                      </Button>
                      <Button
                        size="small"
                        variant="outline"
                        loading={withdrawingId === row.pageId}
                        onClick={() => handleWithdrawToDraft(row)}
                      >
                        收回为草稿
                      </Button>
                    </>
                  ) : null}
                  <Button size="small" variant="outline" icon={<DeleteIcon />} onClick={() => handleDelete(row)}>
                    删除
                  </Button>
                  <Button size="small" variant="outline" icon={<EditIcon />} onClick={() => handleEdit(row)}>
                    修改
                  </Button>
                </>
              ) : null}
            </div>
          );
        },
      },
    ],
    [publishingId, user?.id, visibilityChangingId, withdrawingId],
  );

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

  return (
    <div className="build-page">
      <div className="toolbar">
        <div className="toolbar-row toolbar-row--primary">
          <div className="search-area">
            <Input
              placeholder="搜索页面名称"
              value={query}
              onChange={(val) => setQuery(String(val))}
              suffix={<SearchIcon />}
              clearable
              onEnter={handleSearch}
            />
          </div>
          <div className="primary-actions">
            <Button theme="default" variant="outline" onClick={handleSearch} icon={<SearchIcon />}>
              查询
            </Button>
            <Button theme="primary" onClick={handleCreate} icon={<AddIcon />}>
              创建新页面
            </Button>
          </div>
        </div>

        <div className="toolbar-row toolbar-row--filters">
          <div className="filter-area">
          <Select
            value={scope}
            options={[
              { label: '我的页面', value: 'mine' },
              { label: '全部页面', value: 'all' },
            ]}
            style={{ width: 140 }}
            onChange={(value) => {
              const nextScope = value === 'all' ? 'all' : 'mine';
              setPage(1);
              setScope(nextScope);
            }}
          />
          <Select
            value={statusFilter}
            options={[
              { label: '全部状态', value: 'all' },
              { label: '草稿', value: 'draft' },
              { label: '已发布', value: 'published' },
            ]}
            style={{ width: 120 }}
            onChange={(value) => {
              const nextStatus = value === 'published' ? 'published' : value === 'draft' ? 'draft' : 'all';
              setPage(1);
              setStatusFilter(nextStatus);
            }}
          />
          <Select
            value={visibilityFilter}
            options={[
              { label: '全部可见性', value: 'all' },
              { label: '私有', value: 'private' },
              { label: '公开', value: 'public' },
            ]}
            style={{ width: 140 }}
            onChange={(value) => {
              const nextVisibility = value === 'public' ? 'public' : value === 'private' ? 'private' : 'all';
              setPage(1);
              setVisibilityFilter(nextVisibility);
            }}
          />
          </div>
        </div>
      </div>

      <div className="table-wrapper">
        <Table
          className="list-table"
          columns={buildColumns}
          data={tableData}
          rowKey="id"
          loading={loading}
          pagination={pagination}
          style={{ minWidth: '1440px' }}
        />
      </div>

      <Dialog
        visible={Boolean(deleteTarget)}
        header="确认删除页面"
        confirmBtn={{
          theme: 'danger',
          loading: deleting,
          content: '确认删除',
        }}
        cancelBtn={{
          disabled: deleting,
          content: '取消',
        }}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
      >
        <div>
          即将删除页面“{deleteTarget?.pageName || '-'}”（ID: {deleteTarget?.pageId || '-'}）。删除后不可恢复，请确认。
        </div>
      </Dialog>
    </div>
  );
};

export default BuildPage;
