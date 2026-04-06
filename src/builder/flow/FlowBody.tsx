import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import cloneDeep from 'lodash/cloneDeep';
import { Alert } from 'tdesign-react';
import { calcAutoPan } from '@xyflow/system';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  SelectionMode,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  useReactFlow,
  useStoreApi,
  MarkerType,
  type EdgeTypes,
  type EdgeChange,
  type NodeChange,
  type Connection,
  type Edge,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { flowNodeTypes } from './nodes';
import AnnotatedEdge, { type AnnotatedEdgeData } from './edges/AnnotatedEdge';
import { FlowNodeActionsProvider, type FlowNodeActionsValue } from './context/FlowNodeActionsContext';
import { FlowEdgeActionsProvider, type FlowEdgeActionsValue } from './context/FlowEdgeActionsContext';
import { useBuilderAccess, useBuilderContext } from '../context/BuilderContext';
import { useBuilderThemeStore } from '../theme/builderThemeStore';
import FlowTopbar, { type FlowCanvasTool } from './components/FlowTopbar';
import { useFlowEditorPrefsStore } from './flowEditorPrefsStore';
import { isEditableTarget } from '../hooks/useBuilderModeHotkeys';
import { cloneFlowSubgraphWithNewIds } from './utils/cloneFlowSubgraphPaste';
import type {
  AnnotationNodeData,
  ComponentFlowNodeData,
  EventFilterNodeData,
  FlowComponentDragPayload,
  LifecycleExposeNodeData,
  PropExposeNodeData,
  TimerNodeData,
} from '../../types/flow';
import { CORE_LIFETIMES } from '../../constants/componentBuilder';
import { findNodeByKey } from '../../utils/createComponentTree';

const FLOW_DRAG_DATA_KEY = 'drag-component-data';

const COMPONENT_FALLBACK_LIFETIMES: Record<string, string[]> = {
  Slider: ['onChange'],
};

const RESERVED_COMPONENT_PROP_KEYS = new Set(['__style', '__slot']);

const resolveFlowLifetimes = (lifetimes: unknown, componentType?: string): string[] => {
  const list = Array.isArray(lifetimes)
    ? lifetimes.map((item) => String(item).trim()).filter(Boolean)
    : [];

  if (list.length > 0) {
    return Array.from(new Set(list));
  }

  const fallbackByType = componentType ? COMPONENT_FALLBACK_LIFETIMES[componentType] : undefined;
  if (fallbackByType?.length) {
    return fallbackByType;
  }

  return CORE_LIFETIMES;
};

const resolveConfigurablePropKeys = (props: unknown): string[] => {
  if (!props || typeof props !== 'object' || Array.isArray(props)) {
    return [];
  }

  return Object.keys(props as Record<string, unknown>)
    .filter((key) => key && !RESERVED_COMPONENT_PROP_KEYS.has(key))
    .sort((a, b) => a.localeCompare(b, 'zh-CN'));
};

const toSourceRef = (sourceKey?: unknown, sourceRef?: unknown) => {
  const normalizedRef = typeof sourceRef === 'string' ? sourceRef.trim() : '';
  if (normalizedRef) {
    return normalizedRef;
  }

  const normalizedKey = typeof sourceKey === 'string' ? sourceKey.trim() : '';
  if (!normalizedKey) {
    return '';
  }

  return `root::${normalizedKey}`;
};

