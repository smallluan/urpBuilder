import React from 'react';
import { useLocation } from 'react-router-dom';
import { useCreateComponentStore } from '../CreateComponent/store';
import PreviewRenderer from './components/PreviewRenderer';
import { deserializePreviewSnapshot, type PreviewSnapshot } from './utils/snapshot';
import { createPreviewDataHub } from './runtime/dataHub';
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
  const parsedSnapshot = serialized ? deserializePreviewSnapshot(serialized) : null;

  const snapshot: PreviewSnapshot = parsedSnapshot ?? {
    uiTreeData,
    flowNodes,
    flowEdges,
  };

  React.useEffect(() => {
    const hub = createPreviewDataHub(snapshot.uiTreeData);
    window.dataHub = hub;

    return () => {
      if (window.dataHub === hub) {
        delete window.dataHub;
      }
    };
  }, [snapshot.uiTreeData]);

  return (
    <div className="preview-engine-page">
      <div className="preview-engine-canvas" data-preview-page>
        {(snapshot.uiTreeData.children ?? []).map((child) => (
          <PreviewRenderer key={child.key} node={child} />
        ))}
      </div>
    </div>
  );
};

export default PreviewEngine;
