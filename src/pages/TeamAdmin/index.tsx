import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Avatar, Button, Dialog, Empty, Input, Select, Table, Tag } from 'tdesign-react';
import { DeleteIcon, LockOnIcon, RefreshIcon, SearchIcon } from 'tdesign-icons-react';
import type { PrimaryTableCol } from 'tdesign-react/es/table/type';
import { emitApiAlert } from '../../api/alertBus';
import { useAuth } from '../../auth/context';
import { adminDeleteTeam, adminDisableTeam, adminEnableTeam, getAdminTeams } from '../../team/api';
import type { AdminTeamDisablePayload, AdminTeamListParams, TeamSummary } from '../../team/types';
import { createGithubStyleAvatar, resolveTeamAvatar } from '../../utils/avatar';
import './style.less';

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

const resolveStatusMeta = (status?: string) => {
  if (status === 'disabled') {
    return { text: '已禁用', theme: 'warning' as const };
  }
  if (status === 'deleted') {
    return { text: '已删除', theme: 'danger' as const };
  }
  return { text: '正常', theme: 'success' as const };
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
  const roleSet = new Set((roles ?? []).map((item) => String(item).toLowerCase()));
  return roleSet.has('admin') || roleSet.has('super_admin') || roleSet.has('platform_admin') || roleSet.has('root');
};

