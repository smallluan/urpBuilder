import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Input, Button, Table } from 'tdesign-react';
import { AddIcon, SearchIcon, EditIcon, DeleteIcon, BrowseIcon } from 'tdesign-icons-react';
import type { PrimaryTableCol } from 'tdesign-react/es/table/type';
import { getPageBaseList } from '../../api/pageTemplate';
import type { PageBaseInfo } from '../../api/types';
import './style.less';

interface ComponentTemplateRow {
  id: string;
  pageId: string;
  pageName: string;
  status: PageBaseInfo['status'];
  currentVersion: number;
  screenSize: string;
  autoWidth: string;
  updatedAt: string;
}

const toDisplayDate = (value?: string) => {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('zh-CN', { hour12: false });
};

const BuildComponent: React.FC = () => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [tableData, setTableData] = useState<ComponentTemplateRow[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  const fetchPageBaseList = useCallback(async (params: { page: number; pageSize: number; pageName?: string }) => {
    setLoading(true);
    try {
      const result = await getPageBaseList(params);
      const nextList = result.data.list.map((item) => ({
        id: item.pageId,
        pageId: item.pageId,
        pageName: item.pageName,
        status: item.status,
        currentVersion: item.currentVersion,
        screenSize: item.screenSize === undefined ? '-' : String(item.screenSize),
        autoWidth: item.autoWidth === undefined ? '-' : String(item.autoWidth),
        updatedAt: toDisplayDate(item.updatedAt),
      }));

      setTableData(nextList);
      setTotal(result.data.total || 0);
    } catch {
      setTableData([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPageBaseList({
      page,
      pageSize,
      pageName: query.trim() || undefined,
    });
  }, [fetchPageBaseList, page, pageSize]);

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
    const previewUrl = `${window.location.origin}/preview-engine?pageId=${encodeURIComponent(row.pageId)}`;
    window.open(previewUrl, '_blank');
  };

  const handleEdit = (row: ComponentTemplateRow) => {
    const editUrl = `${window.location.origin}/create-component?pageId=${encodeURIComponent(row.pageId)}`;
    window.open(editUrl, '_blank');
  };

  const handleDelete = (_row: ComponentTemplateRow) => {
    // 删除接口待后续接入
  };

  const buildColumns = useMemo<PrimaryTableCol<ComponentTemplateRow>[]>(
    () => [
      { colKey: 'pageName', title: '组件名称', minWidth: 180 },
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
    </div>
  );
};

export default BuildComponent;