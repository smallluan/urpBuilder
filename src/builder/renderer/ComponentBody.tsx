import React, { useEffect, useMemo, useRef, useState } from 'react';
import cloneDeep from 'lodash/cloneDeep';
import { computePosition, flip, offset, shift } from '@floating-ui/dom';
import { Button, Divider, MessagePlugin, Row, Space, Typography } from 'tdesign-react';
import { Icon } from 'tdesign-icons-react';
import { Palette, PlusSquare } from 'lucide-react';
import type { Edge, Node as FlowNode } from '@xyflow/react';
import { v4 as uuidv4 } from 'uuid';
import { useBuilderAccess, useBuilderContext } from '../context/BuilderContext';
import DropArea from '../../components/DropArea';
import { LIST_TEMPLATE_ALLOWED_TYPES } from '../../constants/componentBuilder';
import { findNodePathByKey } from '../utils/tree';
import NodeStyleDrawer from '../components/NodeStyleDrawer';
import SimulatorSelectionOverlay from '../components/SimulatorSelectionOverlay';
import componentCatalog from '../../config/componentCatalog';
import { getNodeSlotKey, isSlotNode } from '../utils/slot';
import { getTabsPanelSlotKey, normalizeTabsList, normalizeTabsValue } from '../utils/tabs';
import {
  clearTreeClipboard,
  getTreeClipboard,
  setTreeClipboard,
  subscribeTreeClipboard,
  type TreeClipboardPayload,
} from '../utils/treeClipboard';
import { resolveSimulatorStyle } from '../utils/simulatorStyle';
import { getEffectiveBoundingRect, getScrollTargetForBuilderNode } from '../utils/builderNodeDomRect';

const { Text } = Typography;

const GRID_COL_COMPONENT_SCHEMA = componentCatalog.find((item) => item.type === 'Grid.Col');

const CONTAINER_NODE_TYPES = new Set([
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
  'Grid.Row',
  'Grid.Col',
  'Layout',
  'Layout.Header',
  'Layout.Content',
  'Layout.Aside',
  'Layout.Footer',
  'ComponentSlotOutlet',
]);

interface TreeNodeDropTarget {
  parentKey: string;
  slotKey?: string;
}

interface NodeSiblingInfo {
  parentKey: string;
  index: number;
  siblingCount: number;
}

const collectTreeNodes = (node: any, collector: any[] = []): any[] => {
  collector.push(node);
  (node.children ?? []).forEach((child: any) => collectTreeNodes(child, collector));
  return collector;
};

