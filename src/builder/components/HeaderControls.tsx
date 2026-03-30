import React, { useEffect, useMemo, useState } from 'react';
import cloneDeep from 'lodash/cloneDeep';
import { Radio, Button, Drawer, Timeline, Tag, Dialog, DialogPlugin, Input, Textarea, MessagePlugin } from 'tdesign-react';
import {
  UploadIcon,
  ViewImageIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  HistoryIcon,
  SettingIcon,
  JumpIcon,
} from 'tdesign-icons-react';
import { useBuilderAccess, useBuilderContext } from '../context/BuilderContext';
import type { UiHistoryAction } from '../store/types';
import { serializePreviewSnapshot } from '../../pages/PreviewEngine/utils/snapshot';
import { buildComponentContract } from '../flow/componentContract';
import { getPageTemplateBaseList, publishPage, savePageDraft, updatePageDraft } from '../../api/pageTemplate';
import {
  getComponentBaseList,
  getComponentTemplateDetail,
  publishComponent,
  saveComponentDraft,
  updateComponentDraft,
} from '../../api/componentTemplate';
import type { ComponentTemplateListParams, PageTemplateListParams } from '../../api/types';
import { emitApiAlert } from '../../api/alertBus';
import { findNodeByKey, updateNodeByKey } from '../../utils/createComponentTree';
import { useTeam } from '../../team/context';
import UnifiedBuilderTopbar, { TopbarGroup, TopbarIconButton } from './UnifiedBuilderTopbar';
import { dehydrateUiTree, PROPS_STORAGE_VERSION } from '../template/propsHydration';
import { getBlockMessageWhenNoPersistableChanges } from '../save/assertPersistableChanges';
import { computePersistedTemplateFingerprint } from '../save/templateFingerprint';

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

const collectUnpinnedCustomComponentsFromTree = (
  root: unknown,
  bucket: Array<{ componentId: string; componentName: string }>,
) => {
  if (!root || typeof root !== 'object') {
    return;
  }

  const node = root as {
    type?: unknown;
    props?: Record<string, unknown>;
    children?: unknown[];
  };
  const componentIdMeta = node.props?.__componentId as { value?: unknown } | undefined;
  const componentVersionMeta = node.props?.__componentVersion as { value?: unknown } | undefined;
  const componentNameMeta = node.props?.__componentName as { value?: unknown } | undefined;

  const componentId = String(componentIdMeta?.value ?? '').trim();
  const componentVersion = Number(componentVersionMeta?.value);
  const isVersionPinned = Number.isFinite(componentVersion) && componentVersion > 0;
  if ((node.type === 'CustomComponent' || componentId) && componentId && !isVersionPinned) {
    bucket.push({
      componentId,
      componentName: String(componentNameMeta?.value ?? componentId).trim() || componentId,
    });
  }

  if (Array.isArray(node.children)) {
    node.children.forEach((child) => collectUnpinnedCustomComponentsFromTree(child, bucket));
  }
};

