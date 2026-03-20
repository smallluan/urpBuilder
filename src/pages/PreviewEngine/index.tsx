import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { Edge, Node } from '@xyflow/react';
import cloneDeep from 'lodash/cloneDeep';
import PreviewRenderer from './components/PreviewRenderer';
import { deserializePreviewSnapshot, type PreviewSnapshot } from './utils/snapshot';
import { createPreviewDataHub, type DataHubRouterState } from './runtime/dataHub';
import { createPreviewFlowRuntime, type PreviewFlowRuntime } from './runtime/flowRuntime';
import { getPageTemplateBaseList, getPageTemplateDetail } from '../../api/pageTemplate';
import { getComponentTemplateDetail } from '../../api/componentTemplate';
import type { UiTreeNode } from '../../builder/store/types';
import { findNodeByKey, updateNodeByKey } from '../../utils/createComponentTree';
import './style.less';

const EMPTY_ROOT: UiTreeNode = { key: '__root__', type: 'root', label: '', props: {}, children: [] };
const SITE_PREVIEW_PREFIX = '/site-preview';

const normalizePageId = (value: string | null) => {
  const text = String(value ?? '').trim();
  if (!text) {
    return '';
  }

  const lowered = text.toLowerCase();
  if (lowered === 'undefined' || lowered === 'null' || lowered === '-') {
    return '';
  }

  return text;
};

const normalizeRoutePath = (value: string) => {
  const text = String(value ?? '').trim();
  if (!text) {
    return '/';
  }

  return text.startsWith('/') ? text : `/${text}`;
};

const normalizeRouteConfig = (value: unknown): {
  routePath: string;
  routeName: string;
  pageTitle: string;
  menuTitle: string;
  useLayout: boolean;
} | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const raw = value as Record<string, unknown>;
  return {
    routePath: typeof raw.routePath === 'string' ? raw.routePath : '',
    routeName: typeof raw.routeName === 'string' ? raw.routeName : '',
    pageTitle: typeof raw.pageTitle === 'string' ? raw.pageTitle : '',
    menuTitle: typeof raw.menuTitle === 'string' ? raw.menuTitle : '',
    useLayout: raw.useLayout !== false,
  };
};

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
    const target = findNodeByKey(tree, preferredKey);
    if (target?.type === 'RouteOutlet') {
      return preferredKey;
    }
  }

  return findFirstRouteOutletKey(tree);
};

