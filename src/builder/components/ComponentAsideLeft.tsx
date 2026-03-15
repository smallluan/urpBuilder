import React, { useEffect, useMemo, useRef, useState } from 'react';
import cloneDeep from 'lodash/cloneDeep';
import { Button, Input, Tree } from 'tdesign-react';
import type { TreeInstanceFunctions } from 'tdesign-react';
import { SearchIcon } from 'tdesign-icons-react';
import { ArrowDown, ArrowUp, GripHorizontal, LayoutGrid, Minus, Palette, PlusSquare, Trash2 } from 'lucide-react';
import { useBuilderContext } from '../context/BuilderContext';
import type { UiTreeNode } from '../store/types';
import NodeStyleDrawer from './NodeStyleDrawer';
import { getNodeSlotKey, isSlotNode } from '../utils/slot';
import componentCatalog from '../../config/componentCatalog';
import { LIST_TEMPLATE_ALLOWED_TYPES } from '../../constants/componentBuilder';
import { findNodePathByKey } from '../utils/tree';
import { getTabsPanelSlotKey, normalizeTabsList, normalizeTabsValue } from '../utils/tabs';

interface RenderUiTreeNode extends Omit<UiTreeNode, 'label' | 'children'> {
  label: React.ReactNode;
  children?: RenderUiTreeNode[];
}

const DROP_DATA_KEY = 'drag-component-data';
const TREE_NODE_DRAG_KEY = 'drag-tree-node-key';
const CONTAINER_NODE_TYPES = new Set([
  'Space',
  'Steps',
  'Drawer',
  'Upload',
  'Menu',
  'HeadMenu',
  'Menu.Submenu',
  'Grid.Row',
  'Grid.Col',
  'Layout',
  'Layout.Header',
  'Layout.Content',
  'Layout.Aside',
  'Layout.Footer',
]);

const MENU_NODE_TYPES = new Set(['Menu.Submenu', 'Menu.Item']);
const MENU_CONTAINER_TYPES = new Set(['Menu', 'HeadMenu', 'Menu.Submenu']);

const ABSTRACT_NODE_TYPES = new Set([
  'List.Item',
]);

type NodeVisualKind = 'slot' | 'container' | 'leaf' | 'abstract';

interface TreeNodeDropTarget {
  parentKey: string;
  slotKey?: string;
}

interface NodeSiblingInfo {
  parentKey: string;
  index: number;
  siblingCount: number;
}

interface TreeNodeMoveDestination {
  parentKey: string;
  index: number;
  slotKey?: string;
}

const collectTreeKeys = (node: UiTreeNode): string[] => {
  const keys: string[] = [node.key];
  (node.children ?? []).forEach((child) => {
    keys.push(...collectTreeKeys(child));
  });
  return keys;
};

const getNodeSiblingInfo = (root: UiTreeNode, nodeKey: string): NodeSiblingInfo | null => {
  const path = findNodePathByKey(root, nodeKey);
  if (!path || path.length < 2) {
    return null;
  }

  const parentNode = path[path.length - 2];
  const siblings = parentNode.children ?? [];
  const index = siblings.findIndex((item) => item.key === nodeKey);
  if (index < 0) {
    return null;
  }

  return {
    parentKey: parentNode.key,
    index,
    siblingCount: siblings.length,
  };
};

const isNodeDraggable = (node: UiTreeNode, rootKey: string) => node.key !== rootKey && !isSlotNode(node);

const resolveTreeNodeMoveDestination = (
  root: UiTreeNode,
  draggedNodeKey: string,
  targetNode: UiTreeNode,
): TreeNodeMoveDestination | null => {
  if (draggedNodeKey === targetNode.key) {
    return null;
  }

  const targetPath = findNodePathByKey(root, targetNode.key);
  if (!targetPath) {
    return null;
  }

  if (targetPath.some((item) => item.key === draggedNodeKey)) {
    return null;
  }

  const dropTarget = getTreeNodeDropTarget(targetNode, root);
  if (dropTarget) {
    const targetParent = findNodePathByKey(root, dropTarget.parentKey)?.at(-1);
    const index = targetParent?.children?.length ?? 0;
    return {
      parentKey: dropTarget.parentKey,
      index,
      slotKey: dropTarget.slotKey,
    };
  }

  const siblingInfo = getNodeSiblingInfo(root, targetNode.key);
  if (!siblingInfo) {
    return null;
  }

  return {
    parentKey: siblingInfo.parentKey,
    index: siblingInfo.index + 1,
  };
};

