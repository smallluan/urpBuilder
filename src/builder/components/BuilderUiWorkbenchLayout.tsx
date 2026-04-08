import React from 'react';
import ComponentAsideLeft from './ComponentAsideLeft';
import ComponentMainBody from './ComponentMainBody';
import ComponentAsideRight from './ComponentAsideRight';
import { BuilderAsideResizeHandle } from './BuilderWorkbenchChrome';

type Props = {
  /** 搭建工具栏额外区域（如「搭建依赖」） */
  composeToolbarExtra?: React.ReactNode;
  /** 工具栏右侧分组（如页面「路由」入口），与左侧画布等用竖线分隔 */
  composeToolbarRight?: React.ReactNode;
};

/** 搭建 UI：左结构树 + 中画布 + 右物料/配置 */
const BuilderUiWorkbenchLayout: React.FC<Props> = ({ composeToolbarExtra, composeToolbarRight }) => {
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
        toolbarRight={composeToolbarRight}
      />
      <BuilderAsideResizeHandle edge="before-right" mode="component" />
      <ComponentAsideRight />
    </div>
  );
};

export default BuilderUiWorkbenchLayout;
