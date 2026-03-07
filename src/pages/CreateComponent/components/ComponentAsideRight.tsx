import React, { useState } from 'react';
import ComponentConfigPanel from './ComponentConfigPanel';
import ComponentLibraryPanel from './ComponentLibraryPanel';
import RightPanelHeader, { type RightPanelMode } from './RightPanelHeader';

const ComponentAsideRight: React.FC = () => {
  const [mode, setMode] = useState<RightPanelMode>('library');
  const [selectedComponentName, setSelectedComponentName] = useState<string | null>(null);

  const handleSelectComponent = (name: string) => {
    setSelectedComponentName(name);
  };

  return (
    <aside className="aside-right">
      <RightPanelHeader mode={mode} onChange={setMode} />
      {mode === 'library' ? (
        <ComponentLibraryPanel selectedName={selectedComponentName} onSelect={handleSelectComponent} />
      ) : (
        <ComponentConfigPanel selectedName={selectedComponentName} />
      )}
    </aside>
  );
};

export default React.memo(ComponentAsideRight);
