import React, { useEffect, useRef, useState } from 'react';
// layout components handle their own asides
import './style.less';
import HeaderControls from '../../builder/components/HeaderControls';
import ComponentLayout from './ComponentLayout';
import FlowLayout from '../../builder/flow/FlowLayout';
import { getComponentTemplateDetail } from '../../api/componentTemplate';
import { emitApiAlert } from '../../api/alertBus';
import { useCreateComponentStore } from './store';
import { BuilderProvider } from '../../builder/context/BuilderContext';
import { BuilderShell } from '../../builder/components/BuilderShell';
import type { Edge, Node } from '@xyflow/react';
import type { UiTreeNode, BuiltInLayoutTemplateId } from '../../builder/store/types';
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

const CreateComponent: React.FC = () => {
  const { user } = useAuth();
  const [mode, setMode] = useState<'component' | 'flow'>('component');
  const [readOnly, setReadOnly] = useState(false);
  const [readOnlyReason, setReadOnlyReason] = useState('');
  const loadedPageIdRef = useRef<string | null>(null);
  const setCurrentPageMeta = useCreateComponentStore((state) => state.setCurrentPageMeta);

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

        useCreateComponentStore.setState({
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
        emitApiAlert('加载失败', '组件详情请求失败，请稍后重试');
      }
    };

    void loadPageDetail();
  }, [setCurrentPageMeta, user?.id]);

  return (
    <BuilderProvider useStore={useCreateComponentStore} readOnly={readOnly} readOnlyReason={readOnlyReason} entityType="component">
      <BuilderShell header={<HeaderControls mode={mode} onChange={setMode} entityType="component" enableComponentContract />}>
        {mode === 'component' ? <ComponentLayout /> : <FlowLayout />}
      </BuilderShell>
    </BuilderProvider>
  );
};

export default CreateComponent;
