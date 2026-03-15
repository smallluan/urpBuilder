/**
 * createBuilderStore —— Builder store 工厂函数。
 *
 * 设计目标：
 * 1. 零副作用：调用方独立控制 store 实例生命周期。
 * 2. 可插拔：通过 options 注入页面级差异能力（布局节点生成、初始根节点等），
 *    方便 CreateComponent / CreatePage 复用同一套 store 骨架。
 * 3. 向后兼容：CreateComponent 直接调用此工厂，对外导出名保持 useCreateComponentStore 不变。
 */

import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import cloneDeep from 'lodash/cloneDeep';
import type { Edge, Node } from '@xyflow/react';
import type {
  BuilderStore,
  BuiltInLayoutTemplateId,
  PageRouteConfig,
  PageRouteRecord,
  RouteScopeConfig,
  UiHistoryAction,
  UiTreeNode,
} from './types';
import {
  appendNodeByParentKey,
  findNodeByKey,
  insertNodeAtParentIndex,
  removeNodeByKey,
  toUiTreeNode,
  updateNodeByKey,
} from '../../utils/createComponentTree';
import { normalizeTabsList, syncTabsSlotNodes } from '../utils/tabs';
import {
  buildEntityPatch,
  cleanupNodePool,   // re-used via pushHistoryAction
  collectTreeKeys,
  containsNodeKey,
  hasDuplicateKey,
  pushHistoryAction,
  resolveActiveNode,
  resolveLayoutTemplateId,
  saveNodeToPool,
  syncDebugVisibleByActiveNode,
  applyHistoryAction,
  applyFlowHistoryAction,
  COMPONENT_KEY_PATTERN,
} from './helpers';

// 在不需要直接使用 cleanupNodePool 的场景下，其封装已由 pushHistoryAction 内部调用
void cleanupNodePool;

export interface CreateBuilderStoreOptions {
  /**
   * 根据内置布局模板 ID 生成初始子节点列表。
  * 由使用方（如 CreateComponent）注入具体实现，避免 builder 内核直接依赖
  * 页面实例层的布局模板数据（循环依赖隔离）。
   */
  buildLayoutNodes?: (templateId: BuiltInLayoutTemplateId) => UiTreeNode[];

  /**
   * Store 初始化时根节点的覆盖配置。
   * 不传时使用通用默认值（空 label，通用 lifetimes）。
   */
  initialRootNode?: Partial<Omit<UiTreeNode, 'children'>>;
}

const DEFAULT_ROOT_NODE: UiTreeNode = {
  key: uuidv4(),
  label: '根节点',
  children: [],
  props: {},
  lifetimes: [],
};

const DEFAULT_PAGE_ROUTE_CONFIG: PageRouteConfig = {
  routePath: '/',
  routeName: 'root',
  pageTitle: '默认路由',
  menuTitle: '默认路由',
  useLayout: true,
};

const createEmptyHistory = () => ({ pointer: -1, actions: [] as UiHistoryAction[] });

const createPageRouteRecord = (
  rootNode: UiTreeNode,
  route?: Partial<PageRouteRecord>,
): PageRouteRecord => ({
  routeId: String(route?.routeId ?? uuidv4()),
  routeConfig: {
    ...DEFAULT_PAGE_ROUTE_CONFIG,
    ...(route?.routeConfig ?? {}),
  },
  uiTree: cloneDeep(route?.uiTree ?? rootNode),
  flowNodes: cloneDeep(route?.flowNodes ?? []),
  flowEdges: cloneDeep(route?.flowEdges ?? []),
  selectedLayoutTemplateId: route?.selectedLayoutTemplateId ?? null,
  history: cloneDeep(route?.history ?? createEmptyHistory()),
});

const ROUTE_SCOPE_META_KEY = '__routeScope';

const normalizeRouteScope = (
  rawScope: unknown,
  activeRouteId: string | null,
): RouteScopeConfig => {
  if (!rawScope || typeof rawScope !== 'object' || Array.isArray(rawScope)) {
    return { mode: 'private' };
  }

  const scope = rawScope as RouteScopeConfig;
  if (scope.mode === 'all') {
    return { mode: 'all' };
  }

  if (scope.mode === 'include') {
    const routeIds = Array.isArray(scope.routeIds)
      ? Array.from(new Set(scope.routeIds.map((item) => String(item ?? '').trim()).filter(Boolean)))
      : [];

    if (routeIds.length === 0) {
      return { mode: 'private' };
    }

    if (routeIds.length === 1 && activeRouteId && routeIds[0] === activeRouteId) {
      return { mode: 'private' };
    }

    return { mode: 'include', routeIds };
  }

  return { mode: 'private' };
};

const getUiNodeRouteScope = (node: UiTreeNode, activeRouteId: string | null): RouteScopeConfig => {
  const rawValue = (node.props?.[ROUTE_SCOPE_META_KEY] as { value?: unknown } | undefined)?.value;
  return normalizeRouteScope(rawValue, activeRouteId);
};

const patchUiNodeRouteScope = (node: UiTreeNode, scope: RouteScopeConfig): UiTreeNode => {
  const nextProps = {
    ...(node.props ?? {}),
    [ROUTE_SCOPE_META_KEY]: {
      name: '路由作用域',
      value: scope,
    },
  };

  return {
    ...node,
    props: nextProps,
  };
};

const getFlowEntityRouteScope = (
  data: unknown,
  activeRouteId: string | null,
): RouteScopeConfig => {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { mode: 'private' };
  }

  const rawScope = (data as Record<string, unknown>)[ROUTE_SCOPE_META_KEY];
  return normalizeRouteScope(rawScope, activeRouteId);
};

const isScopeSharedForRoute = (scope: RouteScopeConfig, routeId: string | null): boolean => {
  if (scope.mode === 'all') {
    return true;
  }

  if (scope.mode === 'include') {
    const routeIds = Array.isArray(scope.routeIds) ? scope.routeIds : [];
    return Boolean(routeId) && routeIds.includes(String(routeId));
  }

  return false;
};

const isPrivateScope = (scope: RouteScopeConfig): boolean => scope.mode === 'private';

const findFirstRouteOutletKey = (root: UiTreeNode): string | null => {
  if (root.type === 'RouteOutlet') {
    return root.key;
  }

  for (const child of root.children ?? []) {
    const found = findFirstRouteOutletKey(child);
    if (found) {
      return found;
    }
  }

  return null;
};

