import React, { useCallback, useRef } from 'react';
import type { Node, Edge } from '@xyflow/react';
import { GitBranch, Database, Terminal, X } from 'lucide-react';
import { useDebugStore } from './debugStore';
import DebugFlowTab from './DebugFlowTab';
import DebugDataTab from './DebugDataTab';
import DebugConsoleTab from './DebugConsoleTab';
import type { PreviewDataHub } from '../runtime/dataHub';

interface DebugPanelProps {
  flowNodes: Node[];
  flowEdges: Edge[];
  dataHub: PreviewDataHub | null;
}

const DebugPanel: React.FC<DebugPanelProps> = ({ flowNodes, flowEdges, dataHub }) => {
  const panelHeight = useDebugStore((s) => s.panelHeight);
  const activeTab = useDebugStore((s) => s.activeTab);
  const setPanelHeight = useDebugStore((s) => s.setPanelHeight);
  const setActiveTab = useDebugStore((s) => s.setActiveTab);
  const togglePanel = useDebugStore((s) => s.togglePanel);
  const errorCount = useDebugStore((s) => s.errors.length);
  const requestCount = useDebugStore((s) => s.requests.length);

  const draggingRef = useRef(false);
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    draggingRef.current = true;
    startYRef.current = e.clientY;
    startHeightRef.current = panelHeight;

    const onMouseMove = (ev: MouseEvent) => {
      if (!draggingRef.current) return;
      const delta = startYRef.current - ev.clientY;
      setPanelHeight(startHeightRef.current + delta);
    };

    const onMouseUp = () => {
      draggingRef.current = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [panelHeight, setPanelHeight]);

  const tabs: Array<{ key: typeof activeTab; label: string; icon: React.ReactNode; badge?: number }> = [
    { key: 'flow', label: '流程图', icon: <GitBranch /> },
    { key: 'data', label: '数据', icon: <Database /> },
    { key: 'console', label: '控制台', icon: <Terminal />, badge: errorCount + requestCount },
  ];

  return (
    <div
      className="debug-panel"
      style={{ '--debug-panel-height': `${panelHeight}px` } as React.CSSProperties}
    >
      <div className="debug-panel__resize-handle" onMouseDown={handleMouseDown} />
      <div className="debug-panel__header">
        <div className="debug-panel__tabs">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`debug-panel__tab${activeTab === tab.key ? ' is-active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.icon}
              {tab.label}
              {tab.badge != null && tab.badge > 0 && (
                <span style={{ fontSize: 10, color: '#f48771', marginLeft: 2 }}>({tab.badge})</span>
              )}
            </button>
          ))}
        </div>
        <button type="button" className="debug-panel__close" onClick={togglePanel} title="关闭面板">
          <X />
        </button>
      </div>
      <div className="debug-panel__body">
        {activeTab === 'flow' && (
          <DebugFlowTab flowNodes={flowNodes} flowEdges={flowEdges} dataHub={dataHub} />
        )}
        {activeTab === 'data' && <DebugDataTab dataHub={dataHub} />}
        {activeTab === 'console' && <DebugConsoleTab />}
      </div>
    </div>
  );
};

export default DebugPanel;
