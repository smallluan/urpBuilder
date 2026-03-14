import React, { useEffect, useMemo, useState } from 'react';
import { Radio, Button, Space, Drawer, Timeline, Tag, Dialog, Input, Switch } from 'tdesign-react';
import { UploadIcon, ViewImageIcon, ArrowLeftIcon, ArrowRightIcon, HistoryIcon } from 'tdesign-icons-react';
import { useBuilderContext } from '../context/BuilderContext';
import type { UiHistoryAction } from '../store/types';
import { serializePreviewSnapshot } from '../../pages/PreviewEngine/utils/snapshot';
import { buildComponentContract } from '../flow/componentContract';
import { savePageDraft, updatePageDraft } from '../../api/pageTemplate';
import { emitApiAlert } from '../../api/alertBus';

type Props = {
  mode: 'component' | 'flow';
  onChange: (v: 'component' | 'flow') => void;
  designLabel?: string;
  saveEntityLabel?: string;
  entityType?: 'page' | 'component';
  enableComponentContract?: boolean;
  enablePageRouteConfig?: boolean;
};

type RouteConfigDraft = {
  routePath: string;
  routeName: string;
  pageTitle: string;
  menuTitle: string;
  useLayout: boolean;
};

const toReadableValue = (value: unknown) => {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (value === null || value === undefined) {
    return '-';
  }

  return JSON.stringify(value);
};

const toActionDescription = (action: UiHistoryAction) => {
  if (action.type === 'add') {
    return {
      title: `新增组件：${action.nodeLabel}`,
      subtitle: `${action.nodeType || '未知类型'} · ${action.nodeKey}`,
      theme: 'success' as const,
      kind: '新增',
      lines: [`父节点：${action.parentKey}`, `插入位置：${action.index}`],
    };
  }

  if (action.type === 'remove') {
    return {
      title: `删除组件：${action.nodeLabel}`,
      subtitle: `${action.nodeType || '未知类型'} · ${action.nodeKey}`,
      theme: 'danger' as const,
      kind: '删除',
      lines: [`原父节点：${action.parentKey}`, `原位置：${action.index}`],
    };
  }

  if (action.type === 'update-label') {
    return {
      title: `修改组件名称：${action.nextLabel}`,
      subtitle: `${action.nodeType || '未知类型'} · ${action.nodeKey}`,
      theme: 'primary' as const,
      kind: '改名',
      lines: [`旧名称：${action.prevLabel}`, `新名称：${action.nextLabel}`],
    };
  }

  if (action.type === 'update-prop') {
    return {
      title: `修改属性：${action.propKey}`,
      subtitle: `${action.nodeLabel}（${action.nodeType || '未知类型'}） · ${action.nodeKey}`,
      theme: 'warning' as const,
      kind: '改属性',
      lines: [`旧值：${toReadableValue(action.prevValue)}`, `新值：${toReadableValue(action.nextValue)}`],
    };
  }

  if (action.type === 'replace-layout') {
    return {
      title: `应用布局：${action.nextLayoutTemplateId}`,
      subtitle: '页面结构',
      theme: 'primary' as const,
      kind: '布局',
      lines: [
        `旧布局：${action.prevLayoutTemplateId ?? '无'}`,
        `新布局：${action.nextLayoutTemplateId}`,
      ],
    };
  }

  return {
    title: `流程操作：${action.actionLabel}`,
    subtitle: '流程画布',
    theme: 'primary' as const,
    kind: '流程',
    lines: [
      `节点：+${action.nodePatch.added.length} -${action.nodePatch.removed.length} ~${action.nodePatch.updated.length}`,
      `连线：+${action.edgePatch.added.length} -${action.edgePatch.removed.length} ~${action.edgePatch.updated.length}`,
    ],
  };
};

