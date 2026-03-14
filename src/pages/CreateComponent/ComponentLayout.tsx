import React from 'react';
import ComponentAsideLeft from '../BuilderCore/components/ComponentAsideLeft';
import ComponentMainBody from '../BuilderCore/components/ComponentMainBody';
import ComponentAsideRight from '../BuilderCore/components/ComponentAsideRight';
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
