import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import cloneDeep from 'lodash/cloneDeep';
import { computePosition, flip, offset, shift } from '@floating-ui/dom';
import { v4 as uuidv4 } from 'uuid';
import type { Edge, Node as FlowNode } from '@xyflow/react';
import { Button, Divider, Input, Row, Space, Tree, Typography, MessagePlugin } from 'tdesign-react';
const { Text } = Typography;
import type { TreeInstanceFunctions } from 'tdesign-react';
import { Icon, SearchIcon } from 'tdesign-icons-react';
import { FolderTree, GripHorizontal, LayoutGrid, LocateFixed, Minus, PlusSquare } from 'lucide-react';
import { useBuilderAccess, useBuilderContext } from '../context/BuilderContext';
import type { UiTreeInstance, UiTreeNode } from '../store/types';
import { getNodeSlotKey, isSlotNode } from '../utils/slot';
import componentCatalog from '../../config/componentCatalog';
import { LIST_TEMPLATE_ALLOWED_TYPES } from '../../constants/componentBuilder';
import { findNodePathByKey } from '../utils/tree';
import StructureVirtualRootBanner from './StructureVirtualRootBanner';
import {
  isVirtualStructureRootKeyValid,
  resolveStructureDisplayRoot,
} from '../utils/structureTreeVirtualRoot';
import { getTabsPanelSlotKey, normalizeTabsList, normalizeTabsValue } from '../utils/tabs';
import {
  clearTreeClipboard,
  getTreeClipboard,
  setTreeClipboard,
  subscribeTreeClipboard,
  type TreeClipboardPayload,
} from '../utils/treeClipboard';
import { BUILDER_STRUCTURE_TREE_SCROLL } from '../config/builderStructureTreeScroll';
import { isTdesignTreeExpandIconClick } from '../utils/treeExpandIconClick';
import { applyBuilderDragPreview } from '../utils/dragPreview';

interface RenderUiTreeNode extends Omit<UiTreeNode, 'label' | 'children'> {
  label: React.ReactNode;
  children?: RenderUiTreeNode[];
}

const DROP_DATA_KEY = 'drag-component-data';
const TREE_NODE_DRAG_KEY = 'drag-tree-node-key';
const CONTAINER_NODE_TYPES = new Set([
  'root',
  'Space',
  'Flex',
  'Flex.Item',
  'Stack',
  'Inline',
  'Steps',
  'Drawer',
  'Upload',
  'RouteOutlet',
  'Menu',
  'HeadMenu',
  'Menu.Submenu',
  'antd.Menu',
  'antd.HeadMenu',
  'antd.Menu.SubMenu',
  'Grid.Row',
  'Grid.Col',
  'Layout',
  'Layout.Header',
  'Layout.Content',
  'Layout.Aside',
  'Layout.Footer',
  'ComponentSlotOutlet',
  'Card',
  'StickyBoundary',
]);

const MENU_NODE_TYPES = new Set(['Menu.Submenu', 'Menu.Item', 'antd.Menu.SubMenu', 'antd.Menu.Item']);
const MENU_CONTAINER_TYPES = new Set(['Menu', 'HeadMenu', 'Menu.Submenu', 'antd.Menu', 'antd.HeadMenu', 'antd.Menu.SubMenu']);

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

const collectTreeKeySet = (node: UiTreeNode, collector = new Set<string>()): Set<string> => {
  collector.add(node.key);
  (node.children ?? []).forEach((child) => collectTreeKeySet(child, collector));
  return collector;
};

const parseNodeSourceKey = (node: FlowNode): string => {
  const nodeData = (node.data ?? {}) as { sourceKey?: unknown; sourceRef?: unknown };
  if (typeof nodeData.sourceKey === 'string' && nodeData.sourceKey.trim()) {
    return nodeData.sourceKey.trim();
  }

  const sourceRef = typeof nodeData.sourceRef === 'string' ? nodeData.sourceRef.trim() : '';
  if (sourceRef.startsWith('root::')) {
    return sourceRef.slice('root::'.length).trim();
  }

  return '';
};

const resolveClipboardFlowSnapshot = (
  flowNodes: FlowNode[],
  flowEdges: Edge[],
  subtreeKeys: Set<string>,
): { flowNodes: FlowNode[]; flowEdges: Edge[] } => {
  const selectedNodes = flowNodes.filter((node) => {
    if (node.type !== 'componentNode' && node.type !== 'propExposeNode') {
      return false;
    }
    const sourceKey = parseNodeSourceKey(node);
    return !!sourceKey && subtreeKeys.has(sourceKey);
  });

  const selectedNodeIds = new Set(selectedNodes.map((node) => node.id));
  const selectedEdges = flowEdges.filter(
    (edge) => selectedNodeIds.has(edge.source) || selectedNodeIds.has(edge.target),
  );

  return {
    flowNodes: cloneDeep(selectedNodes),
    flowEdges: cloneDeep(selectedEdges),
  };
};

