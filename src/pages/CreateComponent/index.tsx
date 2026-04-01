import React, { useCallback, useEffect, useRef, useState } from 'react';
// layout components handle their own asides
import './style.less';
import HeaderControls from '../../builder/components/HeaderControls';
import ComponentLayout from './ComponentLayout';
import FlowLayout from '../../builder/flow/FlowLayout';
import { getComponentTemplateDetail } from '../../api/componentTemplate';
import { emitApiAlert } from '../../api/alertBus';
import { MessagePlugin } from 'tdesign-react';
import { useCreateComponentStore } from './store';
import { BuilderProvider } from '../../builder/context/BuilderContext';
import { BuilderShell } from '../../builder/components/BuilderShell';
import type { Edge, Node } from '@xyflow/react';
import type { UiTreeNode, BuiltInLayoutTemplateId } from '../../builder/store/types';
import { useAuth } from '../../auth/context';
import { useBuilderModeHotkeys } from '../../builder/hooks/useBuilderModeHotkeys';
import { initModeLongTaskObserver, markModeSwitchEnd, markModeSwitchStart } from '../../builder/utils/perf';
import {
  collectCustomComponentInstances,
  fetchLatestComponentBundle,
  fetchComponentTemplateBundle,
  upgradeCustomComponentsInTree,
  type ComponentTemplateBundle,
} from '../../utils/customComponentUpgrade';
import { computeDependencyUpgradeItems, fetchLatestComponentInfoMap } from '../../utils/componentDependencyMeta';
import { aggregateDirectCustomDependencyRows } from '../../utils/directCustomDependencies';
import { collectCustomComponentNodesForId } from '../../utils/customComponentVersionRisk';
import type { DependencyUpgradeItem } from '../../builder/components/DependencyUpgradeIndicator';
import DependencyManagerDrawer from '../../builder/components/DependencyManagerDrawer';
import BuilderQuickFind from '../../builder/components/BuilderQuickFind';
import { computePersistedTemplateFingerprint } from '../../builder/save/templateFingerprint';

const resolveValidTemplateIdFromUrl = () => {
  const searchParams = new URLSearchParams(window.location.search);
  const rawId = (searchParams.get('id') || searchParams.get('pageId') || '').trim();

  if (!rawId) {
    return '';
  }

  const normalized = rawId.toLowerCase();
  if (normalized === 'undefined' || normalized === 'null' || normalized === '-') {
    return '';
  }

  return rawId;
};

