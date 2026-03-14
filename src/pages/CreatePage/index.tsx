import React, { useEffect, useRef, useState } from 'react';
import type { Edge, Node } from '@xyflow/react';
import { getPageDetail } from '../../api/pageTemplate';
import { emitApiAlert } from '../../api/alertBus';
import HeaderControls from '../../builder/components/HeaderControls';
import { BuilderShell } from '../../builder/components/BuilderShell';
import ComponentAsideLeft from '../../builder/components/ComponentAsideLeft';
import ComponentMainBody from '../../builder/components/ComponentMainBody';
import ComponentAsideRight from '../../builder/components/ComponentAsideRight';
import FlowLayout from '../../builder/flow/FlowLayout';
import { BuilderProvider } from '../../builder/context/BuilderContext';
import type { BuiltInLayoutTemplateId, PageRouteConfig, PageRouteRecord, UiTreeNode } from '../../builder/store/types';
import { useCreatePageStore } from './store';
import PageRouteToolbar from './components/PageRouteToolbar.tsx';

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
  const [mode, setMode] = useState<'component' | 'flow'>('component');
  const loadedPageIdRef = useRef<string | null>(null);
  const pageIdFromUrl = new URLSearchParams(window.location.search).get('id') || new URLSearchParams(window.location.search).get('pageId') || '';
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
    const searchParams = new URLSearchParams(window.location.search);
    const pageId = (searchParams.get('id') || searchParams.get('pageId') || '').trim();

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
        const response = await getPageDetail(pageId);
        const detail = response.data;
        const template = detail?.template;

        if (!template) {
          emitApiAlert('加载失败', '未获取到页面详情数据');
          return;
        }

        const pageConfig = template.pageConfig ?? {};
        const normalizedRouteConfig = normalizeRouteConfig(pageConfig.routeConfig);
        const normalizedRoutes = normalizeTemplateRoutes(template as unknown as Record<string, unknown>, normalizedRouteConfig);

        setCurrentPageMeta({
          pageId: detail.base?.pageId ?? pageId,
          pageName: detail.base?.pageName ?? '',
        });

        useCreatePageStore.setState({
          screenSize: (pageConfig.screenSize as string | number | undefined) ?? detail.base?.screenSize ?? 'auto',
          autoWidth:
            typeof pageConfig.autoWidth === 'number'
              ? pageConfig.autoWidth
              : (detail.base?.autoWidth ?? 1800),
          uiPageData: normalizedRoutes[0]?.uiTree as UiTreeNode,
          flowNodes: normalizedRoutes[0]?.flowNodes ?? [],
          flowEdges: normalizedRoutes[0]?.flowEdges ?? [],
          selectedLayoutTemplateId: normalizedRoutes[0]?.selectedLayoutTemplateId ?? null,
          pageRouteConfig: normalizedRoutes[0]?.routeConfig ?? normalizedRouteConfig,
          pageRoutes: normalizedRoutes,
          activePageRouteId: normalizedRoutes[0]?.routeId ?? null,
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
  }, [setCurrentPageMeta]);

  return (
    <BuilderProvider useStore={useCreatePageStore}>
      <BuilderShell header={<HeaderControls mode={mode} onChange={setMode} designLabel="页面" saveEntityLabel="页面" entityType="page" enablePageRouteConfig />}>
        {mode === 'component' ? <PageLayout /> : <FlowLayout />}
      </BuilderShell>
    </BuilderProvider>
  );
};

export default CreatePage;
