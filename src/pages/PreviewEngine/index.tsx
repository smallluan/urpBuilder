import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { Edge, Node } from '@xyflow/react';
import PreviewRenderer from './components/PreviewRenderer';
import { deserializePreviewSnapshot, type PreviewSnapshot } from './utils/snapshot';
import { createPreviewDataHub, type DataHubRouterState } from './runtime/dataHub';
import { createPreviewFlowRuntime, type PreviewFlowRuntime } from './runtime/flowRuntime';
import { getPageTemplateBaseList, getPageTemplateDetail } from '../../api/pageTemplate';
import type { UiTreeNode } from '../../builder/store/types';
import './style.less';

const EMPTY_ROOT: UiTreeNode = { key: '__root__', type: 'root', label: '', props: {}, children: [] };
const SITE_PREVIEW_PREFIX = '/site-preview';

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

const PreviewEngine: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);

  const serializedFromState = (location.state as { snapshot?: string } | null)?.snapshot;
  const snapshotKey = searchParams.get('snapshotKey');
  const pageId = searchParams.get('pageId');
  const scopeId = (searchParams.get('scopeId') || 'root').trim() || 'root';
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

  React.useEffect(() => {
    if (parsedSnapshot || pageId || !routePathFromLocation) {
      return;
    }

    getPageTemplateBaseList({ routePath: routePathFromLocation, page: 1, pageSize: 1 })
      .then((res) => {
        const target = res.data?.list?.[0];
        if (!target?.pageId) {
          return;
        }

        setResolvedPageId(target.pageId);
      })
      .catch(() => {
        setResolvedPageId('');
      });
  }, [pageId, parsedSnapshot, routePathFromLocation]);

  React.useEffect(() => {
    const finalPageId = pageId || resolvedPageId;
    if (parsedSnapshot || !finalPageId) return;
    getPageTemplateDetail(finalPageId)
      .then((res) => {
        const template = res.data?.template;
        if (!template) return;
        const routeConfig = normalizeRouteConfig((template.pageConfig ?? {}).routeConfig);
        const pageTitle = typeof routeConfig?.pageTitle === 'string' ? routeConfig.pageTitle.trim() : '';
        if (pageTitle) {
          document.title = pageTitle;
        }
        setRemoteSnapshot({
          uiTreeData: (template.uiTree as unknown as UiTreeNode) ?? EMPTY_ROOT,
          flowNodes: (template.flowNodes as unknown as Node[]) ?? [],
          flowEdges: (template.flowEdges as unknown as Edge[]) ?? [],
        });
      })
      .catch(() => {/* 加载失败时保持空白，不阻塞渲染 */});
  }, [pageId, parsedSnapshot, resolvedPageId]);

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
        {routeEmpty ? (
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
