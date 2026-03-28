import React, { useEffect, useRef, useState } from 'react';
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
import { initModeLongTaskObserver, markModeSwitchEnd, markModeSwitchStart } from '../../builder/utils/perf';
import { collectCustomComponentInstances, fetchLatestComponentBundle, upgradeCustomComponentsInTree } from '../../utils/customComponentUpgrade';
import type { ComponentDetail, ComponentTemplateBaseInfo } from '../../api/types';
import DependencyUpgradeIndicator, { type DependencyUpgradeItem } from '../../builder/components/DependencyUpgradeIndicator';

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
  const latestByIdRef = useRef<Map<string, { base: ComponentTemplateBaseInfo; detail: ComponentDetail | null }>>(new Map());
  const ignoredDependencyIdsRef = useRef<Set<string>>(new Set());
  const loadedPageIdRef = useRef<string | null>(null);
  const setCurrentPageMeta = useCreateComponentStore((state) => state.setCurrentPageMeta);

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

        const resolveLatestComponentInfo = async (componentIds: string[]) => {
          const tasks = componentIds.map(async (componentId) => {
            try {
              const res = await getComponentTemplateDetail(componentId);
              const base = (res.data?.base ?? {}) as ComponentTemplateBaseInfo;
              return { componentId, base, detail: res.data as ComponentDetail };
            } catch {
              return { componentId, base: null as unknown as ComponentTemplateBaseInfo, detail: null as ComponentDetail | null };
            }
          });
          const results = await Promise.all(tasks);
          const map = new Map<string, { base: ComponentTemplateBaseInfo; detail: ComponentDetail | null }>();
          results.forEach((item) => {
            if (!item?.componentId || !item.base) return;
            map.set(item.componentId, { base: item.base, detail: item.detail });
          });
          return map;
        };

        const resolveDependencyUpdates = async (tree: UiTreeNode) => {
          const instances = collectCustomComponentInstances(tree);
          const componentIds = Array.from(new Set(instances.map((i) => i.componentId)));
          if (componentIds.length === 0) {
            latestByIdRef.current = new Map();
            setDependencyUpdates([]);
            return;
          }

          const latestMap = await resolveLatestComponentInfo(componentIds);
          latestByIdRef.current = latestMap;
          const merged = new Map<string, DependencyUpgradeItem>();
          instances.forEach((instance) => {
            if (ignoredDependencyIdsRef.current.has(instance.componentId)) {
              return;
            }
            const latest = latestMap.get(instance.componentId);
            if (!latest) return;
            const latestVersion = Number(latest.base.currentVersion);
            if (!Number.isFinite(latestVersion)) return;
            const normalizedUsedVersion = typeof instance.usedVersion === 'number' ? instance.usedVersion : 0;
            if (normalizedUsedVersion >= latestVersion && normalizedUsedVersion > 0) return;
            const prev = merged.get(instance.componentId);
            const usedVersion = prev ? Math.min(prev.usedVersion, normalizedUsedVersion) : normalizedUsedVersion;
            merged.set(instance.componentId, {
              componentId: instance.componentId,
              usedVersion,
              latestVersion,
              name: String(latest.base.pageName ?? instance.componentId),
            });
          });
          setDependencyUpdates(Array.from(merged.values()));
        };

        setCurrentPageMeta({
          pageId: detail.base?.pageId ?? pageId,
          pageName: detail.base?.pageName ?? '',
          description: detail.base?.description ?? '',
          visibility: detail.base?.visibility === 'public' ? 'public' : 'private',
        });

        const initialTree = template.uiTree as unknown as UiTreeNode;
        await resolveDependencyUpdates(initialTree);

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
      } catch {
        emitApiAlert('加载失败', '组件详情请求失败，请稍后重试');
      }
    };

    void loadPageDetail();
  }, [setCurrentPageMeta, user?.id]);

  return (
    <BuilderProvider useStore={useCreateComponentStore} readOnly={readOnly} readOnlyReason={readOnlyReason} entityType="component">
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
            extraRight={(
              <DependencyUpgradeIndicator
                items={dependencyUpdates}
                onIgnoreOne={(componentId) => {
                  ignoredDependencyIdsRef.current.add(componentId);
                  setDependencyUpdates((prev) => prev.filter((item) => item.componentId !== componentId));
                }}
                onUpgradeOne={async (componentId) => {
                  const bundle = await fetchLatestComponentBundle(componentId);
                  if (!bundle) {
                    MessagePlugin.warning('获取最新依赖失败，请稍后重试');
                    return;
                  }
                  latestByIdRef.current.set(componentId, bundle);
                  const latestById = new Map<string, { base: ComponentTemplateBaseInfo; detail: ComponentDetail | null }>();
                  latestById.set(componentId, bundle);
                  const currentTree = useCreateComponentStore.getState().uiPageData as UiTreeNode;
                  const nextTree = upgradeCustomComponentsInTree(currentTree, latestById);
                  if (nextTree === currentTree) {
                    MessagePlugin.warning('未检测到可升级变更，请稍后重试或刷新依赖列表');
                    return;
                  }
                  useCreateComponentStore.setState({ uiPageData: nextTree });
                  setDependencyUpdates((prev) => prev.filter((item) => item.componentId !== componentId));
                  MessagePlugin.success('已升级该组件依赖');
                }}
                onUpgradeAll={async () => {
                  if (dependencyUpdates.length === 0) {
                    return;
                  }
                  const bundles = await Promise.all(
                    dependencyUpdates.map((item) => fetchLatestComponentBundle(item.componentId)),
                  );
                  const latestById = new Map<string, { base: ComponentTemplateBaseInfo; detail: ComponentDetail | null }>();
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
                  setDependencyUpdates([]);
                  MessagePlugin.success('已完成无感升级');
                }}
                onIgnoreAll={() => {
                  dependencyUpdates.forEach((item) => ignoredDependencyIdsRef.current.add(item.componentId));
                  setDependencyUpdates([]);
                }}
              />
            )}
          />
        }
      >
        <div className="mode-keepalive-host">
          <div className={`mode-keepalive-pane${mode === 'component' ? ' is-active' : ''}`}>
            {componentLayoutMounted ? <ComponentLayout /> : null}
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
