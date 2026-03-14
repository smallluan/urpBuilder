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
import type { BuiltInLayoutTemplateId, UiTreeNode } from '../../builder/store/types';
import { useCreatePageStore } from './store';

const PageLayout: React.FC = () => {
  return (
    <div className="create-body">
      <ComponentAsideLeft />
      <ComponentMainBody />
      <ComponentAsideRight />
    </div>
  );
};

const CreatePage: React.FC = () => {
  const [mode, setMode] = useState<'component' | 'flow'>('component');
  const loadedPageIdRef = useRef<string | null>(null);
  const setCurrentPageMeta = useCreatePageStore((state) => state.setCurrentPageMeta);

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
          uiPageData: template.uiTree as unknown as UiTreeNode,
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
        emitApiAlert('加载失败', '页面详情请求失败，请稍后重试');
      }
    };

    void loadPageDetail();
  }, [setCurrentPageMeta]);

  return (
    <BuilderProvider useStore={useCreatePageStore}>
      <BuilderShell header={<HeaderControls mode={mode} onChange={setMode} designLabel="页面" saveEntityLabel="页面" />}>
        {mode === 'component' ? <PageLayout /> : <FlowLayout />}
      </BuilderShell>
    </BuilderProvider>
  );
};

export default CreatePage;
