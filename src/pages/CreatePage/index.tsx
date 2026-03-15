import React, { useEffect, useRef, useState } from 'react';
import type { Edge, Node } from '@xyflow/react';
import { getPageTemplateDetail } from '../../api/pageTemplate';
import { emitApiAlert } from '../../api/alertBus';
import HeaderControls from '../../builder/components/HeaderControls';
import { BuilderShell } from '../../builder/components/BuilderShell';
import ComponentAsideLeft from '../../builder/components/ComponentAsideLeft';
import ComponentMainBody from '../../builder/components/ComponentMainBody';
import ComponentAsideRight from '../../builder/components/ComponentAsideRight';
import FlowLayout from '../../builder/flow/FlowLayout';
import { BuilderProvider } from '../../builder/context/BuilderContext';
import type { BuiltInLayoutTemplateId, PageRouteConfig, PageRouteRecord, UiTreeNode } from '../../builder/store/types';
import { findNodeByKey, updateNodeByKey } from '../../utils/createComponentTree';
import { useCreatePageStore } from './store';
import PageRouteToolbar from './components/PageRouteToolbar.tsx';
import { useAuth } from '../../auth/context';

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

const normalizeTemplateRoutes = (template: Record<string, unknown>, fallbackRouteConfig: PageRouteConfig | null): PageRouteRecord[] => {
  const routes = Array.isArray(template.routes) ? template.routes as Array<Record<string, unknown>> : [];

  if (routes.length > 0) {
    return routes.map((item, index) => ({
      routeId: typeof item.routeId === 'string' && item.routeId.trim() ? item.routeId : `route-${index + 1}`,
      routeConfig: normalizeRouteConfig(item.routeConfig) ?? {
        routePath: index === 0 ? '/' : `/route-${index + 1}`,
        routeName: `route${index + 1}`,
        pageTitle: `路由 ${index + 1}`,
        menuTitle: `路由 ${index + 1}`,
        useLayout: true,
      },
      uiTree: (item.uiTree as UiTreeNode) ?? { key: '__root__', label: '该页面', props: {}, children: [] },
      flowNodes: (item.flowNodes as Node[]) ?? [],
      flowEdges: (item.flowEdges as Edge[]) ?? [],
      selectedLayoutTemplateId: (item.selectedLayoutTemplateId as BuiltInLayoutTemplateId | null | undefined) ?? null,
      history: { pointer: -1, actions: [] },
    }));
  }

  return [{
    routeId: 'route-root',
    routeConfig: fallbackRouteConfig ?? {
      routePath: '/',
      routeName: 'root',
      pageTitle: '默认路由',
      menuTitle: '默认路由',
      useLayout: true,
    },
    uiTree: (template.uiTree as UiTreeNode) ?? { key: '__root__', label: '该页面', props: {}, children: [] },
    flowNodes: (template.flowNodes as Node[]) ?? [],
    flowEdges: (template.flowEdges as Edge[]) ?? [],
    selectedLayoutTemplateId: (template.pageConfig as Record<string, unknown> | undefined)?.selectedLayoutTemplateId as BuiltInLayoutTemplateId | null | undefined ?? null,
    history: { pointer: -1, actions: [] },
  }];
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

const composeRouteUiTree = (privateTree: UiTreeNode, sharedUiTree: UiTreeNode | null, outletKey: string | null): UiTreeNode => {
  if (!sharedUiTree || !outletKey) {
    return privateTree;
  }

  const sharedOutlet = findNodeByKey(sharedUiTree, outletKey);
  if (!sharedOutlet) {
    return privateTree;
  }

  const privateOutlet = findNodeByKey(privateTree, outletKey);
  const outletChildren = privateOutlet?.type === 'RouteOutlet'
    ? (privateOutlet.children ?? [])
    : [];

  return updateNodeByKey(sharedUiTree, outletKey, (target) => ({
    ...target,
    children: outletChildren,
  }));
};

const composeRouteFlow = (
  privateNodes: Node[],
  privateEdges: Edge[],
  sharedNodes: Node[],
  sharedEdges: Edge[],
) => {
  const visibleSharedNodes = sharedNodes;

  const mergedNodes = new Map<string, Node>();
  visibleSharedNodes.forEach((node) => mergedNodes.set(node.id, node));
  privateNodes.forEach((node) => mergedNodes.set(node.id, node));
  const flowNodes = Array.from(mergedNodes.values());
  const flowNodeIds = new Set(flowNodes.map((node) => node.id));

  const visibleSharedEdges = sharedEdges;

  const mergedEdges = new Map<string, Edge>();
  visibleSharedEdges.forEach((edge) => {
    if (flowNodeIds.has(edge.source) && flowNodeIds.has(edge.target)) {
      mergedEdges.set(edge.id, edge);
    }
  });
  privateEdges.forEach((edge) => {
    if (flowNodeIds.has(edge.source) && flowNodeIds.has(edge.target)) {
      mergedEdges.set(edge.id, edge);
    }
  });

  return {
    flowNodes,
    flowEdges: Array.from(mergedEdges.values()),
  };
};

const PageLayout: React.FC = () => {
  return (
    <div className="create-body">
      <ComponentAsideLeft />
      <ComponentMainBody toolbarExtra={<PageRouteToolbar />} />
      <ComponentAsideRight />
    </div>
  );
};

const CreatePage: React.FC = () => {
  const { user } = useAuth();
  const [mode, setMode] = useState<'component' | 'flow'>('component');
  const [readOnly, setReadOnly] = useState(false);
  const [readOnlyReason, setReadOnlyReason] = useState('');
  const loadedPageIdRef = useRef<string | null>(null);
  const pageIdFromUrl = resolveValidTemplateIdFromUrl();
  const setCurrentPageMeta = useCreatePageStore((state) => state.setCurrentPageMeta);
  const pageRoutes = useCreatePageStore((state) => state.pageRoutes);
  const activePageRouteId = useCreatePageStore((state) => state.activePageRouteId);
  const uiPageData = useCreatePageStore((state) => state.uiPageData);
  const flowNodes = useCreatePageStore((state) => state.flowNodes);
  const flowEdges = useCreatePageStore((state) => state.flowEdges);
  const selectedLayoutTemplateId = useCreatePageStore((state) => state.selectedLayoutTemplateId);
  const pageRouteConfig = useCreatePageStore((state) => state.pageRouteConfig);
  const syncActivePageRouteSnapshot = useCreatePageStore((state) => state.syncActivePageRouteSnapshot);
  const addPageRoute = useCreatePageStore((state) => state.addPageRoute);
  const switchPageRoute = useCreatePageStore((state) => state.switchPageRoute);

  useEffect(() => {
    if (pageRoutes.length > 0 || loadedPageIdRef.current || pageIdFromUrl.trim()) {
      return;
    }

    const createdRouteId = addPageRoute({
      routeId: 'route-root',
      routeConfig: {
        routePath: '/',
        routeName: 'root',
        pageTitle: '默认路由',
        menuTitle: '默认路由',
        useLayout: true,
      },
      uiTree: uiPageData,
    });
    switchPageRoute(createdRouteId);
  }, [addPageRoute, pageIdFromUrl, pageRoutes.length, switchPageRoute, uiPageData]);

  useEffect(() => {
    if (!activePageRouteId) {
      return;
    }

    syncActivePageRouteSnapshot();
  }, [activePageRouteId, uiPageData, flowNodes, flowEdges, selectedLayoutTemplateId, pageRouteConfig, syncActivePageRouteSnapshot]);

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
        const response = await getPageTemplateDetail(pageId);
        const detail = response.data;
        if (detail.base?.ownerId && user?.id && detail.base.ownerId !== user.id) {
          setReadOnly(true);
          setReadOnlyReason('当前页面不属于你，已自动切换为只读查看。');
        }
        const template = detail?.template;

        if (!template) {
          emitApiAlert('加载失败', '未获取到页面详情数据');
          return;
        }

        const pageConfig = template.pageConfig ?? {};
        const normalizedRouteConfig = normalizeRouteConfig(pageConfig.routeConfig);
        const normalizedRoutes = normalizeTemplateRoutes(template as unknown as Record<string, unknown>, normalizedRouteConfig);
        const sharedUiTree = pageConfig.sharedUiTree && typeof pageConfig.sharedUiTree === 'object' && !Array.isArray(pageConfig.sharedUiTree)
          ? (pageConfig.sharedUiTree as unknown as UiTreeNode)
          : (Array.isArray(pageConfig.sharedUiChildren)
            ? ({
              key: '__root__',
              label: '该页面',
              props: {},
              children: pageConfig.sharedUiChildren as unknown as UiTreeNode[],
            } as UiTreeNode)
            : null);
        const sharedFlowNodes = Array.isArray(pageConfig.sharedFlowNodes)
          ? (pageConfig.sharedFlowNodes as unknown as Node[])
          : [];
        const sharedFlowEdges = Array.isArray(pageConfig.sharedFlowEdges)
          ? (pageConfig.sharedFlowEdges as unknown as Edge[])
          : [];
        const firstRoute = normalizedRoutes[0] ?? null;
        const activeRouteOutletKey = resolveEffectiveOutletKey(
          firstRoute?.uiTree ?? ({ key: '__root__', label: '该页面', props: {}, children: [] } as UiTreeNode),
          typeof pageConfig.activeRouteOutletKey === 'string' ? pageConfig.activeRouteOutletKey : null,
        );
        const composedUiTree = firstRoute
          ? composeRouteUiTree(firstRoute.uiTree, sharedUiTree, activeRouteOutletKey)
          : ({ key: '__root__', label: '该页面', props: {}, children: [] } as UiTreeNode);
        const composedFlow = firstRoute
          ? composeRouteFlow(firstRoute.flowNodes, firstRoute.flowEdges, sharedFlowNodes, sharedFlowEdges)
          : { flowNodes: [], flowEdges: [] as Edge[] };

        setCurrentPageMeta({
          pageId: detail.base?.pageId ?? pageId,
          pageName: detail.base?.pageName ?? '',
          visibility: detail.base?.visibility === 'public' ? 'public' : 'private',
        });

        useCreatePageStore.setState({
          screenSize: (pageConfig.screenSize as string | number | undefined) ?? detail.base?.screenSize ?? 'auto',
          autoWidth:
            typeof pageConfig.autoWidth === 'number'
              ? pageConfig.autoWidth
              : (detail.base?.autoWidth ?? 1800),
          uiPageData: composedUiTree,
          flowNodes: composedFlow.flowNodes,
          flowEdges: composedFlow.flowEdges,
          selectedLayoutTemplateId: firstRoute?.selectedLayoutTemplateId ?? null,
          pageRouteConfig: firstRoute?.routeConfig ?? normalizedRouteConfig,
          pageRoutes: normalizedRoutes,
          activePageRouteId: firstRoute?.routeId ?? null,
          activeRouteOutletKey,
          sharedUiTree,
          sharedFlowNodes,
          sharedFlowEdges,
          flowActiveNodeId: null,
          activeNodeKey: null,
          activeNode: null,
          history: {
            pointer: -1,
            actions: [],
          },
        });
      } catch {
        emitApiAlert('加载失败', '页面详情请求失败，请稍后重试');
      }
    };

    void loadPageDetail();
  }, [setCurrentPageMeta, user?.id]);

  return (
    <BuilderProvider useStore={useCreatePageStore} readOnly={readOnly} readOnlyReason={readOnlyReason}>
      <BuilderShell header={<HeaderControls mode={mode} onChange={setMode} designLabel="页面" saveEntityLabel="页面" entityType="page" enablePageRouteConfig />}>
        {mode === 'component' ? <PageLayout /> : <FlowLayout />}
      </BuilderShell>
    </BuilderProvider>
  );
};

export default CreatePage;
