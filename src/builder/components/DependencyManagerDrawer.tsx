import React, { useCallback, useEffect, useState } from 'react';
import { Badge, Button, Drawer, MessagePlugin, Popup, Space, Table, Tag, Typography } from 'tdesign-react';
import { RefreshIcon } from 'tdesign-icons-react';
import { HelpCircle, Layers } from 'lucide-react';
import { TopbarIconButton } from './UnifiedBuilderTopbar';
import { batchGetComponentMeta } from '../../api/componentTemplate';
import type { ComponentMetaBatchResultItem } from '../../api/types';
import type { DirectCustomDependencyRow } from '../../utils/directCustomDependencies';
import ComponentVersionHistoryDialog from './ComponentVersionHistoryDialog';
import type { UiTreeNode } from '../store/types';
import type { DependencyUpgradeItem } from './DependencyUpgradeIndicator';
import './DependencyManagerDrawer.less';

const { Text } = Typography;

export type DependencyManagerDrawerProps = {
  readOnly: boolean;
  collectDependencyRows: () => DirectCustomDependencyRow[];
  collectInstanceNodesForComponent: (componentId: string) => UiTreeNode[];
  onIgnoreDependency: (componentId: string) => void;
  applyVersionToEditor: (componentId: string, version: number) => Promise<boolean>;
  /** 与 Header 角标一致：有待升级的依赖 */
  pendingUpgrades: DependencyUpgradeItem[];
  onUpgradeDependencyToLatest: (componentId: string) => Promise<void>;
  onUpgradeAllPending: () => Promise<void>;
  onIgnoreAllPendingUpgrades: () => void;
  catalogPath?: string;
};