const collectTreeKeySet = (node: any, collector = new Set<string>()): Set<string> => {
  collector.add(node.key);
  (node.children ?? []).forEach((child: any) => collectTreeKeySet(child, collector));
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
  node: any,
  existingKeys: Set<string>,
): { tree: any; keyMap: Map<string, string> } => {
  const keyMap = new Map<string, string>();

  const walk = (target: any): any => {
    const cloned = cloneDeep(target);
    const nextKey = buildUniqueKey(cloned.key, existingKeys);
    keyMap.set(target.key, nextKey);
    cloned.key = nextKey;
    cloned.children = (cloned.children ?? []).map((child: any, index: number) => walk((target.children ?? [])[index] ?? child));
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

const isListItemTemplateDroppable = (node: any, root: any) => {
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

const getCardPreferredSlotNode = (node: any) => {
  const slotChildren = (node.children ?? []).filter((child: any) => isSlotNode(child));
  const bodySlot = slotChildren.find((child: any) => getNodeSlotKey(child) === 'body');
  return bodySlot ?? slotChildren[0];
};

const getTabsPreferredSlotNode = (node: any) => {
  const tabsList = normalizeTabsList((node.props?.list as { value?: unknown } | undefined)?.value);
  const controlledValue = normalizeTabsValue((node.props?.value as { value?: unknown } | undefined)?.value);
  const defaultValue = normalizeTabsValue((node.props?.defaultValue as { value?: unknown } | undefined)?.value);
  const targetValue = controlledValue ?? defaultValue ?? tabsList[0]?.value;
  const targetSlotKey = targetValue ? getTabsPanelSlotKey(targetValue) : '';
  const slotChildren = (node.children ?? []).filter((child: any) => isSlotNode(child));

  if (!targetSlotKey) {
    return slotChildren[0];
  }

  const matched = slotChildren.find((child: any) => getNodeSlotKey(child) === targetSlotKey);
  return matched ?? slotChildren[0];
};

const getTreeNodeDropTarget = (node: any, root: any): TreeNodeDropTarget | null => {
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

const getNodeSiblingInfo = (root: any, nodeKey: string): NodeSiblingInfo | null => {
  const path = findNodePathByKey(root, nodeKey);
  if (!path || path.length < 2) {
    return null;
  }

  const parentNode = path[path.length - 2];
  const siblings = parentNode.children ?? [];
  const index = siblings.findIndex((item: any) => item.key === nodeKey);
  if (index < 0) {
    return null;
  }

  return {
    parentKey: parentNode.key,
    index,
    siblingCount: siblings.length,
  };
};

const ComponentBody: React.FC = () => {
  const { useStore } = useBuilderContext();
  const { readOnly } = useBuilderAccess();
  const screenSize = useStore((state) => state.screenSize);
  const autoWidth = useStore((state) => state.autoWidth);
  const uiPageData = useStore((state) => state.uiPageData);
  const activeNodeKey = useStore((state) => state.activeNodeKey);
  const setActiveNode = useStore((state) => state.setActiveNode);
  const removeFromUiPageData = useStore((state) => state.removeFromUiPageData);
  const insertToUiPageData = useStore((state) => state.insertToUiPageData);
  const moveUiNode = useStore((state) => state.moveUiNode);
  const flowNodes = useStore((state) => state.flowNodes);
  const flowEdges = useStore((state) => state.flowEdges);
  const recordFlowEditHistory = useStore((state) => state.recordFlowEditHistory);
  const updateActiveNodeProp = useStore((state) => state.updateActiveNodeProp);
  const hiddenHintKeyRef = useRef<string | null>(null);
  const simulatorContainerRef = useRef<HTMLDivElement | null>(null);
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
  const [treeClipboard, setTreeClipboardState] = useState<TreeClipboardPayload | null>(() => getTreeClipboard());

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

  // 组件拖拽后接收结构化数据，并插入到对应父节点下
  const handleDropData = (data: any, parent: any, options?: { slotKey?: string }) => {
    if (readOnly) {
      return;
    }

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
      console.log(useStore.getState().uiPageData);
    }, 0);
  };

  const simulatorStyle: React.CSSProperties = useMemo(() => {
    const width = screenSize === 'auto' ? `${autoWidth}px` : `${screenSize}px`;
    return {
      width,
      height: '100%',
      backgroundColor: '#fff',
      margin: '0 auto',
      transition: 'width 0.2s ease',
      boxSizing: 'content-box',
      display: 'flex',
      overflow: 'auto',
      position: 'relative',
      isolation: 'isolate',
    };
  }, [screenSize, autoWidth]);

  useEffect(() => {
    const host = simulatorContainerRef.current;
    if (!host) {
      return;
    }

    const applyViewportVariables = () => {
      const nextWidth = host.clientWidth;
      const nextHeight = host.clientHeight;
      if (nextWidth > 0) {
        host.style.setProperty('--builder-vw', `${nextWidth / 100}px`);
      }
      if (nextHeight > 0) {
        host.style.setProperty('--builder-vh', `${nextHeight / 100}px`);
      }
    };

    applyViewportVariables();
    const resizeObserver = new ResizeObserver(() => applyViewportVariables());
    resizeObserver.observe(host);
    return () => {
      resizeObserver.disconnect();
    };
  }, [screenSize, autoWidth]);

  useEffect(() => {
    if (!activeNodeKey) {
      hiddenHintKeyRef.current = null;
      return;
    }

    const activePath = findNodePathByKey(uiPageData, activeNodeKey);
    const activeNode = activePath?.[activePath.length - 1];
    if (!activeNode) {
      return;
    }

    const isHidden = ((activeNode.props?.visible as { value?: unknown } | undefined)?.value) === false;
    if (isHidden) {
      if (hiddenHintKeyRef.current !== activeNodeKey) {
        MessagePlugin.info({
          content: `组件“${activeNode.label || activeNode.key}”当前为隐藏状态，请先开启 visible`,
          duration: 3500,
          closeBtn: true,
        });
        hiddenHintKeyRef.current = activeNodeKey;
      }
      return;
    }

    hiddenHintKeyRef.current = null;

    const safeKey = typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
      ? CSS.escape(activeNodeKey)
      : activeNodeKey.replace(/"/g, '\\"');
    const target = document.querySelector<HTMLElement>(`[data-builder-node-key="${safeKey}"]`);
    if (!target) {
      return;
    }

    const scrollTarget = getScrollTargetForBuilderNode(target);

    const simulatorContainer = document.querySelector<HTMLElement>('[data-builder-scroll-container="true"]');
    if (!simulatorContainer) {
      scrollTarget.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
      return;
    }

    const targetRect = getEffectiveBoundingRect(target);
    const containerRect = simulatorContainer.getBoundingClientRect();
    const outsideViewport =
      targetRect.top < containerRect.top
      || targetRect.bottom > containerRect.bottom
      || targetRect.left < containerRect.left
      || targetRect.right > containerRect.right;

    if (outsideViewport) {
      scrollTarget.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
    }
  }, [activeNodeKey]);

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

  const canOperateNode = (node: any) => {
    if (!node) {
      return false;
    }

    return node.key !== uiPageData.key && !isSlotNode(node);
  };

  const copyNodeToClipboard = (targetNode: any, mode: 'copy' | 'cut') => {
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

  const handleCopyNode = (targetNode: any) => {
    if (!targetNode) {
      return;
    }

    if (copyNodeToClipboard(targetNode, 'copy')) {
      MessagePlugin.success('已复制节点');
    }
    closeContextMenu();
  };

  const handleCutNode = (targetNode: any) => {
    if (!targetNode) {
      return;
    }

    if (!copyNodeToClipboard(targetNode, 'cut')) {
      closeContextMenu();
      return;
    }

    removeFromUiPageData(targetNode.key);
    MessagePlugin.success('已剪切节点');
    closeContextMenu();
  };

  const resolvePasteTarget = (targetNode: any): TreeNodeDropTarget | null => {
    if (!targetNode) {
      return null;
    }

    return getTreeNodeDropTarget(targetNode, uiPageData);
  };

  const handlePasteNode = (targetNode: any) => {
    const clipboard = treeClipboard;
    if (!clipboard || !targetNode) {
      closeContextMenu();
      return;
    }

    const dropTarget = resolvePasteTarget(targetNode);
    if (!dropTarget) {
      MessagePlugin.warning('当前节点不支持粘贴，请选择容器节点或插槽节点');
      closeContextMenu();
      return;
    }

    const usedKeys = collectTreeKeySet(uiPageData);
    const { tree: pastedTree, keyMap } = remapClipboardTreeKeys(clipboard.node, usedKeys);
    const remappedFlow = remapClipboardFlowSnapshot(clipboard.flowNodes, clipboard.flowEdges, keyMap);

    const prevFlowNodes = flowNodes;
    const prevFlowEdges = flowEdges;
    const nextFlowNodes = [...flowNodes, ...remappedFlow.flowNodes];
    const nextFlowEdges = [...flowEdges, ...remappedFlow.flowEdges];

    insertToUiPageData(dropTarget.parentKey, pastedTree as Record<string, unknown>, dropTarget.slotKey);
    if (remappedFlow.flowNodes.length > 0 || remappedFlow.flowEdges.length > 0) {
      recordFlowEditHistory('粘贴节点并同步流程', prevFlowNodes, prevFlowEdges, nextFlowNodes, nextFlowEdges);
    }
    setActiveNode(pastedTree.key);

    if (clipboard.mode === 'cut') {
      clearTreeClipboard();
    }

    MessagePlugin.success('粘贴成功');
    closeContextMenu();
  };

  const handleClearNodeChildren = (targetNode: any, closeMenu = true) => {
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

    children.forEach((child: any) => {
      removeFromUiPageData(child.key);
    });

    setActiveNode(targetNode.key);
    MessagePlugin.success('已清空内部元素');
    if (closeMenu) {
      closeContextMenu();
    }
  };

  const handleDeleteNode = (nodeKey: string) => {
    if (readOnly) {
      closeContextMenu();
      return;
    }

    if (!nodeKey || nodeKey === uiPageData.key || !contextMenuNode || isSlotNode(contextMenuNode)) {
      closeContextMenu();
      return;
    }

    removeFromUiPageData(nodeKey);
    closeContextMenu();
  };

  const handleCanvasContextMenu = (event: React.MouseEvent<HTMLDivElement>) => {
    if (readOnly) {
      closeContextMenu();
      return;
    }

    const targetElement = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-builder-node-key]');
    const nodeKey = targetElement?.dataset.builderNodeKey;
    if (!nodeKey) {
      closeContextMenu();
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
    const handleCanvasCommand = (event: Event) => {
      const customEvent = event as CustomEvent<{ command?: 'center-canvas' | 'scroll-top' }>;
      const command = customEvent.detail?.command;
      if (!command) {
        return;
      }

      const container = document.querySelector<HTMLElement>('[data-builder-scroll-container="true"]');
      if (!container) {
        return;
      }

      if (command === 'center-canvas') {
        const left = Math.max(0, (container.scrollWidth - container.clientWidth) / 2);
        container.scrollTo({ left, top: 0, behavior: 'smooth' });
      }

      if (command === 'scroll-top') {
        container.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };

    window.addEventListener('builder:component-canvas-command', handleCanvasCommand as EventListener);
    return () => {
      window.removeEventListener('builder:component-canvas-command', handleCanvasCommand as EventListener);
    };
  }, []);

  const canCopyContextMenuNode = canOperateNode(contextMenuNode);
  const canCutContextMenuNode = canOperateNode(contextMenuNode);
  const canDeleteContextMenuNode = canOperateNode(contextMenuNode);
  const canPasteToContextMenuNode = Boolean(contextMenuNode && treeClipboard && resolvePasteTarget(contextMenuNode));
  const canClearContextMenuNodeChildren = Boolean((contextMenuNode?.children ?? []).length > 0);
  const canMoveToTop = Boolean(
    contextMenuNode && contextMenuNodeSiblingInfo && canOperateNode(contextMenuNode) && contextMenuNodeSiblingInfo.index > 0,
  );
  const canMoveToBottom = Boolean(
    contextMenuNode
    && contextMenuNodeSiblingInfo
    && canOperateNode(contextMenuNode)
    && contextMenuNodeSiblingInfo.index < contextMenuNodeSiblingInfo.siblingCount - 1,
  );
  const canMoveUp = canMoveToTop;
  const canMoveDown = canMoveToBottom;

  const activeNode = useMemo(() => {
    if (!activeNodeKey) {
      return null;
    }
    const path = findNodePathByKey(uiPageData, activeNodeKey);
    return path?.[path.length - 1] ?? null;
  }, [activeNodeKey, uiPageData]);

  const runQuickOrganize = () => {
    if (!activeNodeKey) {
      MessagePlugin.info('请先选中一个组件');
      return;
    }
    const siblingInfo = getNodeSiblingInfo(uiPageData, activeNodeKey);
    if (!siblingInfo || siblingInfo.index <= 0) {
      MessagePlugin.info('当前节点位置已是较优顺序');
      return;
    }
    moveUiNode(activeNodeKey, siblingInfo.parentKey, 0);
    MessagePlugin.success('已将当前组件整理到同级首位');
  };

  const runToggleVisible = () => {
    if (!activeNode) {
      MessagePlugin.info('请先选中一个组件');
      return;
    }
    const currentVisible = ((activeNode.props?.visible as { value?: unknown } | undefined)?.value) !== false;
    updateActiveNodeProp('visible', !currentVisible);
    MessagePlugin.success(!currentVisible ? '组件已显示' : '组件已隐藏');
  };

  const runSelectNextSameType = () => {
    if (!activeNode || !activeNode.type) {
      MessagePlugin.info('请先选中一个具备类型的组件');
      return;
    }
    const nodes = collectTreeNodes(uiPageData).filter((node) => node.type === activeNode.type);
    if (nodes.length <= 1) {
      MessagePlugin.info('未找到其他同类型组件');
      return;
    }
    const currentIndex = nodes.findIndex((node) => node.key === activeNode.key);
    const nextNode = nodes[(currentIndex + 1) % nodes.length];
    setActiveNode(nextNode.key);
    MessagePlugin.success(`已定位同类组件：${nextNode.label || nextNode.key}`);
  };

  const runCopyActiveNode = () => {
    if (!activeNode) {
      MessagePlugin.info('请先选中一个组件');
      return;
    }
    handleCopyNode(activeNode);
  };

  const runPasteToActiveNode = () => {
    if (!activeNode) {
      MessagePlugin.info('请先选中一个组件');
      return;
    }
    handlePasteNode(activeNode);
  };

  const runDeleteActiveNode = () => {
    if (!activeNode || !canOperateNode(activeNode)) {
      MessagePlugin.info('请先选中可删除组件');
      return;
    }
    removeFromUiPageData(activeNode.key);
    MessagePlugin.success('已删除组件');
  };

  useEffect(() => {
    const handleToolbarCommand = (event: Event) => {
      const customEvent = event as CustomEvent<{ command?: string }>;
      const command = customEvent.detail?.command;
      if (!command) {
        return;
      }
      if (readOnly && command !== 'select-next-same-type' && command !== 'copy-active-node') {
        return;
      }
      if (command === 'quick-organize') {
        runQuickOrganize();
      }
      if (command === 'toggle-visible') {
        runToggleVisible();
      }
      if (command === 'select-next-same-type') {
        runSelectNextSameType();
      }
      if (command === 'copy-active-node') {
        runCopyActiveNode();
      }
      if (command === 'paste-to-active-node') {
        runPasteToActiveNode();
      }
    };

    window.addEventListener('builder:component-toolbar-command', handleToolbarCommand as EventListener);
    return () => {
      window.removeEventListener('builder:component-toolbar-command', handleToolbarCommand as EventListener);
    };
  }, [activeNode, activeNodeKey, readOnly, treeClipboard, uiPageData]);

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName?.toLowerCase();
      if (tagName === 'input' || tagName === 'textarea' || target?.isContentEditable) {
        return;
      }
      const withMeta = event.ctrlKey || event.metaKey;
      if (withMeta && event.shiftKey && event.key.toLowerCase() === 'l') {
        event.preventDefault();
        if (!readOnly) {
          runQuickOrganize();
        }
      }
      if (withMeta && event.shiftKey && event.key.toLowerCase() === 'v') {
        event.preventDefault();
        if (!readOnly) {
          runToggleVisible();
        }
      }
      if (withMeta && event.shiftKey && event.key.toLowerCase() === 'c') {
        event.preventDefault();
        if (!readOnly && activeNode) {
          handleClearNodeChildren(activeNode, false);
        }
        return;
      }
      if (withMeta && event.key.toLowerCase() === 'c' && !event.shiftKey) {
        runCopyActiveNode();
      }
      if (withMeta && event.key.toLowerCase() === 'v' && !event.shiftKey) {
        if (!readOnly) {
          runPasteToActiveNode();
        }
      }
      if (withMeta && event.key === 'Delete') {
        event.preventDefault();
        if (!readOnly) {
          runDeleteActiveNode();
        }
      }
      if (withMeta && activeNodeKey && !readOnly && !event.altKey) {
        const siblingInfo = getNodeSiblingInfo(uiPageData, activeNodeKey);
        if (siblingInfo && activeNode && canOperateNode(activeNode)) {
          if (event.shiftKey && event.key === 'ArrowUp' && siblingInfo.index > 0) {
            event.preventDefault();
            moveUiNode(activeNodeKey, siblingInfo.parentKey, 0);
            return;
          }
          if (event.shiftKey && event.key === 'ArrowDown' && siblingInfo.index < siblingInfo.siblingCount - 1) {
            event.preventDefault();
            moveUiNode(activeNodeKey, siblingInfo.parentKey, siblingInfo.siblingCount - 1);
            return;
          }
          if (!event.shiftKey && event.key === 'ArrowUp' && siblingInfo.index > 0) {
            event.preventDefault();
            moveUiNode(activeNodeKey, siblingInfo.parentKey, siblingInfo.index - 1);
            return;
          }
          if (!event.shiftKey && event.key === 'ArrowDown' && siblingInfo.index < siblingInfo.siblingCount - 1) {
            event.preventDefault();
            moveUiNode(activeNodeKey, siblingInfo.parentKey, siblingInfo.index + 1);
            return;
          }
        }
      }
      if (event.altKey && activeNodeKey) {
        const siblingInfo = getNodeSiblingInfo(uiPageData, activeNodeKey);
        if (!siblingInfo) {
          return;
        }
        if (event.key === 'ArrowUp' && siblingInfo.index > 0 && !readOnly) {
          event.preventDefault();
          moveUiNode(activeNodeKey, siblingInfo.parentKey, siblingInfo.index - 1);
        }
        if (event.key === 'ArrowDown' && siblingInfo.index < siblingInfo.siblingCount - 1 && !readOnly) {
          event.preventDefault();
          moveUiNode(activeNodeKey, siblingInfo.parentKey, siblingInfo.index + 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [activeNode, activeNodeKey, moveUiNode, readOnly, treeClipboard, uiPageData]);

  const getMenuItemStyle = (enabled: boolean): React.CSSProperties => ({
    opacity: enabled ? 1 : 0.45,
    pointerEvents: enabled ? 'auto' : 'none',
  });

  return (
    <div className="component-body">
      <div
        ref={simulatorContainerRef}
        className="simulator-container"
        data-builder-scroll-container="true"
        style={simulatorStyle}
        onContextMenu={handleCanvasContextMenu}
      >
        <DropArea
          className="drop-area-root"
          style={resolveSimulatorStyle({ minHeight: '100%', height: 'auto', flex: '0 0 auto' })}
          data={uiPageData}
          onDropData={handleDropData}
          selectable={false}
        />
        <SimulatorSelectionOverlay scrollContainerRef={simulatorContainerRef} />

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
            <Divider size={4}/>
            <div
              style={getMenuItemStyle(canMoveToTop)}
              onClick={() => {
                if (!contextMenuNode || !contextMenuNodeSiblingInfo || !canMoveToTop) {
                  return;
                }
                moveUiNode(contextMenuNode.key, contextMenuNodeSiblingInfo.parentKey, 0);
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
                moveUiNode(contextMenuNode.key, contextMenuNodeSiblingInfo.parentKey, contextMenuNodeSiblingInfo.siblingCount - 1);
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
                moveUiNode(contextMenuNode.key, contextMenuNodeSiblingInfo.parentKey, contextMenuNodeSiblingInfo.index - 1);
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
                moveUiNode(contextMenuNode.key, contextMenuNodeSiblingInfo.parentKey, contextMenuNodeSiblingInfo.index + 1);
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
            <Divider size={4}/>

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
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default ComponentBody;
