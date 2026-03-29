import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Avatar,
  Button,
  Dialog,
  Input,
  List,
  Pagination,
  Popup,
  Select,
  Space,
  Table,
  Tag,
} from 'tdesign-react';
import type { PrimaryTableCol } from 'tdesign-react/es/table/type';
import { AddIcon, SearchIcon, UserIcon } from 'tdesign-icons-react';
import ListItemMeta from 'tdesign-react/es/list/ListItemMeta';
import {
  deleteComponentTemplate,
  getComponentBaseList,
  publishComponent,
  updateComponentVisibility,
  withdrawComponentToDraft,
} from '../../api/componentTemplate';
import type { ComponentTemplateBaseInfo, ResourceVisibility } from '../../api/types';
import type { ResourceContributor, ResourceTeamSummary } from '../../api/types';
import { emitApiAlert } from '../../api/alertBus';
import { useAuth } from '../../auth/context';
import { useTeam } from '../../team/context';
import { useResourceFiltersStore } from '../../store/resourceFilters';
import ResourceRowOperations from '../../components/ResourceRowOperations';
import './style.less';

const { ListItem } = List;

interface ComponentTemplateRow {
  id: string;
  pageId: string;
  pageName: string;
  description: string;
  ownerType: '个人' | '团队';
  ownerTeamId: string;
  ownerTeamName: string;
  ownerId: string;
  ownerName: string;
  visibility: string;
  status: ComponentTemplateBaseInfo['status'];
  currentVersion: number;
  screenSize: string;
  autoWidth: string;
  updatedAt: string;
  contributors: ResourceContributor[];
  teamSummary?: ResourceTeamSummary;
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

const resolveContributorName = (item: ResourceContributor) => item.nickname || item.username || item.userId;

const BuildComponent: React.FC = () => {
  const { user } = useAuth();
  const { initialized: teamInitialized, currentTeamId, currentTeam, workspaceMode } = useTeam();
  const buildComponentFilters = useResourceFiltersStore((state) => state.buildComponent);
  const setBuildComponentFilters = useResourceFiltersStore((state) => state.setBuildComponentFilters);

  const query = buildComponentFilters.query;
  const statusFilter = buildComponentFilters.statusFilter;
  const visibilityFilter = buildComponentFilters.visibilityFilter;
  const pageSize = buildComponentFilters.pageSize;

  const [loading, setLoading] = useState(false);
  const [tableData, setTableData] = useState<ComponentTemplateRow[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [visibilityChangingId, setVisibilityChangingId] = useState<string | null>(null);
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ComponentTemplateRow | null>(null);
  const [detailTarget, setDetailTarget] = useState<ComponentTemplateRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!teamInitialized) {
      return;
    }

    setPage(1);
  }, [teamInitialized, workspaceMode, currentTeamId]);

  const fetchPageBaseList = useCallback(async (params: { page: number; pageSize: number; pageName?: string }) => {
    setLoading(true);
    try {
      const requestParams: Parameters<typeof getComponentBaseList>[0] = {
        ...params,
        status: statusFilter === 'all' ? undefined : statusFilter,
        visibility: visibilityFilter === 'all' ? undefined : visibilityFilter,
      };

      if (workspaceMode === 'personal') {
        requestParams.mine = true;
      } else if (currentTeamId) {
        requestParams.ownerType = 'team';
        requestParams.ownerTeamId = currentTeamId;
      } else {
        setTableData([]);
        setTotal(0);
        return;
      }

      const result = await getComponentBaseList({
        ...requestParams,
      });
      const rawList = Array.isArray(result.data?.list) ? result.data.list : [];
      const nextList = rawList.map((item) => ({
        id: toSafeText(item.pageId),
        pageId: toSafeText(item.pageId),
        pageName: toSafeText(item.pageName),
        description: String(item.description || '').trim(),
        ownerType: (item.ownerType === 'team' ? '团队' : '个人') as ComponentTemplateRow['ownerType'],
        ownerTeamId: toSafeText(item.ownerTeamId),
        ownerTeamName: toSafeText(item.ownerTeamName || '-'),
        ownerId: toSafeText(item.ownerId),
        ownerName: toSafeText(item.ownerName || '-'),
        visibility: item.visibility === 'public' ? '公开' : '私有',
        status: (item.status === 'published' ? 'published' : 'draft') as ComponentTemplateRow['status'],
        currentVersion: typeof item.currentVersion === 'number' ? item.currentVersion : Number(item.currentVersion) || 0,
        screenSize: item.screenSize === undefined ? '-' : toSafeText(item.screenSize),
        autoWidth: item.autoWidth === undefined ? '-' : toSafeText(item.autoWidth),
        updatedAt: toDisplayDate(item.updatedAt),
        contributors: Array.isArray(item.contributors) ? item.contributors : [],
        teamSummary: item.teamSummary,
      }));

      setTableData(nextList);
      setTotal(typeof result.data?.total === 'number' ? result.data.total : Number(result.data?.total) || 0);
    } catch {
      setTableData([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [currentTeamId, workspaceMode, statusFilter, visibilityFilter]);

  useEffect(() => {
    if (!teamInitialized) {
      return;
    }

    fetchPageBaseList({
      page,
      pageSize,
      pageName: query.trim() || undefined,
    });
  }, [fetchPageBaseList, page, pageSize, statusFilter, visibilityFilter, teamInitialized]);

  const canManageRow = (row: ComponentTemplateRow) => {
    if (row.ownerType === '团队') {
      const isCurrentTeamResource = row.ownerTeamId && currentTeamId && row.ownerTeamId === currentTeamId;
      const canManageTeamResource = currentTeam?.role === 'owner' || currentTeam?.role === 'admin';
      if (isCurrentTeamResource && canManageTeamResource) {
        return true;
      }
    }

    return !row.ownerId || !user?.id || row.ownerId === user.id;
  };

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

  const handleToggleVisibility = async (row: ComponentTemplateRow) => {
    if (!isValidTemplateId(row.pageId) || visibilityChangingId || row.status !== 'published') {
      if (row.status !== 'published') {
        emitApiAlert('操作失败', '草稿组件不可设为公开，请先发布');
      }
      return;
    }

    const nextVisibility: ResourceVisibility = row.visibility === '公开' ? 'private' : 'public';
    setVisibilityChangingId(row.pageId);
    try {
      await updateComponentVisibility({ pageId: row.pageId, visibility: nextVisibility });
      emitApiAlert('操作成功', `组件 ${row.pageName} 已${nextVisibility === 'public' ? '设为公开' : '设为私有'}`, 'success');
      fetchPageBaseList({
        page,
        pageSize,
        pageName: query.trim() || undefined,
      });
    } finally {
      setVisibilityChangingId(null);
    }
  };

  const handleWithdrawToDraft = async (row: ComponentTemplateRow) => {
    if (!isValidTemplateId(row.pageId) || withdrawingId || row.status !== 'published') {
      return;
    }

    setWithdrawingId(row.pageId);
    try {
      await withdrawComponentToDraft({ pageId: row.pageId });
      emitApiAlert('操作成功', `组件 ${row.pageName} 已收回为草稿`, 'success');
      fetchPageBaseList({
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

  const renderContributorsPopup = (contributors: ResourceContributor[]) => {
    if (!contributors.length) {
      return <div className="simple-popup-empty">暂无参与者记录</div>;
    }

    return (
      <List className="participant-list" split>
        {contributors.map((contributor) => (
          <ListItem key={contributor.userId || contributor.username}>
            <ListItemMeta
              image={<Avatar size="28px" image={contributor.avatar}>{String(resolveContributorName(contributor) || '-').slice(0, 1)}</Avatar>}
              title={resolveContributorName(contributor)}
              description={contributor.role || contributor.lastActiveAt || '参与建设'}
            />
          </ListItem>
        ))}
      </List>
    );
  };

  const renderTeamPopup = (row: ComponentTemplateRow) => {
    const summary = row.teamSummary;

    return (
      <Space direction="vertical" size={6} className="team-popup">
        <strong>{summary?.name || row.ownerTeamName || '当前团队'}</strong>
        <span>{summary?.description || '暂无团队简介'}</span>
        <span>成员数：{summary?.memberCount ?? '-'}</span>
      </Space>
    );
  };

  const componentTableColumns: PrimaryTableCol<ComponentTemplateRow>[] = [
    {
      colKey: 'pageName',
      title: '组件名称',
      width: 168,
      ellipsis: true,
      cell: ({ row }) => (
        <Button size="small" variant="text" theme="primary" onClick={() => setDetailTarget(row)}>
          {row.pageName}
        </Button>
      ),
    },
    { colKey: 'pageId', title: '组件 ID', width: 140, ellipsis: true },
    {
      colKey: 'status',
      title: '状态',
      width: 200,
      cell: ({ row }) => (
        <Space size={6}>
          <Tag size="small" theme={row.status === 'published' ? 'success' : 'warning'} variant="light">
            {row.status === 'published' ? '已发布' : '草稿'}
          </Tag>
          <Tag size="small" theme={row.visibility === '公开' ? 'primary' : 'default'} variant="light">
            {row.visibility}
          </Tag>
          <Tag size="small" variant="light-outline">v{row.currentVersion}</Tag>
        </Space>
      ),
    },
    {
      colKey: 'owner',
      title: '负责人 / 归属',
      width: 200,
      ellipsis: true,
      cell: ({ row }) => (
        <Space size={6} align="center" breakLine className="build-resource-table__owner-cell">
          <span className="meta-item">
            <UserIcon size="14" /> {row.ownerName || '-'}
          </span>
          <Popup trigger="hover" placement="top" showArrow content={renderTeamPopup(row)}>
            <Tag size="small" variant="light-outline" className="team-tag-popup-trigger">
              {row.ownerType === '团队' ? (row.ownerTeamName !== '-' ? row.ownerTeamName : '团队资源') : '个人资源'}
            </Tag>
          </Popup>
        </Space>
      ),
    },
    {
      colKey: 'canvas',
      title: '画布',
      width: 120,
      ellipsis: true,
      cell: ({ row }) => `${row.screenSize} / ${row.autoWidth}`,
    },
    {
      colKey: 'description',
      title: '描述',
      ellipsis: true,
      cell: ({ row }) => row.description || '暂无描述',
    },
    {
      colKey: 'updatedAt',
      title: '更新时间',
      width: 156,
      cell: ({ row }) => {
        const { date, time } = splitDateTimeText(row.updatedAt);
        return `${date}${time ? ` ${time}` : ''}`;
      },
    },
    {
      colKey: 'contributors',
      title: '参与者',
      width: 108,
      align: 'center',
      cell: ({ row }) => (
        <Popup trigger="hover" placement="top-right" showArrow content={renderContributorsPopup(row.contributors)}>
          <div className="participant-avatars-trigger">
            <Avatar.Group max={4} cascading="right-up" size="24px">
              {row.contributors.map((item) => (
                <Avatar key={item.userId || item.username} image={item.avatar}>
                  {String(resolveContributorName(item) || '-').slice(0, 1)}
                </Avatar>
              ))}
            </Avatar.Group>
          </div>
        </Popup>
      ),
    },
    {
      colKey: 'ops',
      title: '操作',
      width: 220,
      align: 'left',
      fixed: 'right',
      cell: ({ row }) => (
        <ResourceRowOperations
          canManage={canManageRow(row)}
          isPublished={row.status === 'published'}
          isPublic={row.visibility === '公开'}
          onPreview={() => handlePreview(row)}
          onEdit={() => handleEdit(row)}
          onPublish={() => handlePublish(row)}
          onToggleVisibility={() => handleToggleVisibility(row)}
          onWithdraw={() => handleWithdrawToDraft(row)}
          onDelete={() => handleDelete(row)}
        />
      ),
    },
  ];

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
        setBuildComponentFilters({ pageSize: nextPageSize });
      },
    }),
    [page, pageSize, total, setBuildComponentFilters],
  );

  return (
    <div className="build-component">
      <div className="toolbar">
        <div className="toolbar-row toolbar-row--primary">
          <div className="search-area">
            <Input
              placeholder="搜索组件名称"
              value={query}
              onChange={(val) => setBuildComponentFilters({ query: String(val ?? '') })}
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
              创建新组件
            </Button>
          </div>
        </div>

        <div className="toolbar-row toolbar-row--filters">
          <div className="filter-area">
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
              setBuildComponentFilters({ statusFilter: nextStatus });
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
              setBuildComponentFilters({ visibilityFilter: nextVisibility });
            }}
          />
          </div>
        </div>
      </div>

      <div className="table-wrapper">
        <div className="list-scroll-area">
          <Table
            className="resource-table"
            rowKey="id"
            data={tableData}
            columns={componentTableColumns}
            loading={loading}
            bordered
            stripe
            size="small"
            empty="暂无组件数据"
          />
        </div>

        <div className="pagination-wrap">
          <Pagination
            current={pagination.current}
            pageSize={pagination.pageSize}
            total={pagination.total}
            showJumper={pagination.showJumper}
            showPageSize={pagination.showPageSize}
            onCurrentChange={pagination.onCurrentChange}
            onPageSizeChange={pagination.onPageSizeChange}
          />
        </div>
      </div>

      <Dialog
        visible={Boolean(detailTarget)}
        header="组件详情"
        confirmBtn={{ content: '关闭' }}
        cancelBtn={null}
        onConfirm={() => setDetailTarget(null)}
        onClose={() => setDetailTarget(null)}
      >
        <div className="detail-dialog">
          <div className="detail-row"><span>组件名称</span><strong>{detailTarget?.pageName || '-'}</strong></div>
          <div className="detail-row"><span>组件 ID</span><strong>{detailTarget?.pageId || '-'}</strong></div>
          <div className="detail-row"><span>发布人</span><strong>{detailTarget?.ownerName || '-'}</strong></div>
          <div className="detail-row">
            <span>所属范围</span>
            <strong>
              {detailTarget?.ownerType === '团队' ? (
                <Popup trigger="hover" placement="top-right" showArrow content={detailTarget ? renderTeamPopup(detailTarget) : null}>
                  <Tag size="small" variant="light-outline" className="team-tag-popup-trigger">{detailTarget?.ownerTeamName || '团队资源'}</Tag>
                </Popup>
              ) : '个人资源'}
            </strong>
          </div>
          <div className="detail-row"><span>状态</span><strong>{detailTarget?.status === 'published' ? '已发布' : '草稿'}</strong></div>
          <div className="detail-row"><span>可见性</span><strong>{detailTarget?.visibility || '-'}</strong></div>
          <div className="detail-row"><span>当前版本</span><strong>{detailTarget?.currentVersion ?? '-'}</strong></div>
          <div className="detail-row detail-row--description">
            <span>描述</span>
            <strong className="detail-scroll-content">{detailTarget?.description || '暂无描述'}</strong>
          </div>
          <div className="detail-row">
            <span>参与者</span>
            <strong>
              <Popup
                trigger="click"
                placement="top-right"
                showArrow
                content={renderContributorsPopup(detailTarget?.contributors || [])}
              >
                <span className="participants-detail-trigger">查看列表（{detailTarget?.contributors?.length || 0}）</span>
              </Popup>
            </strong>
          </div>
          <div className="detail-row"><span>页面尺寸</span><strong>{detailTarget?.screenSize || '-'}</strong></div>
          <div className="detail-row"><span>自定义宽度</span><strong>{detailTarget?.autoWidth || '-'}</strong></div>
          <div className="detail-row"><span>更新时间</span><strong>{detailTarget?.updatedAt || '-'}</strong></div>
        </div>
      </Dialog>

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