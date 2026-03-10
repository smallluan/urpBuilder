import React, { useEffect, useMemo, useRef, useState } from 'react';
import cloneDeep from 'lodash/cloneDeep';
import { Button, Input, Popup, Tree } from 'tdesign-react';
import type { TreeInstanceFunctions } from 'tdesign-react';
import { SearchIcon } from 'tdesign-icons-react';
import { GripHorizontal, LayoutGrid, Minus } from 'lucide-react';
import { useCreateComponentStore } from '../store';
import type { UiTreeNode } from '../store/type';
import NodeStyleDrawer from './NodeStyleDrawer';
import { getNodeSlotKey, isSlotNode } from '../utils/slot';
import componentCatalog from '../../../config/componentCatalog';

interface RenderUiTreeNode extends Omit<UiTreeNode, 'label' | 'children'> {
  label: React.ReactNode;
  children?: RenderUiTreeNode[];
}

const DROP_DATA_KEY = 'drag-component-data';
const CONTAINER_NODE_TYPES = new Set([
  'Space',
  'Grid.Row',
  'Grid.Col',
  'Layout',
  'Layout.Header',
  'Layout.Content',
  'Layout.Aside',
  'Layout.Footer',
]);

const ABSTRACT_NODE_TYPES = new Set([
  'List.Item',
]);

type NodeVisualKind = 'slot' | 'container' | 'leaf' | 'abstract';

interface TreeNodeDropTarget {
  parentKey: string;
  slotKey?: string;
}

const getCardPreferredSlotNode = (node: UiTreeNode) => {
  const slotChildren = (node.children ?? []).filter((child) => isSlotNode(child));
  const bodySlot = slotChildren.find((child) => getNodeSlotKey(child) === 'body');
  return bodySlot ?? slotChildren[0];
};

const getTreeNodeDropTarget = (node: UiTreeNode): TreeNodeDropTarget | null => {
  if (isSlotNode(node)) {
    return {
      parentKey: node.key,
      slotKey: getNodeSlotKey(node),
    };
  }

  if (!node.type || CONTAINER_NODE_TYPES.has(node.type)) {
    return {
      parentKey: node.key,
    };
  }

  if (node.type === 'Card') {
    const preferredSlotNode = getCardPreferredSlotNode(node);
    if (!preferredSlotNode) {
      return null;
    }

    return {
      parentKey: preferredSlotNode.key,
      slotKey: getNodeSlotKey(preferredSlotNode),
    };
  }

  return null;
};

const getNodeVisualKind = (node: UiTreeNode): NodeVisualKind => {
  if (isSlotNode(node)) {
    return 'slot';
  }

  if (node.type && ABSTRACT_NODE_TYPES.has(node.type)) {
    return 'abstract';
  }

  return getTreeNodeDropTarget(node) ? 'container' : 'leaf';
};

const GRID_COL_COMPONENT_SCHEMA = componentCatalog.find((item) => item.type === 'Grid.Col');

