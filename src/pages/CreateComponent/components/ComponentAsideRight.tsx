import React, { useEffect, useState } from 'react';
import ComponentLibraryPanel from './ComponentLibraryPanel';
import ComponentConfigPanel from './ComponentConfigPanel';
import RightPanelHeader, { type RightPanelMode } from './RightPanelHeader';
import { useCreateComponentStore } from '../store';

const ComponentAsideRight: React.FC = () => {
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [mode, setMode] = useState<RightPanelMode>('library');
  const activeNodeKey = useCreateComponentStore((state) => state.activeNodeKey);

  useEffect(() => {
    if (activeNodeKey) {
      setMode('config');
    }
  }, [activeNodeKey]);

  return (
    <aside className="aside-right">
      <RightPanelHeader mode={mode} onChange={setMode} />
      <div className="right-panel-content">
        {mode === 'library' ? (
          <ComponentLibraryPanel selectedName={selectedName} onSelect={setSelectedName} />
        ) : (
          <ComponentConfigPanel />
        )}
      </div>
    </aside>
  );
};

export default React.memo(ComponentAsideRight);
