import React from 'react';
import ComponentAsideLeft from './components/ComponentAsideLeft';
import ComponentMainBody from './components/ComponentMainBody';
import ComponentAsideRight from './components/ComponentAsideRight';
import './style.less';

const ComponentLayout: React.FC = () => {
  return (
    <div className="create-body">
      <ComponentAsideLeft />
      <ComponentMainBody />
      <ComponentAsideRight />
    </div>
  );
};

export default ComponentLayout;
