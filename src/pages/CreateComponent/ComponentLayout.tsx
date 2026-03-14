import React from 'react';
import ComponentAsideLeft from '../../builder/components/ComponentAsideLeft';
import ComponentMainBody from '../../builder/components/ComponentMainBody';
import ComponentAsideRight from '../../builder/components/ComponentAsideRight';

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