const composeRouteUiTree = (
  privateTree: UiTreeNode,
  sharedUiTree: UiTreeNode | null,
  outletKey: string | null,
): UiTreeNode => {
  if (!sharedUiTree || !outletKey) {
    return cloneDeep(privateTree);
  }

  const sharedOutlet = findNodeByKey(sharedUiTree, outletKey);
  if (!sharedOutlet) {
    return cloneDeep(privateTree);
  }

  const privateOutlet = findNodeByKey(privateTree, outletKey);
  const outletChildren = privateOutlet?.type === 'RouteOutlet'
    ? cloneDeep(privateOutlet.children ?? [])
    : [];

  return updateNodeByKey(cloneDeep(sharedUiTree), outletKey, (target) => ({
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
  const mergedNodes = new Map<string, Node>();
  sharedNodes.forEach((node) => mergedNodes.set(node.id, cloneDeep(node)));
  privateNodes.forEach((node) => mergedNodes.set(node.id, cloneDeep(node)));
  const flowNodes = Array.from(mergedNodes.values());
  const flowNodeIds = new Set(flowNodes.map((node) => node.id));

  const mergedEdges = new Map<string, Edge>();
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

const PreviewEngine: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);

  const serializedFromState = (location.state as { snapshot?: string } | null)?.snapshot;
  const snapshotKey = searchParams.get('snapshotKey');
  const pageId = normalizePageId(searchParams.get('pageId'));
  const scopeId = (searchParams.get('scopeId') || 'root').trim() || 'root';
  const entityType = searchParams.get('entityType') === 'component' ? 'component' : 'page';
  const routePathFromLocation = location.pathname.startsWith(SITE_PREVIEW_PREFIX)
    ? normalizeRoutePath(location.pathname.slice(SITE_PREVIEW_PREFIX.length) || '/')
    : '';
  const isSitePreview = Boolean(routePathFromLocation);

  const serializedFromStorage = snapshotKey ? window.localStorage.getItem(snapshotKey) : null;
  const serialized = serializedFromStorage ?? serializedFromState;

  const parsedSnapshot = React.useMemo(
    () => (serialized ? deserializePreviewSnapshot(serialized) : null),
    [serialized],
  );

  // 当通过 pageId 直接打开预览时，从 API 加载数据
  const [remoteSnapshot, setRemoteSnapshot] = React.useState<PreviewSnapshot | null>(null);
  const [resolvedPageId, setResolvedPageId] = React.useState<string>('');
  const [routeResolveError, setRouteResolveError] = React.useState<string>('');

  React.useEffect(() => {
    if (entityType === 'component' || parsedSnapshot || pageId || !routePathFromLocation) {
      setRouteResolveError('');
      return;
    }

    getPageTemplateBaseList({ routePath: routePathFromLocation, page: 1, pageSize: 100 })
      .then((res) => {
        const list = Array.isArray(res.data?.list) ? res.data.list : [];
        const candidates = list.filter((item) => normalizePageId(item.pageId));

        if (candidates.length === 1) {
          setResolvedPageId(candidates[0].pageId);
          setRouteResolveError('');
          return;
        }

        setResolvedPageId('');
        if (candidates.length === 0) {
          setRouteResolveError(`未找到路径 ${routePathFromLocation} 对应的页面，请确认 pageId 或路由路径。`);
          return;
        }

        setRouteResolveError(`路径 ${routePathFromLocation} 匹配到多个页面，请在 URL 上追加 ?pageId=页面ID 进行区分。`);
      })
      .catch(() => {
        setResolvedPageId('');
        setRouteResolveError('页面解析失败，请稍后重试或在 URL 上追加 ?pageId=页面ID。');
      });
  }, [entityType, pageId, parsedSnapshot, routePathFromLocation]);

  React.useEffect(() => {
    const finalPageId = pageId || resolvedPageId;
    if (parsedSnapshot || !finalPageId) {
      return;
    }

    const getDetail = entityType === 'component' ? getComponentTemplateDetail : getPageTemplateDetail;

    getDetail(finalPageId)
      .then((res) => {
        const template = res.data?.template;
        if (!template) return;

        const pageConfig = (template.pageConfig ?? {}) as Record<string, unknown>;
        const routeConfig = normalizeRouteConfig((template.pageConfig ?? {}).routeConfig);
        const pageTitle = typeof routeConfig?.pageTitle === 'string' ? routeConfig.pageTitle.trim() : '';
        if (pageTitle) {
          document.title = pageTitle;
        }

        const sharedUiTree = pageConfig.sharedUiTree && typeof pageConfig.sharedUiTree === 'object' && !Array.isArray(pageConfig.sharedUiTree)
          ? (pageConfig.sharedUiTree as UiTreeNode)
          : (Array.isArray(pageConfig.sharedUiChildren)
            ? ({
              key: '__root__',
              type: 'root',
              label: '',
              props: {},
              children: pageConfig.sharedUiChildren as UiTreeNode[],
            } as UiTreeNode)
            : null);
        const sharedFlowNodes = Array.isArray(pageConfig.sharedFlowNodes)
          ? (pageConfig.sharedFlowNodes as Node[])
          : [];
        const sharedFlowEdges = Array.isArray(pageConfig.sharedFlowEdges)
          ? (pageConfig.sharedFlowEdges as Edge[])
          : [];

        const routeSnapshots = Array.isArray(template.routes)
          ? template.routes.map((route, index) => {
              const privateUiTree = (route.uiTree as unknown as UiTreeNode) ?? EMPTY_ROOT;
              const privateFlowNodes = Array.isArray(route.flowNodes)
                ? (route.flowNodes as Node[])
                : [];
              const privateFlowEdges = Array.isArray(route.flowEdges)
                ? (route.flowEdges as Edge[])
                : [];
              const activeRouteOutletKey = resolveEffectiveOutletKey(
                privateUiTree,
                typeof pageConfig.activeRouteOutletKey === 'string' ? pageConfig.activeRouteOutletKey : null,
              );
              const composedUiTree = composeRouteUiTree(privateUiTree, sharedUiTree, activeRouteOutletKey);
              const composedFlow = composeRouteFlow(
                privateFlowNodes,
                privateFlowEdges,
                sharedFlowNodes,
                sharedFlowEdges,
              );

              return {
                routeId: typeof route.routeId === 'string' ? route.routeId : `route-${index + 1}`,
                routePath: normalizeRoutePath(route.routeConfig?.routePath ?? (index === 0 ? '/' : `/route-${index + 1}`)),
                uiTreeData: composedUiTree,
                flowNodes: composedFlow.flowNodes,
                flowEdges: composedFlow.flowEdges,
              };
            })
          : [];

        const defaultRoutePath = routeSnapshots[0]?.routePath
          ?? normalizeRoutePath(routeConfig?.routePath ?? '/');

        setRemoteSnapshot({
          uiTreeData: routeSnapshots[0]?.uiTreeData ?? ((template.uiTree as unknown as UiTreeNode) ?? EMPTY_ROOT),
          flowNodes: routeSnapshots[0]?.flowNodes ?? ((template.flowNodes as unknown as Node[]) ?? []),
          flowEdges: routeSnapshots[0]?.flowEdges ?? ((template.flowEdges as unknown as Edge[]) ?? []),
          pageConfig: {
            routeConfig,
            pageId: finalPageId,
            defaultRoutePath,
            routeSnapshots,
          },
        });
        setRouteResolveError('');
      })
      .catch(() => {
        setRouteResolveError(`页面 ${finalPageId} 加载失败，请确认页面 ID 是否存在。`);
      });
  }, [entityType, pageId, parsedSnapshot, resolvedPageId]);

  const snapshot: PreviewSnapshot = React.useMemo(
    () =>
      parsedSnapshot ?? remoteSnapshot ?? {
        uiTreeData: EMPTY_ROOT,
        flowNodes: [],
        flowEdges: [],
      },
    [parsedSnapshot, remoteSnapshot],
  );

  const normalizedCurrentRoutePath = normalizeRoutePath(routePathFromLocation || '/');
  const routeSnapshots = React.useMemo(
    () => Array.isArray(snapshot.pageConfig?.routeSnapshots) ? snapshot.pageConfig?.routeSnapshots : [],
    [snapshot.pageConfig?.routeSnapshots],
  );
  const defaultRoutePath = React.useMemo(
    () => normalizeRoutePath(snapshot.pageConfig?.defaultRoutePath || '/'),
    [snapshot.pageConfig?.defaultRoutePath],
  );
  const matchedRouteSnapshot = React.useMemo(() => {
    if (routeSnapshots.length === 0) {
      return null;
    }

    return routeSnapshots.find((item) => normalizeRoutePath(item.routePath) === normalizedCurrentRoutePath)
      ?? routeSnapshots.find((item) => normalizeRoutePath(item.routePath) === defaultRoutePath)
      ?? routeSnapshots[0]
      ?? null;
  }, [defaultRoutePath, normalizedCurrentRoutePath, routeSnapshots]);
  const routeMatched = routeSnapshots.length === 0 ? true : routeSnapshots.some((item) => normalizeRoutePath(item.routePath) === normalizedCurrentRoutePath);
  const effectiveUiTree = matchedRouteSnapshot?.uiTreeData ?? snapshot.uiTreeData;
  const effectiveFlowNodes = matchedRouteSnapshot?.flowNodes ?? snapshot.flowNodes;
  const effectiveFlowEdges = matchedRouteSnapshot?.flowEdges ?? snapshot.flowEdges;

  const [renderTree, setRenderTree] = React.useState(effectiveUiTree);
  const runtimeRef = React.useRef<PreviewFlowRuntime | null>(null);
  const routeNotFound = isSitePreview && !routeMatched;
  const routeHasRenderableContent = (renderTree.children ?? []).length > 0;
  const routeEmpty = !routeNotFound && !routeHasRenderableContent;
  const finalPageId = pageId || resolvedPageId;
  const shouldShowResolveError = !parsedSnapshot && !finalPageId && Boolean(routeResolveError);

  const routeSubscribersRef = React.useRef(new Set<(state: DataHubRouterState) => void>());
  const routerState = React.useMemo<DataHubRouterState>(() => ({
    path: normalizedCurrentRoutePath,
    routeId: matchedRouteSnapshot?.routeId,
    matched: routeMatched,
  }), [matchedRouteSnapshot?.routeId, normalizedCurrentRoutePath, routeMatched]);
  const resolveNavigatePath = React.useCallback((path: string, params?: Record<string, unknown>) => {
    const normalizedPath = normalizeRoutePath(path || '/');
    const mergedSearch = new URLSearchParams(location.search);
    if (params && typeof params === 'object') {
      Object.entries(params).forEach(([key, value]) => {
        if (value === undefined || value === null) {
          mergedSearch.delete(key);
          return;
        }

        mergedSearch.set(key, String(value));
      });
    }

    const query = mergedSearch.toString() ? `?${mergedSearch.toString()}` : '';
    if (isSitePreview) {
      return `${SITE_PREVIEW_PREFIX}${normalizedPath}${query}`;
    }

    return `${normalizedPath}${query}`;
  }, [isSitePreview, location.search]);
  const routerContext = React.useMemo(() => ({
    current: () => routerState,
    push: (path: string, params?: Record<string, unknown>) => {
      const targetPath = resolveNavigatePath(path, params);
      navigate(targetPath);
      return true;
    },
    replace: (path: string, params?: Record<string, unknown>) => {
      const targetPath = resolveNavigatePath(path, params);
      navigate(targetPath, { replace: true });
      return true;
    },
    back: () => {
      navigate(-1);
    },
    subscribe: (handler: (state: DataHubRouterState) => void) => {
      routeSubscribersRef.current.add(handler);
      handler(routerState);
      return () => {
        routeSubscribersRef.current.delete(handler);
      };
    },
  }), [navigate, resolveNavigatePath, routerState]);

  React.useEffect(() => {
    setRenderTree(effectiveUiTree);
  }, [effectiveUiTree]);

  React.useEffect(() => {
    routeSubscribersRef.current.forEach((handler) => {
      handler(routerState);
    });
  }, [routerState]);

  React.useEffect(() => {
    const hub = createPreviewDataHub(effectiveUiTree, { scopeId, router: routerContext });
    const runtime = createPreviewFlowRuntime(effectiveFlowNodes, effectiveFlowEdges, hub);
    const unsubscribePatched = hub.subscribe('component:patched', () => {
      setRenderTree(hub.getTreeSnapshot());
    });

    runtimeRef.current = runtime;
    window.dataHub = hub;

    return () => {
      unsubscribePatched();
      runtime.destroy();
      runtimeRef.current = null;
      if (window.dataHub === hub) {
        delete window.dataHub;
      }
    };
  }, [effectiveFlowEdges, effectiveFlowNodes, effectiveUiTree, routerContext, scopeId]);

  const handleLifecycle = React.useCallback((componentKey: string, lifetime: string, payload?: unknown) => {
    runtimeRef.current?.emitLifecycle(componentKey, lifetime, payload);
  }, []);

  return (
    <div className="preview-engine-page" data-preview-scroll-container="true">
      <div className="preview-engine-canvas" data-preview-page>
        {shouldShowResolveError ? (
          <div className="preview-route-status preview-route-status--empty">
            <div className="preview-route-status__title">无法定位预览页面</div>
            <div className="preview-route-status__desc">{routeResolveError}</div>
          </div>
        ) : routeNotFound ? (
          <div className="preview-route-status preview-route-status--empty">
            <div className="preview-route-status__title">当前路由不存在</div>
            <div className="preview-route-status__desc">请确认页面中是否存在该路由，或检查 URL 的 pageId 与路径是否匹配。</div>
          </div>
        ) : routeEmpty ? (
          <div className="preview-route-status preview-route-status--empty">
            <div className="preview-route-status__title">当前路由内容为空</div>
            <div className="preview-route-status__desc">页面中暂无可渲染组件，请先在搭建器中添加内容。</div>
          </div>
        ) : (
          (renderTree.children ?? []).map((child) => (
            <PreviewRenderer key={child.key} node={child} onLifecycle={handleLifecycle} />
          ))
        )}
      </div>
    </div>
  );
};

export default PreviewEngine;