const buildUniqueKey = (rawBase: string, usedKeys: Set<string>) => {
  const safeBase = (rawBase || 'node').replace(/[^A-Za-z0-9_-]/g, '_') || 'node';
  if (!usedKeys.has(safeBase)) {
    usedKeys.add(safeBase);
    return safeBase;
  }

  let index = 1;
  while (index < 1000000) {
    const suffix = index === 1 ? '_copy' : `_copy${index}`;
    const candidate = `${safeBase}${suffix}`;
    if (!usedKeys.has(candidate)) {
      usedKeys.add(candidate);
      return candidate;
    }
    index += 1;
  }

  const fallback = `${safeBase}_${uuidv4().slice(0, 8)}`;
  usedKeys.add(fallback);
  return fallback;
};

const remapClipboardTreeKeys = (
  node: UiTreeNode,
  existingKeys: Set<string>,
): { tree: UiTreeNode; keyMap: Map<string, string> } => {
  const keyMap = new Map<string, string>();

  const walk = (target: UiTreeNode): UiTreeNode => {
    const cloned = cloneDeep(target);
    const nextKey = buildUniqueKey(cloned.key, existingKeys);
    keyMap.set(target.key, nextKey);
    cloned.key = nextKey;
    cloned.children = (cloned.children ?? []).map((child, index) => walk((target.children ?? [])[index] ?? child));
    return cloned;
  };

  return {
    tree: walk(node),
    keyMap,
  };
};

const remapClipboardFlowSnapshot = (
  flowNodes: FlowNode[],
  flowEdges: Edge[],
  keyMap: Map<string, string>,
): { flowNodes: FlowNode[]; flowEdges: Edge[] } => {
  const nodeIdMap = new Map<string, string>();

  const nextFlowNodes = flowNodes.map((node) => {
    const nextId = uuidv4();
    nodeIdMap.set(node.id, nextId);
    const nextNode = cloneDeep(node);
    const rawData = (nextNode.data ?? {}) as Record<string, unknown>;

    const nextSourceKey = typeof rawData.sourceKey === 'string'
      ? keyMap.get(rawData.sourceKey) ?? rawData.sourceKey
      : rawData.sourceKey;
    const nextSourceRef = typeof rawData.sourceRef === 'string' && rawData.sourceRef.startsWith('root::')
      ? `root::${keyMap.get(rawData.sourceRef.slice('root::'.length)) ?? rawData.sourceRef.slice('root::'.length)}`
      : rawData.sourceRef;

    const nextSourceNodeId = typeof rawData.sourceNodeId === 'string'
      ? nodeIdMap.get(rawData.sourceNodeId) ?? rawData.sourceNodeId
      : rawData.sourceNodeId;
    const nextUpstreamNodeId = typeof rawData.upstreamNodeId === 'string'
      ? nodeIdMap.get(rawData.upstreamNodeId) ?? rawData.upstreamNodeId
      : rawData.upstreamNodeId;

    nextNode.id = nextId;
    nextNode.data = {
      ...rawData,
      sourceKey: nextSourceKey,
      sourceRef: nextSourceRef,
      sourceNodeId: nextSourceNodeId,
      upstreamNodeId: nextUpstreamNodeId,
    };

    return nextNode;
  });

  const nextFlowNodeIds = new Set(nextFlowNodes.map((node) => node.id));
  const nextFlowEdges = flowEdges
    .map((edge) => {
      const nextSource = nodeIdMap.get(edge.source) ?? edge.source;
      const nextTarget = nodeIdMap.get(edge.target) ?? edge.target;
      return {
        ...cloneDeep(edge),
        id: uuidv4(),
        source: nextSource,
        target: nextTarget,
      };
    })
    .filter((edge) => nextFlowNodeIds.has(edge.source) && nextFlowNodeIds.has(edge.target));

  return {
    flowNodes: nextFlowNodes,
    flowEdges: nextFlowEdges,
  };
};

const isEditableTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tagName = target.tagName.toLowerCase();
  if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
    return true;
  }
  return target.isContentEditable;
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