const ComponentAsideLeft: React.FC = () => {
  const uiPageData = useCreateComponentStore((state) => state.uiPageData);
  const setTreeInstance = useCreateComponentStore((state) => state.setTreeInstance);
  const activeNodeKey = useCreateComponentStore((state) => state.activeNodeKey);
  const setActiveNode = useCreateComponentStore((state) => state.setActiveNode);
  const toggleActiveNode = useCreateComponentStore((state) => state.toggleActiveNode);
  const removeFromUiPageData = useCreateComponentStore((state) => state.removeFromUiPageData);
  const insertToUiPageData = useCreateComponentStore((state) => state.insertToUiPageData);
  const updateActiveNodeProp = useCreateComponentStore((state) => state.updateActiveNodeProp);
  const [dragOverNodeKey, setDragOverNodeKey] = useState<string | null>(null);
  const [contextMenuState, setContextMenuState] = useState<{
    visible: boolean;
    nodeKey: string | null;
  }>({
    visible: false,
    nodeKey: null,
  });

  const closeContextMenu = () => {
    setContextMenuState((previous) => {
      if (!previous.visible) {
        return previous;
      }

      return {
        ...previous,
        visible: false,
      };
    });
  };

  const handlePopupVisibleChange = (visible: boolean, nodeKey: string) => {
    if (visible) {
      setContextMenuState({
        visible: true,
        nodeKey,
      });
      return;
    }

    setContextMenuState((previous) => {
      if (!previous.visible || previous.nodeKey !== nodeKey) {
        return previous;
      }

      return {
        visible: false,
        nodeKey: null,
      };
    });
  };

  const handleNodeContextMenu = (event: React.MouseEvent<HTMLDivElement>, nodeKey: string) => {
    event.preventDefault();
    event.stopPropagation();
    setActiveNode(nodeKey);
    setContextMenuState({
      visible: true,
      nodeKey,
    });
  };

  const handleDeleteNode = (nodeKey: string) => {
    if (!nodeKey || nodeKey === uiPageData.key) {
      closeContextMenu();
      return;
    }

    removeFromUiPageData(nodeKey);
    closeContextMenu();
  };

  const handleTreeNodeDragOver = (event: React.DragEvent<HTMLDivElement>, node: UiTreeNode) => {
    const dropTarget = getTreeNodeDropTarget(node);
    if (!dropTarget) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'copy';
    setDragOverNodeKey(node.key);
  };

  const handleTreeNodeDragLeave = (event: React.DragEvent<HTMLDivElement>, node: UiTreeNode) => {
    event.preventDefault();
    event.stopPropagation();

    const relatedTarget = event.relatedTarget as Node | null;
    if (relatedTarget && event.currentTarget.contains(relatedTarget)) {
      return;
    }

    setDragOverNodeKey((previous) => (previous === node.key ? null : previous));
  };

  const handleTreeNodeDrop = (event: React.DragEvent<HTMLDivElement>, node: UiTreeNode) => {
    const dropTarget = getTreeNodeDropTarget(node);
    if (!dropTarget) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    setDragOverNodeKey(null);

    const rawData = event.dataTransfer.getData(DROP_DATA_KEY);
    if (!rawData) {
      return;
    }

    try {
      const parsedData = JSON.parse(rawData);
      if (!parsedData || typeof parsedData !== 'object') {
        return;
      }

      insertToUiPageData(dropTarget.parentKey, parsedData as Record<string, unknown>, dropTarget.slotKey);
      setActiveNode(node.key);
    } catch {
      console.error(rawData);
    }
  };

  const uiPageDataWithWrappedLabel = useMemo(() => {
    const cloned = cloneDeep(uiPageData) as UiTreeNode;

    const transformNode = (node: UiTreeNode): RenderUiTreeNode => {
      const children = Array.isArray(node.children)
        ? node.children.map((child) => transformNode(child))
        : [];

      const nodeVisualKind = getNodeVisualKind(node);
      const dropTarget = getTreeNodeDropTarget(node);
      const isDroppable = !!dropTarget;
      const isDragOver = dragOverNodeKey === node.key;
      const title = String(node.label ?? '未命名节点');

      const icon = nodeVisualKind === 'slot'
        ? <GripHorizontal size={12} strokeWidth={2} />
        : nodeVisualKind === 'container'
          ? <LayoutGrid size={12} strokeWidth={2} />
          : nodeVisualKind === 'abstract'
            ? <GripHorizontal size={12} strokeWidth={2} />
          : <Minus size={12} strokeWidth={2} />;

      const isAbstractNode = nodeVisualKind === 'abstract';

      return {
        ...node,
        label: (
          <Popup
            visible={contextMenuState.visible && contextMenuState.nodeKey === node.key}
            trigger="context-menu"
            placement="right-top"
            destroyOnClose={false}
            showArrow={false}
            onVisibleChange={(visible) => handlePopupVisibleChange(visible, node.key)}
            content={
              <div className="tree-node-context-popup-content" onMouseDown={(event) => event.stopPropagation()}>
                <NodeStyleDrawer
                  targetKey={node.key}
                  value={(node.props?.__style as { value?: Record<string, unknown> } | undefined)?.value}
                  onChange={(nextStyle) => {
                    setActiveNode(node.key);
                    updateActiveNodeProp('__style', nextStyle);
                  }}
                  triggerRenderer={(openDrawer) => (
                    <Button
                      size="small"
                      variant="text"
                      theme="default"
                      className="tree-node-context-action"
                      onClick={() => {
                        setActiveNode(node.key);
                        closeContextMenu();
                        openDrawer();
                      }}
                    >
                      样式配置
                    </Button>
                  )}
                />
                {node.type === 'Grid.Row' ? (
                  <Button
                    size="small"
                    variant="text"
                    theme="default"
                    className="tree-node-context-action"
                    onClick={() => {
                      if (!GRID_COL_COMPONENT_SCHEMA) {
                        return;
                      }

                      insertToUiPageData(node.key, cloneDeep(GRID_COL_COMPONENT_SCHEMA) as Record<string, unknown>);
                      setActiveNode(node.key);
                      closeContextMenu();
                    }}
                  >
                    添加栅格列
                  </Button>
                ) : null}
                <Button
                  size="small"
                  variant="base"
                  theme="default"
                  className="tree-node-context-action"
                  disabled={node.key === uiPageData.key || isSlotNode(node)}
                  onClick={() => handleDeleteNode(node.key)}
                >
                  删除该节点
                </Button>
              </div>
            }
          >
            <div
              className={`tree-node-label${isDroppable ? ' tree-node-label--droppable' : ''}${isDragOver ? ' tree-node-label--drag-over' : ''}`}
              onContextMenu={(event) => handleNodeContextMenu(event, node.key)}
              onDragOver={(event) => handleTreeNodeDragOver(event, node)}
              onDragLeave={(event) => handleTreeNodeDragLeave(event, node)}
              onDrop={(event) => handleTreeNodeDrop(event, node)}
            >
              <div className="tree-node-item">
                <span className="tree-node-item__left">
                  <span className={`tree-node-item__icon tree-node-item__icon--${nodeVisualKind}`}>{icon}</span>
                  <span className="tree-node-item__title">{title}</span>
                  {isAbstractNode ? <span className="tree-node-item__badge">抽象</span> : null}
                </span>
              </div>
            </div>
          </Popup>
        ),
        children,
      };
    };

    return transformNode(cloned);
  }, [contextMenuState.nodeKey, contextMenuState.visible, dragOverNodeKey, uiPageData]);

  const treeData = useMemo(() => [uiPageDataWithWrappedLabel], [uiPageDataWithWrappedLabel]);
  const treeRef = useRef<TreeInstanceFunctions<any>>(null);

  const handleTreeClick = (context: any) => {
    const key = context?.node?.value ?? context?.node?.key;
    if (typeof key !== 'string') {
      return;
    }
    toggleActiveNode(key);
  };

  useEffect(() => {
    setTreeInstance(treeRef.current);
    return () => setTreeInstance(null);
  }, [setTreeInstance]);

  return (
    <aside className="aside-left">
      <div className="structure-top">
        <div className="structure-panel">
          <div className="search-row">
            <Input placeholder="搜索组件（示例）" clearable suffix={<SearchIcon />} />
          </div>

          <div className="structure-tree" role="tree">
            <Tree
              keys={{ value: 'key' }}
              ref={treeRef}
              activable
              expandAll
              line
              data={treeData}
              actived={activeNodeKey ? [activeNodeKey] : []}
              onClick={handleTreeClick}
              onDragLeave={() => setDragOverNodeKey(null)}
            />
          </div>
        </div>
      </div>
    </aside>
  );
};

export default React.memo(ComponentAsideLeft);
