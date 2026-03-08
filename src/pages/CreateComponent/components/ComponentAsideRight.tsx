import React, { useState } from 'react';
import ComponentLibraryPanel from './ComponentLibraryPanel';

const ComponentAsideRight: React.FC = () => {
  const [selectedName, setSelectedName] = useState<string | null>(null);

  return (
    <aside className="aside-right">
      <ComponentLibraryPanel selectedName={selectedName} onSelect={setSelectedName} />
    </aside>
  );
};

export default React.memo(ComponentAsideRight);
