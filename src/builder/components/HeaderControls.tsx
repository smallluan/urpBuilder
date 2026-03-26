import React, { useEffect, useMemo, useState } from 'react';
import cloneDeep from 'lodash/cloneDeep';
import { Radio, Button, Drawer, Timeline, Tag, Dialog, Input, Switch, Textarea } from 'tdesign-react';
import { UploadIcon, ViewImageIcon, ArrowLeftIcon, ArrowRightIcon, HistoryIcon, SettingIcon } from 'tdesign-icons-react';
import { useBuilderAccess, useBuilderContext } from '../context/BuilderContext';
import type { UiHistoryAction } from '../store/types';
import { serializePreviewSnapshot } from '../../pages/PreviewEngine/utils/snapshot';
import { buildComponentContract } from '../flow/componentContract';
import { getPageTemplateBaseList, savePageDraft, updatePageDraft } from '../../api/pageTemplate';
import { getComponentBaseList, getComponentTemplateDetail, saveComponentDraft, updateComponentDraft } from '../../api/componentTemplate';
import type { ComponentTemplateListParams, PageTemplateListParams } from '../../api/types';
import { emitApiAlert } from '../../api/alertBus';
import { findNodeByKey, updateNodeByKey } from '../../utils/createComponentTree';
import { useTeam } from '../../team/context';
import UnifiedBuilderTopbar, { TopbarGroup, TopbarIconButton } from './UnifiedBuilderTopbar';

type Props = {
  mode: 'component' | 'flow';
  onChange: (v: 'component' | 'flow') => void;
  designLabel?: string;
  saveEntityLabel?: string;
  entityType?: 'page' | 'component';
  enableComponentContract?: boolean;
  enablePageRouteConfig?: boolean;
  /** 追加到右侧按钮组（保持 header 布局不变） */
  extraRight?: React.ReactNode;
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

const normalizeRoutePath = (value: string) => {
  const text = String(value ?? '').trim();
  if (!text) {
    return '/';
  }

  return text.startsWith('/') ? text : `/${text}`;
};

const isEditableTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tagName = target.tagName.toLowerCase();
  return tagName === 'input' || tagName === 'textarea' || target.isContentEditable;
};

const SCOPED_ID_CHECK_PAGE_SIZE = 200;
const SCOPED_ID_CHECK_MAX_PAGES = 10;
const MAX_TEAM_COMPONENT_VALIDATION_COUNT = 60;
const RESOURCE_DESCRIPTION_MAX_LENGTH = 300;

const hasDuplicateScopedResourceId = async (
  entityType: 'page' | 'component',
  pageId: string,
  ownerType: 'user' | 'team',
  ownerTeamId?: string,
) => {
  let page = 1;

  while (page <= SCOPED_ID_CHECK_MAX_PAGES) {
    if (entityType === 'component') {
      const params: ComponentTemplateListParams = {
        page,
        pageSize: SCOPED_ID_CHECK_PAGE_SIZE,
        ...(ownerType === 'team'
          ? { ownerType: 'team' as const, ownerTeamId }
          : { mine: true }),
      };

      const result = await getComponentBaseList(params);
      const list = Array.isArray(result.data?.list) ? result.data.list : [];
      if (list.some((item) => String(item.pageId || '').trim() === pageId)) {
        return true;
      }

      const total = typeof result.data?.total === 'number' ? result.data.total : Number(result.data?.total) || 0;
      if (page * SCOPED_ID_CHECK_PAGE_SIZE >= total || list.length < SCOPED_ID_CHECK_PAGE_SIZE) {
        return false;
      }
    } else {
      const params: PageTemplateListParams = {
        page,
        pageSize: SCOPED_ID_CHECK_PAGE_SIZE,
        ...(ownerType === 'team'
          ? { ownerType: 'team' as const, ownerTeamId }
          : { mine: true }),
      };

      const result = await getPageTemplateBaseList(params);
      const list = Array.isArray(result.data?.list) ? result.data.list : [];
      if (list.some((item) => String(item.pageId || '').trim() === pageId)) {
        return true;
      }

      const total = typeof result.data?.total === 'number' ? result.data.total : Number(result.data?.total) || 0;
      if (page * SCOPED_ID_CHECK_PAGE_SIZE >= total || list.length < SCOPED_ID_CHECK_PAGE_SIZE) {
        return false;
      }
    }

    page += 1;
  }

  return false;
};