const getPopupContentSlotNode = (node: UiTreeNode) => {
  const slotChildren = (node.children ?? []).filter((child) => isSlotNode(child));
  const contentSlot = slotChildren.find((child) => getNodeSlotKey(child) === 'content');
  return contentSlot ?? slotChildren[0];
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

  if (node.type === 'Popup') {
    const preferredSlotNode = getPopupContentSlotNode(node);
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
  const { readOnly } = useBuilderAccess();
  const uiPageData = useStore((state) => state.uiPageData);
  const builderLeftAsideWidthPx = useStore((state) => state.builderComponentLeftAsideWidthPx);
  const builderLeftAsideCollapsed = useStore((state) => state.builderComponentLeftAsideCollapsed);
  const setTreeInstance = useStore((state) => state.setTreeInstance);
  const uiStructureTreeScrollRequest = useStore((state) => state.uiStructureTreeScrollRequest);
  const clearUiStructureTreeScrollRequest = useStore((state) => state.clearUiStructureTreeScrollRequest);
  const requestUiStructureTreeScrollToKey = useStore((state) => state.requestUiStructureTreeScrollToKey);
  const activeNodeKey = useStore((state) => state.activeNodeKey);
  const setActiveNode = useStore((state) => state.setActiveNode);
  const toggleActiveNode = useStore((state) => state.toggleActiveNode);
  const removeFromUiPageData = useStore((state) => state.removeFromUiPageData);
  const insertToUiPageData = useStore((state) => state.insertToUiPageData);
  const moveUiNode = useStore((state) => state.moveUiNode);
  const wrapNodeWithPopup = useStore((state) => state.wrapNodeWithPopup);
  const flowNodes = useStore((state) => state.flowNodes);
  const flowEdges = useStore((state) => state.flowEdges);
  const recordFlowEditHistory = useStore((state) => state.recordFlowEditHistory);
  const [treeClipboard, setTreeClipboardState] = useState<TreeClipboardPayload | null>(() => getTreeClipboard());
  const [dragOverNodeKey, setDragOverNodeKey] = useState<string | null>(null);
  const [draggingTreeNodeKey, setDraggingTreeNodeKey] = useState<string | null>(null);
  const [expandedKeys, setExpandedKeys] = useState<string[]>(() => collectTreeKeys(uiPageData));
  const [virtualStructureRootKey, setVirtualStructureRootKey] = useState<string | null>(null);
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
  const contextMenuAnchorRef = useRef<{ x: number; y: number } | null>(null);

  const displayRoot = useMemo(
    () => resolveStructureDisplayRoot(uiPageData, virtualStructureRootKey),
    [uiPageData, virtualStructureRootKey],
  );

  useEffect(() => {
    if (virtualStructureRootKey && !isVirtualStructureRootKeyValid(uiPageData, virtualStructureRootKey)) {
      setVirtualStructureRootKey(null);
    }
  }, [uiPageData, virtualStructureRootKey]);

  useEffect(() => {
    const v = virtualStructureRootKey?.trim() || null;
    const root = useStore.getState().uiPageData;
    if (v && v !== root.key) {
      const dr = resolveStructureDisplayRoot(root, v);
      if (dr.key === v) {
        setExpandedKeys(collectTreeKeys(dr));
      }
    } else {
      setExpandedKeys(collectTreeKeys(root));
    }
  }, [virtualStructureRootKey, useStore]);

  const closeContextMenu = () => {
    contextMenuAnchorRef.current = null;
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
    if (readOnly) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    setActiveNode(nodeKey);
    contextMenuAnchorRef.current = {
      x: event.clientX,
      y: event.clientY,
    };

    setContextMenuState({
      visible: true,
      nodeKey,
      x: event.clientX,
      y: event.clientY,
    });
  };

  const handleDeleteNode = (nodeKey: string) => {
    if (!nodeKey || nodeKey === uiPageData.key) {
      MessagePlugin.warning('根节点不支持删除');
      closeContextMenu();
      return;
    }

    removeFromUiPageData(nodeKey);
    closeContextMenu();
  };

  const handleClearNodeChildren = (targetNode: UiTreeNode | null, closeMenu = true) => {
    if (!targetNode) {
      return;
    }

    const children = targetNode.children ?? [];
    if (children.length === 0) {
      MessagePlugin.info('当前节点内部为空');
      if (closeMenu) {
        closeContextMenu();
      }
      return;
    }

    const childKeys = children.map((child) => child.key);
    childKeys.forEach((childKey) => {
      removeFromUiPageData(childKey);
    });

    setActiveNode(targetNode.key);
    MessagePlugin.success('已清空内部元素');
    if (closeMenu) {
      closeContextMenu();
    }
  };

  const canOperateNode = (node: UiTreeNode | null) => {
    if (!node) {
      return false;
    }
    return node.key !== uiPageData.key && !isSlotNode(node);
  };

  const copyNodeToClipboard = (targetNode: UiTreeNode, mode: 'copy' | 'cut') => {
    if (!canOperateNode(targetNode)) {
      MessagePlugin.warning('当前节点不支持该操作');
      return false;
    }

    const subtreeKeys = collectTreeKeySet(targetNode);
    const flowSnapshot = resolveClipboardFlowSnapshot(flowNodes, flowEdges, subtreeKeys);
    setTreeClipboard({
      mode,
      node: cloneDeep(targetNode),
      flowNodes: flowSnapshot.flowNodes,
      flowEdges: flowSnapshot.flowEdges,
      createdAt: Date.now(),
    });
    return true;
  };

  const handleCopyNode = (targetNode: UiTreeNode | null, closeMenu = true) => {
    if (!targetNode) {
      return;
    }
    const copied = copyNodeToClipboard(targetNode, 'copy');
    if (copied) {
      MessagePlugin.success('已复制节点');
    }
    if (closeMenu) {
      closeContextMenu();
    }
  };

  const handleCutNode = (targetNode: UiTreeNode | null, closeMenu = true) => {
    if (!targetNode) {
      return;
    }
    const copied = copyNodeToClipboard(targetNode, 'cut');
    if (!copied) {
      if (closeMenu) {
        closeContextMenu();
      }
      return;
    }

    removeFromUiPageData(targetNode.key);
    MessagePlugin.success('已剪切节点');
    if (closeMenu) {
      closeContextMenu();
    }
  };

  const resolvePasteTarget = (targetNode: UiTreeNode | null): TreeNodeDropTarget | null => {
    if (!targetNode) {
      return null;
    }

    return getTreeNodeDropTarget(targetNode, uiPageData);
  };

  const handlePasteNode = (targetNode: UiTreeNode | null, closeMenu = true) => {
    if (!treeClipboard || !targetNode) {
      if (closeMenu) {
        closeContextMenu();
      }
      return;
    }

    const dropTarget = resolvePasteTarget(targetNode);
    if (!dropTarget) {
      MessagePlugin.warning('当前节点不支持粘贴，请选择可容器节点或插槽节点');
      if (closeMenu) {
        closeContextMenu();
      }
      return;
    }

    const usedKeys = collectTreeKeySet(uiPageData);
    const { tree: pastedTree, keyMap } = remapClipboardTreeKeys(treeClipboard.node, usedKeys);
    const remappedFlow = remapClipboardFlowSnapshot(treeClipboard.flowNodes, treeClipboard.flowEdges, keyMap);

    const prevFlowNodes = flowNodes;
    const prevFlowEdges = flowEdges;
    const nextFlowNodes = [...flowNodes, ...remappedFlow.flowNodes];
    const nextFlowEdges = [...flowEdges, ...remappedFlow.flowEdges];

    insertToUiPageData(dropTarget.parentKey, pastedTree as unknown as Record<string, unknown>, dropTarget.slotKey);
    if (remappedFlow.flowNodes.length > 0 || remappedFlow.flowEdges.length > 0) {
      recordFlowEditHistory('粘贴节点并同步流程', prevFlowNodes, prevFlowEdges, nextFlowNodes, nextFlowEdges);
    }
    setActiveNode(pastedTree.key);

    if (treeClipboard.mode === 'cut') {
      clearTreeClipboard();
    }

    MessagePlugin.success('粘贴成功');
    if (closeMenu) {
      closeContextMenu();
    }
  };

  const handleTreeNodeDragOver = (event: React.DragEvent<HTMLDivElement>, node: UiTreeNode) => {
    if (readOnly) {
      return;
    }

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

    const relatedTarget = event.relatedTarget as globalThis.Node | null;
    if (relatedTarget && event.currentTarget.contains(relatedTarget)) {
      return;
    }

    setDragOverNodeKey((previous) => (previous === node.key ? null : previous));
  };

  const handleTreeNodeDrop = (event: React.DragEvent<HTMLDivElement>, node: UiTreeNode) => {
    if (readOnly) {
      return;
    }

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

      if (
        (currentNodeType === 'Menu'
          || currentNodeType === 'HeadMenu'
          || currentNodeType === 'antd.Menu'
          || currentNodeType === 'antd.HeadMenu')
        && !MENU_NODE_TYPES.has(droppedType)
      ) {
        return;
      }

      if ((currentNodeType === 'Menu.Submenu' || currentNodeType === 'antd.Menu.SubMenu') && !MENU_NODE_TYPES.has(droppedType)) {
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
            data-tree-node-key={node.key}
            onContextMenu={(event) => handleNodeContextMenu(event, node.key)}
            onDragOver={(event) => handleTreeNodeDragOver(event, node)}
            onDragLeave={(event) => handleTreeNodeDragLeave(event, node)}
            onDrop={(event) => handleTreeNodeDrop(event, node)}
          >
            <div className="tree-node-item">
              <span className="tree-node-item__left">
                <span
                  className={`tree-node-item__icon tree-node-item__icon--${nodeVisualKind}`}
                  draggable={!readOnly && isNodeDraggable(node, uiPageData.key)}
                  onDragStart={(event) => {
                    if (readOnly) {
                      return;
                    }
                    event.stopPropagation();
                    applyBuilderDragPreview(event, {
                      kind: 'page',
                      title,
                      componentType: String(node.type ?? ''),
                      pageUiTreeNode: node,
                    });
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

    return transformNode(displayRoot);
  }, [dragOverNodeKey, uiPageData, displayRoot]);

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

  const canCopyContextMenuNode = canOperateNode(contextMenuNode);
  const canCutContextMenuNode = canOperateNode(contextMenuNode);
  const canPasteToContextMenuNode = Boolean(contextMenuNode && treeClipboard && resolvePasteTarget(contextMenuNode));
  const canDeleteContextMenuNode = canOperateNode(contextMenuNode);
  const canClearContextMenuNodeChildren = Boolean((contextMenuNode?.children ?? []).length > 0);
  const canWrapWithPopup = Boolean(
    contextMenuNode
    && canOperateNode(contextMenuNode)
    && !isSlotNode(contextMenuNode)
    && contextMenuNode.type !== 'Popup',
  );
  const canShowMoveMenu = Boolean(contextMenuNode && contextMenuNodeSiblingInfo && canOperateNode(contextMenuNode));
  const canMoveToTop = Boolean(
    contextMenuNode
    && contextMenuNodeSiblingInfo
    && canOperateNode(contextMenuNode)
    && contextMenuNodeSiblingInfo.index > 0,
  );
  const canMoveToBottom = Boolean(
    contextMenuNode
    && contextMenuNodeSiblingInfo
    && canOperateNode(contextMenuNode)
    && contextMenuNodeSiblingInfo.index < contextMenuNodeSiblingInfo.siblingCount - 1,
  );
  const canMoveUp = canMoveToTop;
  const canMoveDown = canMoveToBottom;
  const canShowAsVirtualRoot = Boolean(contextMenuNode && contextMenuNode.key !== uiPageData.key);

  const getMenuItemStyle = (enabled: boolean): React.CSSProperties => ({
    opacity: enabled ? 1 : 0.45,
    pointerEvents: enabled ? 'auto' : 'none',
  });

  const treeData = useMemo(() => [uiPageDataWithWrappedLabel], [uiPageDataWithWrappedLabel]);
  const treeRef = useRef<TreeInstanceFunctions<any> | null>(null);
  const structureTreeViewportRef = useRef<HTMLDivElement | null>(null);

  const bindTreeRef = useCallback(
    (el: TreeInstanceFunctions<any> | null) => {
      treeRef.current = el;
      setTreeInstance(el as unknown as UiTreeInstance);
    },
    [setTreeInstance],
  );

  const handleTreeClick = (context: any) => {
    const key = context?.node?.value ?? context?.node?.key;
    if (typeof key !== 'string') {
      return;
    }
    if (isTdesignTreeExpandIconClick(context?.e)) {
      return;
    }
    toggleActiveNode(key);
  };

  useEffect(() => {
    return () => setTreeInstance(null);
  }, [setTreeInstance]);

  /** 先于 scroll 的 layout 阶段展开，避免虚拟列表尚未挂载时 scrollTo 无效 */
  useLayoutEffect(() => {
    if (!uiStructureTreeScrollRequest) {
      return;
    }
    const path = findNodePathByKey(uiPageData, uiStructureTreeScrollRequest.key);
    if (!path?.length) {
      clearUiStructureTreeScrollRequest();
      return;
    }
    const ancestors = path.slice(0, -1).map((item) => item.key);
    setExpandedKeys((previous) => {
      const merged = [...new Set([...previous, ...ancestors])];
      if (merged.length === previous.length && merged.every((key, index) => key === previous[index])) {
        return previous;
      }
      return merged;
    });
  }, [clearUiStructureTreeScrollRequest, uiPageData, uiStructureTreeScrollRequest]);

  useLayoutEffect(() => {
    if (!uiStructureTreeScrollRequest) {
      return;
    }
    const path = findNodePathByKey(uiPageData, uiStructureTreeScrollRequest.key);
    if (!path?.length) {
      clearUiStructureTreeScrollRequest();
      return;
    }
    const ancestors = path.slice(0, -1).map((item) => item.key);
    if (!ancestors.every((key) => expandedKeys.includes(key))) {
      return;
    }
    treeRef.current?.scrollTo?.({ key: uiStructureTreeScrollRequest.key });
    clearUiStructureTreeScrollRequest();
  }, [
    clearUiStructureTreeScrollRequest,
    expandedKeys,
    uiPageData,
    uiStructureTreeScrollRequest,
  ]);

  useLayoutEffect(() => {
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

  const handleLocateActiveNode = useCallback(() => {
    if (activeNodeKey) {
      requestUiStructureTreeScrollToKey(activeNodeKey);
    }
  }, [activeNodeKey, requestUiStructureTreeScrollToKey]);

  useEffect(() => {
    if (!contextMenuState.visible) {
      return;
    }

    const handleWindowMouseDown = (event: MouseEvent) => {
      if (contextMenuRef.current?.contains(event.target as globalThis.Node | null)) {
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

  useEffect(() => {
    if (!contextMenuState.visible) {
      return;
    }
    const menuElement = contextMenuRef.current;
    const anchor = contextMenuAnchorRef.current;
    if (!menuElement || !anchor) {
      return;
    }
    const anchorX = anchor.x;
    const anchorY = anchor.y;
    const virtualAnchor = {
      getBoundingClientRect: () => DOMRect.fromRect({ x: anchorX, y: anchorY, width: 0, height: 0 }),
    };
    void computePosition(virtualAnchor, menuElement, {
      strategy: 'fixed',
      placement: 'right-start',
      middleware: [offset(4), flip({ padding: 8 }), shift({ padding: 8 })],
    }).then(({ x, y }) => {
      setContextMenuState((previous) => {
        if (!previous.visible || previous.x !== anchorX || previous.y !== anchorY) {
          return previous;
        }
        return { ...previous, x, y };
      });
    });
  }, [contextMenuState.visible]);

  useEffect(() => {
    const unsubscribe = subscribeTreeClipboard((value) => {
      setTreeClipboardState(value);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (readOnly) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const withCmd = event.ctrlKey || event.metaKey;
      if (!withCmd || isEditableTarget(event.target)) {
        return;
      }

      // Ctrl/Cmd+R 为浏览器刷新，改用 Ctrl/Cmd+Alt+R 避免冲突
      if (event.key.toLowerCase() === 'r' && !event.shiftKey && event.altKey) {
        const vKey = virtualStructureRootKey?.trim() || null;
        if (vKey) {
          event.preventDefault();
          event.stopPropagation();
          setVirtualStructureRootKey(null);
          return;
        }
        if (activeNodeKey && activeNodeKey !== uiPageData.key) {
          event.preventDefault();
          event.stopPropagation();
          setVirtualStructureRootKey(activeNodeKey);
        }
        return;
      }

      const activeNode = activeNodeKey ? findNodePathByKey(uiPageData, activeNodeKey)?.at(-1) ?? null : null;

      if (event.key.toLowerCase() === 'c' && !event.shiftKey) {
        if (!activeNode || !canOperateNode(activeNode)) {
          return;
        }
        event.preventDefault();
        handleCopyNode(activeNode, false);
        return;
      }

      if (event.key.toLowerCase() === 'x') {
        if (!activeNode || !canOperateNode(activeNode)) {
          return;
        }
        event.preventDefault();
        handleCutNode(activeNode, false);
        return;
      }

      if (event.key.toLowerCase() === 'v' && !event.shiftKey) {
        if (!activeNode || !treeClipboard) {
          return;
        }
        event.preventDefault();
        handlePasteNode(activeNode, false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeNodeKey, readOnly, treeClipboard, uiPageData, virtualStructureRootKey]);

  const asideStyle = useMemo((): React.CSSProperties => {
    if (builderLeftAsideCollapsed) {
      return { width: 0, minWidth: 0, flexShrink: 0 };
    }
    return { width: builderLeftAsideWidthPx, minWidth: 0, maxWidth: 300, flexShrink: 0 };
  }, [builderLeftAsideCollapsed, builderLeftAsideWidthPx]);

  return (
    <aside
      className={`aside-left${builderLeftAsideCollapsed ? ' aside-left--collapsed' : ''}`}
      style={asideStyle}
    >
      <div className="structure-top">
        <div className="structure-panel">
          <div className="search-row">
            <Input placeholder="搜索组件（示例）" clearable suffix={<SearchIcon />} />
            <button
              type="button"
              className={`structure-locate-btn${activeNodeKey ? '' : ' structure-locate-btn--disabled'}`}
              title="定位到激活节点"
              disabled={!activeNodeKey}
              onClick={handleLocateActiveNode}
            >
              <LocateFixed size={16} strokeWidth={1.8} />
            </button>
          </div>

          <StructureVirtualRootBanner
            visible={Boolean(virtualStructureRootKey && virtualStructureRootKey !== uiPageData.key)}
            rootLabel={String(displayRoot.label ?? displayRoot.key)}
            onClear={() => setVirtualStructureRootKey(null)}
          />

          <div ref={structureTreeViewportRef} className="structure-tree" role="tree">
            <div className="structure-tree__zoom">
              <Tree
                keys={{ value: 'key' }}
                ref={bindTreeRef}
                activable
                expanded={expandedKeys}
                line
                scroll={BUILDER_STRUCTURE_TREE_SCROLL}
                data={treeData}
                actived={activeNodeKey ? [activeNodeKey] : []}
                onClick={handleTreeClick}
                onExpand={(nextExpanded) => {
                  setExpandedKeys(Array.isArray(nextExpanded) ? nextExpanded.map((item) => String(item)) : []);
                }}
                onDragLeave={() => setDragOverNodeKey(null)}
              />
            </div>
          </div>

          {contextMenuState.visible && contextMenuNode ? (
            <div
              ref={contextMenuRef}
              className="tree-node-context-menu"
              style={{ left: contextMenuState.x, top: contextMenuState.y }}
              onMouseDown={(event) => event.stopPropagation()}
            >
              <div
                style={getMenuItemStyle(canCopyContextMenuNode)}
                onClick={() => {
                  if (!canCopyContextMenuNode) {
                    return;
                  }
                  handleCopyNode(contextMenuNode);
                }}
              >
                <Row className="tree-node-context-menu-item" justify='space-between' align='center'>
                  <Space style={{ alignItems: 'center' }} size={12} align='center'>
                    <Icon size={16} name="copy"/>
                    <Text>复制</Text>
                  </Space>
                  <Text>Ctrl+C</Text>
                </Row>
              </div>
              <div
                style={getMenuItemStyle(canPasteToContextMenuNode)}
                onClick={() => {
                  if (!canPasteToContextMenuNode) {
                    return;
                  }
                  handlePasteNode(contextMenuNode);
                }}
              >
                <Row className="tree-node-context-menu-item" justify='space-between' align='center'>
                  <Space style={{ alignItems: 'center' }} size={12} align='center'>
                    <Icon size={16} name="clipboard-paste"/>
                    <Text>粘贴</Text>
                  </Space>
                  <Text>Ctrl+V</Text>
                </Row>
              </div>
              <div
                style={getMenuItemStyle(canCutContextMenuNode)}
                onClick={() => {
                  if (!canCutContextMenuNode) {
                    return;
                  }
                  handleCutNode(contextMenuNode);
                }}
              >
                <Row className="tree-node-context-menu-item" justify='space-between' align='center'>
                  <Space style={{ alignItems: 'center' }} size={12} align='center'>
                    <Icon size={16} name="cut"/>
                    <Text>剪切</Text>
                  </Space>
                  <Text>Ctrl+X</Text>
                </Row>
              </div>
              <Divider size={4}/>
              <div
                style={getMenuItemStyle(canClearContextMenuNodeChildren)}
                onClick={() => {
                  if (!canClearContextMenuNodeChildren) {
                    return;
                  }

                  handleClearNodeChildren(contextMenuNode);
                }}
              >
                <Row className="tree-node-context-menu-item" justify='space-between' align='center'>
                  <Space style={{ alignItems: 'center' }} size={12} align='center'>
                    <Icon size={16} name="clear"/>
                    <Text>清空内部</Text>
                  </Space>
                </Row>
              </div>
              <div
                style={getMenuItemStyle(canDeleteContextMenuNode)}
                onClick={() => {
                  if (!canDeleteContextMenuNode) {
                    return;
                  }

                  handleDeleteNode(contextMenuNode.key);
                }}
              >
                <Row className="tree-node-context-menu-item" justify='space-between' align='center'>
                  <Space style={{ alignItems: 'center' }} size={12} align='center'>
                    <Icon size={16} name="delete"/>
                    <Text>删除元素</Text>
                  </Space>
                </Row>
              </div>
              <div
                style={getMenuItemStyle(canWrapWithPopup)}
                onClick={() => {
                  if (!contextMenuNode || !canWrapWithPopup) {
                    return;
                  }
                  wrapNodeWithPopup(contextMenuNode.key);
                  closeContextMenu();
                }}
              >
                <Row className="tree-node-context-menu-item" justify='space-between' align='center'>
                  <Space style={{ alignItems: 'center' }} size={12} align='center'>
                    <Icon size={16} name="layers"/>
                    <Text>添加 Popup</Text>
                  </Space>
                </Row>
              </div>
              <Divider size={4}/>
              <div className="tree-node-context-menu-submenu-wrap" style={getMenuItemStyle(canShowMoveMenu)}>
                <Row className="tree-node-context-menu-item tree-node-context-menu-submenu-trigger" justify='space-between' align='center'>
                  <Space style={{ alignItems: 'center' }} size={12} align='center'>
                    <Icon size={16} name="move"/>
                    <Text>移动元素</Text>
                  </Space>
                  <Icon size={14} name="chevron-right" />
                </Row>
                <div className="tree-node-context-menu-submenu">
                  <div
                    style={getMenuItemStyle(canMoveToTop)}
                    onClick={() => {
                      if (!contextMenuNode || !contextMenuNodeSiblingInfo || !canMoveToTop) {
                        return;
                      }

                      moveUiNode(
                        contextMenuNode.key,
                        contextMenuNodeSiblingInfo.parentKey,
                        0,
                      );
                      setActiveNode(contextMenuNode.key);
                      closeContextMenu();
                    }}
                  >
                    <Row className="tree-node-context-menu-item" justify='space-between' align='center'>
                      <Space style={{ alignItems: 'center' }} size={12} align='center'>
                        <Icon size={16} name="chevron-up-double"/>
                        <Text>移到顶部</Text>
                      </Space>
                    </Row>
                  </div>
                  <div
                    style={getMenuItemStyle(canMoveToBottom)}
                    onClick={() => {
                      if (!contextMenuNode || !contextMenuNodeSiblingInfo || !canMoveToBottom) {
                        return;
                      }

                      moveUiNode(
                        contextMenuNode.key,
                        contextMenuNodeSiblingInfo.parentKey,
                        contextMenuNodeSiblingInfo.siblingCount - 1,
                      );
                      setActiveNode(contextMenuNode.key);
                      closeContextMenu();
                    }}
                  >
                    <Row className="tree-node-context-menu-item" justify='space-between' align='center'>
                      <Space style={{ alignItems: 'center' }} size={12} align='center'>
                        <Icon size={16} name="chevron-down-double"/>
                        <Text>移到底部</Text>
                      </Space>
                    </Row>
                  </div>
                  <div
                    style={getMenuItemStyle(canMoveUp)}
                    onClick={() => {
                      if (!contextMenuNode || !contextMenuNodeSiblingInfo || !canMoveUp) {
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
                    <Row className="tree-node-context-menu-item" justify='space-between' align='center'>
                      <Space style={{ alignItems: 'center' }} size={12} align='center'>
                        <Icon size={16} name="chevron-up"/>
                        <Text>向上移动</Text>
                      </Space>
                    </Row>
                  </div>
                  <div
                    style={getMenuItemStyle(canMoveDown)}
                    onClick={() => {
                      if (!contextMenuNode || !contextMenuNodeSiblingInfo || !canMoveDown) {
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
                    <Row className="tree-node-context-menu-item" justify='space-between' align='center'>
                      <Space style={{ alignItems: 'center' }} size={12} align='center'>
                        <Icon size={16} name="chevron-down"/>
                        <Text>向下移动</Text>
                      </Space>
                    </Row>
                  </div>
                </div>
              </div>

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

              <Divider size={4} />
              <div
                style={getMenuItemStyle(canShowAsVirtualRoot)}
                onClick={() => {
                  if (!canShowAsVirtualRoot || !contextMenuNode) {
                    return;
                  }
                  setVirtualStructureRootKey(contextMenuNode.key);
                  closeContextMenu();
                }}
              >
                <Row className="tree-node-context-menu-item" justify="space-between" align="center">
                  <Space style={{ alignItems: 'center' }} size={12} align="center">
                    <FolderTree size={16} strokeWidth={2} />
                    <Text>展示为根节点</Text>
                  </Space>
                </Row>
              </div>

            </div>
          ) : null}
        </div>
      </div>
    </aside>
  );
};

export default React.memo(ComponentAsideLeft);
