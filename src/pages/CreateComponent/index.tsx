import React, { useState } from 'react';
// layout components handle their own asides
import './style.less';
import HeaderControls from './components/HeaderControls';
import ComponentLayout from './ComponentLayout';
import FlowLayout from './FlowLayout';

const CreateComponent: React.FC = () => {
  const [mode, setMode] = useState<'component' | 'flow'>('component');

  return (
    <div className="create-page">
      <header className="create-header">
        <HeaderControls mode={mode} onChange={setMode} />
      </header>

      <div className="create-body">
        {mode === 'component' ? <ComponentLayout /> : <FlowLayout />}
      </div>
    </div>
  );
};

export default CreateComponent;