const isListItemTemplateDroppable = (node: UiTreeNode, root: UiTreeNode) => {
  if (node.type !== 'List.Item') {
    return false;
  }

  const path = findNodePathByKey(root, node.key);
  const listAncestor = path?.slice().reverse().find((item) => item.type === 'List');
  if (!listAncestor) {
    return false;
  }

  return Boolean((listAncestor.props?.customTemplateEnabled as { value?: unknown } | undefined)?.value);
};

const getCardPreferredSlotNode = (node: UiTreeNode) => {
  const slotChildren = (node.children ?? []).filter((child) => isSlotNode(child));
  const bodySlot = slotChildren.find((child) => getNodeSlotKey(child) === 'body');
  return bodySlot ?? slotChildren[0];
};

const getTabsPreferredSlotNode = (node: UiTreeNode) => {
  const tabsList = normalizeTabsList((node.props?.list as { value?: unknown } | undefined)?.value);
  const controlledValue = normalizeTabsValue((node.props?.value as { value?: unknown } | undefined)?.value);
  const defaultValue = normalizeTabsValue((node.props?.defaultValue as { value?: unknown } | undefined)?.value);
  const targetValue = controlledValue ?? defaultValue ?? tabsList[0]?.value;
  const targetSlotKey = targetValue ? getTabsPanelSlotKey(targetValue) : '';
  const slotChildren = (node.children ?? []).filter((child) => isSlotNode(child));

  if (!targetSlotKey) {
    return slotChildren[0];
  }

  const matched = slotChildren.find((child) => getNodeSlotKey(child) === targetSlotKey);
  return matched ?? slotChildren[0];
};

