import React, { useState } from 'react';
// layout components handle their own asides
import './style.less';
import HeaderControls from './components/HeaderControls';
import ComponentLayout from './ComponentLayout';
import FlowLayout from './FlowLayout';
import { useCreateComponentStore } from './store';

const CreateComponent: React.FC = () => {
  const [mode, setMode] = useState<'component' | 'flow'>('component');
  const history = useCreateComponentStore((state) => state.history);
  const undo = useCreateComponentStore((state) => state.undo);
  const redo = useCreateComponentStore((state) => state.redo);

  const canUndo = history.pointer >= 0;
  const canRedo = history.pointer < history.actions.length - 1;

  return (
    <div className="create-page">
      <header className="create-header">
        <HeaderControls
          mode={mode}
          onChange={setMode}
          onUndo={undo}
          onRedo={redo}
          canUndo={canUndo}
          canRedo={canRedo}
        />
      </header>

      <div className="create-body">
        {mode === 'component' ? <ComponentLayout /> : <FlowLayout />}
      </div>
    </div>
  );
};

export default CreateComponent;