const CreateComponent: React.FC = () => {
  const { user } = useAuth();
  const [mode, setMode] = useState<'component' | 'flow'>('component');
  const [componentLayoutMounted, setComponentLayoutMounted] = useState(true);
  const [flowLayoutMounted, setFlowLayoutMounted] = useState(false);
  const [readOnly, setReadOnly] = useState(false);
  const [readOnlyReason, setReadOnlyReason] = useState('');
  const [dependencyUpdates, setDependencyUpdates] = useState<DependencyUpgradeItem[]>([]);
  const latestByIdRef = useRef<Map<string, ComponentTemplateBundle>>(new Map());
  const ignoredDependencyIdsRef = useRef<Set<string>>(new Set());
  const loadedPageIdRef = useRef<string | null>(null);
  const setCurrentPageMeta = useCreateComponentStore((state) => state.setCurrentPageMeta);

  const refreshDependencyUpdates = useCallback(async () => {
    const tree = useCreateComponentStore.getState().uiPageData;
    const instances = collectCustomComponentInstances(tree);
    const componentIds = Array.from(new Set(instances.map((i) => i.componentId)));
    if (componentIds.length === 0) {
      latestByIdRef.current = new Map();
      setDependencyUpdates([]);
      return;
    }
    const latestMap = await fetchLatestComponentInfoMap(componentIds);
    latestByIdRef.current = latestMap;
    setDependencyUpdates(computeDependencyUpgradeItems(instances, latestMap, ignoredDependencyIdsRef.current));
  }, []);

  const collectDependencyRows = useCallback(
    () =>
      aggregateDirectCustomDependencyRows(collectCustomComponentInstances(useCreateComponentStore.getState().uiPageData)),
    [],
  );

  const collectInstanceNodesForComponent = useCallback((componentId: string) => {
    return collectCustomComponentNodesForId(useCreateComponentStore.getState().uiPageData, componentId);
  }, []);

  const applyVersionToEditor = useCallback(
    async (componentId: string, version: number) => {
      const bundle = await fetchComponentTemplateBundle(componentId, version);
      if (!bundle?.detail) {
        MessagePlugin.warning('无法加载该版本');
        return false;
      }
      const tree = useCreateComponentStore.getState().uiPageData;
      const m = new Map([[componentId, bundle]]);
      const nextTree = upgradeCustomComponentsInTree(tree, m);
      if (nextTree === tree) {
        MessagePlugin.warning('未找到该依赖实例');
        return false;
      }
      useCreateComponentStore.setState({ uiPageData: nextTree });
      await refreshDependencyUpdates();
      MessagePlugin.success('已切换版本，请保存草稿以同步到服务端');
      return true;
    },
    [refreshDependencyUpdates],
  );

  const handleUpgradeDependencyToLatest = useCallback(async (componentId: string) => {
    const bundle = await fetchLatestComponentBundle(componentId);
    if (!bundle) {
      MessagePlugin.warning('获取最新依赖失败，请稍后重试');
      return;
    }
    latestByIdRef.current.set(componentId, bundle);
    const latestById = new Map<string, ComponentTemplateBundle>();
    latestById.set(componentId, bundle);
    const currentTree = useCreateComponentStore.getState().uiPageData as UiTreeNode;
    const nextTree = upgradeCustomComponentsInTree(currentTree, latestById);
    if (nextTree === currentTree) {
      MessagePlugin.warning('未检测到可升级变更，请稍后重试或刷新依赖列表');
      return;
    }
    useCreateComponentStore.setState({ uiPageData: nextTree });
    setDependencyUpdates((prev) => prev.filter((item) => item.componentId !== componentId));
    MessagePlugin.success('已升级到最新');
  }, []);

  const handleUpgradeAllPending = useCallback(async () => {
    if (dependencyUpdates.length === 0) {
      return;
    }
    const bundles = await Promise.all(
      dependencyUpdates.map((item) => fetchLatestComponentBundle(item.componentId)),
    );
    const latestById = new Map<string, ComponentTemplateBundle>();
    let failedCount = 0;
    dependencyUpdates.forEach((item, index) => {
      const bundle = bundles[index];
      if (bundle) {
        latestById.set(item.componentId, bundle);
        latestByIdRef.current.set(item.componentId, bundle);
      } else {
        failedCount += 1;
      }
    });
    if (latestById.size === 0) {
      MessagePlugin.warning('获取最新依赖失败，请稍后重试');
      return;
    }
    if (failedCount > 0) {
      MessagePlugin.warning(`部分依赖拉取失败（${failedCount} 个），已跳过`);
    }
    const currentTree = useCreateComponentStore.getState().uiPageData as UiTreeNode;
    const nextTree = upgradeCustomComponentsInTree(currentTree, latestById);
    if (nextTree === currentTree) {
      MessagePlugin.warning('未检测到可升级变更，请稍后重试或刷新依赖列表');
      return;
    }
    useCreateComponentStore.setState({ uiPageData: nextTree });
    dependencyUpdates.forEach((item) => ignoredDependencyIdsRef.current.delete(item.componentId));
    setDependencyUpdates([]);
    MessagePlugin.success('已全部升级到最新');
  }, [dependencyUpdates]);

  useEffect(() => {
    initModeLongTaskObserver();
  }, []);

  useEffect(() => {
    if (mode === 'component') {
      setComponentLayoutMounted(true);
    } else {
      setFlowLayoutMounted(true);
    }
    const rafId = window.requestAnimationFrame(() => {
      markModeSwitchEnd(mode);
    });
    return () => window.cancelAnimationFrame(rafId);
  }, [mode]);

  useBuilderModeHotkeys(mode, setMode);

  useEffect(() => {
    const pageId = resolveValidTemplateIdFromUrl();

    if (!pageId) {
      return;
    }

    if (loadedPageIdRef.current === pageId) {
      return;
    }

    loadedPageIdRef.current = pageId;
    setCurrentPageMeta({ pageId });

    const loadPageDetail = async () => {
      try {
        const response = await getComponentTemplateDetail(pageId);
        const detail = response.data;
        if (detail.base?.ownerId && user?.id && detail.base.ownerId !== user.id) {
          setReadOnly(true);
          setReadOnlyReason('当前组件不属于你，已自动切换为只读查看。');
        }
        const template = detail?.template;

        if (!template) {
          emitApiAlert('加载失败', '未获取到模板详情数据');
          return;
        }

        const pageConfig = template.pageConfig ?? {};

        setCurrentPageMeta({
          pageId: detail.base?.pageId ?? pageId,
          pageName: detail.base?.pageName ?? '',
          description: detail.base?.description ?? '',
          visibility: detail.base?.visibility === 'public' ? 'public' : 'private',
        });

        const initialTree = template.uiTree as unknown as UiTreeNode;
        const depInstances = collectCustomComponentInstances(initialTree);
        const depIds = Array.from(new Set(depInstances.map((i) => i.componentId)));
        if (depIds.length === 0) {
          latestByIdRef.current = new Map();
          setDependencyUpdates([]);
        } else {
          const latestMap = await fetchLatestComponentInfoMap(depIds);
          latestByIdRef.current = latestMap;
          setDependencyUpdates(computeDependencyUpgradeItems(depInstances, latestMap, ignoredDependencyIdsRef.current));
        }

        useCreateComponentStore.setState({
          screenSize: (pageConfig.screenSize as string | number | undefined) ?? detail.base?.screenSize ?? 'auto',
          autoWidth:
            typeof pageConfig.autoWidth === 'number'
              ? pageConfig.autoWidth
              : (detail.base?.autoWidth ?? 1800),
          uiPageData: initialTree,
          flowNodes: (template.flowNodes as unknown as Node[]) ?? [],
          flowEdges: (template.flowEdges as unknown as Edge[]) ?? [],
          selectedLayoutTemplateId:
            (pageConfig.selectedLayoutTemplateId as BuiltInLayoutTemplateId | null | undefined) ?? null,
          flowActiveNodeId: null,
          activeNodeKey: null,
          activeNode: null,
          history: {
            pointer: -1,
            actions: [],
          },
        });
        useCreateComponentStore.getState().setLastPersistedTemplateFingerprint(
          computePersistedTemplateFingerprint(useCreateComponentStore.getState(), {
            enablePageRouteConfig: false,
            enableComponentContract: true,
          }),
        );
      } catch {
        emitApiAlert('加载失败', '组件详情请求失败，请稍后重试');
      }
    };

    void loadPageDetail();
  }, [setCurrentPageMeta, user?.id]);

  return (
    <BuilderProvider
      useStore={useCreateComponentStore}
      readOnly={readOnly}
      readOnlyReason={readOnlyReason}
      entityType="component"
      builderViewMode={mode}
    >
      <BuilderShell
        header={
          <HeaderControls
            mode={mode}
            onChange={(nextMode) => {
              markModeSwitchStart(nextMode);
              setMode(nextMode);
            }}
            entityType="component"
            enableComponentContract
          />
        }
      >
        <BuilderQuickFind mode={mode} />
        <div className="mode-keepalive-host">
          <div className={`mode-keepalive-pane${mode === 'component' ? ' is-active' : ''}`}>
            {componentLayoutMounted ? (
              <ComponentLayout
                composeToolbarExtra={(
                  <DependencyManagerDrawer
                    readOnly={readOnly}
                    collectDependencyRows={collectDependencyRows}
                    collectInstanceNodesForComponent={collectInstanceNodesForComponent}
                    onIgnoreDependency={(componentId) => {
                      ignoredDependencyIdsRef.current.add(componentId);
                      void refreshDependencyUpdates();
                    }}
                    applyVersionToEditor={applyVersionToEditor}
                    pendingUpgrades={dependencyUpdates}
                    onUpgradeDependencyToLatest={handleUpgradeDependencyToLatest}
                    onUpgradeAllPending={handleUpgradeAllPending}
                    onIgnoreAllPendingUpgrades={() => {
                      dependencyUpdates.forEach((item) => ignoredDependencyIdsRef.current.add(item.componentId));
                      void refreshDependencyUpdates();
                    }}
                  />
                )}
              />
            ) : null}
          </div>
          <div className={`mode-keepalive-pane${mode === 'flow' ? ' is-active' : ''}`}>
            {flowLayoutMounted ? <FlowLayout /> : null}
          </div>
        </div>
      </BuilderShell>
    </BuilderProvider>
  );
};

export default CreateComponent;