const createFlowNodeId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.round(Math.random() * 1000)}`;

const createFlowEdgeId = (source: string, target: string) =>
  `edge-${source}-${target}-${Date.now()}-${Math.round(Math.random() * 1000)}`;

const flowEdgeTypes: EdgeTypes = {
  annotatedEdge: AnnotatedEdge,
};

/** 节点数超过此值时隐藏 MiniMap，降低大图固定开销 */
const FLOW_MINIMAP_HIDE_AFTER_NODES = 100;
/** 节点数超过此值时关闭选中节点抬升，减轻 z-index 重绘 */
const FLOW_ELEVATE_ON_SELECT_MAX_NODES = 80;
/** 拖拽位移超过此阈值（px）才触发 onNodesChange，减少轻微抖动写回 */
const FLOW_NODE_DRAG_THRESHOLD_PX = 2;
/** 与 <Background gap={16} /> 一致，便于对齐视觉网格 */
const FLOW_SNAP_GRID: [number, number] = [16, 16];

function snapFlowPosition(
  pos: { x: number; y: number },
  enabled: boolean,
  grid: [number, number],
): { x: number; y: number } {
  if (!enabled) {
    return { x: pos.x, y: pos.y };
  }
  const [gx, gy] = grid;
  return {
    x: Math.round(pos.x / gx) * gx,
    y: Math.round(pos.y / gy) * gy,
  };
}

const FlowCanvas: React.FC = () => {
  const { useStore } = useBuilderContext();
  const { readOnly } = useBuilderAccess();
  const colorMode = useBuilderThemeStore((s) => s.colorMode);
  const flowSnapToGrid = useFlowEditorPrefsStore((s) => s.flowSnapToGrid);
  const setFlowSnapToGrid = useFlowEditorPrefsStore((s) => s.setFlowSnapToGrid);
  const defaultEdgeColor = colorMode === 'dark' ? '#7a8799' : '#9aa5b5';
  const nodes = useStore((state) => state.flowNodes);
  const edges = useStore((state) => state.flowEdges);
  const flowViewportFocusNonce = useStore((state) => state.flowViewportFocusNonce);
  const setFlowNodes = useStore((state) => state.setFlowNodes);
  const setFlowEdges = useStore((state) => state.setFlowEdges);
  const setFlowActiveNodeId = useStore((state) => state.setFlowActiveNodeId);
  const recordFlowEditHistory = useStore((state) => state.recordFlowEditHistory);
  const [flowAlertMessage, setFlowAlertMessage] = useState<string | null>(null);
  const [editingEdgeId, setEditingEdgeId] = useState<string | null>(null);
  const [editingEdgeValue, setEditingEdgeValue] = useState('');
  const [annotationMenu, setAnnotationMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    flowX: number;
    flowY: number;
  }>({
    visible: false,
    x: 0,
    y: 0,
    flowX: 0,
    flowY: 0,
  });
  const [edgeMenu, setEdgeMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    edgeId: string | null;
  }>({
    visible: false,
    x: 0,
    y: 0,
    edgeId: null,
  });
  const [canvasTool, setCanvasTool] = useState<FlowCanvasTool>('pan');
  const [paneSelectionMenu, setPaneSelectionMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    anchorFlow?: { x: number; y: number };
  }>({
    visible: false,
    x: 0,
    y: 0,
  });
  const [hasFlowClipboard, setHasFlowClipboard] = useState(false);
  const flowClipboardRef = useRef<{ nodes: Node[]; edges: Edge[] } | null>(null);
  const lastPointerFlowRef = useRef<{ x: number; y: number } | null>(null);
  const flowCanvasRef = useRef<HTMLDivElement | null>(null);
  const { screenToFlowPosition, setCenter } = useReactFlow();
  const reactFlowStore = useStoreApi();

  useEffect(() => {
    if (readOnly) {
      setCanvasTool('pan');
    }
  }, [readOnly]);

  /** 框选边缘自动平移：RF 在 pointerdown 时对 pane 调用了 setPointerCapture，pointermove 须在 document 捕获阶段监听；用 store.userSelectionRect 判断正在拖选。平移量与 RF 连线/拖节点一致（calcAutoPan + domNode 坐标）。不设 e.buttons：capture 后部分环境 buttons 恒为 0。 */
  useEffect(() => {
    if (readOnly) {
      return;
    }
    const EDGE_DISTANCE = 40;
    const onPointerMoveCapture = (e: PointerEvent) => {
      const state = reactFlowStore.getState();
      if (!state.userSelectionRect) {
        return;
      }
      const el = state.domNode ?? flowCanvasRef.current;
      if (!el) {
        return;
      }
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) {
        return;
      }
      const pos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      const speed = state.autoPanSpeed ?? 15;
      const [xMovement, yMovement] = calcAutoPan(pos, { width: rect.width, height: rect.height }, speed, EDGE_DISTANCE);
      if (xMovement === 0 && yMovement === 0) {
        return;
      }
      void state.panBy({ x: xMovement, y: yMovement });
    };
    document.addEventListener('pointermove', onPointerMoveCapture, true);
    return () => document.removeEventListener('pointermove', onPointerMoveCapture, true);
  }, [readOnly, reactFlowStore]);

  const nodesForCanvas = useMemo(() => nodes, [nodes]);

  const edgesForCanvas = useMemo(() => {
    const ids = new Set(nodesForCanvas.map((n) => n.id));
    return edges.filter((edge) => ids.has(edge.source) && ids.has(edge.target));
  }, [edges, nodesForCanvas]);

  const panToFlowNodeId = useCallback(
    (nodeId: string) => {
      const list = useStore.getState().flowNodes;
      const node = list.find((item) => item.id === nodeId);
      if (!node?.position) {
        return;
      }
      void setCenter(node.position.x + 120, node.position.y + 40, { duration: 220, zoom: 1 });
    },
    [setCenter, useStore],
  );

  useEffect(() => {
    if (flowViewportFocusNonce === 0) {
      return;
    }
    const { flowActiveNodeId: id } = useStore.getState();
    if (!id) {
      return;
    }
    panToFlowNodeId(id);
  }, [flowViewportFocusNonce, panToFlowNodeId]);

  const applyFlowEdit = useCallback(
    (
      actionLabel: string,
      updater: (payload: { nodes: Node[]; edges: Edge[] }) => { nodes: Node[]; edges: Edge[] },
    ) => {
      const { flowNodes: prevNodes, flowEdges: prevEdges } = useStore.getState();
      const result = updater({ nodes: prevNodes, edges: prevEdges });

      recordFlowEditHistory(actionLabel, prevNodes, prevEdges, result.nodes, result.edges);
    },
    [recordFlowEditHistory],
  );

  const createAnnotationNode = useCallback(
    (x: number, y: number, text = '') => {
      const nodeId = createFlowNodeId('annotation-node');
      const snapped = snapFlowPosition(
        { x, y },
        useFlowEditorPrefsStore.getState().flowSnapToGrid,
        FLOW_SNAP_GRID,
      );
      const nextNode: Node = {
        id: nodeId,
        type: 'annotationNode',
        position: snapped,
        connectable: false,
        data: {
          text,
        },
      };

      applyFlowEdit('新建流程注释节点', ({ nodes: previous, edges: previousEdges }) => ({
        nodes: [...previous, nextNode],
        edges: previousEdges,
      }));
    },
    [applyFlowEdit],
  );

  const handleChangeEditingValue = useCallback((value: string) => {
    setEditingEdgeValue(value);
  }, []);

  const handleCancelEdgeEditing = useCallback(() => {
    setEditingEdgeId(null);
    setEditingEdgeValue('');
  }, []);

  const handleStartEditEdge = useCallback((edgeId: string) => {
    const targetEdge = useStore.getState().flowEdges.find((item) => item.id === edgeId);
    const targetData = (targetEdge?.data ?? {}) as Record<string, unknown>;
    setEditingEdgeId(edgeId);
    setEditingEdgeValue(typeof targetData.annotation === 'string' ? targetData.annotation : '');
  }, []);

  const handleCommitEdgeAnnotation = useCallback((edgeId?: string) => {
    const targetEdgeId = edgeId ?? editingEdgeId;
    if (!targetEdgeId) {
      return;
    }

    const nextAnnotation = editingEdgeValue.trim();

    applyFlowEdit('编辑连线注释', ({ nodes: previousNodes, edges: previousEdges }) => {
      const nextEdges = previousEdges.map((edge) => {
        if (edge.id !== targetEdgeId) {
          return edge;
        }

        const currentData = (edge.data ?? {}) as Record<string, unknown>;

        if (!nextAnnotation) {
          const { annotation: _, ...restData } = currentData;
          return {
            ...edge,
            data: restData,
          };
        }

        return {
          ...edge,
          data: {
            ...currentData,
            annotation: nextAnnotation,
          },
        };
      });

      return {
        nodes: previousNodes,
        edges: nextEdges,
      };
    });

    setEditingEdgeId(null);
    setEditingEdgeValue('');
  }, [applyFlowEdit, editingEdgeId, editingEdgeValue]);

  const handleCancelEdgeAnnotation = useCallback(() => {
    setEditingEdgeId(null);
    setEditingEdgeValue('');
  }, []);

  const renderedEdges = useMemo(() => {
    return edgesForCanvas.map((edge) => {
      const edgeData = (edge.data ?? {}) as Record<string, unknown>;
      const annotation = typeof edgeData.annotation === 'string' ? edgeData.annotation : '';
      const isEditing = editingEdgeId === edge.id;

      return {
        ...edge,
        type: 'annotatedEdge',
        animated: false,
        data: {
          ...edgeData,
          annotation,
          isEditing,
          editingValue: isEditing ? editingEdgeValue : annotation,
        } as AnnotatedEdgeData,
        style: {
          ...edge.style,
          stroke: defaultEdgeColor,
          strokeWidth: 1.6,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: defaultEdgeColor,
        },
      } as Edge;
    });
  }, [editingEdgeId, editingEdgeValue, edgesForCanvas, defaultEdgeColor]);

  const handleAnnotationTextChange = useCallback(
    (nodeId: string, text: string) => {
      setFlowNodes((previous) =>
        previous.map((node) => {
          if (node.id !== nodeId || node.type !== 'annotationNode') {
            return node;
          }

          const nodeData = (node.data ?? {}) as AnnotationNodeData;
          return {
            ...node,
            data: {
              ...nodeData,
              text,
            },
          };
        }),
      );
    },
    [setFlowNodes],
  );

  const handleDeleteFlowNode = useCallback(
    (nodeId: string) => {
      applyFlowEdit('删除流程节点', ({ nodes: previousNodes, edges: previousEdges }) => ({
        nodes: previousNodes.filter((node) => node.id !== nodeId),
        edges: previousEdges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId),
      }));

      const currentActiveNodeId = useStore.getState().flowActiveNodeId;
      if (currentActiveNodeId === nodeId) {
        setFlowActiveNodeId(null);
      }
    },
    [applyFlowEdit, setFlowActiveNodeId],
  );

  const handleFlipFlowNode = useCallback(
    (nodeId: string, axis: 'x' | 'y') => {
      const { flowNodes: currentNodes, flowEdges: currentEdges } = useStore.getState();
      const targetNode = currentNodes.find((node) => node.id === nodeId);
      if (!targetNode) {
        return;
      }

      if (
        axis === 'y' &&
        (targetNode.type === 'componentNode' ||
          targetNode.type === 'codeNode' ||
          targetNode.type === 'eventFilterNode' ||
          targetNode.type === 'networkRequestNode' ||
          targetNode.type === 'timerNode' ||
          targetNode.type === 'propExposeNode' ||
          targetNode.type === 'lifecycleExposeNode')
      ) {
        return;
      }

      const nextNodeId = createFlowNodeId(String(targetNode.type || 'node'));
      const targetNodeData = (targetNode.data ?? {}) as Record<string, unknown>;
      const nextFlipX = axis === 'x' ? !(targetNodeData.flipX as boolean | undefined) : (targetNodeData.flipX as boolean | undefined);
      const nextFlipY = axis === 'y' ? !(targetNodeData.flipY as boolean | undefined) : (targetNodeData.flipY as boolean | undefined);

      const nextNodes = currentNodes.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            id: nextNodeId,
            data: {
              ...targetNodeData,
              flipX: !!nextFlipX,
              flipY: !!nextFlipY,
            },
          };
        }

        if (node.type === 'eventFilterNode') {
          const nodeData = (node.data ?? {}) as EventFilterNodeData;
          if (nodeData.upstreamNodeId === nodeId) {
            return {
              ...node,
              data: {
                ...nodeData,
                upstreamNodeId: nextNodeId,
              },
            };
          }
        }

        if (node.type === 'propExposeNode') {
          const nodeData = (node.data ?? {}) as PropExposeNodeData;
          if (nodeData.sourceNodeId === nodeId) {
            return {
              ...node,
              data: {
                ...nodeData,
                sourceNodeId: nextNodeId,
              },
            };
          }
        }

        if (node.type === 'lifecycleExposeNode') {
          const nodeData = (node.data ?? {}) as LifecycleExposeNodeData;
          if (nodeData.upstreamNodeId === nodeId) {
            return {
              ...node,
              data: {
                ...nodeData,
                upstreamNodeId: nextNodeId,
              },
            };
          }
        }

        return node;
      });

      const nextEdges = currentEdges.map((edge) => {
        const source = edge.source === nodeId ? nextNodeId : edge.source;
        const target = edge.target === nodeId ? nextNodeId : edge.target;

        if (source === edge.source && target === edge.target) {
          return edge;
        }

        return {
          ...edge,
          id: createFlowEdgeId(source, target),
          source,
          target,
        };
      });

      applyFlowEdit('翻转流程节点端口', () => ({
        nodes: nextNodes,
        edges: nextEdges,
      }));
      const currentActiveNodeId = useStore.getState().flowActiveNodeId;
      setFlowActiveNodeId(currentActiveNodeId === nodeId ? nextNodeId : currentActiveNodeId);
    },
    [applyFlowEdit, setFlowActiveNodeId],
  );

  const flowNodeActions = useMemo<FlowNodeActionsValue>(
    () => ({
      deleteNode: handleDeleteFlowNode,
      flipHorizontal: (nodeId: string) => handleFlipFlowNode(nodeId, 'x'),
      flipVertical: (nodeId: string) => handleFlipFlowNode(nodeId, 'y'),
      setAnnotationText: handleAnnotationTextChange,
    }),
    [handleAnnotationTextChange, handleDeleteFlowNode, handleFlipFlowNode],
  );

  const flowEdgeActionsRef = useRef({
    startEdit: handleStartEditEdge,
    changeEditingValue: handleChangeEditingValue,
    commitEdit: handleCommitEdgeAnnotation,
    cancelEdit: handleCancelEdgeEditing,
  });
  flowEdgeActionsRef.current.startEdit = handleStartEditEdge;
  flowEdgeActionsRef.current.changeEditingValue = handleChangeEditingValue;
  flowEdgeActionsRef.current.commitEdit = handleCommitEdgeAnnotation;
  flowEdgeActionsRef.current.cancelEdit = handleCancelEdgeEditing;

  const flowEdgeActions = useMemo<FlowEdgeActionsValue>(
    () => ({
      startEdit: (edgeId: string) => {
        flowEdgeActionsRef.current.startEdit(edgeId);
      },
      changeEditingValue: (value: string) => {
        flowEdgeActionsRef.current.changeEditingValue(value);
      },
      commitEdit: () => {
        flowEdgeActionsRef.current.commitEdit();
      },
      cancelEdit: () => {
        flowEdgeActionsRef.current.cancelEdit();
      },
    }),
    [],
  );

  const nodesForReactFlow = useMemo(
    () =>
      nodesForCanvas.map((node) =>
        node.type === 'annotationNode' && node.connectable !== false
          ? { ...node, connectable: false as const }
          : node,
      ),
    [nodesForCanvas],
  );

  const flowNodeCount = nodesForCanvas.length;
  const showFlowMiniMap = flowNodeCount <= FLOW_MINIMAP_HIDE_AFTER_NODES;
  const elevateNodesOnSelect = flowNodeCount < FLOW_ELEVATE_ON_SELECT_MAX_NODES;

  const onNodesChange = useCallback(
    (changes: NodeChange<Node>[]) => {
      setFlowNodes((previous) => applyNodeChanges(changes, previous));
    },
    [setFlowNodes],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange<Edge>[]) => {
      setFlowEdges((previous) => applyEdgeChanges(changes, previous));
    },
    [setFlowEdges],
  );

  const onConnect = useCallback(
    (params: Edge | Connection) => {
      if (!params.source || !params.target) {
        return;
      }

      const currentNodes = useStore.getState().flowNodes;
      const currentEdges = useStore.getState().flowEdges;
      const sourceNode = currentNodes.find((item) => item.id === params.source);
      const targetNode = currentNodes.find((item) => item.id === params.target);

      let nextNodes = currentNodes;

      if (sourceNode?.type === 'componentNode' && targetNode?.type === 'eventFilterNode') {
        const sourceData = (sourceNode.data ?? {}) as ComponentFlowNodeData;
        const sourceIdentity = toSourceRef(sourceData.sourceKey, sourceData.sourceRef);

        const existingUpstreamSourceIds = currentEdges
          .filter((edge) => edge.target === targetNode.id)
          .map((edge) => edge.source);

        const hasDifferentSourceKey = existingUpstreamSourceIds
          .map((sourceId) => currentNodes.find((node) => node.id === sourceId))
          .filter((node): node is Node => !!node && node.type === 'componentNode')
          .some((node) => {
            const upstreamData = (node.data ?? {}) as ComponentFlowNodeData;
            return toSourceRef(upstreamData.sourceKey, upstreamData.sourceRef) !== sourceIdentity;
          });

        if (hasDifferentSourceKey) {
          setFlowAlertMessage('事件过滤节点仅支持连接同一树节点示例（sourceKey 相同）的组件。');
          return;
        }

        const lifetimes = resolveFlowLifetimes(sourceData.lifetimes, sourceData.componentType);
        const selectedLifetimes = lifetimes.length === 1 ? [lifetimes[0]] : [];

        nextNodes = currentNodes.map((item) => {
          if (item.id !== targetNode.id) {
            return item;
          }

          const currentData = (item.data ?? {}) as EventFilterNodeData;
          return {
            ...item,
            data: {
              ...currentData,
              upstreamNodeId: sourceNode.id,
              upstreamLabel: sourceData.label || sourceData.componentType || '组件节点',
              availableLifetimes: lifetimes,
              selectedLifetimes,
            },
          };
        });
      }

      if (sourceNode?.type === 'propExposeNode' && targetNode?.type === 'componentNode') {
        const targetData = (targetNode.data ?? {}) as ComponentFlowNodeData;
        const sourceData = (sourceNode.data ?? {}) as PropExposeNodeData;
        const sourceKey = String(targetData.sourceKey ?? '').trim();
        const sourceRef = toSourceRef(targetData.sourceKey, targetData.sourceRef);

        if (!sourceKey || !sourceRef) {
          setFlowAlertMessage('属性暴露节点连接失败：目标组件节点缺少 sourceKey。');
          return;
        }

        const existingTargets = currentEdges
          .filter((edge) => edge.source === sourceNode.id)
          .map((edge) => currentNodes.find((node) => node.id === edge.target))
          .filter((node): node is Node => !!node && node.type === 'componentNode');

        const hasDifferentSourceKey = existingTargets.some((node) => {
          const data = (node.data ?? {}) as ComponentFlowNodeData;
          return toSourceRef(data.sourceKey, data.sourceRef) !== sourceRef;
        });

        if (hasDifferentSourceKey) {
          setFlowAlertMessage('同一个属性暴露节点仅能绑定同一组件来源。');
          return;
        }

        const uiRoot = useStore.getState().uiPageData;
        const sourceUiNode = findNodeByKey(uiRoot, sourceKey);
        const availablePropKeys = resolveConfigurablePropKeys(sourceUiNode?.props ?? {});
        const selectedExisting = Array.isArray(sourceData.selectedPropKeys)
          ? sourceData.selectedPropKeys.map((item) => String(item)).filter((item) => availablePropKeys.includes(item))
          : [];
        const selectedPropKeys = selectedExisting.length > 0
          ? selectedExisting
          : (availablePropKeys.length === 1 ? [availablePropKeys[0]] : []);

        nextNodes = currentNodes.map((item) => {
          if (item.id !== sourceNode.id) {
            return item;
          }

          const currentData = (item.data ?? {}) as PropExposeNodeData;
          return {
            ...item,
            data: {
              ...currentData,
              sourceNodeId: targetNode.id,
              sourceKey,
              sourceRef,
              sourceLabel: targetData.label || targetData.componentType || '组件节点',
              availablePropKeys,
              selectedPropKeys,
            },
          };
        });
      }

      if (sourceNode?.type === 'eventFilterNode' && targetNode?.type === 'lifecycleExposeNode') {
        const sourceData = (sourceNode.data ?? {}) as EventFilterNodeData;
        const availableLifetimes = Array.isArray(sourceData.availableLifetimes)
          ? sourceData.availableLifetimes.map((item) => String(item)).filter(Boolean)
          : [];
        const selectedRaw = Array.isArray(sourceData.selectedLifetimes)
          ? sourceData.selectedLifetimes.map((item) => String(item)).filter(Boolean)
          : [];
        const selectedLifetimes = selectedRaw.filter((item) => availableLifetimes.includes(item));

        nextNodes = currentNodes.map((item) => {
          if (item.id !== targetNode.id) {
            return item;
          }

          const currentData = (item.data ?? {}) as LifecycleExposeNodeData;
          return {
            ...item,
            data: {
              ...currentData,
              upstreamNodeId: sourceNode.id,
              upstreamLabel: sourceData.label || '事件过滤节点',
              availableLifetimes,
              selectedLifetimes,
            },
          };
        });
      }

      if (sourceNode?.type === 'componentNode' && targetNode?.type === 'lifecycleExposeNode') {
        const sourceData = (sourceNode.data ?? {}) as ComponentFlowNodeData;
        const availableLifetimes = resolveFlowLifetimes(sourceData.lifetimes, sourceData.componentType);
        const selectedLifetimes = availableLifetimes.length === 1 ? [availableLifetimes[0]] : [];

        nextNodes = currentNodes.map((item) => {
          if (item.id !== targetNode.id) {
            return item;
          }

          const currentData = (item.data ?? {}) as LifecycleExposeNodeData;
          return {
            ...item,
            data: {
              ...currentData,
              upstreamNodeId: sourceNode.id,
              upstreamLabel: sourceData.label || sourceData.componentType || '组件节点',
              availableLifetimes,
              selectedLifetimes,
            },
          };
        });
      }

      const nextEdge: Edge = {
        id: createFlowEdgeId(params.source, params.target),
        source: params.source,
        target: params.target,
        sourceHandle: params.sourceHandle,
        targetHandle: params.targetHandle,
        animated: false,
        type: 'annotatedEdge',
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: defaultEdgeColor,
        },
        style: {
          stroke: defaultEdgeColor,
          strokeWidth: 1.6,
        },
      };

      const nextEdges = addEdge(nextEdge, currentEdges);
      applyFlowEdit('新增流程连线', () => ({
        nodes: nextNodes,
        edges: nextEdges,
      }));
    },
    [applyFlowEdit, defaultEdgeColor],
  );

  const isValidConnection = useCallback((params: Edge | Connection) => {
    if (!params.source || !params.target) {
      return true;
    }

    const currentNodes = useStore.getState().flowNodes;
    const currentEdges = useStore.getState().flowEdges;
    const sourceNode = currentNodes.find((item) => item.id === params.source);
    const targetNode = currentNodes.find((item) => item.id === params.target);

    if (sourceNode?.type === 'annotationNode' || targetNode?.type === 'annotationNode') {
      return false;
    }

    if (sourceNode?.type === 'lifecycleExposeNode') {
      return false;
    }

    if (targetNode?.type === 'propExposeNode') {
      return false;
    }

    if (sourceNode?.type === 'propExposeNode') {
      if (targetNode?.type !== 'componentNode') {
        return false;
      }

      const targetData = (targetNode.data ?? {}) as ComponentFlowNodeData;
      const sourceIdentity = toSourceRef(targetData.sourceKey, targetData.sourceRef);
      if (!sourceIdentity) {
        return false;
      }

      const existingTargets = currentEdges
        .filter((edge) => edge.source === sourceNode.id)
        .map((edge) => currentNodes.find((node) => node.id === edge.target))
        .filter((node): node is Node => !!node && node.type === 'componentNode');

      return existingTargets.every((node) => {
        const data = (node.data ?? {}) as ComponentFlowNodeData;
        return toSourceRef(data.sourceKey, data.sourceRef) === sourceIdentity;
      });
    }

    if (targetNode?.type === 'eventFilterNode') {
      return sourceNode?.type === 'componentNode';
    }

    if (targetNode?.type === 'lifecycleExposeNode') {
      if (sourceNode?.type !== 'eventFilterNode' && sourceNode?.type !== 'componentNode') {
        return false;
      }

      const hasUpstream = currentEdges.some((edge) => edge.target === targetNode.id);
      return !hasUpstream;
    }

    return true;
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      const rawData = event.dataTransfer.getData(FLOW_DRAG_DATA_KEY);
      if (!rawData) {
        return;
      }

      let payload: FlowComponentDragPayload | null = null;
      try {
        payload = JSON.parse(rawData) as FlowComponentDragPayload;
      } catch {
        return;
      }

      if (!payload || !payload.kind) {
        return;
      }

      const position = snapFlowPosition(
        screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        }),
        useFlowEditorPrefsStore.getState().flowSnapToGrid,
        FLOW_SNAP_GRID,
      );

      if (payload.kind === 'component-node') {
        const nodeId = createFlowNodeId('component-node');
        const sourceRef = toSourceRef(payload.sourceKey, payload.sourceRef);
        const nextNode: Node = {
          id: nodeId,
          type: 'componentNode',
          position,
          data: {
            label: payload.name || '组件节点',
            componentType: payload.componentType || 'Unknown',
            sourceKey: payload.sourceKey,
            sourceRef: sourceRef || undefined,
            lifetimes: resolveFlowLifetimes(payload.lifetimes, payload.componentType),
          },
        };

        applyFlowEdit('新增组件流程节点', ({ nodes: previousNodes, edges: previousEdges }) => ({
          nodes: [...previousNodes, nextNode],
          edges: previousEdges,
        }));
        return;
      }

      if (payload.kind === 'builtin-node' && payload.nodeType === 'eventFilterNode') {
        const nodeId = createFlowNodeId('event-filter-node');
        const nextNode: Node = {
          id: nodeId,
          type: 'eventFilterNode',
          position,
          data: {
            label: payload.label || '事件过滤节点',
            availableLifetimes: [],
            selectedLifetimes: [],
          },
        };

        applyFlowEdit('新增事件过滤节点', ({ nodes: previousNodes, edges: previousEdges }) => ({
          nodes: [...previousNodes, nextNode],
          edges: previousEdges,
        }));
        return;
      }

      if (payload.kind === 'builtin-node' && payload.nodeType === 'codeNode') {
        const nodeId = createFlowNodeId('code-node');
        const nextNode: Node = {
          id: nodeId,
          type: 'codeNode',
          position,
          data: {
            label: payload.label || '代码节点',
            language: 'javascript',
            editorTheme: 'vscode-dark',
            note: '注释信息',
            code: '',
          },
        };

        applyFlowEdit('新增代码节点', ({ nodes: previousNodes, edges: previousEdges }) => ({
          nodes: [...previousNodes, nextNode],
          edges: previousEdges,
        }));
        return;
      }

      if (payload.kind === 'builtin-node' && payload.nodeType === 'networkRequestNode') {
        const nodeId = createFlowNodeId('network-request-node');
        const nextNode: Node = {
          id: nodeId,
          type: 'networkRequestNode',
          position,
          data: {
            label: payload.label || '网络请求节点',
            method: 'GET',
            endpoint: '/api/example',
            timeoutMs: 5000,
            responsePath: 'ctx.response',
            bodyType: 'none',
            body: '',
            onError: 'throw',
            mockEnabled: false,
          },
        };

        applyFlowEdit('新增网络请求节点', ({ nodes: previousNodes, edges: previousEdges }) => ({
          nodes: [...previousNodes, nextNode],
          edges: previousEdges,
        }));
        return;
      }

      if (payload.kind === 'builtin-node' && payload.nodeType === 'timerNode') {
        const nodeId = createFlowNodeId('timer-node');
        const nextNode: Node = {
          id: nodeId,
          type: 'timerNode',
          position,
          data: {
            label: payload.label || '定时器节点',
            intervalMs: 1000,
          } satisfies TimerNodeData,
        };

        applyFlowEdit('新增定时器节点', ({ nodes: previousNodes, edges: previousEdges }) => ({
          nodes: [...previousNodes, nextNode],
          edges: previousEdges,
        }));
        return;
      }

      if (payload.kind === 'builtin-node' && payload.nodeType === 'propExposeNode') {
        const nodeId = createFlowNodeId('prop-expose-node');
        const nextNode: Node = {
          id: nodeId,
          type: 'propExposeNode',
          position,
          data: {
            label: payload.label || '属性暴露节点',
            sourceNodeId: undefined,
            sourceKey: undefined,
            sourceLabel: '',
            availablePropKeys: [],
            selectedPropKeys: [],
          } satisfies PropExposeNodeData,
        };

        applyFlowEdit('新增属性暴露节点', ({ nodes: previousNodes, edges: previousEdges }) => ({
          nodes: [...previousNodes, nextNode],
          edges: previousEdges,
        }));
        return;
      }

      if (payload.kind === 'builtin-node' && payload.nodeType === 'lifecycleExposeNode') {
        const nodeId = createFlowNodeId('lifecycle-expose-node');
        const nextNode: Node = {
          id: nodeId,
          type: 'lifecycleExposeNode',
          position,
          data: {
            label: payload.label || '生命周期暴露节点',
            upstreamNodeId: undefined,
            upstreamLabel: '',
            availableLifetimes: [],
            selectedLifetimes: [],
          } satisfies LifecycleExposeNodeData,
        };

        applyFlowEdit('新增生命周期暴露节点', ({ nodes: previousNodes, edges: previousEdges }) => ({
          nodes: [...previousNodes, nextNode],
          edges: previousEdges,
        }));
      }

    },
    [applyFlowEdit, screenToFlowPosition],
  );

  const handlePaneContextMenu = useCallback(
    (event: React.MouseEvent<Element, MouseEvent> | MouseEvent) => {
      event.preventDefault();

      const target = event.target as HTMLElement | null;
      if (!target) {
        return;
      }

      if (!target.closest('.react-flow__pane')) {
        return;
      }

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      setEdgeMenu((previous) => ({ ...previous, visible: false, edgeId: null }));

      const selectedCount = useStore.getState().flowNodes.filter((n) => n.selected).length;
      if (!readOnly && selectedCount > 0) {
        setPaneSelectionMenu({
          visible: true,
          x: event.clientX,
          y: event.clientY,
          anchorFlow: position,
        });
        setAnnotationMenu((previous) => ({ ...previous, visible: false }));
        return;
      }

      setPaneSelectionMenu((previous) => ({ ...previous, visible: false }));
      setAnnotationMenu({
        visible: true,
        x: event.clientX,
        y: event.clientY,
        flowX: position.x,
        flowY: position.y,
      });
    },
    [readOnly, screenToFlowPosition, useStore],
  );

  const closeAnnotationMenu = useCallback(() => {
    setAnnotationMenu((previous) => ({ ...previous, visible: false }));
  }, []);

  const closePaneSelectionMenu = useCallback(() => {
    setPaneSelectionMenu((previous) => ({ ...previous, visible: false }));
  }, []);

  const closeEdgeMenu = useCallback(() => {
    setEdgeMenu((previous) => ({ ...previous, visible: false, edgeId: null }));
  }, []);

  const handleEdgeContextMenu = useCallback(
    (event: React.MouseEvent<Element, MouseEvent> | MouseEvent, edge: Edge) => {
      event.preventDefault();
      event.stopPropagation();

      closeAnnotationMenu();
      closePaneSelectionMenu();
      setFlowAlertMessage(null);

      setEdgeMenu({
        visible: true,
        x: event.clientX,
        y: event.clientY,
        edgeId: edge.id,
      });
    },
    [closeAnnotationMenu, closePaneSelectionMenu],
  );

  const handleNodeContextMenu = useCallback(
    (event: React.MouseEvent<Element, MouseEvent>, node: Node) => {
      const selectedOnCanvas = useStore.getState().flowNodes.filter((n) => n.selected);
      if (selectedOnCanvas.length === 0 || !selectedOnCanvas.some((n) => n.id === node.id)) {
        return;
      }
      if (readOnly) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      setFlowAlertMessage(null);
      closeAnnotationMenu();
      setEdgeMenu((previous) => ({ ...previous, visible: false, edgeId: null }));
      const anchorFlow = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      setPaneSelectionMenu({
        visible: true,
        x: event.clientX,
        y: event.clientY,
        anchorFlow,
      });
    },
    [closeAnnotationMenu, readOnly, screenToFlowPosition, useStore],
  );

  /** 选区矩形（.react-flow__nodesselection-rect）上右键：与多选 pane 菜单一致 */
  const handleSelectionContextMenu = useCallback(
    (event: React.MouseEvent<Element, MouseEvent>) => {
      event.preventDefault();
      event.stopPropagation();
      if (readOnly) {
        return;
      }
      const selectedCount = useStore.getState().flowNodes.filter((n) => n.selected).length;
      if (selectedCount === 0) {
        return;
      }
      setFlowAlertMessage(null);
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      setEdgeMenu((previous) => ({ ...previous, visible: false, edgeId: null }));
      setAnnotationMenu((previous) => ({ ...previous, visible: false }));
      setPaneSelectionMenu({
        visible: true,
        x: event.clientX,
        y: event.clientY,
        anchorFlow: position,
      });
    },
    [readOnly, screenToFlowPosition, useStore],
  );

  const handleDeleteEdgeFromMenu = useCallback(() => {
    if (!edgeMenu.edgeId) {
      return;
    }

    applyFlowEdit('删除流程连线', ({ nodes: previousNodes, edges: previousEdges }) => ({
      nodes: previousNodes,
      edges: previousEdges.filter((edge) => edge.id !== edgeMenu.edgeId),
    }));
    setEditingEdgeId((previous) => (previous === edgeMenu.edgeId ? null : previous));
    setEditingEdgeValue((previous) => (edgeMenu.edgeId ? '' : previous));
    closeEdgeMenu();
  }, [applyFlowEdit, closeEdgeMenu, edgeMenu.edgeId]);

  const handleCreateAnnotationFromMenu = useCallback(() => {
    createAnnotationNode(annotationMenu.flowX, annotationMenu.flowY, '');
    closeAnnotationMenu();
  }, [annotationMenu.flowX, annotationMenu.flowY, closeAnnotationMenu, createAnnotationNode]);

  const deleteSelectedFlowNodes = useCallback(() => {
    if (readOnly) {
      return;
    }
    const selectedIds = useStore.getState().flowNodes.filter((n) => n.selected).map((n) => n.id);
    if (selectedIds.length === 0) {
      return;
    }
    const remove = new Set(selectedIds);
    applyFlowEdit('删除选中流程节点', ({ nodes: previousNodes, edges: previousEdges }) => ({
      nodes: previousNodes.filter((node) => !remove.has(node.id)),
      edges: previousEdges.filter((edge) => !remove.has(edge.source) && !remove.has(edge.target)),
    }));
    setFlowActiveNodeId(null);
    setPaneSelectionMenu((previous) => ({ ...previous, visible: false }));
  }, [applyFlowEdit, readOnly, setFlowActiveNodeId]);

  const copyFlowSelection = useCallback(() => {
    const allNodes = useStore.getState().flowNodes;
    const selected = allNodes.filter((n) => n.selected);
    if (selected.length === 0) {
      return;
    }
    const idSet = new Set(selected.map((n) => n.id));
    const selectedEdges = useStore.getState().flowEdges.filter(
      (e) => idSet.has(e.source) && idSet.has(e.target),
    );
    flowClipboardRef.current = {
      nodes: cloneDeep(selected),
      edges: cloneDeep(selectedEdges),
    };
    setHasFlowClipboard(true);
  }, [useStore]);

  const pasteFlowClipboard = useCallback(
    (anchorFlow?: { x: number; y: number }) => {
      if (readOnly) {
        return;
      }
      const clip = flowClipboardRef.current;
      if (!clip?.nodes.length) {
        return;
      }
      const anchor = anchorFlow ?? lastPointerFlowRef.current ?? undefined;
      const { nodes: pastedNodesRaw, edges: pastedEdges } = cloneFlowSubgraphWithNewIds(clip.nodes, clip.edges, {
        ...(anchor ? { anchorFlow: anchor } : { fallbackOffset: { x: 48, y: 48 } }),
        selectPasted: true,
      });
      const snapPaste = useFlowEditorPrefsStore.getState().flowSnapToGrid;
      const pastedNodes = snapPaste
        ? pastedNodesRaw.map((n) => ({
            ...n,
            position: snapFlowPosition(n.position, true, FLOW_SNAP_GRID),
          }))
        : pastedNodesRaw;
      applyFlowEdit('粘贴流程子图', ({ nodes: previousNodes, edges: previousEdges }) => ({
        nodes: [...previousNodes.map((n) => ({ ...n, selected: false })), ...pastedNodes],
        edges: [...previousEdges, ...pastedEdges],
      }));
      setFlowActiveNodeId(pastedNodes[0]?.id ?? null);
    },
    [applyFlowEdit, readOnly, setFlowActiveNodeId],
  );

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) {
        return;
      }

      const withMeta = event.ctrlKey || event.metaKey;
      if (withMeta && !event.shiftKey && event.key.toLowerCase() === 'c') {
        event.preventDefault();
        copyFlowSelection();
      }
      if (withMeta && !event.shiftKey && event.key.toLowerCase() === 'v') {
        event.preventDefault();
        pasteFlowClipboard();
      }
      if (!readOnly && (event.key === 'Delete' || event.key === 'Backspace')) {
        const hasSelected = useStore.getState().flowNodes.some((n) => n.selected);
        if (hasSelected) {
          event.preventDefault();
          deleteSelectedFlowNodes();
        }
      }
      if (event.key === 'Escape') {
        handleCancelEdgeAnnotation();
        closeEdgeMenu();
        closeAnnotationMenu();
        closePaneSelectionMenu();
      }
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [
    closeAnnotationMenu,
    closeEdgeMenu,
    closePaneSelectionMenu,
    copyFlowSelection,
    deleteSelectedFlowNodes,
    handleCancelEdgeAnnotation,
    pasteFlowClipboard,
    readOnly,
    useStore,
  ]);

  return (
    <div className="flow-body-content">
      <div className="flow-body-topbar">
        <FlowTopbar
          readOnly={readOnly}
          canvasTool={canvasTool}
          onCanvasToolChange={setCanvasTool}
          snapToGrid={flowSnapToGrid}
          onSnapToGridChange={setFlowSnapToGrid}
        />
      </div>
      <div
        ref={flowCanvasRef}
        className="flow-canvas"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onPointerMove={(e) => {
          lastPointerFlowRef.current = screenToFlowPosition({ x: e.clientX, y: e.clientY });
        }}
      >
        <FlowNodeActionsProvider value={flowNodeActions}>
        <FlowEdgeActionsProvider value={flowEdgeActions}>
        <ReactFlow
        className={colorMode === 'dark' ? 'dark' : undefined}
        nodes={nodesForReactFlow}
        edges={renderedEdges}
        nodeTypes={flowNodeTypes}
        edgeTypes={flowEdgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        isValidConnection={isValidConnection}
        onlyRenderVisibleElements
        elevateNodesOnSelect={elevateNodesOnSelect}
        nodeDragThreshold={FLOW_NODE_DRAG_THRESHOLD_PX}
        snapToGrid={!readOnly && flowSnapToGrid}
        snapGrid={FLOW_SNAP_GRID}
        zoomOnDoubleClick={false}
        selectionOnDrag={!readOnly && canvasTool === 'select'}
        selectionMode={SelectionMode.Partial}
        /* 不可含 2：@xyflow 在 panOnDrag.includes(2) 时会 preventDefault 并跳过 onPaneContextMenu，导致多选右键无菜单 */
        panOnDrag={!readOnly && canvasTool === 'select' ? [1] : true}
        panActivationKeyCode="Space"
        deleteKeyCode={null}
        nodesDraggable={!readOnly}
        nodesConnectable={!readOnly}
        elementsSelectable={!readOnly}
        onNodeClick={(_, node) => {
          handleCancelEdgeAnnotation();
          closeEdgeMenu();
          closeAnnotationMenu();
          closePaneSelectionMenu();
          setFlowAlertMessage(null);
          setFlowActiveNodeId(node.id);
        }}
        onPaneClick={() => {
          setFlowActiveNodeId(null);
          handleCommitEdgeAnnotation();
          closeEdgeMenu();
          closeAnnotationMenu();
          closePaneSelectionMenu();
          setFlowAlertMessage(null);
        }}
        onEdgeDoubleClick={(_, edge) => {
          closeEdgeMenu();
          closeAnnotationMenu();
          setFlowAlertMessage(null);
          setFlowActiveNodeId(null);
          handleStartEditEdge(edge.id);
        }}
        onEdgeContextMenu={handleEdgeContextMenu}
        onNodeContextMenu={handleNodeContextMenu}
        onPaneContextMenu={handlePaneContextMenu}
        onSelectionContextMenu={handleSelectionContextMenu}
        defaultEdgeOptions={{
          type: 'annotatedEdge',
          animated: false,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: defaultEdgeColor,
          },
          style: {
            stroke: defaultEdgeColor,
            strokeWidth: 1.6,
          },
        }}
        fitView
        >
          {showFlowMiniMap ? (
            <MiniMap
              zoomable
              pannable
              nodeColor={() => (colorMode === 'dark' ? '#4a5568' : '#c9d2e4')}
            />
          ) : null}
          <Controls />
          <Background gap={16} size={1} />
        </ReactFlow>
        </FlowEdgeActionsProvider>
        </FlowNodeActionsProvider>

        {annotationMenu.visible ? (
          <div className="tree-node-context-menu" style={{ left: annotationMenu.x, top: annotationMenu.y }}>
            <button
              className="tree-node-context-menu-item"
              type="button"
              onClick={handleCreateAnnotationFromMenu}
            >
              新建注释
            </button>
            {!readOnly && hasFlowClipboard ? (
              <button
                className="tree-node-context-menu-item"
                type="button"
                onClick={() => {
                  pasteFlowClipboard({ x: annotationMenu.flowX, y: annotationMenu.flowY });
                  closeAnnotationMenu();
                }}
              >
                粘贴到此处
              </button>
            ) : null}
          </div>
        ) : null}

        {edgeMenu.visible ? (
          <div className="tree-node-context-menu" style={{ left: edgeMenu.x, top: edgeMenu.y }}>
            <button
              className="tree-node-context-menu-item"
              type="button"
              onClick={handleDeleteEdgeFromMenu}
            >
              删除连线
            </button>
          </div>
        ) : null}

        {paneSelectionMenu.visible ? (
          <div className="tree-node-context-menu" style={{ left: paneSelectionMenu.x, top: paneSelectionMenu.y }}>
            <button className="tree-node-context-menu-item" type="button" onClick={copyFlowSelection}>
              复制选中 (Ctrl/Cmd+C)
            </button>
            <button
              className="tree-node-context-menu-item"
              type="button"
              disabled={readOnly || !hasFlowClipboard}
              onClick={() => {
                pasteFlowClipboard();
                closePaneSelectionMenu();
              }}
            >
              粘贴 (Ctrl/Cmd+V)
            </button>
            {!readOnly && hasFlowClipboard ? (
              <button
                className="tree-node-context-menu-item"
                type="button"
                onClick={() => {
                  const a = paneSelectionMenu.anchorFlow;
                  if (a) {
                    pasteFlowClipboard(a);
                  }
                  closePaneSelectionMenu();
                }}
              >
                粘贴到此处
              </button>
            ) : null}
            <button
              className="tree-node-context-menu-item tree-node-context-action--danger"
              type="button"
              onClick={deleteSelectedFlowNodes}
            >
              删除选中
            </button>
          </div>
        ) : null}

        {flowAlertMessage ? (
          <div className="flow-alert">
            <Alert
              theme="error"
              close
              message={flowAlertMessage}
              onClose={() => setFlowAlertMessage(null)}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
};

const FlowBody: React.FC = () => {
  return (
    <div className="flow-body">
      <ReactFlowProvider>
        <FlowCanvas />
      </ReactFlowProvider>
    </div>
  );
};

export default FlowBody;
