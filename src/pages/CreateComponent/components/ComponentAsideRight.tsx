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
        <div className={`right-panel-view ${mode === 'library' ? '' : ' right-panel-view--hidden'}`}>
          <ComponentLibraryPanel selectedName={selectedName} onSelect={setSelectedName} />
        </div>
        <div className={`right-panel-view ${mode === 'config' ? '' : ' right-panel-view--hidden'}`}>
          <ComponentConfigPanel />
        </div>
      </div>
    </aside>
  );
};

export default React.memo(ComponentAsideRight);