const collectCustomComponentIdsFromTree = (root: unknown, bucket: Set<string>) => {
  if (!root || typeof root !== 'object') {
    return;
  }

  const node = root as {
    type?: unknown;
    props?: Record<string, unknown>;
    children?: unknown[];
  };

  const componentIdMeta = node.props?.__componentId as { value?: unknown } | undefined;
  const componentId = String(componentIdMeta?.value ?? '').trim();
  if ((node.type === 'CustomComponent' || componentId) && componentId) {
    bucket.add(componentId);
  }

  if (Array.isArray(node.children)) {
    node.children.forEach((child) => collectCustomComponentIdsFromTree(child, bucket));
  }
};

const collectAllUsedCustomComponentIds = (
  uiTree: unknown,
  routes: Array<{ uiTree?: unknown }> = [],
  sharedTree?: unknown,
) => {
  const ids = new Set<string>();
  collectCustomComponentIdsFromTree(uiTree, ids);
  routes.forEach((route) => {
    collectCustomComponentIdsFromTree(route?.uiTree, ids);
  });
  if (sharedTree) {
    collectCustomComponentIdsFromTree(sharedTree, ids);
  }
  return ids;
};

const resolveTeamOwnedCustomComponents = async (componentIds: string[]) => {
  const result = await Promise.all(
    componentIds.map(async (componentId) => {
      try {
        const detail = await getComponentTemplateDetail(componentId);
        const base = detail.data?.base;
        if (base?.ownerType !== 'team') {
          return null;
        }

        return {
          pageId: String(base.pageId || componentId),
          pageName: String(base.pageName || componentId),
          ownerTeamName: String(base.ownerTeamName || '团队资源'),
        };
      } catch {
        return null;
      }
    }),
  );

  return result.filter((item): item is { pageId: string; pageName: string; ownerTeamName: string } => Boolean(item));
};

const composeRouteUiTree = (
  privateTree: any,
  sharedTree: any,
  outletKey: string | null,
) => {
  if (!sharedTree || !outletKey) {
    return cloneDeep(privateTree);
  }

  const sharedOutlet = findNodeByKey(sharedTree, outletKey);
  if (!sharedOutlet) {
    return cloneDeep(privateTree);
  }

  const privateOutlet = findNodeByKey(privateTree, outletKey);
  const outletChildren = privateOutlet?.type === 'RouteOutlet'
    ? cloneDeep(privateOutlet.children ?? [])
    : [];

  return updateNodeByKey(cloneDeep(sharedTree), outletKey, (target) => ({
    ...target,
    children: outletChildren,
  }));
};

