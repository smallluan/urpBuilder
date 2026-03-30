import React from 'react';
import ComponentAsideLeft from '../../builder/components/ComponentAsideLeft';
import ComponentMainBody from '../../builder/components/ComponentMainBody';
import ComponentAsideRight from '../../builder/components/ComponentAsideRight';

type Props = {
  /** 搭建工具栏额外区域（如「搭建依赖」） */
  composeToolbarExtra?: React.ReactNode;
};

const ComponentLayout: React.FC<Props> = ({ composeToolbarExtra }) => {
  return (
    <div className="create-body">
      <ComponentAsideLeft />
      <ComponentMainBody
        toolbarExtra={
          composeToolbarExtra ? (
            <div className="builder-compose-toolbar-extras">{composeToolbarExtra}</div>
          ) : undefined
        }
      />
      <ComponentAsideRight />
    </div>
  );
};

export default ComponentLayout;
