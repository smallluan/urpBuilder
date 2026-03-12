import React, { useMemo } from 'react';
import { useCreateComponentStore } from './store';
import DropArea from '../../components/DropArea';
import { LIST_TEMPLATE_ALLOWED_TYPES } from '../../constants/componentBuilder';
import { findNodePathByKey } from './utils/tree';

const ComponentBody: React.FC = () => {
  const screenSize = useCreateComponentStore((state) => state.screenSize);
  const autoWidth = useCreateComponentStore((state) => state.autoWidth);
  const uiPageData = useCreateComponentStore((state) => state.uiPageData);
  const insertToUiPageData = useCreateComponentStore((state) => state.insertToUiPageData);

  // 组件拖拽后接收结构化数据，并插入到对应父节点下
  const handleDropData = (data: any, parent: any, options?: { slotKey?: string }) => {
    if (!parent?.key || !data || typeof data !== 'object') {
      return;
    }

    const droppedType = typeof data.type === 'string' ? data.type.trim() : '';
    const parentType = typeof parent.type === 'string' ? parent.type.trim() : '';
    const menuNodeTypes = new Set(['Menu.Submenu', 'Menu.Item']);
    const menuContainerTypes = new Set(['Menu', 'HeadMenu', 'Menu.Submenu']);

    if (parentType === 'Steps' && droppedType !== 'Steps.Item') {
      return;
    }

    if (droppedType === 'Steps.Item' && parentType !== 'Steps') {
      return;
    }

    if (parentType === 'HeadMenu' && !menuNodeTypes.has(droppedType)) {
      return;
    }

    if (parentType === 'Menu' && !menuNodeTypes.has(droppedType)) {
      return;
    }

    if (parentType === 'Menu.Submenu' && !menuNodeTypes.has(droppedType)) {
      return;
    }

    if (parentType === 'Menu.Group') {
      return;
    }

    if (droppedType === 'Menu.Group') {
      return;
    }

    if (menuNodeTypes.has(droppedType) && !menuContainerTypes.has(parentType)) {
      return;
    }

    if (parentType === 'List.Item') {
      const parentPath = findNodePathByKey(uiPageData, String(parent.key));
      const listAncestor = parentPath?.slice().reverse().find((item) => item.type === 'List');
      const customModeEnabled =
        !!listAncestor
        && Boolean((listAncestor.props?.customTemplateEnabled as { value?: unknown } | undefined)?.value);

      if (customModeEnabled && !LIST_TEMPLATE_ALLOWED_TYPES.has(droppedType)) {
        return;
      }
    }

    insertToUiPageData(parent.key, data as Record<string, unknown>, options?.slotKey);
    setTimeout(() => {
      console.log(useCreateComponentStore.getState().uiPageData);
    }, 0);
  };

  const simulatorStyle: React.CSSProperties = useMemo(() => {
    const width = screenSize === 'auto' ? `${autoWidth}px` : `${screenSize}px`;
    return {
      width,
      height: '100%',
      backgroundColor: '#fff',
      margin: '0 auto',
      transition: 'width 0.3s ease',
      boxSizing: 'content-box', // Ensure border doesn't eat into width if strict specific
      display: 'flex',
      overflow: 'auto',
      position: 'relative'
    };
  }, [screenSize, autoWidth]);

  return (
    <div className="component-body">
      <div className="simulator-container" data-builder-scroll-container="true" style={simulatorStyle}>
        <DropArea
          className="drop-area-root"
          style={{ flex: 1, height: '100%' }}
          data={uiPageData}
          onDropData={handleDropData}
        />
      </div>
    </div>
  );
};

export default ComponentBody;