const resolveEffectiveOutletKey = (tree: UiTreeNode, preferredKey: string | null): string | null => {
  if (preferredKey) {
    const preferredNode = findNodeByKey(tree, preferredKey);
    if (preferredNode?.type === 'RouteOutlet') {
      return preferredKey;
    }
  }

  return findFirstRouteOutletKey(tree);
};

const composeRouteUiTree = (
  privateTree: UiTreeNode,
  sharedTree: UiTreeNode | null,
  outletKey: string | null,
): UiTreeNode => {
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
  privateNodes: Node[],
  privateEdges: Edge[],
  sharedNodes: Node[],
  sharedEdges: Edge[],
): { flowNodes: Node[]; flowEdges: Edge[] } => {
  const visibleSharedNodes = sharedNodes;

  const mergedNodeMap = new Map<string, Node>();
  visibleSharedNodes.forEach((node) => {
    mergedNodeMap.set(node.id, cloneDeep(node));
  });
  privateNodes.forEach((node) => {
    mergedNodeMap.set(node.id, cloneDeep(node));
  });
  const flowNodes = Array.from(mergedNodeMap.values());
  const flowNodeIds = new Set(flowNodes.map((node) => node.id));

  const visibleSharedEdges = sharedEdges;

  const mergedEdgeMap = new Map<string, Edge>();
  visibleSharedEdges.forEach((edge) => {
    if (flowNodeIds.has(edge.source) && flowNodeIds.has(edge.target)) {
      mergedEdgeMap.set(edge.id, cloneDeep(edge));
    }
  });
  privateEdges.forEach((edge) => {
    if (flowNodeIds.has(edge.source) && flowNodeIds.has(edge.target)) {
      mergedEdgeMap.set(edge.id, cloneDeep(edge));
    }
  });

  return {
    flowNodes,
    flowEdges: Array.from(mergedEdgeMap.values()),
  };
};

const resolveFlowSourceKey = (node: Node): string => {
  const nodeData = (node.data ?? {}) as { sourceKey?: unknown; sourceRef?: unknown };
  if (typeof nodeData.sourceKey === 'string' && nodeData.sourceKey.trim()) {
    return nodeData.sourceKey.trim();
  }

  if (typeof nodeData.sourceRef === 'string' && nodeData.sourceRef.startsWith('root::')) {
    return nodeData.sourceRef.slice('root::'.length).trim();
  }

  return '';
};

const syncRouteSnapshotsWithActiveState = (
  state: BuilderStore,
): {
  nextRoutes: PageRouteRecord[];
  nextSharedUiTree: UiTreeNode | null;
  nextSharedFlowNodes: Node[];
  nextSharedFlowEdges: Edge[];
  activeRouteOutletKey: string | null;
} => {
  if (!state.activePageRouteId) {
    return {
      nextRoutes: state.pageRoutes,
      nextSharedUiTree: state.sharedUiTree,
      nextSharedFlowNodes: state.sharedFlowNodes,
      nextSharedFlowEdges: state.sharedFlowEdges,
      activeRouteOutletKey: state.activeRouteOutletKey,
    };
  }

  const activeRouteId = state.activePageRouteId;
  const outletKey = resolveEffectiveOutletKey(state.uiPageData, state.activeRouteOutletKey);
  const outletNode = outletKey ? findNodeByKey(state.uiPageData, outletKey) : null;

  if (outletNode?.type === 'RouteOutlet') {
    const outletNodeKey = String(outletKey);
    const outletTreeKeys = collectTreeKeys(outletNode);

    const nextSharedUiTree = updateNodeByKey(cloneDeep(state.uiPageData), outletNodeKey, (target) => ({
      ...target,
      children: [],
    }));

    const privateUiTree: UiTreeNode = cloneDeep(state.uiPageData);

    const privateNodeIdSet = new Set<string>();
    state.flowNodes.forEach((node) => {
      const sourceKey = resolveFlowSourceKey(node);
      if (sourceKey && outletTreeKeys.has(sourceKey)) {
        privateNodeIdSet.add(node.id);
      }
    });

    let changed = true;
    while (changed) {
      changed = false;
      state.flowEdges.forEach((edge) => {
        const sourcePrivate = privateNodeIdSet.has(edge.source);
        const targetPrivate = privateNodeIdSet.has(edge.target);
        if (sourcePrivate && !targetPrivate) {
          privateNodeIdSet.add(edge.target);
          changed = true;
        } else if (!sourcePrivate && targetPrivate) {
          privateNodeIdSet.add(edge.source);
          changed = true;
        }
      });
    }

    const privateFlowNodes = state.flowNodes
      .filter((node) => privateNodeIdSet.has(node.id))
      .map((node) => cloneDeep(node));
    const nextSharedFlowNodes = state.flowNodes
      .filter((node) => !privateNodeIdSet.has(node.id))
      .map((node) => cloneDeep(node));

    const privateFlowEdges = state.flowEdges
      .filter((edge) => privateNodeIdSet.has(edge.source) && privateNodeIdSet.has(edge.target))
      .map((edge) => cloneDeep(edge));
    const nextSharedFlowEdges = state.flowEdges
      .filter((edge) => !privateNodeIdSet.has(edge.source) || !privateNodeIdSet.has(edge.target))
      .map((edge) => cloneDeep(edge));

    const nextRoutes = state.pageRoutes.map((route) => {
      if (route.routeId !== activeRouteId) {
        return route;
      }

      return {
        ...route,
        routeConfig: cloneDeep(state.pageRouteConfig ?? route.routeConfig),
        uiTree: privateUiTree,
        flowNodes: privateFlowNodes,
        flowEdges: privateFlowEdges,
        selectedLayoutTemplateId: state.selectedLayoutTemplateId,
        history: cloneDeep(state.history),
      };
    });

    return {
      nextRoutes,
      nextSharedUiTree,
      nextSharedFlowNodes,
      nextSharedFlowEdges,
      activeRouteOutletKey: outletKey,
    };
  }

  const privateUiChildren: UiTreeNode[] = [];
  const sharedUiCandidates: UiTreeNode[] = [];

  (state.uiPageData.children ?? []).forEach((child) => {
    const scope = getUiNodeRouteScope(child, activeRouteId);
    if (isPrivateScope(scope)) {
      privateUiChildren.push(cloneDeep(child));
      return;
    }

    sharedUiCandidates.push(cloneDeep(child));
  });

  const previousSharedChildren = state.sharedUiTree?.children ?? [];

  const visibleSharedUiKeysBefore = new Set(
    previousSharedChildren
      .filter((item) => isScopeSharedForRoute(getUiNodeRouteScope(item, activeRouteId), activeRouteId))
      .map((item) => item.key),
  );
  const nextSharedUiMap = new Map<string, UiTreeNode>(
    previousSharedChildren
      .filter((item) => !visibleSharedUiKeysBefore.has(item.key))
      .map((item) => [item.key, cloneDeep(item)]),
  );
  sharedUiCandidates.forEach((item) => {
    nextSharedUiMap.set(item.key, cloneDeep(item));
  });

  const privateUiTree: UiTreeNode = {
    ...cloneDeep(state.uiPageData),
    children: privateUiChildren,
  };

  const privateFlowNodes: Node[] = [];
  const sharedFlowNodeCandidates: Node[] = [];
  state.flowNodes.forEach((node) => {
    const scope = getFlowEntityRouteScope(node.data, activeRouteId);
    if (isPrivateScope(scope)) {
      privateFlowNodes.push(cloneDeep(node));
      return;
    }

    sharedFlowNodeCandidates.push(cloneDeep(node));
  });

  const visibleSharedFlowNodeIdsBefore = new Set(
    state.sharedFlowNodes
      .filter((node) => isScopeSharedForRoute(getFlowEntityRouteScope(node.data, activeRouteId), activeRouteId))
      .map((node) => node.id),
  );
  const nextSharedFlowNodeMap = new Map<string, Node>(
    state.sharedFlowNodes
      .filter((node) => !visibleSharedFlowNodeIdsBefore.has(node.id))
      .map((node) => [node.id, cloneDeep(node)]),
  );
  sharedFlowNodeCandidates.forEach((node) => {
    nextSharedFlowNodeMap.set(node.id, cloneDeep(node));
  });

  const activeFlowNodeIds = new Set(state.flowNodes.map((node) => node.id));
  const privateFlowEdges: Edge[] = [];
  const sharedFlowEdgeCandidates: Edge[] = [];
  state.flowEdges.forEach((edge) => {
    if (!activeFlowNodeIds.has(edge.source) || !activeFlowNodeIds.has(edge.target)) {
      return;
    }

    const scope = getFlowEntityRouteScope(edge.data, activeRouteId);
    if (isPrivateScope(scope)) {
      privateFlowEdges.push(cloneDeep(edge));
      return;
    }

    sharedFlowEdgeCandidates.push(cloneDeep(edge));
  });

  const visibleSharedFlowEdgeIdsBefore = new Set(
    state.sharedFlowEdges
      .filter((edge) => isScopeSharedForRoute(getFlowEntityRouteScope(edge.data, activeRouteId), activeRouteId))
      .map((edge) => edge.id),
  );
  const nextSharedFlowEdgeMap = new Map<string, Edge>(
    state.sharedFlowEdges
      .filter((edge) => !visibleSharedFlowEdgeIdsBefore.has(edge.id))
      .map((edge) => [edge.id, cloneDeep(edge)]),
  );
  sharedFlowEdgeCandidates.forEach((edge) => {
    nextSharedFlowEdgeMap.set(edge.id, cloneDeep(edge));
  });

  const nextRoutes = state.pageRoutes.map((route) => {
    if (route.routeId !== activeRouteId) {
      return route;
    }

    return {
      ...route,
      routeConfig: cloneDeep(state.pageRouteConfig ?? route.routeConfig),
      uiTree: privateUiTree,
      flowNodes: privateFlowNodes,
      flowEdges: privateFlowEdges,
      selectedLayoutTemplateId: state.selectedLayoutTemplateId,
      history: cloneDeep(state.history),
    };
  });

  return {
    nextRoutes,
    nextSharedUiTree: {
      ...cloneDeep(state.uiPageData),
      children: Array.from(nextSharedUiMap.values()),
    },
    nextSharedFlowNodes: Array.from(nextSharedFlowNodeMap.values()),
    nextSharedFlowEdges: Array.from(nextSharedFlowEdgeMap.values()),
    activeRouteOutletKey: outletKey,
  };
};

