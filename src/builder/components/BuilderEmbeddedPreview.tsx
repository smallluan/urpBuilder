import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Switch } from 'tdesign-react';
import { RefreshCw } from 'lucide-react';
import PreviewRenderer, {
  PreviewDataHubRefContext,
  PreviewPortalContainerContext,
  PreviewUiLibraryContext,
} from '../../pages/PreviewEngine/components/PreviewRenderer';
import { createPreviewDataHub, type DataHubRouterState, type PreviewDataHub } from '../../pages/PreviewEngine/runtime/dataHub';
import { createPreviewFlowRuntime, type PreviewFlowRuntime } from '../../pages/PreviewEngine/runtime/flowRuntime';
import { useBuilderContext } from '../context/BuilderContext';
import { buildPreviewSnapshot, normalizeRoutePath } from '../utils/buildPreviewSnapshot';
import type { PreviewSnapshot } from '../../pages/PreviewEngine/utils/snapshot';
import SimulatorDeviceChrome from './SimulatorDeviceChrome';
import { isHandheldSimulatorScreenSize } from '../utils/simulatorViewport';
import { SIMULATOR_CHROME_FLOATING_PAD_PX } from '../constants/simulatorChromeStyle';
import '../../pages/PreviewEngine/style.less';
import './BuilderEmbeddedPreview.less';
import { AntdRuntimeRoot } from '../antd/AntdRuntimeRoot';
import SimulatorLibraryBrushOverlay from './SimulatorLibraryBrushOverlay';

const AUTO_REFRESH_STORAGE_KEY = 'urpbuilder.embeddedPreview.autoRefreshOnShow';

export interface BuilderEmbeddedPreviewProps {
  enablePageRouteConfig: boolean;
  entityType: 'page' | 'component';
  /** 当前是否为「实时预览」可见页签；为 true 时可根据开关在展示时自动刷新快照 */
  previewActive?: boolean;
}

/**
 * 搭建器壳内实时预览：快照来自当前 store（内存），不写 localStorage。
 * 布局与搭建画布一致：main-body / main-inner + 手机壳（窄屏预设时）。
 */