const collectAllUnpinnedCustomComponents = (
  uiTree: unknown,
  routes: Array<{ uiTree?: unknown }> = [],
  sharedTree?: unknown,
) => {
  const list: Array<{ componentId: string; componentName: string }> = [];
  collectUnpinnedCustomComponentsFromTree(uiTree, list);
  routes.forEach((route) => {
    collectUnpinnedCustomComponentsFromTree(route?.uiTree, list);
  });
  if (sharedTree) {
    collectUnpinnedCustomComponentsFromTree(sharedTree, list);
  }

  const deduped = new Map<string, { componentId: string; componentName: string }>();
  list.forEach((item) => {
    if (!deduped.has(item.componentId)) {
      deduped.set(item.componentId, item);
    }
  });
  return Array.from(deduped.values());
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

export default function HeaderControls({
  mode,
  onChange,
  designLabel = '组件',
  saveEntityLabel = '组件',
  entityType = 'component',
  enableComponentContract = false,
  enablePageRouteConfig = false,
  extraRight,
}: Props) {
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
  const activeRouteOutletKey = useStore((state) => state.activeRouteOutletKey);
  const sharedUiTree = useStore((state) => state.sharedUiTree);
  const sharedFlowNodes = useStore((state) => state.sharedFlowNodes);
  const sharedFlowEdges = useStore((state) => state.sharedFlowEdges);
  const setCurrentPageMeta = useStore((state) => state.setCurrentPageMeta);
  const selectedLayoutTemplateId = useStore((state) => state.selectedLayoutTemplateId);
  const undo = useStore((state) => state.undo);
  const redo = useStore((state) => state.redo);
  const jumpToHistory = useStore((state) => state.jumpToHistory);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [saveDialogVisible, setSaveDialogVisible] = useState(false);
  const [saveIntent, setSaveIntent] = useState<'save' | 'saveAndPublish'>('save');
  const [componentName, setComponentName] = useState('');
  const [componentId, setComponentId] = useState('');
  const [componentDescription, setComponentDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [shortcutDialogVisible, setShortcutDialogVisible] = useState(false);

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

  const openPreviewWindow = (debug: boolean) => {
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
    if (debug) {
      previewUrl.searchParams.set('debug', 'true');
    }

    window.open(previewUrl.toString(), '_blank', 'noopener,noreferrer');
  };

  const handlePreview = () => {
    const confirmDialog = DialogPlugin.confirm({
      header: '预览选项',
      body: '是否开启调试模式？开启后可在预览页面中使用流程图断点调试功能。',
      confirmBtn: '调试模式预览',
      cancelBtn: '普通预览',
      onConfirm: () => { confirmDialog.hide(); openPreviewWindow(true); },
      onCancel: () => { confirmDialog.hide(); openPreviewWindow(false); },
      onClose: () => { confirmDialog.hide(); },
    });
  };

  const handleOpenSaveDialog = () => {
    setSaveIntent('save');
    setComponentName(currentPageName || '');
    setComponentId(currentPageId || '');
    setComponentDescription(currentPageDescription || '');
    setSaveDialogVisible(true);
  };

  const handleOpenSaveAndPublishDialog = () => {
    setSaveIntent('saveAndPublish');
    setComponentName(currentPageName || '');
    setComponentId(currentPageId || '');
    setComponentDescription(currentPageDescription || '');
    setSaveDialogVisible(true);
  };

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

  const handleCloseSaveDialog = () => {
    if (saving) {
      return;
    }

    setSaveIntent('save');
    setSaveDialogVisible(false);
  };

  /**
   * 保存 / 保存并发布主流程：先做同步校验，再进入耗时阶段（全局 Message loading + 弹窗按钮 loading）。
   * 后续可在「同步校验」与 try 块之间继续插入保存前校验。
   */
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

    const storeSnapshot = useStore.getState();
    const currentTemplateFingerprint = computePersistedTemplateFingerprint(storeSnapshot, {
      enablePageRouteConfig,
      enableComponentContract,
    });
    const noPersistableChangeMessage = getBlockMessageWhenNoPersistableChanges({
      isEditingExisting: isEditMode,
      historyPointer: history.pointer,
      currentTemplateFingerprint,
      lastPersistedTemplateFingerprint: storeSnapshot.lastPersistedTemplateFingerprint,
      formPageName: pageName,
      formDescription: pageDescription,
      storedPageName: currentPageName || '',
      storedDescription: currentPageDescription || '',
    });
    if (noPersistableChangeMessage) {
      emitApiAlert(
        saveIntent === 'saveAndPublish' ? '无法保存并发布' : '无法保存',
        noPersistableChangeMessage,
      );
      return;
    }

    const unpinnedDependencies = collectAllUnpinnedCustomComponents(
      uiTreeData,
      enablePageRouteConfig ? pageRoutes : [],
      enablePageRouteConfig ? sharedUiTree : null,
    );
    if (unpinnedDependencies.length > 0) {
      const previewText = unpinnedDependencies
        .slice(0, 3)
        .map((item) => `${item.componentName}（${item.componentId}）`)
        .join('、');
      emitApiAlert(
        '保存失败',
        `检测到 ${unpinnedDependencies.length} 个自定义组件依赖未固定版本：${previewText}${unpinnedDependencies.length > 3 ? ' 等' : ''}。请先在“依赖更新”中升级/固化后再保存。`,
      );
      return;
    }

    const resolvedOwnerType: 'user' | 'team' = workspaceMode === 'team' ? 'team' : 'user';
    const resolvedOwnerTeamId: string | undefined = resolvedOwnerType === 'team' ? currentTeamId || undefined : undefined;

    if (resolvedOwnerType === 'team' && !resolvedOwnerTeamId) {
      emitApiAlert('保存失败', '当前为团队空间，但未选择团队，请先在侧边栏选择团队后再保存');
      return;
    }

    const loadingText = saveIntent === 'saveAndPublish' ? '正在保存并发布…' : '正在保存…';
    const loadingMessagePromise = MessagePlugin.loading({ content: loadingText, duration: 0 });
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
        uiTree: dehydrateUiTree(uiTreeData) as unknown as Record<string, unknown>,
        flowNodes: flowNodes as unknown as Array<Record<string, unknown>>,
        flowEdges: flowEdges as unknown as Array<Record<string, unknown>>,
        ...(resolvedPageRoutes.length > 0 ? {
          routes: resolvedPageRoutes.map((route) => ({
            routeId: route.routeId,
            routeConfig: route.routeConfig,
            uiTree: dehydrateUiTree(route.uiTree) as unknown as Record<string, unknown>,
            flowNodes: route.flowNodes as unknown as Array<Record<string, unknown>>,
            flowEdges: route.flowEdges as unknown as Array<Record<string, unknown>>,
            selectedLayoutTemplateId: route.selectedLayoutTemplateId,
          })),
        } : {}),
        pageConfig: {
          screenSize,
          autoWidth,
          selectedLayoutTemplateId,
          propsStorageVersion: PROPS_STORAGE_VERSION,
          ...(enablePageRouteConfig && pageRouteConfig ? { routeConfig: pageRouteConfig } : {}),
          ...(enablePageRouteConfig ? {
            ...(activeRouteOutletKey ? { activeRouteOutletKey } : {}),
            ...(sharedUiTree
              ? { sharedUiTree: dehydrateUiTree(sharedUiTree) as unknown as Record<string, unknown> }
              : {}),
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

      const storeApi = useStore.getState();
      storeApi.resetHistoryBaseline();
      const postSaveSnapshot = useStore.getState();
      postSaveSnapshot.setLastPersistedTemplateFingerprint(
        computePersistedTemplateFingerprint(postSaveSnapshot, {
          enablePageRouteConfig,
          enableComponentContract,
        }),
      );

      const shouldPublish = saveIntent === 'saveAndPublish';
      if (shouldPublish) {
        try {
          if (entityType === 'component') {
            await publishComponent({ pageId });
          } else {
            await publishPage({ pageId });
          }
          emitApiAlert('保存并发布成功', `${saveEntityLabel} ${pageName} 已保存并发布`, 'success');
        } catch (error: unknown) {
          const message =
            error && typeof error === 'object' && 'message' in error
              ? String((error as { message?: unknown }).message ?? '')
              : '';
          emitApiAlert(
            '发布失败',
            message
              ? `${saveEntityLabel} 已保存，但发布失败：${message}`
              : `${saveEntityLabel} 已保存，但发布失败，请稍后在列表中重试发布。`,
          );
        }
      } else {
        emitApiAlert('保存成功', `${saveEntityLabel} ${pageName} 已保存`, 'success');
      }

      setSaveIntent('save');
      setSaveDialogVisible(false);
    } finally {
      setSaving(false);
      MessagePlugin.close(loadingMessagePromise);
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
              <TopbarIconButton tip="高级快捷键设置" icon={<SettingIcon />} onClick={() => setShortcutDialogVisible(true)} />
              {extraRight}
              <Button
                theme="primary"
                size="small"
                icon={<UploadIcon />}
                disabled={readOnly}
                loading={saving}
                onClick={handleOpenSaveDialog}
              >
                保存
              </Button>
              <Button
                theme="default"
                size="small"
                variant="outline"
                icon={<JumpIcon />}
                disabled={readOnly}
                loading={saving}
                onClick={handleOpenSaveAndPublishDialog}
              >
                保存并发布
              </Button>
              <Button theme="default" size="small" icon={<ViewImageIcon />} onClick={handlePreview}>预览</Button>
            </TopbarGroup>
          )}
        />
      </div>

      <Dialog
        visible={saveDialogVisible}
        header={saveIntent === 'saveAndPublish' ? `保存并发布${saveEntityLabel}` : `保存${saveEntityLabel}`}
        confirmBtn={{
          content: saveIntent === 'saveAndPublish' ? '保存并发布' : '确认保存',
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
          <div>切换搭建：Ctrl/Cmd+Shift+U（搭建 UI）、Ctrl/Cmd+Shift+F（搭建流程）。</div>
          <div>流程模式快捷键：Ctrl/Cmd+Shift+L / V / K。</div>
          <div>
            组件树/画布：Ctrl/Cmd+Shift+C 清空子节点；Ctrl/Cmd+↑↓ 同级移动；Ctrl/Cmd+Shift+↑↓ 置顶/置底；Alt+方向键（同级微调另一套）。
          </div>
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
}