const DependencyManagerDrawer: React.FC<DependencyManagerDrawerProps> = ({
  readOnly,
  collectDependencyRows,
  collectInstanceNodesForComponent,
  onIgnoreDependency,
  applyVersionToEditor,
  pendingUpgrades,
  onUpgradeDependencyToLatest,
  onUpgradeAllPending,
  onIgnoreAllPendingUpgrades,
  catalogPath,
}) => {
  const [open, setOpen] = useState(false);
  const [metaById, setMetaById] = useState<Map<string, ComponentMetaBatchResultItem>>(new Map());
  const [metaLoading, setMetaLoading] = useState(false);
  const [historyFor, setHistoryFor] = useState<DirectCustomDependencyRow | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [rowUpgradeBusy, setRowUpgradeBusy] = useState<string | null>(null);

  const pendingIds = new Set(pendingUpgrades.map((p) => p.componentId));

  const helpPopup = (
    <div className="dependency-manager-drawer__help">
      <p className="dependency-manager-drawer__help-lead">
        仅统计当前<strong>搭建模式</strong>下模板里的自定义组件引用；不包含流程图，也不包含子组件内部的间接依赖。
      </p>
      <p className="dependency-manager-drawer__help-muted">与顶栏依赖升级角标范围一致：仅 UI 树。</p>
    </div>
  );

  const drawerHeader = (
    <div className="dependency-manager-drawer-panel__header-row">
      <span className="dependency-manager-drawer-panel__header-title">搭建依赖</span>
      <Popup
        trigger="click"
        placement="bottom-left"
        showArrow={false}
        destroyOnClose={false}
        content={helpPopup}
        overlayInnerClassName="dependency-manager-drawer__help-popup-inner"
        overlayStyle={{ zIndex: 5700 }}
      >
        <button type="button" className="dependency-manager-drawer-panel__help-trigger" aria-label="统计说明">
          <HelpCircle size={16} strokeWidth={2} />
        </button>
      </Popup>
    </div>
  );

  const refreshMeta = useCallback(async () => {
    const rows = collectDependencyRows();
    if (rows.length === 0) {
      setMetaById(new Map());
      return;
    }
    setMetaLoading(true);
    try {
      const res = await batchGetComponentMeta({
        items: rows.map((r) => ({
          componentId: r.componentId,
          usedVersion: r.minUsedVersion > 0 ? r.minUsedVersion : undefined,
        })),
      });
      const list = Array.isArray(res.data?.list) ? res.data.list : [];
      const next = new Map<string, ComponentMetaBatchResultItem>();
      list.forEach((item) => {
        if (item?.componentId) {
          next.set(item.componentId, item);
        }
      });
      setMetaById(next);
    } catch {
      MessagePlugin.warning('依赖元信息拉取失败');
      setMetaById(new Map());
    } finally {
      setMetaLoading(false);
    }
  }, [collectDependencyRows]);

  useEffect(() => {
    if (!open) {
      return;
    }
    void refreshMeta();
  }, [open, refreshMeta]);

  const rows = open ? collectDependencyRows() : [];

  const handleUpgradeOne = async (componentId: string) => {
    setRowUpgradeBusy(componentId);
    try {
      await onUpgradeDependencyToLatest(componentId);
      await refreshMeta();
    } finally {
      setRowUpgradeBusy(null);
    }
  };

  const handleUpgradeAll = async () => {
    if (pendingUpgrades.length === 0) {
      return;
    }
    setBulkBusy(true);
    try {
      await onUpgradeAllPending();
      await refreshMeta();
    } finally {
      setBulkBusy(false);
    }
  };

  const dependencyTrigger = (
    <TopbarIconButton
      tip="查看与升级页面中引用的自定义组件版本"
      label="搭建依赖"
      icon={<Layers size={16} strokeWidth={2} />}
      onClick={() => setOpen(true)}
      disabled={readOnly}
    />
  );

  return (
    <>
      {pendingUpgrades.length > 0 ? (
        <Badge count={pendingUpgrades.length} size="small" offset={[2, -2]}>
          {dependencyTrigger}
        </Badge>
      ) : (
        dependencyTrigger
      )}

      <Drawer
        className="dependency-manager-drawer-panel"
        visible={open}
        header={drawerHeader}
        placement="right"
        size="large"
        closeOnOverlayClick
        onClose={() => setOpen(false)}
        footer={false}
        lazy={false}
        zIndex={5600}
      >
        <div className="dependency-manager-drawer">
          <div className="dependency-manager-drawer__toolbar">
            <Button size="small" variant="outline" loading={metaLoading} onClick={() => void refreshMeta()}>
              刷新元信息
            </Button>
            <Button
              size="small"
              theme="primary"
              icon={<RefreshIcon />}
              loading={bulkBusy}
              disabled={readOnly || pendingUpgrades.length === 0 || bulkBusy}
              onClick={() => void handleUpgradeAll()}
            >
              全部升级到最新
            </Button>
            <Button
              size="small"
              variant="outline"
              disabled={readOnly || pendingUpgrades.length === 0}
              onClick={() => {
                onIgnoreAllPendingUpgrades();
                MessagePlugin.info('已忽略全部升级提示（仅本次编辑会话）');
                void refreshMeta();
              }}
            >
              忽略全部升级提示
            </Button>
          </div>

          <div className="dependency-manager-drawer__table-host">
            <Table
              rowKey="componentId"
              data={rows}
              loading={metaLoading && rows.length === 0}
              className="dependency-manager-drawer__table"
              size="small"
              empty="暂无自定义组件依赖"
              columns={[
                {
                  colKey: 'displayName',
                  title: '名称',
                  width: 140,
                  ellipsis: true,
                },
                {
                  colKey: 'componentId',
                  title: '组件 ID',
                  width: 160,
                  ellipsis: true,
                },
                {
                  colKey: 'used',
                  title: '使用版本',
                  width: 108,
                  cell: ({ row }) => (
                    <Space size={4}>
                      <Text>
                        {row.minUsedVersion > 0 ? `v${row.minUsedVersion}` : '未固定'}
                        {row.versionMismatch ? '…' : ''}
                      </Text>
                      {row.versionMismatch ? (
                        <Tag size="small" theme="warning">
                          不一致
                        </Tag>
                      ) : null}
                    </Space>
                  ),
                },
                {
                  colKey: 'latest',
                  title: '最新',
                  width: 88,
                  cell: ({ row }) => {
                    const m = metaById.get(row.componentId);
                    if (!m) {
                      return '—';
                    }
                    if (m.deleted) {
                      return <Tag theme="danger">已删除</Tag>;
                    }
                    if (!m.accessible) {
                      return <Tag theme="warning">无权限</Tag>;
                    }
                    const lv = m.latestVersion;
                    return typeof lv === 'number' && Number.isFinite(lv) ? `v${lv}` : '—';
                  },
                },
                {
                  colKey: 'actions',
                  title: '操作',
                  width: 280,
                  cell: ({ row }) => (
                    <Space size={6} breakLine className="dependency-manager-drawer__actions">
                      {pendingIds.has(row.componentId) ? (
                        <Button
                          size="small"
                          theme="primary"
                          variant="outline"
                          loading={rowUpgradeBusy === row.componentId}
                          disabled={readOnly || (rowUpgradeBusy !== null && rowUpgradeBusy !== row.componentId)}
                          onClick={() => void handleUpgradeOne(row.componentId)}
                        >
                          升到最新
                        </Button>
                      ) : null}
                      <Button
                        size="small"
                        variant="outline"
                        theme="primary"
                        disabled={readOnly}
                        onClick={() => setHistoryFor(row)}
                      >
                        版本时间线
                      </Button>
                      <Button
                        size="small"
                        variant="text"
                        disabled={readOnly}
                        onClick={() => {
                          onIgnoreDependency(row.componentId);
                          MessagePlugin.info('已忽略该依赖的升级提示（仅本次编辑会话）');
                          void refreshMeta();
                        }}
                      >
                        忽略提示
                      </Button>
                    </Space>
                  ),
                },
              ]}
            />
          </div>
        </div>
      </Drawer>

      {historyFor ? (
        <ComponentVersionHistoryDialog
          visible
          componentId={historyFor.componentId}
          displayName={historyFor.displayName}
          usedVersion={historyFor.minUsedVersion}
          instanceNodes={collectInstanceNodesForComponent(historyFor.componentId)}
          catalogPath={catalogPath}
          onClose={() => setHistoryFor(null)}
          onApplyVersion={async (version) => applyVersionToEditor(historyFor.componentId, version)}
        />
      ) : null}
    </>
  );
};

export default DependencyManagerDrawer;
