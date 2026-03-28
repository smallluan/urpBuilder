import React from 'react';
import { Bug } from 'lucide-react';
import { useDebugStore } from './debugStore';

const DebugFAB: React.FC = () => {
  const panelOpen = useDebugStore((s) => s.panelOpen);
  const paused = useDebugStore((s) => s.paused);
  const errorCount = useDebugStore((s) => s.errors.length);
  const togglePanel = useDebugStore((s) => s.togglePanel);
  const panelHeight = useDebugStore((s) => s.panelHeight);

  const showBadge = paused || errorCount > 0;

  return (
    <button
      type="button"
      className={`debug-fab${panelOpen ? ' is-panel-open' : ''}`}
      style={panelOpen ? { '--debug-panel-height': `${panelHeight}px` } as React.CSSProperties : undefined}
      onClick={togglePanel}
      title={panelOpen ? '关闭调试面板' : '打开调试面板'}
    >
      <Bug />
      {showBadge && <span className="debug-fab__badge" />}
    </button>
  );
};

export default DebugFAB;