export const createBuilderStore = (options: CreateBuilderStoreOptions = {}) => {
  const { buildLayoutNodes, initialRootNode } = options;
  const rootNode: UiTreeNode = {
    ...DEFAULT_ROOT_NODE,
    ...initialRootNode,
    key: initialRootNode?.key ?? uuidv4(),
  };

  return create<BuilderStore>((set) => ({
    // ===== 视图环境 =====
    screenSize: 'auto',
    autoWidth: 1800,
    currentPageId: '',
    currentPageName: '',
    currentPageVisibility: 'private',
    pageRouteConfig: null,
    pageRoutes: [],
    activePageRouteId: null,
    activeRouteOutletKey: null,
    sharedUiTree: null,
    sharedFlowNodes: [],
    sharedFlowEdges: [],

    // ===== 流程图状态 =====
    flowNodes: [],
    flowEdges: [],
    flowActiveNodeId: null,

    // ===== UI 树状态 =====
    uiPageData: rootNode,
    activeNodeKey: null,
    activeNode: null,
    selectedLayoutTemplateId: null,
    treeInstance: null,

    // ===== 历史系统 =====
    history: createEmptyHistory(),

    // ===== Actions — 视图环境 =====

    setScreenSize: (screenSize) => set({ screenSize }),

    setAutoWidth: (width) => set({ autoWidth: width }),

    setCurrentPageMeta: ({ pageId, pageName, visibility }) =>
      set((state) => ({
        currentPageId: pageId ?? state.currentPageId,
        currentPageName: pageName ?? state.currentPageName,
        currentPageVisibility: visibility ?? state.currentPageVisibility,
      })),

    setPageRouteConfig: (config) =>
      set((state) => ({
        pageRouteConfig:
          typeof config === 'function'
            ? (config as (previous: typeof state.pageRouteConfig) => typeof state.pageRouteConfig)(state.pageRouteConfig)
            : config,
      })),

    setPageRoutes: (routes, activeRouteId = null) =>
      set(() => {
        const normalizedRoutes = Array.isArray(routes)
          ? routes.map((route) => createPageRouteRecord(rootNode, route))
          : [];
        const nextActiveRouteId = activeRouteId ?? normalizedRoutes[0]?.routeId ?? null;
        const activeRoute = normalizedRoutes.find((item) => item.routeId === nextActiveRouteId) ?? null;

        if (!activeRoute) {
          return {
            pageRoutes: [],
            activePageRouteId: null,
            pageRouteConfig: null,
            activeRouteOutletKey: null,
            sharedUiTree: null,
            sharedFlowNodes: [],
            sharedFlowEdges: [],
          };
        }

        const composedUiTree = composeRouteUiTree(activeRoute.uiTree, null, null);
        const composedFlow = composeRouteFlow(activeRoute.flowNodes, activeRoute.flowEdges, [], []);

        return {
          pageRoutes: normalizedRoutes,
          activePageRouteId: activeRoute.routeId,
          pageRouteConfig: cloneDeep(activeRoute.routeConfig),
          uiPageData: composedUiTree,
          flowNodes: composedFlow.flowNodes,
          flowEdges: composedFlow.flowEdges,
          selectedLayoutTemplateId: activeRoute.selectedLayoutTemplateId,
          history: cloneDeep(activeRoute.history),
          activeNodeKey: null,
          activeNode: null,
          flowActiveNodeId: null,
          activeRouteOutletKey: resolveEffectiveOutletKey(composedUiTree, null),
          sharedUiTree: null,
          sharedFlowNodes: [],
          sharedFlowEdges: [],
        };
      }),

    addPageRoute: (route) => {
      const routeId = String(route?.routeId ?? uuidv4());
      set((state) => {
        const nextRoute = createPageRouteRecord(rootNode, {
          ...route,
          routeId,
        });
        return {
          pageRoutes: [...state.pageRoutes, nextRoute],
        };
      });
      return routeId;
    },

    switchPageRoute: (routeId) =>
      set((state) => {
        const normalizedRouteId = String(routeId ?? '').trim();
        if (!normalizedRouteId || state.activePageRouteId === normalizedRouteId) {
          return state;
        }

        const synced = syncRouteSnapshotsWithActiveState(state);
        const nextRoutes = synced.nextRoutes;

        const targetRoute = nextRoutes.find((route) => route.routeId === normalizedRouteId);
        if (!targetRoute) {
          return state;
        }

        const composedUiTree = composeRouteUiTree(targetRoute.uiTree, synced.nextSharedUiTree, synced.activeRouteOutletKey);
        const composedFlow = composeRouteFlow(
          targetRoute.flowNodes,
          targetRoute.flowEdges,
          synced.nextSharedFlowNodes,
          synced.nextSharedFlowEdges,
        );

        return {
          pageRoutes: nextRoutes,
          activeRouteOutletKey: synced.activeRouteOutletKey,
          sharedUiTree: synced.nextSharedUiTree,
          sharedFlowNodes: synced.nextSharedFlowNodes,
          sharedFlowEdges: synced.nextSharedFlowEdges,
          activePageRouteId: targetRoute.routeId,
          pageRouteConfig: cloneDeep(targetRoute.routeConfig),
          uiPageData: composedUiTree,
          flowNodes: composedFlow.flowNodes,
          flowEdges: composedFlow.flowEdges,
          selectedLayoutTemplateId: targetRoute.selectedLayoutTemplateId,
          history: cloneDeep(targetRoute.history),
          activeNodeKey: null,
          activeNode: null,
          flowActiveNodeId: null,
        };
      }),

    removePageRoute: (routeId) =>
      set((state) => {
        const normalizedRouteId = String(routeId ?? '').trim();
        if (!normalizedRouteId || state.pageRoutes.length <= 1) {
          return state;
        }

        const synced = syncRouteSnapshotsWithActiveState(state);
        const routesWithSnapshot = synced.nextRoutes;

        const removeIndex = routesWithSnapshot.findIndex((route) => route.routeId === normalizedRouteId);
        if (removeIndex < 0) {
          return state;
        }

        const nextRoutes = routesWithSnapshot.filter((route) => route.routeId !== normalizedRouteId);

        if (state.activePageRouteId !== normalizedRouteId) {
          return {
            pageRoutes: nextRoutes,
            activeRouteOutletKey: synced.activeRouteOutletKey,
            sharedUiTree: synced.nextSharedUiTree,
            sharedFlowNodes: synced.nextSharedFlowNodes,
            sharedFlowEdges: synced.nextSharedFlowEdges,
          };
        }

        const nextActiveRoute = nextRoutes[Math.min(removeIndex, nextRoutes.length - 1)] ?? nextRoutes[0] ?? null;
        if (!nextActiveRoute) {
          return state;
        }

        const composedUiTree = composeRouteUiTree(nextActiveRoute.uiTree, synced.nextSharedUiTree, synced.activeRouteOutletKey);
        const composedFlow = composeRouteFlow(
          nextActiveRoute.flowNodes,
          nextActiveRoute.flowEdges,
          synced.nextSharedFlowNodes,
          synced.nextSharedFlowEdges,
        );

        return {
          pageRoutes: nextRoutes,
          activeRouteOutletKey: synced.activeRouteOutletKey,
          sharedUiTree: synced.nextSharedUiTree,
          sharedFlowNodes: synced.nextSharedFlowNodes,
          sharedFlowEdges: synced.nextSharedFlowEdges,
          activePageRouteId: nextActiveRoute.routeId,
          pageRouteConfig: cloneDeep(nextActiveRoute.routeConfig),
          uiPageData: composedUiTree,
          flowNodes: composedFlow.flowNodes,
          flowEdges: composedFlow.flowEdges,
          selectedLayoutTemplateId: nextActiveRoute.selectedLayoutTemplateId,
          history: cloneDeep(nextActiveRoute.history),
          activeNodeKey: null,
          activeNode: null,
          flowActiveNodeId: null,
        };
      }),

    setDefaultPageRoute: (routeId) =>
      set((state) => {
        const normalizedRouteId = String(routeId ?? '').trim();
        if (!normalizedRouteId || state.pageRoutes.length <= 1) {
          return state;
        }

        const synced = syncRouteSnapshotsWithActiveState(state);
        const routesWithSnapshot = synced.nextRoutes;

        const currentIndex = routesWithSnapshot.findIndex((route) => route.routeId === normalizedRouteId);
        if (currentIndex <= 0) {
          return state;
        }

        const nextRoutes = [...routesWithSnapshot];
        const [defaultRoute] = nextRoutes.splice(currentIndex, 1);
        nextRoutes.unshift(defaultRoute);

        return {
          pageRoutes: nextRoutes,
          activeRouteOutletKey: synced.activeRouteOutletKey,
          sharedUiTree: synced.nextSharedUiTree,
          sharedFlowNodes: synced.nextSharedFlowNodes,
          sharedFlowEdges: synced.nextSharedFlowEdges,
        };
      }),

    setActiveRouteOutletKey: (outletKey) =>
      set((state) => {
        const normalizedOutletKey = String(outletKey ?? '').trim() || null;
        const synced = syncRouteSnapshotsWithActiveState(state);
        const activeRoute = synced.nextRoutes.find((route) => route.routeId === state.activePageRouteId) ?? null;
        if (!activeRoute) {
          return state;
        }

        const composedUiTree = composeRouteUiTree(activeRoute.uiTree, synced.nextSharedUiTree, normalizedOutletKey);
        const effectiveOutletKey = resolveEffectiveOutletKey(composedUiTree, normalizedOutletKey);
        const recomposedUiTree = composeRouteUiTree(activeRoute.uiTree, synced.nextSharedUiTree, effectiveOutletKey);
        const composedFlow = composeRouteFlow(
          activeRoute.flowNodes,
          activeRoute.flowEdges,
          synced.nextSharedFlowNodes,
          synced.nextSharedFlowEdges,
        );

        return {
          pageRoutes: synced.nextRoutes,
          activeRouteOutletKey: effectiveOutletKey,
          sharedUiTree: synced.nextSharedUiTree,
          sharedFlowNodes: synced.nextSharedFlowNodes,
          sharedFlowEdges: synced.nextSharedFlowEdges,
          uiPageData: recomposedUiTree,
          flowNodes: composedFlow.flowNodes,
          flowEdges: composedFlow.flowEdges,
          activeNodeKey: null,
          activeNode: null,
          flowActiveNodeId: null,
        };
      }),

    syncActivePageRouteSnapshot: () =>
      set((state) => {
        if (!state.activePageRouteId || state.pageRoutes.length === 0) {
          return state;
        }

        const synced = syncRouteSnapshotsWithActiveState(state);
        return {
          pageRoutes: synced.nextRoutes,
          activeRouteOutletKey: synced.activeRouteOutletKey,
          sharedUiTree: synced.nextSharedUiTree,
          sharedFlowNodes: synced.nextSharedFlowNodes,
          sharedFlowEdges: synced.nextSharedFlowEdges,
        };
      }),

    // ===== Actions — 流程图 =====

    setFlowNodes: (flowNodes) =>
      set((state) => {
        const nextFlowNodes =
          typeof flowNodes === 'function'
            ? (flowNodes as (previous: Node[]) => Node[])(state.flowNodes)
            : flowNodes;
        return {
          flowNodes: nextFlowNodes,
          flowActiveNodeId: state.flowActiveNodeId
            ? nextFlowNodes.some((item) => item.id === state.flowActiveNodeId)
              ? state.flowActiveNodeId
              : null
            : null,
        };
      }),

    setFlowEdges: (flowEdges) =>
      set((state) => ({
        flowEdges:
          typeof flowEdges === 'function'
            ? (flowEdges as (previous: Edge[]) => Edge[])(state.flowEdges)
            : flowEdges,
      })),

    setFlowActiveNodeId: (flowActiveNodeId) => set({ flowActiveNodeId }),

    // ===== Actions — UI 树 =====

    setActiveNode: (nodeKey) =>
      set((state) => {
        const nextActiveNodeKey = nodeKey ?? null;
        const nextTree = syncDebugVisibleByActiveNode(
          state.uiPageData,
          state.activeNodeKey,
          nextActiveNodeKey,
        );
        const nextActiveNode = resolveActiveNode(nextTree, nextActiveNodeKey);
        return {
          uiPageData: nextTree,
          activeNodeKey: nextActiveNodeKey,
          activeNode: nextActiveNode,
          activeRouteOutletKey:
            nextActiveNode?.type === 'RouteOutlet'
              ? nextActiveNode.key
              : state.activeRouteOutletKey,
        };
      }),

    toggleActiveNode: (nodeKey) =>
      set((state) => {
        const nextActiveNodeKey = state.activeNodeKey === nodeKey ? null : nodeKey ?? null;
        const nextTree = syncDebugVisibleByActiveNode(
          state.uiPageData,
          state.activeNodeKey,
          nextActiveNodeKey,
        );
        const nextActiveNode = resolveActiveNode(nextTree, nextActiveNodeKey);
        return {
          uiPageData: nextTree,
          activeNodeKey: nextActiveNodeKey,
          activeNode: nextActiveNode,
          activeRouteOutletKey:
            nextActiveNode?.type === 'RouteOutlet'
              ? nextActiveNode.key
              : state.activeRouteOutletKey,
        };
      }),

    updateActiveNodeLabel: (label) =>
      set((state) => {
        if (!state.activeNodeKey) return state;
        const currentNode = resolveActiveNode(state.uiPageData, state.activeNodeKey);
        if (!currentNode || currentNode.label === label) return state;

        const nextTree = updateNodeByKey(state.uiPageData, state.activeNodeKey, (target) => ({
          ...target,
          label,
        }));

        const action: UiHistoryAction = {
          type: 'update-label',
          nodeKey: state.activeNodeKey,
          nodeType: currentNode.type,
          prevLabel: currentNode.label,
          nextLabel: label,
          timestamp: Date.now(),
        };
        const nextHistory = pushHistoryAction(state.history.actions, state.history.pointer, action);

        return {
          uiPageData: nextTree,
          activeNode: resolveActiveNode(nextTree, state.activeNodeKey),
          history: nextHistory,
        };
      }),

    updateActiveNodeKey: (nextKey) => {
      const trimmedKey = String(nextKey ?? '').trim();
      if (!trimmedKey) {
        return { success: false, message: '组件标识不能为空' };
      }
      if (!COMPONENT_KEY_PATTERN.test(trimmedKey)) {
        return {
          success: false,
          message: '组件标识仅支持字母、数字、下划线(_)和中划线(-)',
        };
      }

      let result: { success: boolean; message?: string } = { success: true };

      set((state) => {
        if (!state.activeNodeKey) {
          result = { success: false, message: '请先选择组件' };
          return state;
        }
        const currentNode = resolveActiveNode(state.uiPageData, state.activeNodeKey);
        if (!currentNode) {
          result = { success: false, message: '当前组件不存在' };
          return state;
        }
        if (currentNode.key === trimmedKey) {
          result = { success: true };
          return state;
        }
        if (hasDuplicateKey(state.uiPageData, trimmedKey, currentNode.key)) {
          result = { success: false, message: `组件标识"${trimmedKey}"已存在，请更换` };
          return state;
        }

        const prevKey = currentNode.key;
        const nextTree = updateNodeByKey(state.uiPageData, prevKey, (target) => ({
          ...target,
          key: trimmedKey,
        }));

        const nextFlowNodes = state.flowNodes.map((node) => {
          if (node.type !== 'componentNode' && node.type !== 'propExposeNode') return node;
          const nodeData = (node.data ?? {}) as { sourceKey?: string; sourceRef?: string };
          const sourceKeyMatched = nodeData.sourceKey === prevKey;
          const sourceRefMatched = typeof nodeData.sourceRef === 'string' && nodeData.sourceRef.trim() === `root::${prevKey}`;
          if (!sourceKeyMatched && !sourceRefMatched) return node;
          return {
            ...node,
            data: {
              ...nodeData,
              sourceKey: sourceKeyMatched ? trimmedKey : nodeData.sourceKey,
              sourceRef: sourceRefMatched ? `root::${trimmedKey}` : nodeData.sourceRef,
            },
          };
        });

        result = { success: true };
        return {
          uiPageData: nextTree,
          flowNodes: nextFlowNodes,
          activeNodeKey: trimmedKey,
          activeNode: resolveActiveNode(nextTree, trimmedKey),
        };
      });

      return result;
    },

    updateActiveNodeProp: (propKey, value) =>
      set((state) => {
        if (!state.activeNodeKey) return state;
        const currentNode = resolveActiveNode(state.uiPageData, state.activeNodeKey);
        if (!currentNode) return state;

        const currentProps = (currentNode.props ?? {}) as Record<string, unknown>;
        const currentProp = (currentProps[propKey] ?? {}) as Record<string, unknown>;
        const prevValue = currentProp.value;
        if (Object.is(prevValue, value)) return state;

        let nextTree = updateNodeByKey(state.uiPageData, state.activeNodeKey, (target) => {
          const tProps = (target.props ?? {}) as Record<string, unknown>;
          const tProp = (tProps[propKey] ?? {}) as Record<string, unknown>;
          return {
            ...target,
            props: { ...tProps, [propKey]: { ...tProp, value } },
          };
        });

        // List：关闭自定义模板时清空 List.Item 子节点
        if (currentNode.type === 'List' && propKey === 'customTemplateEnabled' && value === false) {
          nextTree = updateNodeByKey(nextTree, state.activeNodeKey, (target) => ({
            ...target,
            children: (target.children ?? []).map((child) =>
              child.type === 'List.Item' ? { ...child, children: [] } : child,
            ),
          }));
        }

        // Tabs：同步插槽节点
        if (currentNode.type === 'Tabs' && propKey === 'list') {
          const tabsList = normalizeTabsList(value);
          nextTree = updateNodeByKey(nextTree, state.activeNodeKey, (target) =>
            syncTabsSlotNodes(target, tabsList),
          );
        }

        const action: UiHistoryAction = {
          type: 'update-prop',
          nodeKey: state.activeNodeKey,
          nodeLabel: currentNode.label,
          nodeType: currentNode.type,
          propKey,
          prevValue,
          nextValue: value,
          timestamp: Date.now(),
        };
        const nextHistory = pushHistoryAction(state.history.actions, state.history.pointer, action);

        return {
          uiPageData: nextTree,
          activeNode: resolveActiveNode(nextTree, state.activeNodeKey),
          history: nextHistory,
        };
      }),

    setActiveNodeRouteScope: (scope) =>
      set((state) => {
        if (!state.activeNodeKey || !state.activePageRouteId) {
          return state;
        }

        const normalizedScope = normalizeRouteScope(scope, state.activePageRouteId);
        const currentNode = resolveActiveNode(state.uiPageData, state.activeNodeKey);
        if (!currentNode) {
          return state;
        }

        const prevScope = getUiNodeRouteScope(currentNode, state.activePageRouteId);
        if (JSON.stringify(prevScope) === JSON.stringify(normalizedScope)) {
          return state;
        }

        const nextTree = updateNodeByKey(state.uiPageData, state.activeNodeKey, (target) =>
          patchUiNodeRouteScope(target, normalizedScope),
        );

        return {
          uiPageData: nextTree,
          activeNode: resolveActiveNode(nextTree, state.activeNodeKey),
        };
      }),

    setTreeInstance: (instance) => set({ treeInstance: instance }),

    insertToUiPageData: (parentKey, componentData, slotKey) =>
      set((state) => {
        const parentNode = findNodeByKey(state.uiPageData, parentKey);
        if (!parentNode) return state;

        const newNode = toUiTreeNode(componentData);
        if (slotKey) {
          const currentProps = (newNode.props ?? {}) as Record<string, unknown>;
          newNode.props = {
            ...currentProps,
            __slot: {
              ...((currentProps.__slot ?? {}) as Record<string, unknown>),
              value: slotKey,
            },
          };
        }

        const nodeRef = saveNodeToPool(newNode);
        const index = parentNode.children?.length ?? 0;
        const action: UiHistoryAction = {
          type: 'add',
          parentKey,
          index,
          nodeRef,
          nodeKey: newNode.key,
          nodeLabel: newNode.label,
          nodeType: newNode.type,
          timestamp: Date.now(),
        };

        const nextHistory = pushHistoryAction(state.history.actions, state.history.pointer, action);
        const nextTree = appendNodeByParentKey(state.uiPageData, parentKey, newNode);
        return {
          uiPageData: nextTree,
          activeNode: resolveActiveNode(nextTree, state.activeNodeKey),
          history: nextHistory,
        };
      }),

    removeFromUiPageData: (nodeKey) =>
      set((state) => {
        if (nodeKey === state.uiPageData.key) return state;

        const result = removeNodeByKey(state.uiPageData, nodeKey);
        if (!result.removedNode || !result.parentKey || result.index < 0) return state;

        const removedTreeKeys = collectTreeKeys(result.removedNode);
        const flowNodesToRemove = state.flowNodes.filter((node) => {
          if (node.type !== 'componentNode' && node.type !== 'propExposeNode') return false;
          const nodeData = (node.data as { sourceKey?: string; sourceRef?: string } | undefined) ?? {};
          const sourceKey = nodeData.sourceKey;
          if (typeof sourceKey === 'string' && removedTreeKeys.has(sourceKey)) {
            return true;
          }

          const sourceRef = typeof nodeData.sourceRef === 'string' ? nodeData.sourceRef.trim() : '';
          if (!sourceRef.startsWith('root::')) {
            return false;
          }

          const sourceRefKey = sourceRef.slice('root::'.length);
          return !!sourceRefKey && removedTreeKeys.has(sourceRefKey);
        });

        const removedFlowNodeIds = new Set(flowNodesToRemove.map((node) => node.id));
        const flowEdgesToRemove = state.flowEdges.filter(
          (edge) => removedFlowNodeIds.has(edge.source) || removedFlowNodeIds.has(edge.target),
        );
        const removedFlowEdgeIds = new Set(flowEdgesToRemove.map((edge) => edge.id));

        const nextFlowNodes = state.flowNodes
          .filter((node) => !removedFlowNodeIds.has(node.id))
          .map((node) => {
            if (node.type === 'eventFilterNode') {
              const nodeData = (node.data ?? {}) as {
                upstreamNodeId?: string;
                upstreamLabel?: string;
                availableLifetimes?: string[];
                selectedLifetimes?: string[];
              };
              if (!nodeData.upstreamNodeId || !removedFlowNodeIds.has(nodeData.upstreamNodeId)) {
                return node;
              }
              return {
                ...node,
                data: {
                  ...nodeData,
                  upstreamNodeId: undefined,
                  upstreamLabel: undefined,
                  availableLifetimes: [],
                  selectedLifetimes: [],
                },
              };
            }

            if (node.type === 'lifecycleExposeNode') {
              const nodeData = (node.data ?? {}) as {
                upstreamNodeId?: string;
                upstreamLabel?: string;
                availableLifetimes?: string[];
                selectedLifetimes?: string[];
              };
              if (!nodeData.upstreamNodeId || !removedFlowNodeIds.has(nodeData.upstreamNodeId)) {
                return node;
              }
              return {
                ...node,
                data: {
                  ...nodeData,
                  upstreamNodeId: undefined,
                  upstreamLabel: undefined,
                  availableLifetimes: [],
                  selectedLifetimes: [],
                },
              };
            }

            if (node.type === 'propExposeNode') {
              const nodeData = (node.data ?? {}) as {
                sourceNodeId?: string;
                sourceLabel?: string;
                availablePropKeys?: string[];
                selectedPropKeys?: string[];
              };
              if (!nodeData.sourceNodeId || !removedFlowNodeIds.has(nodeData.sourceNodeId)) {
                return node;
              }
              return {
                ...node,
                data: {
                  ...nodeData,
                  sourceNodeId: undefined,
                  sourceLabel: undefined,
                  availablePropKeys: [],
                  selectedPropKeys: [],
                },
              };
            }

            return node;
          });

        const nextFlowNodeIds = new Set(nextFlowNodes.map((node) => node.id));
        const nextFlowEdges = state.flowEdges.filter(
          (edge) =>
            !removedFlowEdgeIds.has(edge.id) &&
            !removedFlowNodeIds.has(edge.source) &&
            !removedFlowNodeIds.has(edge.target) &&
            nextFlowNodeIds.has(edge.source) &&
            nextFlowNodeIds.has(edge.target),
        );

        const flowSnapshot =
          flowNodesToRemove.length > 0 || flowEdgesToRemove.length > 0
            ? { nodes: cloneDeep(flowNodesToRemove), edges: cloneDeep(flowEdgesToRemove) }
            : undefined;

        const nodeRef = saveNodeToPool(result.removedNode);
        const action: UiHistoryAction = {
          type: 'remove',
          parentKey: result.parentKey,
          index: result.index,
          nodeRef,
          nodeKey: result.removedNode.key,
          nodeLabel: result.removedNode.label,
          nodeType: result.removedNode.type,
          flowSnapshot,
          timestamp: Date.now(),
        };

        const nextHistory = pushHistoryAction(state.history.actions, state.history.pointer, action);
        const shouldClearActive =
          !!state.activeNodeKey && containsNodeKey(result.removedNode, state.activeNodeKey);
        const nextActiveNodeKey = shouldClearActive ? null : state.activeNodeKey;

        return {
          uiPageData: result.tree,
          flowNodes: nextFlowNodes,
          flowEdges: nextFlowEdges,
          activeNodeKey: nextActiveNodeKey,
          activeNode: resolveActiveNode(result.tree, nextActiveNodeKey),
          history: nextHistory,
        };
      }),

    moveUiNode: (nodeKey, targetParentKey, targetIndex, slotKey) =>
      set((state) => {
        const sourceKey = String(nodeKey ?? '').trim();
        const parentKey = String(targetParentKey ?? '').trim();
        if (!sourceKey || !parentKey || sourceKey === state.uiPageData.key) {
          return state;
        }

        const removed = removeNodeByKey(state.uiPageData, sourceKey);
        if (!removed.removedNode || !removed.parentKey || removed.index < 0) {
          return state;
        }

        const targetParentNode = findNodeByKey(removed.tree, parentKey);
        if (!targetParentNode) {
          return state;
        }

        const siblingCount = targetParentNode.children?.length ?? 0;
        const requestedIndex = Number.isFinite(targetIndex) ? Math.trunc(targetIndex) : siblingCount;
        let safeIndex = Math.max(0, Math.min(requestedIndex, siblingCount));
        if (removed.parentKey === parentKey && removed.index < safeIndex) {
          safeIndex -= 1;
        }

        if (removed.parentKey === parentKey && removed.index === safeIndex) {
          return state;
        }

        const movedNode = cloneDeep(removed.removedNode);
        const currentProps = (movedNode.props ?? {}) as Record<string, unknown>;
        const previousSlotKeyRaw = (currentProps.__slot as { value?: unknown } | undefined)?.value;
        const previousSlotKey = typeof previousSlotKeyRaw === 'string' ? previousSlotKeyRaw : undefined;
        if (slotKey) {
          movedNode.props = {
            ...currentProps,
            __slot: {
              ...((currentProps.__slot ?? {}) as Record<string, unknown>),
              value: slotKey,
            },
          };
        } else if (Object.prototype.hasOwnProperty.call(currentProps, '__slot')) {
          const nextProps = { ...currentProps };
          delete nextProps.__slot;
          movedNode.props = nextProps;
        }

        const nextTree = insertNodeAtParentIndex(removed.tree, parentKey, safeIndex, movedNode);
        const action: UiHistoryAction = {
          type: 'move',
          nodeKey: movedNode.key,
          nodeLabel: movedNode.label,
          nodeType: movedNode.type,
          fromParentKey: removed.parentKey,
          fromIndex: removed.index,
          toParentKey: parentKey,
          toIndex: safeIndex,
          prevSlotKey: previousSlotKey,
          nextSlotKey: slotKey,
          timestamp: Date.now(),
        };
        const nextHistory = pushHistoryAction(state.history.actions, state.history.pointer, action);

        return {
          uiPageData: nextTree,
          activeNode: resolveActiveNode(nextTree, state.activeNodeKey),
          history: nextHistory,
        };
      }),

    // ===== Actions — 流程历史 =====

    recordFlowEditHistory: (actionLabel, prevFlowNodes, prevFlowEdges, nextFlowNodes, nextFlowEdges) =>
      set((state) => {
        const nodePatch = buildEntityPatch(prevFlowNodes, nextFlowNodes);
        const edgePatch = buildEntityPatch(prevFlowEdges, nextFlowEdges);
        const hasChange =
          nodePatch.added.length > 0 ||
          nodePatch.removed.length > 0 ||
          nodePatch.updated.length > 0 ||
          edgePatch.added.length > 0 ||
          edgePatch.removed.length > 0 ||
          edgePatch.updated.length > 0;

        if (!hasChange) return state;

        const action: UiHistoryAction = {
          type: 'flow-edit',
          actionLabel,
          nodePatch,
          edgePatch,
          timestamp: Date.now(),
        };
        const nextHistory = pushHistoryAction(state.history.actions, state.history.pointer, action);
        return { flowNodes: nextFlowNodes, flowEdges: nextFlowEdges, history: nextHistory };
      }),

    updateFlowNodeData: (nodeId, updater, actionLabel = '更新流程节点配置') =>
      set((state) => {
        const targetNode = state.flowNodes.find((item) => item.id === nodeId);
        if (!targetNode) return state;

        const currentData = (targetNode.data ?? {}) as Record<string, unknown>;
        const nextData = updater(currentData);
        if (Object.is(currentData, nextData)) return state;

        const nextFlowNodes = state.flowNodes.map((node) =>
          node.id === nodeId ? { ...node, data: nextData } : node,
        );

        const nodePatch = buildEntityPatch(state.flowNodes, nextFlowNodes);
        const edgePatch = buildEntityPatch(state.flowEdges, state.flowEdges);
        const action: UiHistoryAction = {
          type: 'flow-edit',
          actionLabel,
          nodePatch,
          edgePatch,
          timestamp: Date.now(),
        };
        const nextHistory = pushHistoryAction(state.history.actions, state.history.pointer, action);
        return { flowNodes: nextFlowNodes, history: nextHistory };
      }),

    // ===== Actions — 布局模板 =====

    applyBuiltInLayoutTemplate: (templateId) =>
      set((state) => {
        if (!buildLayoutNodes) return state;

        const nextChildren = buildLayoutNodes(templateId);
        const prevChildren = cloneDeep(state.uiPageData.children ?? []);
        const prevLayoutTemplateId = state.selectedLayoutTemplateId;

        const nextTree: UiTreeNode = {
          ...state.uiPageData,
          props: {
            ...(state.uiPageData.props ?? {}),
            __layoutTemplate: { name: '布局模板', value: templateId },
          },
          children: nextChildren,
        };

        const action: UiHistoryAction = {
          type: 'replace-layout',
          prevChildren,
          nextChildren: cloneDeep(nextChildren),
          prevLayoutTemplateId,
          nextLayoutTemplateId: templateId,
          timestamp: Date.now(),
        };
        const nextHistory = pushHistoryAction(state.history.actions, state.history.pointer, action);

        return {
          uiPageData: nextTree,
          activeNodeKey: null,
          activeNode: null,
          selectedLayoutTemplateId: templateId,
          history: nextHistory,
        };
      }),

    // ===== Actions — 历史记录 =====

    undo: () =>
      set((state) => {
        const { pointer, actions } = state.history;
        if (pointer < 0) return state;

        const action = actions[pointer];
        const nextTree = applyHistoryAction(state.uiPageData, action, 'undo');
        const nextFlow = applyFlowHistoryAction(state.flowNodes, state.flowEdges, action, 'undo');

        return {
          uiPageData: nextTree,
          flowNodes: nextFlow.flowNodes,
          flowEdges: nextFlow.flowEdges,
          activeNode: resolveActiveNode(nextTree, state.activeNodeKey),
          selectedLayoutTemplateId: resolveLayoutTemplateId(nextTree),
          history: { pointer: pointer - 1, actions },
        };
      }),

    redo: () =>
      set((state) => {
        const { pointer, actions } = state.history;
        const nextPointer = pointer + 1;
        if (nextPointer >= actions.length) return state;

        const action = actions[nextPointer];
        const nextTree = applyHistoryAction(state.uiPageData, action, 'redo');
        const nextFlow = applyFlowHistoryAction(state.flowNodes, state.flowEdges, action, 'redo');

        return {
          uiPageData: nextTree,
          flowNodes: nextFlow.flowNodes,
          flowEdges: nextFlow.flowEdges,
          activeNode: resolveActiveNode(nextTree, state.activeNodeKey),
          selectedLayoutTemplateId: resolveLayoutTemplateId(nextTree),
          history: { pointer: nextPointer, actions },
        };
      }),

    jumpToHistory: (targetPointer) =>
      set((state) => {
        const { pointer, actions } = state.history;
        const clampedTarget = Math.max(-1, Math.min(targetPointer, actions.length - 1));
        if (clampedTarget === pointer) return state;

        let nextTree = state.uiPageData;
        let nextFlowNodes = state.flowNodes;
        let nextFlowEdges = state.flowEdges;

        if (clampedTarget < pointer) {
          for (let index = pointer; index > clampedTarget; index -= 1) {
            nextTree = applyHistoryAction(nextTree, actions[index], 'undo');
            const nextFlow = applyFlowHistoryAction(nextFlowNodes, nextFlowEdges, actions[index], 'undo');
            nextFlowNodes = nextFlow.flowNodes;
            nextFlowEdges = nextFlow.flowEdges;
          }
        } else {
          for (let index = pointer + 1; index <= clampedTarget; index += 1) {
            nextTree = applyHistoryAction(nextTree, actions[index], 'redo');
            const nextFlow = applyFlowHistoryAction(nextFlowNodes, nextFlowEdges, actions[index], 'redo');
            nextFlowNodes = nextFlow.flowNodes;
            nextFlowEdges = nextFlow.flowEdges;
          }
        }

        return {
          uiPageData: nextTree,
          flowNodes: nextFlowNodes,
          flowEdges: nextFlowEdges,
          activeNode: resolveActiveNode(nextTree, state.activeNodeKey),
          selectedLayoutTemplateId: resolveLayoutTemplateId(nextTree),
          history: { pointer: clampedTarget, actions },
        };
      }),
  }));
};
