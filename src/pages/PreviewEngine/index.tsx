import React from 'react';
import { useLocation } from 'react-router-dom';
import { useCreateComponentStore } from '../CreateComponent/store';
import PreviewRenderer from './components/PreviewRenderer';
import { deserializePreviewSnapshot, type PreviewSnapshot } from './utils/snapshot';
import { createPreviewDataHub } from './runtime/dataHub';
import { createPreviewFlowRuntime, type PreviewFlowRuntime } from './runtime/flowRuntime';
import './style.less';

const PreviewEngine: React.FC = () => {
  const location = useLocation();
  const uiTreeData = useCreateComponentStore((state) => state.uiPageData);
  const flowNodes = useCreateComponentStore((state) => state.flowNodes);
  const flowEdges = useCreateComponentStore((state) => state.flowEdges);

  const serializedFromState = (location.state as { snapshot?: string } | null)?.snapshot;
  const snapshotKey = new URLSearchParams(location.search).get('snapshotKey');
  const serializedFromStorage = snapshotKey ? window.localStorage.getItem(snapshotKey) : null;

  const serialized = serializedFromStorage ?? serializedFromState;
  const parsedSnapshot = React.useMemo(
    () => (serialized ? deserializePreviewSnapshot(serialized) : null),
    [serialized],
  );

  const snapshot: PreviewSnapshot = React.useMemo(
    () =>
      parsedSnapshot ?? {
        uiTreeData,
        flowNodes,
        flowEdges,
      },
    [parsedSnapshot, uiTreeData, flowNodes, flowEdges],
  );

  const [renderTree, setRenderTree] = React.useState(snapshot.uiTreeData);
  const runtimeRef = React.useRef<PreviewFlowRuntime | null>(null);

  React.useEffect(() => {
    setRenderTree(snapshot.uiTreeData);
  }, [snapshot.uiTreeData]);

  React.useEffect(() => {
    const hub = createPreviewDataHub(snapshot.uiTreeData);
    const runtime = createPreviewFlowRuntime(snapshot.flowNodes, snapshot.flowEdges, hub);
    const unsubscribePatched = hub.subscribe('component:patched', () => {
      setRenderTree(hub.getTreeSnapshot());
    });

    runtimeRef.current = runtime;
    window.dataHub = hub;

    return () => {
      unsubscribePatched();
      runtimeRef.current = null;
      if (window.dataHub === hub) {
        delete window.dataHub;
      }
    };
  }, [snapshot.flowEdges, snapshot.flowNodes, snapshot.uiTreeData]);

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