const getTreeNodeDropTarget = (node: UiTreeNode, root: UiTreeNode): TreeNodeDropTarget | null => {
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

  if (isListItemTemplateDroppable(node, root)) {
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

  if (node.type === 'Tabs') {
    const preferredSlotNode = getTabsPreferredSlotNode(node);
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

const getNodeVisualKind = (node: UiTreeNode, root: UiTreeNode): NodeVisualKind => {
  if (isSlotNode(node)) {
    return 'slot';
  }

  if (node.type && ABSTRACT_NODE_TYPES.has(node.type)) {
    return 'abstract';
  }

  return getTreeNodeDropTarget(node, root) ? 'container' : 'leaf';
};

const GRID_COL_COMPONENT_SCHEMA = componentCatalog.find((item) => item.type === 'Grid.Col');

const ComponentAsideLeft: React.FC = () => {
  const { useStore } = useBuilderContext();
  const uiPageData = useStore((state) => state.uiPageData);
  const setTreeInstance = useStore((state) => state.setTreeInstance);
  const activeNodeKey = useStore((state) => state.activeNodeKey);
  const setActiveNode = useStore((state) => state.setActiveNode);
  const toggleActiveNode = useStore((state) => state.toggleActiveNode);
  const removeFromUiPageData = useStore((state) => state.removeFromUiPageData);
  const insertToUiPageData = useStore((state) => state.insertToUiPageData);
  const moveUiNode = useStore((state) => state.moveUiNode);
  const updateActiveNodeProp = useStore((state) => state.updateActiveNodeProp);
  const [dragOverNodeKey, setDragOverNodeKey] = useState<string | null>(null);
  const [draggingTreeNodeKey, setDraggingTreeNodeKey] = useState<string | null>(null);
  const [expandedKeys, setExpandedKeys] = useState<string[]>(() => collectTreeKeys(uiPageData));
  const [contextMenuState, setContextMenuState] = useState<{
    visible: boolean;
    nodeKey: string | null;
    x: number;
    y: number;
  }>({
    visible: false,
    nodeKey: null,
    x: 0,
    y: 0,
  });
  const contextMenuRef = useRef<HTMLDivElement | null>(null);

  const closeContextMenu = () => {
    setContextMenuState((previous) => {
      if (!previous.visible) {
        return previous;
      }

      return {
        ...previous,
        visible: false,
        nodeKey: null,
      };
    });
  };

  const handleNodeContextMenu = (event: React.MouseEvent<HTMLDivElement>, nodeKey: string) => {
    event.preventDefault();
    event.stopPropagation();
    setActiveNode(nodeKey);

    const menuWidth = 190;
    const menuHeight = 228;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const x = Math.max(8, Math.min(event.clientX, viewportWidth - menuWidth - 8));
    const y = Math.max(8, Math.min(event.clientY, viewportHeight - menuHeight - 8));

    setContextMenuState({
      visible: true,
      nodeKey,
      x,
      y,
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
    const draggedNodeKey = draggingTreeNodeKey;
    if (draggedNodeKey) {
      const destination = resolveTreeNodeMoveDestination(uiPageData, draggedNodeKey, node);
      if (!destination) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.dataTransfer.dropEffect = 'move';
      setDragOverNodeKey(node.key);
      return;
    }

    const dropTarget = getTreeNodeDropTarget(node, uiPageData);
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
    event.preventDefault();
    event.stopPropagation();
    setDragOverNodeKey(null);

    const draggedNodeKey = draggingTreeNodeKey || event.dataTransfer.getData(TREE_NODE_DRAG_KEY);
    if (draggedNodeKey) {
      const draggedNodePath = findNodePathByKey(uiPageData, draggedNodeKey);
      const draggedNode = draggedNodePath?.at(-1);
      if (!draggedNode || !isNodeDraggable(draggedNode, uiPageData.key)) {
        setDraggingTreeNodeKey(null);
        return;
      }

      const destination = resolveTreeNodeMoveDestination(uiPageData, draggedNodeKey, node);
      if (!destination) {
        return;
      }

      moveUiNode(draggedNodeKey, destination.parentKey, destination.index, destination.slotKey);
      setActiveNode(draggedNodeKey);
      setDraggingTreeNodeKey(null);
      return;
    }

    const dropTarget = getTreeNodeDropTarget(node, uiPageData);
    if (!dropTarget) {
      return;
    }

    const rawData = event.dataTransfer.getData(DROP_DATA_KEY);
    if (!rawData) {
      return;
    }

    try {
      const parsedData = JSON.parse(rawData);
      if (!parsedData || typeof parsedData !== 'object') {
        return;
      }

      const currentNodeType = typeof node.type === 'string' ? node.type.trim() : '';

      if (currentNodeType === 'List.Item') {
        const droppedType = typeof (parsedData as { type?: unknown }).type === 'string'
          ? String((parsedData as { type?: unknown }).type).trim()
          : '';
        if (!LIST_TEMPLATE_ALLOWED_TYPES.has(droppedType)) {
          return;
        }
      }

      const droppedType = typeof (parsedData as { type?: unknown }).type === 'string'
        ? String((parsedData as { type?: unknown }).type).trim()
        : '';

      if (currentNodeType === 'Steps' && droppedType !== 'Steps.Item') {
        return;
      }

      if (droppedType === 'Steps.Item' && currentNodeType !== 'Steps') {
        return;
      }

      if ((currentNodeType === 'Menu' || currentNodeType === 'HeadMenu') && !MENU_NODE_TYPES.has(droppedType)) {
        return;
      }

      if (currentNodeType === 'Menu.Submenu' && !MENU_NODE_TYPES.has(droppedType)) {
        return;
      }

      if (droppedType === 'Menu.Group') {
        return;
      }

      if (MENU_NODE_TYPES.has(droppedType) && !MENU_CONTAINER_TYPES.has(currentNodeType)) {
        return;
      }

      insertToUiPageData(dropTarget.parentKey, parsedData as Record<string, unknown>, dropTarget.slotKey);
      setActiveNode(node.key);
    } catch {
      console.error(rawData);
    } finally {
      setDraggingTreeNodeKey(null);
    }
  };

  const uiPageDataWithWrappedLabel = useMemo(() => {
    const cloned = cloneDeep(uiPageData) as UiTreeNode;

    const transformNode = (node: UiTreeNode): RenderUiTreeNode => {
      const children = Array.isArray(node.children)
        ? node.children.map((child) => transformNode(child))
        : [];

      const nodeVisualKind = getNodeVisualKind(node, uiPageData);
      const dropTarget = getTreeNodeDropTarget(node, uiPageData);
      const isDroppable = !!dropTarget;
      const isDragOver = dragOverNodeKey === node.key;
      const title = String(node.label ?? '未命名节点');
      const isHidden = ((node.props?.visible as { value?: unknown } | undefined)?.value) === false;

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
          <div
            className={`tree-node-label${isDroppable ? ' tree-node-label--droppable' : ''}${isDragOver ? ' tree-node-label--drag-over' : ''}`}
            onContextMenu={(event) => handleNodeContextMenu(event, node.key)}
            onDragOver={(event) => handleTreeNodeDragOver(event, node)}
            onDragLeave={(event) => handleTreeNodeDragLeave(event, node)}
            onDrop={(event) => handleTreeNodeDrop(event, node)}
          >
            <div className="tree-node-item">
              <span className="tree-node-item__left">
                <span
                  className={`tree-node-item__icon tree-node-item__icon--${nodeVisualKind}`}
                  draggable={isNodeDraggable(node, uiPageData.key)}
                  onDragStart={(event) => {
                    event.stopPropagation();
                    setDraggingTreeNodeKey(node.key);
                    event.dataTransfer.setData(TREE_NODE_DRAG_KEY, node.key);
                    event.dataTransfer.setData('text/plain', node.key);
                    event.dataTransfer.effectAllowed = 'move';
                  }}
                  onDragEnd={() => {
                    setDraggingTreeNodeKey(null);
                    setDragOverNodeKey(null);
                  }}
                >
                  {icon}
                </span>
                <span className="tree-node-item__title">{title}</span>
                {isAbstractNode ? <span className="tree-node-item__badge">抽象</span> : null}
                {isHidden ? <span className="tree-node-item__badge tree-node-item__badge--hidden">隐藏</span> : null}
              </span>
            </div>
          </div>
        ),
        children,
      };
    };

    return transformNode(cloned);
  }, [dragOverNodeKey, uiPageData]);

  const contextMenuNode = useMemo(() => {
    if (!contextMenuState.nodeKey) {
      return null;
    }

    const path = findNodePathByKey(uiPageData, contextMenuState.nodeKey);
    if (!path?.length) {
      return null;
    }

    return path[path.length - 1];
  }, [contextMenuState.nodeKey, uiPageData]);

  const contextMenuNodeSiblingInfo = useMemo(() => {
    if (!contextMenuNode) {
      return null;
    }
    return getNodeSiblingInfo(uiPageData, contextMenuNode.key);
  }, [contextMenuNode, uiPageData]);

  const canMoveContextMenuNode = Boolean(
    contextMenuNode
    && contextMenuNode.key !== uiPageData.key
    && !isSlotNode(contextMenuNode),
  );
  const canMoveUp = Boolean(canMoveContextMenuNode && contextMenuNodeSiblingInfo && contextMenuNodeSiblingInfo.index > 0);
  const canMoveDown = Boolean(
    canMoveContextMenuNode
    && contextMenuNodeSiblingInfo
    && contextMenuNodeSiblingInfo.index < contextMenuNodeSiblingInfo.siblingCount - 1,
  );

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

  useEffect(() => {
    const allKeys = collectTreeKeys(uiPageData);
    const allKeySet = new Set(allKeys);
    setExpandedKeys((previous) => {
      if (!previous.length) {
        return allKeys;
      }

      const retained = previous.filter((key) => allKeySet.has(key));
      const activePath = activeNodeKey ? findNodePathByKey(uiPageData, activeNodeKey) : null;
      if (activePath?.length) {
        activePath.forEach((item) => {
          if (!retained.includes(item.key)) {
            retained.push(item.key);
          }
        });
      }
      return retained;
    });
  }, [activeNodeKey, uiPageData]);

  useEffect(() => {
    if (!contextMenuState.visible) {
      return;
    }

    const handleWindowMouseDown = (event: MouseEvent) => {
      if (contextMenuRef.current?.contains(event.target as Node)) {
        return;
      }
      closeContextMenu();
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeContextMenu();
      }
    };

    window.addEventListener('mousedown', handleWindowMouseDown);
    window.addEventListener('keydown', handleEscape);
    window.addEventListener('resize', closeContextMenu);
    return () => {
      window.removeEventListener('mousedown', handleWindowMouseDown);
      window.removeEventListener('keydown', handleEscape);
      window.removeEventListener('resize', closeContextMenu);
    };
  }, [contextMenuState.visible]);

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
              expanded={expandedKeys}
              line
              data={treeData}
              actived={activeNodeKey ? [activeNodeKey] : []}
              onClick={handleTreeClick}
              onExpand={(nextExpanded) => {
                setExpandedKeys(Array.isArray(nextExpanded) ? nextExpanded.map((item) => String(item)) : []);
              }}
              onDragLeave={() => setDragOverNodeKey(null)}
            />
          </div>

          {contextMenuState.visible && contextMenuNode ? (
            <div
              ref={contextMenuRef}
              className="tree-node-context-menu"
              style={{ left: contextMenuState.x, top: contextMenuState.y }}
              onMouseDown={(event) => event.stopPropagation()}
            >
              <NodeStyleDrawer
                targetKey={contextMenuNode.key}
                value={(contextMenuNode.props?.__style as { value?: Record<string, unknown> } | undefined)?.value}
                onChange={(nextStyle) => {
                  setActiveNode(contextMenuNode.key);
                  updateActiveNodeProp('__style', nextStyle);
                }}
                triggerRenderer={(openDrawer) => (
                  <Button
                    size="small"
                    variant="text"
                    theme="default"
                    className="tree-node-context-action"
                    icon={<Palette size={14} />}
                    onClick={() => {
                      setActiveNode(contextMenuNode.key);
                      closeContextMenu();
                      openDrawer();
                    }}
                  >
                    样式配置
                  </Button>
                )}
              />

              {contextMenuNode.type === 'Grid.Row' ? (
                <Button
                  size="small"
                  variant="text"
                  theme="default"
                  className="tree-node-context-action"
                  icon={<PlusSquare size={14} />}
                  onClick={() => {
                    if (!GRID_COL_COMPONENT_SCHEMA) {
                      return;
                    }

                    insertToUiPageData(contextMenuNode.key, cloneDeep(GRID_COL_COMPONENT_SCHEMA) as Record<string, unknown>);
                    setActiveNode(contextMenuNode.key);
                    closeContextMenu();
                  }}
                >
                  添加栅格列
                </Button>
              ) : null}

              <Button
                size="small"
                variant="text"
                theme="default"
                className="tree-node-context-action"
                icon={<ArrowUp size={14} />}
                disabled={!canMoveUp || !contextMenuNodeSiblingInfo || !contextMenuNode}
                onClick={() => {
                  if (!contextMenuNode || !contextMenuNodeSiblingInfo) {
                    return;
                  }

                  moveUiNode(
                    contextMenuNode.key,
                    contextMenuNodeSiblingInfo.parentKey,
                    contextMenuNodeSiblingInfo.index - 1,
                  );
                  setActiveNode(contextMenuNode.key);
                  closeContextMenu();
                }}
              >
                向上移动
              </Button>

              <Button
                size="small"
                variant="text"
                theme="default"
                className="tree-node-context-action"
                icon={<ArrowDown size={14} />}
                disabled={!canMoveDown || !contextMenuNodeSiblingInfo || !contextMenuNode}
                onClick={() => {
                  if (!contextMenuNode || !contextMenuNodeSiblingInfo) {
                    return;
                  }

                  moveUiNode(
                    contextMenuNode.key,
                    contextMenuNodeSiblingInfo.parentKey,
                    contextMenuNodeSiblingInfo.index + 1,
                  );
                  setActiveNode(contextMenuNode.key);
                  closeContextMenu();
                }}
              >
                向下移动
              </Button>

              <Button
                size="small"
                variant="text"
                theme="danger"
                className="tree-node-context-action tree-node-context-action--danger"
                icon={<Trash2 size={14} />}
                disabled={contextMenuNode.key === uiPageData.key || isSlotNode(contextMenuNode)}
                onClick={() => handleDeleteNode(contextMenuNode.key)}
              >
                删除该节点
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  );
};

export default React.memo(ComponentAsideLeft);
