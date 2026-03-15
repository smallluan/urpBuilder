import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Input, Button, Dialog, Table } from 'tdesign-react';
import { AddIcon, SearchIcon, EditIcon, DeleteIcon, BrowseIcon } from 'tdesign-icons-react';
import type { PrimaryTableCol } from 'tdesign-react/es/table/type';
import { deletePageTemplate, getPageTemplateBaseList } from '../../api/pageTemplate';
import type { PageTemplateBaseInfo } from '../../api/types';
import { emitApiAlert } from '../../api/alertBus';
import './style.less';

interface PageTemplateRow {
  id: string;
  pageId: string;
  pageName: string;
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

const BuildPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [tableData, setTableData] = useState<PageTemplateRow[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<PageTemplateRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchPageList = useCallback(async (params: { page: number; pageSize: number; pageName?: string }) => {
    setLoading(true);
    try {
      const result = await getPageTemplateBaseList({
        ...params,
      });
      const rawList = Array.isArray(result.data?.list) ? result.data.list : [];
      const nextList = rawList.map((item) => ({
        id: toSafeText(item.pageId),
        pageId: toSafeText(item.pageId),
        pageName: toSafeText(item.pageName),
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
  }, []);

  useEffect(() => {
    fetchPageList({
      page,
      pageSize,
      pageName: query.trim() || undefined,
    });
  }, [fetchPageList, page, pageSize]);

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
      { colKey: 'pageName', title: '页面名称', minWidth: 180 },
      { colKey: 'pageId', title: '页面ID', minWidth: 220 },
      {
        colKey: 'status',
        title: '状态',
        width: 100,
        cell: ({ row }) => (row.status === 'published' ? '已发布' : '草稿'),
      },
      { colKey: 'currentVersion', title: '当前版本', width: 110 },
      { colKey: 'routePath', title: '路由路径', minWidth: 180 },
      { colKey: 'pageTitle', title: '页面标题', minWidth: 160 },
      { colKey: 'menuTitle', title: '菜单名称', minWidth: 160 },
      { colKey: 'useLayout', title: '主布局', width: 100 },
      { colKey: 'updatedAt', title: '更新时间', minWidth: 180 },
      {
        colKey: 'operations',
        title: '操作',
        width: 260,
        fixed: 'right',
        cell: ({ row }) => (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Button size="small" variant="outline" icon={<DeleteIcon />} onClick={() => handleDelete(row)}>
              删除
            </Button>
            <Button size="small" variant="outline" icon={<BrowseIcon />} onClick={() => handlePreview(row)}>
              预览
            </Button>
            <Button size="small" variant="outline" icon={<EditIcon />} onClick={() => handleEdit(row)}>
              修改
            </Button>
          </div>
        ),
      },
    ],
    [],
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
      <div className="top-row">
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

        <div className="action-area">
          <Button theme="default" variant="outline" onClick={handleSearch} icon={<SearchIcon />}>
            查询
          </Button>
          <Button theme="primary" onClick={handleCreate} icon={<AddIcon />}>
            创建新页面
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
