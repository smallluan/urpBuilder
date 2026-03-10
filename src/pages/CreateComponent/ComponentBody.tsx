import React, { useMemo } from 'react';
import { useCreateComponentStore } from './store';
import DropArea from '../../components/DropArea';
import type { UiTreeNode } from './store/type';

const LIST_TEMPLATE_ALLOWED_TYPES = new Set([
  'Image',
  'Avatar',
  'Button',
  'Typography.Title',
  'Typography.Paragraph',
  'Typography.Text',
]);

const findNodePathByKey = (node: UiTreeNode, targetKey: string, path: UiTreeNode[] = []): UiTreeNode[] | null => {
  const nextPath = [...path, node];
  if (node.key === targetKey) {
    return nextPath;
  }

  if (!node.children?.length) {
    return null;
  }

  for (const child of node.children) {
    const found = findNodePathByKey(child, targetKey, nextPath);
    if (found) {
      return found;
    }
  }

  return null;
};

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

    if (parent.type === 'List.Item') {
      const droppedType = typeof data.type === 'string' ? data.type : '';
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
      overflow: 'scroll'
    };
  }, [screenSize, autoWidth]);

  return (
    <div className="component-body">
      <div className="simulator-container" style={simulatorStyle}>
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