const TeamAdminPage: React.FC = () => {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'disabled' | 'deleted'>('all');
  const [loading, setLoading] = useState(false);
  const [tableData, setTableData] = useState<TeamSummary[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [disableTarget, setDisableTarget] = useState<TeamSummary | null>(null);
  const [disableMode, setDisableMode] = useState<'manual' | 'timed'>('manual');
  const [disableScheduleMode, setDisableScheduleMode] = useState<'duration' | 'until'>('duration');
  const [disableDurationValue, setDisableDurationValue] = useState('1');
  const [disableDurationUnit, setDisableDurationUnit] = useState<DisablePresetUnit>('day');
  const [disableUntil, setDisableUntil] = useState('');
  const [disableReason, setDisableReason] = useState('');
  const [disabling, setDisabling] = useState(false);
  const [enableTarget, setEnableTarget] = useState<TeamSummary | null>(null);
  const [enabling, setEnabling] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TeamSummary | null>(null);
  const [deleting, setDeleting] = useState(false);

  const canManageTeams = isPlatformAdmin(user?.roles);

  const fetchTeams = useCallback(async (params: { page: number; pageSize: number; keyword?: string }) => {
    if (!canManageTeams) {
      setTableData([]);
      setTotal(0);
      return;
    }

    setLoading(true);
    try {
      const requestParams: AdminTeamListParams = {
        ...params,
        status: statusFilter,
      };
      const result = await getAdminTeams(requestParams);
      setTableData(Array.isArray(result?.list) ? result.list : []);
      setTotal(typeof result?.total === 'number' ? result.total : 0);
    } catch {
      setTableData([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [canManageTeams, statusFilter]);

  useEffect(() => {
    fetchTeams({
      page,
      pageSize,
      keyword: query.trim() || undefined,
    });
  }, [fetchTeams, page, pageSize, statusFilter]);

  const handleSearch = () => {
    setPage(1);
    fetchTeams({
      page: 1,
      pageSize,
      keyword: query.trim() || undefined,
    });
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

    const payload: AdminTeamDisablePayload = {
      mode: disableMode,
      reason: disableReason.trim() || undefined,
    };

    if (disableMode === 'timed') {
      const disabledUntil = buildDisabledUntil(
        disableScheduleMode,
        disableScheduleMode === 'until' ? disableUntil : disableDurationValue,
        disableDurationUnit,
      );
      if (!disabledUntil) {
        emitApiAlert('禁用失败', '请填写有效的禁用时长或截止时间');
        return;
      }
      payload.disabledUntil = disabledUntil;
    }

    setDisabling(true);
    try {
      await adminDisableTeam(disableTarget.id, payload);
      emitApiAlert('操作成功', `团队 ${disableTarget.name} 已禁用`, 'success');
      setDisableTarget(null);
      resetDisableForm();
      fetchTeams({ page, pageSize, keyword: query.trim() || undefined });
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
      await adminEnableTeam(enableTarget.id);
      emitApiAlert('操作成功', `团队 ${enableTarget.name} 已恢复`, 'success');
      setEnableTarget(null);
      fetchTeams({ page, pageSize, keyword: query.trim() || undefined });
    } finally {
      setEnabling(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget?.id || deleting) {
      return;
    }

    setDeleting(true);
    try {
      await adminDeleteTeam(deleteTarget.id);
      emitApiAlert('操作成功', `团队 ${deleteTarget.name} 已删除`, 'success');
      setDeleteTarget(null);
      fetchTeams({ page, pageSize, keyword: query.trim() || undefined });
    } finally {
      setDeleting(false);
    }
  };

  const columns = useMemo<PrimaryTableCol<TeamSummary>[]>(() => [
    {
      colKey: 'name',
      title: '团队',
      minWidth: 220,
      cell: ({ row }) => (
        <div className="team-admin-page__team-cell">
          <Avatar className="team-admin-page__team-avatar" image={resolveTeamAvatar({ id: row.id, name: row.name, code: row.code, avatar: row.avatar })} size="28px" />
          <div className="team-admin-page__team-main">
            <span className="team-admin-page__team-name">{row.name}</span>
            <span className="team-admin-page__team-sub">{row.code || row.id}</span>
          </div>
        </div>
      ),
    },
    {
      colKey: 'ownerName',
      title: '拥有者',
      minWidth: 160,
      cell: ({ row }) => (
        <div className="team-admin-page__owner-cell">
          <Avatar className="team-admin-page__owner-icon" image={createGithubStyleAvatar(`${row.ownerId || row.id || row.ownerName || 'team-owner'}`)} size="22px" />
          <span>{row.ownerName || '-'}</span>
        </div>
      ),
    },
    {
      colKey: 'memberCount',
      title: '成员数',
      width: 100,
    },
    {
      colKey: 'status',
      title: '状态',
      width: 120,
      cell: ({ row }) => {
        const status = resolveStatusMeta(row.status);
        return <Tag size="small" theme={status.theme} variant="light">{status.text}</Tag>;
      },
    },
    {
      colKey: 'disableInfo',
      title: '禁用信息',
      minWidth: 180,
      cell: ({ row }) => {
        if (row.status !== 'disabled') {
          return '-';
        }
        if (row.disableType === 'timed' && row.disabledUntil) {
          return `定时至 ${formatDateText(row.disabledUntil)}`;
        }
        return '手动禁用';
      },
    },
    {
      colKey: 'operations',
      title: '操作',
      width: 320,
      fixed: 'right',
      cell: ({ row }) => (
        <div className="team-admin-page__action-row">
          {row.status === 'disabled' ? (
            <Button size="small" theme="success" variant="outline" onClick={() => setEnableTarget(row)}>解禁</Button>
          ) : (
            <Button size="small" theme="warning" variant="outline" icon={<LockOnIcon />} disabled={row.status === 'deleted'} onClick={() => setDisableTarget(row)}>禁用</Button>
          )}
          <Button size="small" theme="danger" variant="outline" icon={<DeleteIcon />} disabled={row.status === 'deleted'} onClick={() => setDeleteTarget(row)}>
            删除
          </Button>
        </div>
      ),
    },
  ], []);

  const pagination = useMemo(() => ({
    current: page,
    pageSize,
    total,
    showJumper: true,
    showPageSize: true,
    onCurrentChange: (nextPage: number) => setPage(nextPage),
    onPageSizeChange: (nextPageSize: number) => {
      setPage(1);
      setPageSize(nextPageSize);
    },
  }), [page, pageSize, total]);

  if (!canManageTeams) {
    return (
      <div className="team-admin-page team-admin-page--empty">
        <Empty description="仅平台管理员可访问团队管理" />
      </div>
    );
  }

  return (
    <div className="team-admin-page">
      <div className="team-admin-page__toolbar">
        <Input
          value={query}
          placeholder="按团队名称或 Key 搜索"
          suffix={<SearchIcon />}
          clearable
          onChange={(value) => setQuery(String(value ?? ''))}
          onEnter={handleSearch}
        />
        <Select
          value={statusFilter}
          style={{ width: 140 }}
          options={[
            { label: '全部状态', value: 'all' },
            { label: '正常', value: 'active' },
            { label: '已禁用', value: 'disabled' },
            { label: '已删除', value: 'deleted' },
          ]}
          onChange={(value) => {
            const nextStatus = value === 'active' || value === 'disabled' || value === 'deleted' ? value : 'all';
            setPage(1);
            setStatusFilter(nextStatus);
          }}
        />
        <Button theme="default" variant="outline" icon={<SearchIcon />} onClick={handleSearch}>查询</Button>
        <Button theme="default" variant="outline" icon={<RefreshIcon />} onClick={() => fetchTeams({ page, pageSize, keyword: query.trim() || undefined })}>刷新</Button>
      </div>

      <div className="team-admin-page__table-wrap">
        <Table
          rowKey="id"
          columns={columns}
          data={tableData}
          loading={loading}
          pagination={pagination}
          style={{ minWidth: '1100px' }}
        />
      </div>

      <Dialog
        visible={Boolean(disableTarget)}
        header="禁用团队"
        confirmBtn={{ content: '确认禁用', theme: 'warning', loading: disabling }}
        cancelBtn={{ content: '取消', disabled: disabling }}
        onClose={() => {
          setDisableTarget(null);
          resetDisableForm();
        }}
        onConfirm={handleConfirmDisable}
      >
        <div className="team-admin-page__dialog-form">
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
                <div className="team-admin-page__duration-row">
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
                  className="team-admin-page__native-datetime"
                  type="datetime-local"
                  value={disableUntil}
                  onChange={(event) => setDisableUntil(event.target.value)}
                />
              )}
            </>
          ) : null}
          <Input value={disableReason} placeholder="禁用原因（可选）" onChange={(value) => setDisableReason(String(value ?? ''))} />
        </div>
      </Dialog>

      <Dialog
        visible={Boolean(enableTarget)}
        header="确认解禁团队"
        confirmBtn={{ content: '确认解禁', theme: 'success', loading: enabling }}
        cancelBtn={{ content: '取消', disabled: enabling }}
        onClose={() => setEnableTarget(null)}
        onConfirm={handleConfirmEnable}
      >
        <div>确认恢复团队“{enableTarget?.name || '-'}”吗？</div>
      </Dialog>

      <Dialog
        visible={Boolean(deleteTarget)}
        header="确认删除团队"
        confirmBtn={{ content: '确认删除', theme: 'danger', loading: deleting }}
        cancelBtn={{ content: '取消', disabled: deleting }}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      >
        <div>确认删除团队“{deleteTarget?.name || '-'}”吗？该操作不可恢复。</div>
      </Dialog>
    </div>
  );
};

export default TeamAdminPage;