const BuilderEmbeddedPreview: React.FC<BuilderEmbeddedPreviewProps> = ({
  enablePageRouteConfig,
  entityType,
  previewActive,
}) => {
  const { useStore } = useBuilderContext();
  const [storeRev, setStoreRev] = useState(0);
  const [refreshTick, setRefreshTick] = useState(0);
  const [autoRefreshOnShow, setAutoRefreshOnShow] = useState(() => {
    try {
      return window.localStorage.getItem(AUTO_REFRESH_STORAGE_KEY) !== 'false';
    } catch {
      return true;
    }
  });

  const bumpRefresh = useCallback(() => {
    setRefreshTick((n) => n + 1);
  }, []);
  const pageRoutePath = useStore((s) => s.pageRouteConfig?.routePath);
  const screenSize = useStore((s) => s.screenSize);
  const autoWidth = useStore((s) => s.autoWidth);
  const simulatorChromeStyle = useStore((s) => s.simulatorChromeStyle);
  const previewUiLibrary = useStore((s) => s.previewUiLibrary);
  const [previewPath, setPreviewPath] = useState(() => normalizeRoutePath(pageRoutePath ?? '/'));
  const simulatorScrollRef = useRef<HTMLDivElement | null>(null);
  const simulatorOverlayRef = useRef<HTMLDivElement | null>(null);
  const [embeddedSimulatorOverlayEl, setEmbeddedSimulatorOverlayEl] = useState<HTMLDivElement | null>(null);

  const bindEmbeddedSimulatorScrollRef = useCallback((node: HTMLDivElement | null) => {
    simulatorScrollRef.current = node;
  }, []);

  const bindEmbeddedSimulatorOverlayRef = useCallback((node: HTMLDivElement | null) => {
    simulatorOverlayRef.current = node;
    setEmbeddedSimulatorOverlayEl(node);
  }, []);

  const embeddedPreviewPortalMount = useCallback((): HTMLElement => {
    return (
      embeddedSimulatorOverlayEl
      ?? simulatorOverlayRef.current
      ?? (document.querySelector('[data-builder-overlay-container="embedded"]') as HTMLElement | null)
      ?? document.body
    );
  }, [embeddedSimulatorOverlayEl]);

  useEffect(() => {
    return useStore.subscribe(() => {
      setStoreRev((n) => n + 1);
    });
  }, [useStore]);

  useEffect(() => {
    if (previewActive !== true || !autoRefreshOnShow) {
      return;
    }
    bumpRefresh();
  }, [previewActive, autoRefreshOnShow, bumpRefresh]);

  useEffect(() => {
    setPreviewPath(normalizeRoutePath(pageRoutePath ?? '/'));
  }, [pageRoutePath]);

  const showDeviceChrome = useMemo(() => isHandheldSimulatorScreenSize(screenSize), [screenSize]);
  const chromeFloating = showDeviceChrome && simulatorChromeStyle === 'dynamic-island';

  const simulatorStyle: React.CSSProperties = useMemo(() => {
    const width = screenSize === 'auto' ? `${autoWidth}px` : `${screenSize}px`;
    return {
      width,
      height: '100%',
      ...(showDeviceChrome
        ? {}
        : { backgroundColor: 'var(--builder-simulator-device-bg)' }),
      margin: '0 auto',
      transition: 'width 0.2s ease',
      boxSizing: showDeviceChrome ? 'border-box' : 'content-box',
      position: 'relative',
      isolation: 'isolate',
    };
  }, [screenSize, autoWidth, showDeviceChrome]);

  const simulatorFrameInnerStyle: React.CSSProperties = useMemo(
    () => (showDeviceChrome ? { width: '100%', height: '100%', minHeight: 0 } : {}),
    [showDeviceChrome],
  );

  useEffect(() => {
    const host = simulatorScrollRef.current;
    if (!host) {
      return;
    }

    const applyViewportVariables = () => {
      const computedStyle = window.getComputedStyle(host);
      const paddingLeft = Number.parseFloat(computedStyle.paddingLeft) || 0;
      const paddingRight = Number.parseFloat(computedStyle.paddingRight) || 0;
      const paddingTop = Number.parseFloat(computedStyle.paddingTop) || 0;
      const paddingBottom = Number.parseFloat(computedStyle.paddingBottom) || 0;
      const nextWidth = Math.max(0, host.clientWidth - paddingLeft - paddingRight);
      const nextHeight = Math.max(0, host.clientHeight - paddingTop - paddingBottom);
      if (nextWidth > 0) {
        host.style.setProperty('--builder-vw', `${nextWidth / 100}px`);
      }
      if (nextHeight > 0) {
        host.style.setProperty('--builder-vh', `${nextHeight / 100}px`);
      }
    };

    applyViewportVariables();
    const resizeObserver = new ResizeObserver(() => applyViewportVariables());
    resizeObserver.observe(host);
    return () => {
      resizeObserver.disconnect();
    };
  }, [screenSize, autoWidth, showDeviceChrome, simulatorChromeStyle]);

  const snapshot: PreviewSnapshot = useMemo(() => {
    void storeRev;
    void refreshTick;
    return buildPreviewSnapshot(useStore.getState(), enablePageRouteConfig);
  }, [storeRev, refreshTick, useStore, enablePageRouteConfig]);

  const routeSnapshots = useMemo(
    () => (Array.isArray(snapshot.pageConfig?.routeSnapshots) ? snapshot.pageConfig?.routeSnapshots : []),
    [snapshot.pageConfig?.routeSnapshots],
  );
  const defaultRoutePath = useMemo(
    () => normalizeRoutePath(snapshot.pageConfig?.defaultRoutePath || '/'),
    [snapshot.pageConfig?.defaultRoutePath],
  );
  const normalizedCurrentRoutePath = normalizeRoutePath(previewPath);
  const matchedRouteSnapshot = useMemo(() => {
    if (routeSnapshots.length === 0) {
      return null;
    }
    return routeSnapshots.find((item) => normalizeRoutePath(item.routePath) === normalizedCurrentRoutePath)
      ?? routeSnapshots.find((item) => normalizeRoutePath(item.routePath) === defaultRoutePath)
      ?? routeSnapshots[0]
      ?? null;
  }, [defaultRoutePath, normalizedCurrentRoutePath, routeSnapshots]);
  const routeMatched = routeSnapshots.length === 0
    ? true
    : routeSnapshots.some((item) => normalizeRoutePath(item.routePath) === normalizedCurrentRoutePath);

  const effectiveUiTree = matchedRouteSnapshot?.uiTreeData ?? snapshot.uiTreeData;
  const effectiveFlowNodes = matchedRouteSnapshot?.flowNodes ?? snapshot.flowNodes;
  const effectiveFlowEdges = matchedRouteSnapshot?.flowEdges ?? snapshot.flowEdges;

  const [renderTree, setRenderTree] = useState(effectiveUiTree);
  const runtimeRef = React.useRef<PreviewFlowRuntime | null>(null);
  const dataHubRef = React.useRef<PreviewDataHub | null>(null);
  const routeSubscribersRef = React.useRef(new Set<(state: DataHubRouterState) => void>());
  const scopeId = 'root';

  const routerState = useMemo<DataHubRouterState>(() => ({
    path: normalizedCurrentRoutePath,
    routeId: matchedRouteSnapshot?.routeId,
    matched: routeMatched,
  }), [matchedRouteSnapshot?.routeId, normalizedCurrentRoutePath, routeMatched]);

  const routerContext = useMemo(() => ({
    current: () => routerState,
    push: (path: string) => {
      setPreviewPath(normalizeRoutePath(path || '/'));
      return true;
    },
    replace: (path: string) => {
      setPreviewPath(normalizeRoutePath(path || '/'));
      return true;
    },
    back: () => {},
    subscribe: (handler: (state: DataHubRouterState) => void) => {
      routeSubscribersRef.current.add(handler);
      handler(routerState);
      return () => {
        routeSubscribersRef.current.delete(handler);
      };
    },
  }), [routerState]);

  useEffect(() => {
    setRenderTree(effectiveUiTree);
  }, [effectiveUiTree]);

  useEffect(() => {
    routeSubscribersRef.current.forEach((handler) => {
      handler(routerState);
    });
  }, [routerState]);

  useEffect(() => {
    const hub = createPreviewDataHub(effectiveUiTree, { scopeId, router: routerContext });
    const runtime = createPreviewFlowRuntime(effectiveFlowNodes, effectiveFlowEdges, hub);
    const unsubscribePatched = hub.subscribe('component:patched', () => {
      setRenderTree(hub.getTreeSnapshot());
    });

    runtimeRef.current = runtime;
    dataHubRef.current = hub;
    window.dataHub = hub;

    return () => {
      unsubscribePatched();
      runtime.destroy();
      runtimeRef.current = null;
      dataHubRef.current = null;
      if (window.dataHub === hub) {
        delete window.dataHub;
      }
    };
  }, [effectiveFlowEdges, effectiveFlowNodes, effectiveUiTree, routerContext, scopeId, refreshTick]);

  const handleLifecycle = React.useCallback((componentKey: string, lifetime: string, payload?: unknown) => {
    queueMicrotask(() => {
      runtimeRef.current?.emitLifecycle(componentKey, lifetime, payload);
    });
  }, []);

  const routeNotFound = enablePageRouteConfig && routeSnapshots.length > 0 && !routeMatched;
  const routeHasRenderableContent = (renderTree.children ?? []).length > 0;
  const routeEmpty = !routeNotFound && !routeHasRenderableContent;
  const isComponentEntity = entityType === 'component';

  const simulatorContainerClassName = [
    'simulator-container',
    showDeviceChrome ? 'simulator-container--device-frame' : '',
    chromeFloating ? 'simulator-container--chrome-floating' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const simulatorContainerStyle: React.CSSProperties = {
    ...(showDeviceChrome ? simulatorFrameInnerStyle : simulatorStyle),
    ...(chromeFloating
      ? ({ ['--simulator-chrome-pad' as string]: `${SIMULATOR_CHROME_FLOATING_PAD_PX}px` } as React.CSSProperties)
      : {}),
  };

  const previewBody = (
    <>
      {routeNotFound ? (
        <div className="preview-route-status preview-route-status--empty">
          <div className="preview-route-status__title">当前路由不存在</div>
          <div className="preview-route-status__desc">请在搭建器中检查多路由配置，或切换可导航的路由。</div>
        </div>
      ) : routeEmpty ? (
        <div className="preview-route-status preview-route-status--empty">
          <div className="preview-route-status__title">
            {isComponentEntity ? '暂无可预览内容' : '当前页面暂无内容'}
          </div>
          <div className="preview-route-status__desc">
            {isComponentEntity
              ? '搭建画布中还没有可渲染的组件，请从组件库拖拽到画布。'
              : '请先在搭建器中添加需要展示的组件。'}
          </div>
        </div>
      ) : (
        <PreviewPortalContainerContext.Provider value={embeddedPreviewPortalMount}>
          <SimulatorLibraryBrushOverlay activeLibrary={previewUiLibrary} variant="embedded">
            {(lib) => (
              <PreviewUiLibraryContext.Provider value={lib}>
                <AntdRuntimeRoot>
                  <PreviewDataHubRefContext.Provider value={dataHubRef}>
                    <PreviewRenderer
                      key={`${renderTree.key}-${lib}-${refreshTick}`}
                      node={renderTree}
                      onLifecycle={handleLifecycle}
                    />
                  </PreviewDataHubRefContext.Provider>
                </AntdRuntimeRoot>
              </PreviewUiLibraryContext.Provider>
            )}
          </SimulatorLibraryBrushOverlay>
        </PreviewPortalContainerContext.Provider>
      )}
    </>
  );

  const simulatorPanel = (
    <div className={simulatorContainerClassName} style={simulatorContainerStyle}>
      {showDeviceChrome && !chromeFloating ? (
        <SimulatorDeviceChrome variant={simulatorChromeStyle} />
      ) : null}
      <div
        ref={bindEmbeddedSimulatorScrollRef}
        className={['simulator-scroll', chromeFloating ? 'simulator-scroll--chrome-inset' : ''].filter(Boolean).join(' ')}
        data-preview-scroll-container="true"
        data-builder-scroll-container="true"
        data-urpbuilder-simulator-scroll="embedded"
      >
        <div
          className="preview-engine-canvas builder-embedded-preview__canvas-inner"
          data-preview-page
        >
          {previewBody}
        </div>
      </div>
      <div
        ref={bindEmbeddedSimulatorOverlayRef}
        className="simulator-overlay-root"
        data-builder-overlay-container="embedded"
      />
      {showDeviceChrome && chromeFloating ? (
        <SimulatorDeviceChrome variant={simulatorChromeStyle} />
      ) : null}
    </div>
  );

  return (
    <div className="builder-embedded-preview">
      <div className="builder-embedded-preview__note">
        <p className="builder-embedded-preview__note-text">
          壳内预览随搭建即时更新。上线前建议仍用右上角「预览」新开独立窗口，更接近真实页面环境。
        </p>
        <div className="builder-embedded-preview__note-actions" role="toolbar" aria-label="实时预览工具">
          <Button
            size="small"
            theme="default"
            variant="outline"
            onClick={bumpRefresh}
          >
            <RefreshCw size={14} strokeWidth={2} style={{ marginRight: 4, verticalAlign: '-2px' }} />
            刷新预览
          </Button>
          <label className="builder-embedded-preview__auto-refresh">
            <span className="builder-embedded-preview__auto-refresh-label">进入本页自动刷新</span>
            <Switch
              size="small"
              value={autoRefreshOnShow}
              onChange={(v) => {
                const next = Boolean(v);
                setAutoRefreshOnShow(next);
                try {
                  window.localStorage.setItem(AUTO_REFRESH_STORAGE_KEY, next ? 'true' : 'false');
                } catch {
                  /* ignore */
                }
              }}
            />
          </label>
        </div>
      </div>
      <div className="main-body">
        <div className="main-inner">
          <div className="component-body">
            {showDeviceChrome ? (
              <div className="simulator-device-wrap" style={simulatorStyle}>
                <span className="simulator-device-sidekey simulator-device-sidekey--silence" aria-hidden />
                <span className="simulator-device-sidekey simulator-device-sidekey--vol-up" aria-hidden />
                <span className="simulator-device-sidekey simulator-device-sidekey--vol-down" aria-hidden />
                <span className="simulator-device-sidekey simulator-device-sidekey--power" aria-hidden />
                {simulatorPanel}
              </div>
            ) : (
              simulatorPanel
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BuilderEmbeddedPreview;