const HeaderControls: React.FC<Props> = ({
  mode,
  onChange,
  designLabel = '组件',
  saveEntityLabel = '组件',
  entityType = 'component',
  enableComponentContract = false,
  enablePageRouteConfig = false,
}) => {
  const { useStore } = useBuilderContext();
  const history = useStore((state) => state.history);
  const uiTreeData = useStore((state) => state.uiPageData);
  const flowNodes = useStore((state) => state.flowNodes);
  const flowEdges = useStore((state) => state.flowEdges);
  const screenSize = useStore((state) => state.screenSize);
  const autoWidth = useStore((state) => state.autoWidth);
  const currentPageId = useStore((state) => state.currentPageId);
  const currentPageName = useStore((state) => state.currentPageName);
  const pageRouteConfig = useStore((state) => state.pageRouteConfig);
  const pageRoutes = useStore((state) => state.pageRoutes);
  const activePageRouteId = useStore((state) => state.activePageRouteId);
  const setCurrentPageMeta = useStore((state) => state.setCurrentPageMeta);
  const setPageRouteConfig = useStore((state) => state.setPageRouteConfig);
  const removePageRoute = useStore((state) => state.removePageRoute);
  const setDefaultPageRoute = useStore((state) => state.setDefaultPageRoute);
  const selectedLayoutTemplateId = useStore((state) => state.selectedLayoutTemplateId);
  const undo = useStore((state) => state.undo);
  const redo = useStore((state) => state.redo);
  const jumpToHistory = useStore((state) => state.jumpToHistory);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [saveDialogVisible, setSaveDialogVisible] = useState(false);
  const [componentName, setComponentName] = useState('');
  const [componentId, setComponentId] = useState('');
  const [saving, setSaving] = useState(false);
  const [pageSettingsVisible, setPageSettingsVisible] = useState(false);
  const [deleteRouteDialogVisible, setDeleteRouteDialogVisible] = useState(false);
  const [routeConfigDraft, setRouteConfigDraft] = useState<RouteConfigDraft>({
    routePath: '',
    routeName: '',
    pageTitle: '',
    menuTitle: '',
    useLayout: true,
  });

  const canUndo = history.pointer >= 0;
  const canRedo = history.pointer < history.actions.length - 1;
  const isEditMode = Boolean(currentPageId);

  const displayTimelineItems = useMemo(
    () =>
      history.actions
        .map((action, index) => ({
          index,
          time: new Date(action.timestamp).toLocaleTimeString('zh-CN', { hour12: false }),
          detail: toActionDescription(action),
        }))
        .reverse(),
    [history.actions],
  );

  const handleChange = (value: any) => {
    onChange(String(value) === '1' ? 'component' : 'flow');
  };

  const handlePreview = () => {
    const snapshot = serializePreviewSnapshot({
      uiTreeData,
      flowNodes,
      flowEdges,
      pageConfig: enablePageRouteConfig
        ? {
            routeConfig: pageRouteConfig,
            pageId: currentPageId,
            pageName: currentPageName,
          }
        : undefined,
    });

    const snapshotKey = `preview-snapshot-${Date.now()}-${Math.round(Math.random() * 10000)}`;
    window.localStorage.setItem(snapshotKey, snapshot);

    const routePath = enablePageRouteConfig ? pageRouteConfig?.routePath?.trim() ?? '' : '';
    const previewUrl = new URL(routePath ? `/site-preview${routePath}` : '/preview-engine', window.location.origin);
    previewUrl.searchParams.set('snapshotKey', snapshotKey);
    if (routePath) {
      previewUrl.searchParams.set('previewMode', 'route');
    }

    window.open(previewUrl.toString(), '_blank', 'noopener,noreferrer');
  };

  const handleOpenSaveDialog = () => {
    setComponentName(currentPageName || '');
    setComponentId(currentPageId || '');
    setSaveDialogVisible(true);
  };

  const handleOpenPageSettings = () => {
    setRouteConfigDraft({
      routePath: pageRouteConfig?.routePath ?? '',
      routeName: pageRouteConfig?.routeName ?? '',
      pageTitle: pageRouteConfig?.pageTitle ?? '',
      menuTitle: pageRouteConfig?.menuTitle ?? '',
      useLayout: pageRouteConfig?.useLayout !== false,
    });
    setPageSettingsVisible(true);
  };

  useEffect(() => {
    if (!enablePageRouteConfig) {
      return undefined;
    }

    const handleEvent = () => {
      handleOpenPageSettings();
    };

    window.addEventListener('builder:open-page-settings', handleEvent);
    return () => {
      window.removeEventListener('builder:open-page-settings', handleEvent);
    };
  }, [enablePageRouteConfig, pageRouteConfig]);

  const handleApplyPageSettings = () => {
    const routePath = routeConfigDraft.routePath.trim();
    const routeName = routeConfigDraft.routeName.trim();
    if (routePath && !routePath.startsWith('/')) {
      emitApiAlert('保存失败', '页面路由路径必须以 / 开头');
      return;
    }

    if (routePath) {
      const duplicatedRoute = pageRoutes.find((route) => {
        if (route.routeId === activePageRouteId) {
          return false;
        }

        return route.routeConfig.routePath.trim() === routePath;
      });

      if (duplicatedRoute) {
        emitApiAlert('保存失败', `路由路径 ${routePath} 已存在，请使用其他路径`);
        return;
      }
    }

    if (routeName) {
      const duplicatedRouteName = pageRoutes.find((route) => {
        if (route.routeId === activePageRouteId) {
          return false;
        }

        return route.routeConfig.routeName.trim() === routeName;
      });

      if (duplicatedRouteName) {
        emitApiAlert('保存失败', `路由名称 ${routeName} 已存在，请使用其他名称`);
        return;
      }
    }

    setPageRouteConfig({
      routePath,
      routeName,
      pageTitle: routeConfigDraft.pageTitle.trim(),
      menuTitle: routeConfigDraft.menuTitle.trim(),
      useLayout: routeConfigDraft.useLayout,
    });
    setPageSettingsVisible(false);
  };

  const handleDeleteCurrentRoute = () => {
    if (!activePageRouteId) {
      return;
    }

    if (pageRoutes.length <= 1) {
      emitApiAlert('删除失败', '至少需要保留一条路由');
      return;
    }

    setDeleteRouteDialogVisible(true);
  };

  const handleConfirmDeleteCurrentRoute = () => {
    if (!activePageRouteId) {
      setDeleteRouteDialogVisible(false);
      return;
    }

    const activeRoute = pageRoutes.find((route) => route.routeId === activePageRouteId);
    const routeLabel = activeRoute?.routeConfig.routePath || activeRoute?.routeConfig.menuTitle || activeRoute?.routeConfig.routeName || '当前路由';
    removePageRoute(activePageRouteId);
    setDeleteRouteDialogVisible(false);
    setPageSettingsVisible(false);
    emitApiAlert('删除成功', `已删除路由 ${routeLabel}`, 'success');
  };

  const activeRouteIndex = pageRoutes.findIndex((route) => route.routeId === activePageRouteId);
  const canSetDefault = activeRouteIndex > 0;

  const handleSetCurrentRouteDefault = () => {
    if (!activePageRouteId) {
      return;
    }

    setDefaultPageRoute(activePageRouteId);
    emitApiAlert('设置成功', '当前路由已设为默认路由', 'success');
  };

  const handleCloseSaveDialog = () => {
    if (saving) {
      return;
    }

    setSaveDialogVisible(false);
  };

  const handleSave = async () => {
    const pageName = componentName.trim();
    const pageId = componentId.trim();

    if (!pageName) {
      emitApiAlert('保存失败', `请输入${saveEntityLabel}名称`);
      return;
    }

    if (!pageId) {
      emitApiAlert('保存失败', `请输入${saveEntityLabel} ID`);
      return;
    }

    if (!/^[A-Za-z0-9_-]+$/.test(pageId)) {
      emitApiAlert('保存失败', `${saveEntityLabel} ID 仅支持字母、数字、下划线和中划线`);
      return;
    }

    setSaving(true);

    try {
      const componentContract = enableComponentContract
        ? buildComponentContract(uiTreeData, flowNodes, flowEdges)
        : null;

      const resolvedPageRoutes = enablePageRouteConfig && pageRoutes.length > 0
        ? pageRoutes.map((route) => {
            if (route.routeId !== activePageRouteId) {
              return route;
            }

            return {
              ...route,
              routeConfig: pageRouteConfig ?? route.routeConfig,
              uiTree: uiTreeData,
              flowNodes,
              flowEdges,
              selectedLayoutTemplateId,
            };
          })
        : [];

      const payload = {
        base: {
          pageId,
          pageName,
          entityType,
          screenSize,
          autoWidth,
        },
        template: {
          uiTree: uiTreeData as unknown as Record<string, unknown>,
          flowNodes: flowNodes as unknown as Array<Record<string, unknown>>,
          flowEdges: flowEdges as unknown as Array<Record<string, unknown>>,
          ...(resolvedPageRoutes.length > 0 ? {
            routes: resolvedPageRoutes.map((route) => ({
              routeId: route.routeId,
              routeConfig: route.routeConfig,
              uiTree: route.uiTree as unknown as Record<string, unknown>,
              flowNodes: route.flowNodes as unknown as Array<Record<string, unknown>>,
              flowEdges: route.flowEdges as unknown as Array<Record<string, unknown>>,
              selectedLayoutTemplateId: route.selectedLayoutTemplateId,
            })),
          } : {}),
          pageConfig: {
            screenSize,
            autoWidth,
            selectedLayoutTemplateId,
            ...(enablePageRouteConfig && pageRouteConfig ? { routeConfig: pageRouteConfig } : {}),
            ...(componentContract ? { componentContract } : {}),
          },
        },
      };

      if (isEditMode) {
        await updatePageDraft(currentPageId, payload);
      } else {
        await savePageDraft(payload);
      }

      setCurrentPageMeta({
        pageId,
        pageName,
      });
      emitApiAlert('保存成功', `${saveEntityLabel} ${pageName} 已保存`, 'success');
      setSaveDialogVisible(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="header-controls">
      <div className="header-left-control">
        <Radio.Group variant="default-filled" value={mode === 'component' ? '1' : '2'} onChange={handleChange}>
          <Radio.Button value="1">搭建{designLabel}</Radio.Button>
          <Radio.Button value="2">搭建流程</Radio.Button>
        </Radio.Group>
      </div>

      <div className="header-right-control">
        <Space>
          <div className="action-group">
            <Button
              theme="default"
              size="small"
              variant="outline"
              icon={<ArrowLeftIcon />}
              disabled={!canUndo}
              onClick={undo}
            >
              上一步
            </Button>
            <Button
              theme="default"
              size="small"
              variant="outline"
              icon={<ArrowRightIcon />}
              disabled={!canRedo}
              onClick={redo}
            >
              下一步
            </Button>
            <Button
              theme="default"
              size="small"
              variant="outline"
              icon={<HistoryIcon />}
              onClick={() => setHistoryVisible(true)}
            >
              操作历史
            </Button>
            {enablePageRouteConfig ? (
              <Button theme="default" size="small" variant="outline" onClick={handleOpenPageSettings}>当前路由设置</Button>
            ) : null}
            <Button theme="primary" size="small" icon={<UploadIcon />} onClick={handleOpenSaveDialog}>保存</Button>
            <Button theme="default" size="small" icon={<ViewImageIcon />} onClick={handlePreview}>预览</Button>
          </div>
        </Space>
      </div>

      <Dialog
        visible={saveDialogVisible}
        header={`保存${saveEntityLabel}`}
        confirmBtn={{
          content: '确认保存',
          loading: saving,
        }}
        cancelBtn={{
          content: '取消',
          disabled: saving,
        }}
        closeOnOverlayClick={false}
        onConfirm={handleSave}
        onClose={handleCloseSaveDialog}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <div style={{ marginBottom: 6 }}>{saveEntityLabel}名称</div>
            <Input
              value={componentName}
              placeholder={`请输入${saveEntityLabel}名称`}
              onChange={(value) => setComponentName(String(value ?? ''))}
              maxlength={60}
              clearable
            />
          </div>

          <div>
            <div style={{ marginBottom: 6 }}>{saveEntityLabel} ID</div>
            <Input
              value={componentId}
              placeholder="例如：user_profile_card"
              onChange={(value) => setComponentId(String(value ?? '').trim())}
              maxlength={64}
              clearable
              disabled={isEditMode}
            />
          </div>
        </div>
      </Dialog>

      <Drawer
        visible={pageSettingsVisible}
        header="当前路由设置"
        placement="right"
        size="420px"
        footer={false}
        onClose={() => setPageSettingsVisible(false)}
      >
        <div className="flow-config-drawer-form">
          <div className="flow-config-drawer-subtitle">这里配置当前路由的路径、名称和展示信息。切换路由后，下面的组件树、模拟器和流程都会一起切换。</div>

          <div className="flow-config-field">
            <div className="flow-config-field__label">路由路径</div>
            <Input
              value={routeConfigDraft.routePath}
              placeholder="例如：/user/profile"
              onChange={(value) => setRouteConfigDraft((prev) => ({ ...prev, routePath: String(value ?? '') }))}
              clearable
            />
          </div>

          <div className="flow-config-field">
            <div className="flow-config-field__label">路由名称</div>
            <Input
              value={routeConfigDraft.routeName}
              placeholder="例如：UserProfilePage"
              onChange={(value) => setRouteConfigDraft((prev) => ({ ...prev, routeName: String(value ?? '') }))}
              clearable
            />
          </div>

          <div className="flow-config-field">
            <div className="flow-config-field__label">页面标题</div>
            <Input
              value={routeConfigDraft.pageTitle}
              placeholder="浏览器标题"
              onChange={(value) => setRouteConfigDraft((prev) => ({ ...prev, pageTitle: String(value ?? '') }))}
              clearable
            />
          </div>

          <div className="flow-config-field">
            <div className="flow-config-field__label">菜单名称</div>
            <Input
              value={routeConfigDraft.menuTitle}
              placeholder="侧边菜单显示名"
              onChange={(value) => setRouteConfigDraft((prev) => ({ ...prev, menuTitle: String(value ?? '') }))}
              clearable
            />
          </div>

          <div className="flow-config-field flow-config-field--switch">
            <div className="flow-config-field__label">使用主布局</div>
            <Switch
              value={routeConfigDraft.useLayout}
              onChange={(value) => setRouteConfigDraft((prev) => ({ ...prev, useLayout: Boolean(value) }))}
            />
          </div>

          <div className="flow-config-drawer-actions">
            <Button size="small" theme="default" variant="outline" disabled={!canSetDefault} onClick={handleSetCurrentRouteDefault}>
              设为默认
            </Button>
          </div>

          <div className="flow-config-drawer-actions">
            <Button
              size="small"
              theme="danger"
              variant="outline"
              disabled={pageRoutes.length <= 1}
              onClick={handleDeleteCurrentRoute}
            >
              删除当前路由
            </Button>
            <Button size="small" theme="default" variant="outline" onClick={() => setPageSettingsVisible(false)}>取消</Button>
            <Button size="small" theme="primary" onClick={handleApplyPageSettings}>应用设置</Button>
          </div>
        </div>
      </Drawer>

      <Dialog
        visible={deleteRouteDialogVisible}
        header="删除当前路由"
        confirmBtn="确认删除"
        cancelBtn="取消"
        onConfirm={handleConfirmDeleteCurrentRoute}
        onClose={() => setDeleteRouteDialogVisible(false)}
      >
        <div>删除后不可恢复，确认继续吗？</div>
      </Dialog>

      <Drawer
        visible={historyVisible}
        header="操作历史"
        placement="right"
        size="560px"
        footer={false}
        onClose={() => setHistoryVisible(false)}
      >
        <div className="history-hero">
          <div className="history-hero-title">操作说明</div>
          <div className="history-hero-desc">点击任意历史节点可快速跳转到对应状态，顶部为最近操作。</div>
        </div>

        <div className="history-drawer-meta">
          <span>当前步：{history.pointer + 1}</span>
          <span>总步数：{history.actions.length}</span>
        </div>

        <div className="history-drawer-body">
          <Timeline mode="same" layout="vertical" labelAlign="left">
            {displayTimelineItems.map((item) => {
              const isCurrent = history.pointer === item.index;
              return (
                <Timeline.Item
                  key={item.index}
                  dotColor={isCurrent ? 'primary' : item.detail.theme}
                  label={`#${item.index + 1} · ${item.time}`}
                  content={
                    <div
                      className={`history-item history-card ${isCurrent ? 'is-current' : ''}`}
                      onClick={() => jumpToHistory(item.index)}
                    >
                      <div className="history-card-head">
                        <span className="history-card-title">{item.detail.title}</span>
                        <div className="history-card-tags">
                          <Tag size="small" theme={item.detail.theme} variant="light">{item.detail.kind}</Tag>
                          {isCurrent ? <Tag size="small" theme="primary" variant="light">当前</Tag> : null}
                        </div>
                      </div>
                      <div className="history-card-subtitle">{item.detail.subtitle}</div>
                      {item.detail.lines.map((line) => (
                        <div key={line} className="history-card-line">{line}</div>
                      ))}
                    </div>
                  }
                />
              );
            })}

            <Timeline.Item
              dotColor={history.pointer === -1 ? 'primary' : 'default'}
              label="初始"
              content={
                <div
                  className={`history-item history-card ${history.pointer === -1 ? 'is-current' : ''}`}
                  onClick={() => jumpToHistory(-1)}
                >
                  <div className="history-card-head">
                    <span className="history-card-title">初始状态</span>
                    {history.pointer === -1 ? <Tag size="small" theme="primary" variant="light">当前</Tag> : null}
                  </div>
                  <div className="history-card-line">编辑器初始快照</div>
                </div>
              }
            />
          </Timeline>
        </div>
      </Drawer>
    </div>
  );
};

export default HeaderControls;
