import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { Edge, Node } from '@xyflow/react';
import PreviewRenderer from './components/PreviewRenderer';
import { deserializePreviewSnapshot, type PreviewSnapshot } from './utils/snapshot';
import { createPreviewDataHub } from './runtime/dataHub';
import { createPreviewFlowRuntime, type PreviewFlowRuntime } from './runtime/flowRuntime';
import { getPageBaseList, getPageDetail } from '../../api/pageTemplate';
import type { PageBaseInfo } from '../../api/types';
import type { PageRouteConfig, UiTreeNode } from '../../builder/store/types';
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

const normalizeRouteConfig = (value: unknown): PageRouteConfig | null => {
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
  const [resolvedRouteConfig, setResolvedRouteConfig] = React.useState<PageRouteConfig | null>(null);
  const [sitePages, setSitePages] = React.useState<PageBaseInfo[]>([]);

  const snapshotRouteConfig = React.useMemo(
    () => normalizeRouteConfig(parsedSnapshot?.pageConfig?.routeConfig),
    [parsedSnapshot],
  );

  React.useEffect(() => {
    if (parsedSnapshot || pageId || !routePathFromLocation) {
      return;
    }

    getPageBaseList({ routePath: routePathFromLocation, entityType: 'page', page: 1, pageSize: 1 })
      .then((res) => {
        const target = res.data?.list?.[0];
        if (!target?.pageId) {
          return;
        }

        setResolvedPageId(target.pageId);
        setResolvedRouteConfig(normalizeRouteConfig(target.routeConfig));
      })
      .catch(() => {
        setResolvedPageId('');
        setResolvedRouteConfig(null);
      });
  }, [pageId, parsedSnapshot, routePathFromLocation]);

  React.useEffect(() => {
    if (!isSitePreview) {
      setSitePages([]);
      return;
    }

    getPageBaseList({ entityType: 'page', page: 1, pageSize: 200 })
      .then((res) => {
        const list = Array.isArray(res.data?.list) ? res.data.list : [];
        setSitePages(
          list.filter((item) => {
            const routeConfig = normalizeRouteConfig(item.routeConfig);
            return Boolean(routeConfig?.routePath);
          }),
        );
      })
      .catch(() => {
        setSitePages([]);
      });
  }, [isSitePreview]);

  React.useEffect(() => {
    const finalPageId = pageId || resolvedPageId;
    if (parsedSnapshot || !finalPageId) return;
    getPageDetail(finalPageId)
      .then((res) => {
        const template = res.data?.template;
        if (!template) return;
        const routeConfig = normalizeRouteConfig((template.pageConfig ?? {}).routeConfig);
        const pageTitle = typeof routeConfig?.pageTitle === 'string' ? routeConfig.pageTitle.trim() : '';
        if (pageTitle) {
          document.title = pageTitle;
        }
        setResolvedRouteConfig(routeConfig);
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

  const [renderTree, setRenderTree] = React.useState(snapshot.uiTreeData);
  const runtimeRef = React.useRef<PreviewFlowRuntime | null>(null);
  const activeRouteConfig = snapshotRouteConfig ?? resolvedRouteConfig;
  const shouldUseLayout = isSitePreview && activeRouteConfig?.useLayout !== false;
  const currentTitle = activeRouteConfig?.pageTitle?.trim() || activeRouteConfig?.menuTitle?.trim() || '页面预览';
  const navigationItems = React.useMemo(
    () => sitePages
      .map((item) => {
        const routeConfig = normalizeRouteConfig(item.routeConfig);
        if (!routeConfig?.routePath) {
          return null;
        }

        return {
          pageId: item.pageId,
          routePath: routeConfig.routePath,
          title: routeConfig.menuTitle?.trim() || routeConfig.pageTitle?.trim() || item.pageName,
        };
      })
      .filter(Boolean) as Array<{ pageId: string; routePath: string; title: string }>,
    [sitePages],
  );

  React.useEffect(() => {
    setRenderTree(snapshot.uiTreeData);
  }, [snapshot.uiTreeData]);

  React.useEffect(() => {
    const hub = createPreviewDataHub(snapshot.uiTreeData, { scopeId });
    const runtime = createPreviewFlowRuntime(snapshot.flowNodes, snapshot.flowEdges, hub);
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
  }, [scopeId, snapshot.flowEdges, snapshot.flowNodes, snapshot.uiTreeData]);

  const handleLifecycle = React.useCallback((componentKey: string, lifetime: string, payload?: unknown) => {
    runtimeRef.current?.emitLifecycle(componentKey, lifetime, payload);
  }, []);

  return (
    <div className="preview-engine-page" data-preview-scroll-container="true">
      {shouldUseLayout ? (
        <div className="site-preview-layout">
          <header className="site-preview-layout__header">
            <div className="site-preview-layout__brand">站点预览</div>
            <div className="site-preview-layout__title">{currentTitle}</div>
          </header>
          <div className="site-preview-layout__body">
            <aside className="site-preview-layout__aside">
              <div className="site-preview-layout__aside-title">页面导航</div>
              <div className="site-preview-layout__nav">
                {navigationItems.length > 0 ? navigationItems.map((item) => {
                  const active = normalizeRoutePath(item.routePath) === routePathFromLocation;
                  return (
                    <button
                      key={item.pageId}
                      type="button"
                      className={`site-preview-layout__nav-item${active ? ' is-active' : ''}`}
                      onClick={() => navigate(`/site-preview${normalizeRoutePath(item.routePath)}`)}
                    >
                      {item.title}
                    </button>
                  );
                }) : (
                  <div className="site-preview-layout__nav-empty">暂无可导航页面</div>
                )}
              </div>
            </aside>

            <main className="site-preview-layout__content">
              <div className="preview-engine-canvas" data-preview-page>
                {(renderTree.children ?? []).map((child) => (
                  <PreviewRenderer key={child.key} node={child} onLifecycle={handleLifecycle} />
                ))}
              </div>
            </main>
          </div>
        </div>
      ) : (
        <div className="preview-engine-canvas" data-preview-page>
          {(renderTree.children ?? []).map((child) => (
            <PreviewRenderer key={child.key} node={child} onLifecycle={handleLifecycle} />
          ))}
        </div>
      )}
    </div>
  );
};

export default PreviewEngine;
