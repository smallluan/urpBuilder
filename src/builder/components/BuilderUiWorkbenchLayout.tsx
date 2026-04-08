import React from 'react';
import ComponentAsideLeft from './ComponentAsideLeft';
import ComponentMainBody from './ComponentMainBody';
import ComponentAsideRight from './ComponentAsideRight';
import { BuilderAsideResizeHandle } from './BuilderWorkbenchChrome';

type Props = {
  /** 搭建工具栏额外区域（如「搭建依赖」） */
  composeToolbarExtra?: React.ReactNode;
};

/** 搭建 UI：左结构树 + 中画布 + 右物料/配置 */
const BuilderUiWorkbenchLayout: React.FC<Props> = ({ composeToolbarExtra }) => {
  return (
    <div className="create-body">
      <ComponentAsideLeft />
      <BuilderAsideResizeHandle edge="after-left" mode="component" />
      <ComponentMainBody
        toolbarExtra={
          composeToolbarExtra ? (
            <div className="builder-compose-toolbar-extras">{composeToolbarExtra}</div>
          ) : undefined
        }
      />
      <BuilderAsideResizeHandle edge="before-right" mode="component" />
      <ComponentAsideRight />
    </div>
  );
};

export default BuilderUiWorkbenchLayout;