const composeRouteFlow = (
  privateNodes: any[],
  privateEdges: any[],
  sharedNodes: any[],
  sharedEdges: any[],
) => {
  const mergedNodes = new Map<string, any>();
  sharedNodes.forEach((node) => mergedNodes.set(node.id, cloneDeep(node)));
  privateNodes.forEach((node) => mergedNodes.set(node.id, cloneDeep(node)));
  const flowNodes = Array.from(mergedNodes.values());
  const flowNodeIds = new Set(flowNodes.map((node) => node.id));

  const mergedEdges = new Map<string, any>();
  sharedEdges.forEach((edge) => {
    if (flowNodeIds.has(edge.source) && flowNodeIds.has(edge.target)) {
      mergedEdges.set(edge.id, cloneDeep(edge));
    }
  });
  privateEdges.forEach((edge) => {
    if (flowNodeIds.has(edge.source) && flowNodeIds.has(edge.target)) {
      mergedEdges.set(edge.id, cloneDeep(edge));
    }
  });

  return {
    flowNodes,
    flowEdges: Array.from(mergedEdges.values()),
  };
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

  if (action.type === 'move') {
    return {
      title: `移动组件：${action.nodeLabel}`,
      subtitle: `${action.nodeType || '未知类型'} · ${action.nodeKey}`,
      theme: 'primary' as const,
      kind: '移动',
      lines: [
        `原位置：${action.fromParentKey} / ${action.fromIndex}`,
        `新位置：${action.toParentKey} / ${action.toIndex}`,
      ],
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
  extraRight,
}) => {
  const { useStore } = useBuilderContext();
  const { readOnly } = useBuilderAccess();
  const { currentTeamId, currentTeam, workspaceMode } = useTeam();
  const history = useStore((state) => state.history);
  const screenSize = useStore((state) => state.screenSize);
  const autoWidth = useStore((state) => state.autoWidth);
  const currentPageId = useStore((state) => state.currentPageId);
  const currentPageName = useStore((state) => state.currentPageName);
  const currentPageDescription = useStore((state) => state.currentPageDescription);
  const currentPageVisibility = useStore((state) => state.currentPageVisibility);
  const pageRouteConfig = useStore((state) => state.pageRouteConfig);
  const pageRoutes = useStore((state) => state.pageRoutes);
  const activePageRouteId = useStore((state) => state.activePageRouteId);
  const activeRouteOutletKey = useStore((state) => state.activeRouteOutletKey);
  const sharedUiTree = useStore((state) => state.sharedUiTree);
  const sharedFlowNodes = useStore((state) => state.sharedFlowNodes);
  const sharedFlowEdges = useStore((state) => state.sharedFlowEdges);
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
  const [componentDescription, setComponentDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [shortcutDialogVisible, setShortcutDialogVisible] = useState(false);
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
      (!historyVisible ? [] : history.actions)
        .map((action, index) => ({
          index,
          time: new Date(action.timestamp).toLocaleTimeString('zh-CN', { hour12: false }),
          detail: toActionDescription(action),
        }))
        .reverse(),
    [history.actions, historyVisible],
  );

  const handleChange = (value: any) => {
    onChange(String(value) === '1' ? 'component' : 'flow');
  };

  const handlePreview = () => {
    const { uiPageData: uiTreeData, flowNodes, flowEdges } = useStore.getState();
    const routeSnapshots = enablePageRouteConfig
      ? pageRoutes.map((route) => {
          const composedUiTree = composeRouteUiTree(route.uiTree, sharedUiTree, activeRouteOutletKey);
          const composedFlow = composeRouteFlow(
            route.flowNodes,
            route.flowEdges,
            sharedFlowNodes,
            sharedFlowEdges,
          );

          return {
            routeId: route.routeId,
            routePath: normalizeRoutePath(route.routeConfig.routePath),
            uiTreeData: composedUiTree,
            flowNodes: composedFlow.flowNodes,
            flowEdges: composedFlow.flowEdges,
          };
        })
      : [];

    const activeRoutePath = enablePageRouteConfig
      ? normalizeRoutePath(pageRouteConfig?.routePath?.trim() ?? '/')
      : '';
    const activeRouteSnapshot = routeSnapshots.find((item) => item.routePath === activeRoutePath) ?? routeSnapshots[0];

    const snapshot = serializePreviewSnapshot({
      uiTreeData: activeRouteSnapshot?.uiTreeData ?? uiTreeData,
      flowNodes: activeRouteSnapshot?.flowNodes ?? flowNodes,
      flowEdges: activeRouteSnapshot?.flowEdges ?? flowEdges,
      pageConfig: enablePageRouteConfig
        ? {
            routeConfig: pageRouteConfig,
            pageId: currentPageId,
            pageName: currentPageName,
            defaultRoutePath: activeRouteSnapshot?.routePath ?? activeRoutePath,
            routeSnapshots,
          }
        : undefined,
    });

    const snapshotKey = `preview-snapshot-${Date.now()}-${Math.round(Math.random() * 10000)}`;
    window.localStorage.setItem(snapshotKey, snapshot);

    const routePath = enablePageRouteConfig ? (activeRouteSnapshot?.routePath ?? activeRoutePath) : '';
    const previewUrl = new URL(routePath ? `/site-preview${routePath}` : '/preview-engine', window.location.origin);
    previewUrl.searchParams.set('snapshotKey', snapshotKey);
    previewUrl.searchParams.set('entityType', entityType);
    if (currentPageId?.trim()) {
      previewUrl.searchParams.set('pageId', currentPageId.trim());
    }
    if (routePath) {
      previewUrl.searchParams.set('previewMode', 'route');
    }

    window.open(previewUrl.toString(), '_blank', 'noopener,noreferrer');
  };

  const handleOpenSaveDialog = () => {
    setComponentName(currentPageName || '');
    setComponentId(currentPageId || '');
    setComponentDescription(currentPageDescription || '');
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

  useEffect(() => {
    const handleGlobalHistoryHotkey = (event: KeyboardEvent) => {
      const withMeta = event.ctrlKey || event.metaKey;
      if (!withMeta || isEditableTarget(event.target)) {
        return;
      }

      const key = event.key.toLowerCase();
      if (key === 'z' && !event.shiftKey) {
        if (!readOnly && canUndo) {
          event.preventDefault();
          undo();
        }
        return;
      }

      const isRedoHotkey = (key === 'z' && event.shiftKey) || key === 'y';
      if (isRedoHotkey) {
        if (!readOnly && canRedo) {
          event.preventDefault();
          redo();
        }
      }
    };

    window.addEventListener('keydown', handleGlobalHistoryHotkey);
    return () => {
      window.removeEventListener('keydown', handleGlobalHistoryHotkey);
    };
  }, [canRedo, canUndo, readOnly, redo, undo]);

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
    const { uiPageData: uiTreeData, flowNodes, flowEdges } = useStore.getState();
    const pageName = componentName.trim();
    const pageId = componentId.trim();
    const pageDescription = componentDescription.trim();

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

    const resolvedOwnerType: 'user' | 'team' = workspaceMode === 'team' ? 'team' : 'user';
    const resolvedOwnerTeamId: string | undefined = resolvedOwnerType === 'team' ? currentTeamId || undefined : undefined;

    if (resolvedOwnerType === 'team' && !resolvedOwnerTeamId) {
      emitApiAlert('保存失败', '当前为团队空间，但未选择团队，请先在侧边栏选择团队后再保存');
      return;
    }

    setSaving(true);

    try {
      if (resolvedOwnerType === 'user') {
        const usedComponentIds = Array.from(
          collectAllUsedCustomComponentIds(
            uiTreeData,
            enablePageRouteConfig ? pageRoutes : [],
            enablePageRouteConfig ? sharedUiTree : null,
          ),
        ).slice(0, MAX_TEAM_COMPONENT_VALIDATION_COUNT);

        if (usedComponentIds.length > 0) {
          const teamOwnedComponents = await resolveTeamOwnedCustomComponents(usedComponentIds);

          if (teamOwnedComponents.length > 0) {
            const conflictNames = teamOwnedComponents
              .slice(0, 3)
              .map((item) => `${item.pageName}（${item.ownerTeamName}）`)
              .join('、');

            emitApiAlert(
              '保存失败',
              `当前${saveEntityLabel}使用了团队组件：${conflictNames}${teamOwnedComponents.length > 3 ? ' 等' : ''}。请先切换到团队空间后再保存。`,
            );
            return;
          }
        }
      }

      if (!isEditMode) {
        const hasDuplicate = await hasDuplicateScopedResourceId(
          entityType,
          pageId,
          resolvedOwnerType,
          resolvedOwnerTeamId,
        );

        if (hasDuplicate) {
          emitApiAlert(
            '保存失败',
            `${saveEntityLabel} ID ${pageId} 在当前${resolvedOwnerType === 'team' ? '团队' : '个人'}作用域已存在，请更换 ID`,
          );
          return;
        }
      }

      const componentContract = enableComponentContract
        ? buildComponentContract(uiTreeData, flowNodes, flowEdges)
        : null;

      const resolvedPageRoutes = enablePageRouteConfig && pageRoutes.length > 0
        ? pageRoutes
        : [];

      const templatePayload = {
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
          ...(enablePageRouteConfig ? {
            ...(activeRouteOutletKey ? { activeRouteOutletKey } : {}),
            ...(sharedUiTree ? { sharedUiTree: sharedUiTree as unknown as Record<string, unknown> } : {}),
            sharedFlowNodes: sharedFlowNodes as unknown as Array<Record<string, unknown>>,
            sharedFlowEdges: sharedFlowEdges as unknown as Array<Record<string, unknown>>,
          } : {}),
          ...(componentContract ? { componentContract } : {}),
        },
      };

      if (entityType === 'component') {
        const payload = {
          base: {
            pageId,
            pageName,
            description: pageDescription || undefined,
            entityType: 'component' as const,
            ownerType: resolvedOwnerType,
            ownerTeamId: resolvedOwnerTeamId,
            visibility: (currentPageVisibility ?? 'private') as 'private' | 'public',
            screenSize,
            autoWidth,
          },
          template: templatePayload,
        };

        if (isEditMode) {
          await updateComponentDraft(currentPageId, payload);
        } else {
          await saveComponentDraft(payload);
        }
      } else {
        const payload = {
          base: {
            pageId,
            pageName,
            description: pageDescription || undefined,
            entityType: 'page' as const,
            ownerType: resolvedOwnerType,
            ownerTeamId: resolvedOwnerTeamId,
            visibility: (currentPageVisibility ?? 'private') as 'private' | 'public',
            screenSize,
            autoWidth,
          },
          template: templatePayload,
        };

        if (isEditMode) {
          await updatePageDraft(currentPageId, payload);
        } else {
          await savePageDraft(payload);
        }
      }

      setCurrentPageMeta({
        pageId,
        pageName,
        description: pageDescription,
        visibility: (currentPageVisibility ?? 'private') as 'private' | 'public',
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
        <UnifiedBuilderTopbar
          className="component-topbar"
          left={(
            <TopbarGroup>
              <TopbarIconButton tip="上一步" icon={<ArrowLeftIcon />} disabled={readOnly || !canUndo} onClick={undo} />
              <TopbarIconButton tip="下一步" icon={<ArrowRightIcon />} disabled={readOnly || !canRedo} onClick={redo} />
              <TopbarIconButton tip="操作历史" icon={<HistoryIcon />} onClick={() => setHistoryVisible(true)} />
            </TopbarGroup>
          )}
          right={(
            <TopbarGroup>
              {enablePageRouteConfig ? (
                <Button theme="default" size="small" variant="outline" disabled={readOnly} onClick={handleOpenPageSettings}>当前路由设置</Button>
              ) : null}
              <TopbarIconButton tip="高级快捷键设置" icon={<SettingIcon />} onClick={() => setShortcutDialogVisible(true)} />
              {extraRight}
              <Button theme="primary" size="small" icon={<UploadIcon />} disabled={readOnly} onClick={handleOpenSaveDialog}>保存</Button>
              <Button theme="default" size="small" icon={<ViewImageIcon />} onClick={handlePreview}>预览</Button>
            </TopbarGroup>
          )}
        />
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
        onConfirm={readOnly ? undefined : handleSave}
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
              disabled={readOnly}
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
              disabled={readOnly || isEditMode}
            />
          </div>

          <div>
            <div style={{ marginBottom: 6 }}>描述（非必填，最多 {RESOURCE_DESCRIPTION_MAX_LENGTH} 字）</div>
            <Textarea
              value={componentDescription}
              placeholder="请输入资源描述"
              maxlength={RESOURCE_DESCRIPTION_MAX_LENGTH}
              maxcharacter={RESOURCE_DESCRIPTION_MAX_LENGTH}
              autosize={{ minRows: 3, maxRows: 5 }}
              onChange={(value) => setComponentDescription(String(value ?? ''))}
              disabled={readOnly}
            />
          </div>

          <div>
            <div style={{ marginBottom: 6 }}>归属范围</div>
            <Input
              readonly
              value={workspaceMode === 'team' ? (currentTeam ? `当前团队（${currentTeam.name}）` : '当前团队') : '个人资源'}
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

      <Dialog
        visible={shortcutDialogVisible}
        header="快捷键设置"
        confirmBtn="关闭"
        cancelBtn={null}
        onConfirm={() => setShortcutDialogVisible(false)}
        onClose={() => setShortcutDialogVisible(false)}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>核心快捷键：Ctrl/Cmd+Z（撤销）、Ctrl/Cmd+Shift+Z（重做）、Esc（关闭浮层/退出聚焦）。</div>
          <div>流程模式快捷键：Ctrl/Cmd+Shift+L / V / K。</div>
          <div>组件模式快捷键：Alt + 方向键（同级微调）。</div>
          <div style={{ color: '#64748b', fontSize: 12 }}>
            该入口用于查看全局快捷键，后续可扩展为可编辑映射。
          </div>
        </div>
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
