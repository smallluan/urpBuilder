import React from 'react';
import { useLocation } from 'react-router-dom';
import type { Edge, Node } from '@xyflow/react';
import PreviewRenderer from './components/PreviewRenderer';
import { deserializePreviewSnapshot, type PreviewSnapshot } from './utils/snapshot';
import { createPreviewDataHub } from './runtime/dataHub';
import { createPreviewFlowRuntime, type PreviewFlowRuntime } from './runtime/flowRuntime';
import { getPageDetail } from '../../api/pageTemplate';
import type { UiTreeNode } from '../../builder/store/types';
import './style.less';

const EMPTY_ROOT: UiTreeNode = { key: '__root__', type: 'root', label: '', props: {}, children: [] };

const PreviewEngine: React.FC = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);

  const serializedFromState = (location.state as { snapshot?: string } | null)?.snapshot;
  const snapshotKey = searchParams.get('snapshotKey');
  const pageId = searchParams.get('pageId');
  const scopeId = (searchParams.get('scopeId') || 'root').trim() || 'root';

  const serializedFromStorage = snapshotKey ? window.localStorage.getItem(snapshotKey) : null;
  const serialized = serializedFromStorage ?? serializedFromState;

  const parsedSnapshot = React.useMemo(
    () => (serialized ? deserializePreviewSnapshot(serialized) : null),
    [serialized],
  );

  // 当通过 pageId 直接打开预览时，从 API 加载数据
  const [remoteSnapshot, setRemoteSnapshot] = React.useState<PreviewSnapshot | null>(null);

  React.useEffect(() => {
    if (parsedSnapshot || !pageId) return;
    getPageDetail(pageId)
      .then((res) => {
        const template = res.data?.template;
        if (!template) return;
        setRemoteSnapshot({
          uiTreeData: (template.uiTree as unknown as UiTreeNode) ?? EMPTY_ROOT,
          flowNodes: (template.flowNodes as unknown as Node[]) ?? [],
          flowEdges: (template.flowEdges as unknown as Edge[]) ?? [],
        });
      })
      .catch(() => {/* 加载失败时保持空白，不阻塞渲染 */});
  }, [pageId, parsedSnapshot]);

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
      <div className="preview-engine-canvas" data-preview-page>
        {(renderTree.children ?? []).map((child) => (
          <PreviewRenderer key={child.key} node={child} onLifecycle={handleLifecycle} />
        ))}
      </div>
    </div>
  );
};

export default PreviewEngine;
