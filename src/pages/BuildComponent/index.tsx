import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Input, Button, Dialog, Select, Table } from 'tdesign-react';
import { AddIcon, SearchIcon, EditIcon, DeleteIcon, BrowseIcon } from 'tdesign-icons-react';
import type { PrimaryTableCol } from 'tdesign-react/es/table/type';
import { deleteComponentTemplate, getComponentBaseList, publishComponent } from '../../api/componentTemplate';
import type { ComponentTemplateBaseInfo, ResourceVisibility, TemplateStatus } from '../../api/types';
import { emitApiAlert } from '../../api/alertBus';
import { useAuth } from '../../auth/context';
import './style.less';

interface ComponentTemplateRow {
  id: string;
  pageId: string;
  pageName: string;
  ownerId: string;
  ownerName: string;
  visibility: string;
  status: ComponentTemplateBaseInfo['status'];
  currentVersion: number;
  screenSize: string;
  autoWidth: string;
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

const BuildComponent: React.FC = () => {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [tableData, setTableData] = useState<ComponentTemplateRow[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [scope, setScope] = useState<'mine' | 'all'>('mine');
  const [statusFilter, setStatusFilter] = useState<'all' | TemplateStatus>('all');
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | ResourceVisibility>('all');
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ComponentTemplateRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchPageBaseList = useCallback(async (params: { page: number; pageSize: number; pageName?: string }) => {
    setLoading(true);
    try {
      const result = await getComponentBaseList({
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
        status: (item.status === 'published' ? 'published' : 'draft') as ComponentTemplateRow['status'],
        currentVersion: typeof item.currentVersion === 'number' ? item.currentVersion : Number(item.currentVersion) || 0,
        screenSize: item.screenSize === undefined ? '-' : toSafeText(item.screenSize),
        autoWidth: item.autoWidth === undefined ? '-' : toSafeText(item.autoWidth),
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
    fetchPageBaseList({
      page,
      pageSize,
      pageName: query.trim() || undefined,
    });
  }, [fetchPageBaseList, page, pageSize, scope, statusFilter, visibilityFilter]);

  const canManageRow = (row: ComponentTemplateRow) => !row.ownerId || !user?.id || row.ownerId === user.id;

  const handleSearch = () => {
    setPage(1);
    fetchPageBaseList({
      page: 1,
      pageSize,
      pageName: query.trim() || undefined,
    });
  };

  const handleCreate = () => {
    // 在新窗口打开创建组件页面（无 Layout）
    const url = `${window.location.origin}/create-component`;
    window.open(url, '_blank');
  };

  const handlePreview = (row: ComponentTemplateRow) => {
    if (!isValidTemplateId(row.pageId)) {
      emitApiAlert('操作失败', '当前记录缺少有效组件 ID，无法预览');
      return;
    }

    const previewUrl = `${window.location.origin}/preview-engine?pageId=${encodeURIComponent(row.pageId)}&entityType=component`;
    window.open(previewUrl, '_blank');
  };

  const handleEdit = (row: ComponentTemplateRow) => {
    if (!isValidTemplateId(row.pageId)) {
      emitApiAlert('操作失败', '当前记录缺少有效组件 ID，无法进入编辑');
      return;
    }

    const editUrl = `${window.location.origin}/create-component?id=${encodeURIComponent(row.pageId)}`;
    window.open(editUrl, '_blank');
  };

  const handleDelete = (row: ComponentTemplateRow) => {
    setDeleteTarget(row);
  };

  const handlePublish = async (row: ComponentTemplateRow) => {
    if (!isValidTemplateId(row.pageId) || publishingId) {
      return;
    }

    setPublishingId(row.pageId);
    try {
      await publishComponent({ pageId: row.pageId });
      emitApiAlert('发布成功', `组件 ${row.pageName} 已发布`, 'success');
      fetchPageBaseList({
        page,
        pageSize,
        pageName: query.trim() || undefined,
      });
    } finally {
      setPublishingId(null);
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
      emitApiAlert('操作失败', '当前记录缺少有效组件 ID，无法删除');
      return;
    }

    setDeleting(true);
    try {
      await deleteComponentTemplate(deleteTarget.pageId);
      emitApiAlert('删除成功', `组件 ${deleteTarget.pageName} 已删除`, 'success');
      setDeleteTarget(null);
      fetchPageBaseList({
        page,
        pageSize,
        pageName: query.trim() || undefined,
      });
    } finally {
      setDeleting(false);
    }
  };

  const buildColumns = useMemo<PrimaryTableCol<ComponentTemplateRow>[]>(
    () => [
      { colKey: 'pageName', title: '组件名称', minWidth: 180 },
      { colKey: 'ownerName', title: '创建人', width: 140 },
      { colKey: 'visibility', title: '可见性', width: 100 },
      { colKey: 'pageId', title: '组件ID', minWidth: 220 },
      {
        colKey: 'status',
        title: '状态',
        width: 120,
        cell: ({ row }) => (row.status === 'published' ? '已发布' : '草稿'),
      },
      { colKey: 'currentVersion', title: '当前版本', width: 120 },
      { colKey: 'screenSize', title: '页面尺寸', width: 140 },
      { colKey: 'autoWidth', title: '自定义宽度', width: 140 },
      { colKey: 'updatedAt', title: '更新时间', minWidth: 180 },
      {
        colKey: 'operations',
        title: '操作',
        width: 360,
        fixed: 'right',
        cell: ({ row }) => {
          const manageable = canManageRow(row);
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Button size="small" variant="outline" icon={<BrowseIcon />} onClick={() => handlePreview(row)}>
                预览
              </Button>
              {manageable ? (
                <>
                  {row.status !== 'published' ? (
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
    [publishingId, user?.id],
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
    <div className="build-component">
      <div className="top-row">
        <div className="search-area">
          <Input
            placeholder="搜索组件名称"
            value={query}
            onChange={(val) => setQuery(String(val))}
            suffix={<SearchIcon />}
            clearable
            onEnter={handleSearch}
          />
        </div>

        <div className="action-area">
          <Select
            value={scope}
            options={[
              { label: '我的组件', value: 'mine' },
              { label: '全部组件', value: 'all' },
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
          <Button theme="default" variant="outline" onClick={handleSearch} icon={<SearchIcon />}>
            查询
          </Button>
          <Button theme="primary" onClick={handleCreate} icon={<AddIcon />}>
            创建新组件
          </Button>
        </div>
      </div>

      <div className="table-wrapper">
        <Table
          columns={buildColumns}
          data={tableData}
          rowKey="id"
          loading={loading}
          pagination={pagination}
          style={{ minWidth: '1200px' }}
        />
      </div>

      <Dialog
        visible={Boolean(deleteTarget)}
        header="确认删除组件"
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
          即将删除组件“{deleteTarget?.pageName || '-'}”（ID: {deleteTarget?.pageId || '-'}）。删除后不可恢复，请确认。
        </div>
      </Dialog>
    </div>
  );
};

export default BuildComponent;