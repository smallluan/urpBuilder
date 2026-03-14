import React, { useCallback, useMemo, useState } from 'react';
import { Alert } from 'tdesign-react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  useReactFlow,
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
import { useBuilderContext } from '../context/BuilderContext';
import type {
  AnnotationNodeData,
  ComponentFlowNodeData,
  EventFilterNodeData,
  FlowComponentDragPayload,
  TimerNodeData,
} from '../../../types/flow';
import { CORE_LIFETIMES } from '../../../constants/componentBuilder';

const FLOW_DRAG_DATA_KEY = 'drag-component-data';

const DEFAULT_EDGE_COLOR = '#9aa5b5';
const COMPONENT_TRACE_COLOR = '#0052d9';
const EVENT_FILTER_TRACE_COLOR = '#2ba471';
const CODE_TRACE_COLOR = '#6f5af0';
const NETWORK_REQUEST_TRACE_COLOR = '#eb6f0a';
const TIMER_TRACE_COLOR = '#0f766e';
const COMPONENT_FALLBACK_LIFETIMES: Record<string, string[]> = {
  Slider: ['onChange'],
};

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

const createFlowNodeId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.round(Math.random() * 1000)}`;

const createFlowEdgeId = (source: string, target: string) =>
  `edge-${source}-${target}-${Date.now()}-${Math.round(Math.random() * 1000)}`;

const flowEdgeTypes: EdgeTypes = {
  annotatedEdge: AnnotatedEdge,
};

const FlowCanvas: React.FC = () => {
  const { useStore } = useBuilderContext();
  const nodes = useStore((state) => state.flowNodes);
  const edges = useStore((state) => state.flowEdges);
  const setFlowNodes = useStore((state) => state.setFlowNodes);
  const setFlowEdges = useStore((state) => state.setFlowEdges);
  const setFlowActiveNodeId = useStore((state) => state.setFlowActiveNodeId);
  const recordFlowEditHistory = useStore((state) => state.recordFlowEditHistory);
  const [traceActiveNodeId, setTraceActiveNodeId] = useState<string | null>(null);
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
  const { screenToFlowPosition } = useReactFlow();

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
      const nextNode: Node = {
        id: nodeId,
        type: 'annotationNode',
        position: { x, y },
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

  const traceColor = useMemo(() => {
    if (!traceActiveNodeId) {
      return COMPONENT_TRACE_COLOR;
    }

    const activeNode = nodes.find((item) => item.id === traceActiveNodeId);
    if (!activeNode) {
      return COMPONENT_TRACE_COLOR;
    }

    if (activeNode.type === 'eventFilterNode') {
      return EVENT_FILTER_TRACE_COLOR;
    }

    if (activeNode.type === 'codeNode') {
      return CODE_TRACE_COLOR;
    }

    if (activeNode.type === 'networkRequestNode') {
      return NETWORK_REQUEST_TRACE_COLOR;
    }

    if (activeNode.type === 'timerNode') {
      return TIMER_TRACE_COLOR;
    }

    return COMPONENT_TRACE_COLOR;
  }, [traceActiveNodeId, nodes]);

  const traceNodeIds = useMemo(() => {
    if (!traceActiveNodeId) {
      return new Set<string>();
    }

    const activeNode = nodes.find((item) => item.id === traceActiveNodeId);
    if (!activeNode) {
      return new Set<string>();
    }

    if (activeNode.type === 'annotationNode') {
      return new Set<string>();
    }

    const seedNodeIds = new Set<string>([activeNode.id]);

    if (activeNode.type === 'componentNode') {
      const activeSourceKey = (activeNode.data as ComponentFlowNodeData | undefined)?.sourceKey;
      if (activeSourceKey) {
        nodes.forEach((item) => {
          if (item.type !== 'componentNode') {
            return;
          }

          const sourceKey = (item.data as ComponentFlowNodeData | undefined)?.sourceKey;
          if (sourceKey === activeSourceKey) {
            seedNodeIds.add(item.id);
          }
        });
      }
    }

    const outgoingMap = new Map<string, string[]>();
    const incomingMap = new Map<string, string[]>();

    edges.forEach((edge) => {
      if (!outgoingMap.has(edge.source)) {
        outgoingMap.set(edge.source, []);
      }
      outgoingMap.get(edge.source)?.push(edge.target);

      if (!incomingMap.has(edge.target)) {
        incomingMap.set(edge.target, []);
      }
      incomingMap.get(edge.target)?.push(edge.source);
    });

    const visited = new Set<string>();
    const queue = Array.from(seedNodeIds);

    while (queue.length > 0) {
      const currentNodeId = queue.shift();
      if (!currentNodeId || visited.has(currentNodeId)) {
        continue;
      }

      visited.add(currentNodeId);

      const downstream = outgoingMap.get(currentNodeId) ?? [];
      const upstream = incomingMap.get(currentNodeId) ?? [];

      [...downstream, ...upstream].forEach((neighborId) => {
        if (!visited.has(neighborId)) {
          queue.push(neighborId);
        }
      });
    }

    return visited;
  }, [traceActiveNodeId, nodes, edges]);

  const renderedEdges = useMemo(() => {
    const hasTrace = traceNodeIds.size > 0;

    return edges.map((edge) => {
      const edgeData = (edge.data ?? {}) as Record<string, unknown>;
      const annotation = typeof edgeData.annotation === 'string' ? edgeData.annotation : '';
      const highlighted =
        traceNodeIds.size > 0 && traceNodeIds.has(edge.source) && traceNodeIds.has(edge.target);

      return {
        ...edge,
        type: 'annotatedEdge',
        animated: highlighted,
        data: {
          ...edgeData,
          annotation,
          isEditing: editingEdgeId === edge.id,
          editingValue: editingEdgeId === edge.id ? editingEdgeValue : annotation,
          onStartEdit: (edgeId: string) => {
            const targetEdge = useStore
              .getState()
              .flowEdges.find((item) => item.id === edgeId);
            const targetData = (targetEdge?.data ?? {}) as Record<string, unknown>;
            setEditingEdgeId(edgeId);
            setEditingEdgeValue(typeof targetData.annotation === 'string' ? targetData.annotation : '');
          },
          onChangeEditingValue: (value: string) => setEditingEdgeValue(value),
          onCommitEdit: () => {
            const nextAnnotation = editingEdgeValue.trim();
            applyFlowEdit('编辑连线注释', ({ nodes: previousNodes, edges: previousEdges }) => {
              const nextEdges = previousEdges.map((item) => {
                if (item.id !== edge.id) {
                  return item;
                }

                const currentData = (item.data ?? {}) as Record<string, unknown>;

                if (!nextAnnotation) {
                  const { annotation: _, ...restData } = currentData;
                  return {
                    ...item,
                    data: restData,
                  };
                }

                return {
                  ...item,
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
          },
          onCancelEdit: () => {
            setEditingEdgeId(null);
            setEditingEdgeValue('');
          },
        } as AnnotatedEdgeData,
        style: {
          ...edge.style,
          stroke: highlighted ? traceColor : DEFAULT_EDGE_COLOR,
          strokeWidth: highlighted ? 2 : 1.6,
          strokeDasharray: highlighted ? '6 4' : undefined,
          opacity: hasTrace ? (highlighted ? 1 : 0.28) : 1,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: highlighted ? traceColor : DEFAULT_EDGE_COLOR,
        },
      } as Edge;
    });
  }, [editingEdgeId, editingEdgeValue, edges, applyFlowEdit, traceColor, traceNodeIds]);

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

      setTraceActiveNodeId((previous) => (previous === nodeId ? null : previous));
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
          targetNode.type === 'timerNode')
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
      setTraceActiveNodeId((previous) => (previous === nodeId ? nextNodeId : previous));
      const currentActiveNodeId = useStore.getState().flowActiveNodeId;
      setFlowActiveNodeId(currentActiveNodeId === nodeId ? nextNodeId : currentActiveNodeId);
    },
    [applyFlowEdit, setFlowActiveNodeId],
  );

  const renderedNodes = useMemo(() => {
    return nodes.map((node) => {
      const nodeData = (node.data ?? {}) as AnnotationNodeData;
      return {
        ...node,
        connectable: node.type === 'annotationNode' ? false : node.connectable,
        data: {
          ...nodeData,
          onChange: node.type === 'annotationNode' ? handleAnnotationTextChange : nodeData.onChange,
          onDeleteNode: handleDeleteFlowNode,
          onFlipHorizontal: (nodeId: string) => handleFlipFlowNode(nodeId, 'x'),
          onFlipVertical: (nodeId: string) => handleFlipFlowNode(nodeId, 'y'),
        },
      };
    });
  }, [nodes, handleAnnotationTextChange, handleDeleteFlowNode, handleFlipFlowNode]);

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
        const sourceKey = sourceData.sourceKey ?? '';

        const existingUpstreamSourceIds = currentEdges
          .filter((edge) => edge.target === targetNode.id)
          .map((edge) => edge.source);

        const hasDifferentSourceKey = existingUpstreamSourceIds
          .map((sourceId) => currentNodes.find((node) => node.id === sourceId))
          .filter((node): node is Node => !!node && node.type === 'componentNode')
          .some((node) => {
            const upstreamData = (node.data ?? {}) as ComponentFlowNodeData;
            return (upstreamData.sourceKey ?? '') !== sourceKey;
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
          color: DEFAULT_EDGE_COLOR,
        },
        style: {
          stroke: DEFAULT_EDGE_COLOR,
          strokeWidth: 1.6,
        },
      };

      const nextEdges = addEdge(nextEdge, currentEdges);
      applyFlowEdit('新增流程连线', () => ({
        nodes: nextNodes,
        edges: nextEdges,
      }));
    },
    [applyFlowEdit],
  );

  const isValidConnection = useCallback((params: Edge | Connection) => {
    if (!params.source || !params.target) {
      return true;
    }

    const currentNodes = useStore.getState().flowNodes;
    const sourceNode = currentNodes.find((item) => item.id === params.source);
    const targetNode = currentNodes.find((item) => item.id === params.target);

    if (sourceNode?.type === 'annotationNode' || targetNode?.type === 'annotationNode') {
      return false;
    }

    if (targetNode?.type === 'eventFilterNode') {
      return sourceNode?.type === 'componentNode';
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

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      if (payload.kind === 'component-node') {
        const nodeId = createFlowNodeId('component-node');
        const nextNode: Node = {
          id: nodeId,
          type: 'componentNode',
          position,
          data: {
            label: payload.name || '组件节点',
            componentType: payload.componentType || 'Unknown',
            sourceKey: payload.sourceKey,
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

      setAnnotationMenu({
        visible: true,
        x: event.clientX,
        y: event.clientY,
        flowX: position.x,
        flowY: position.y,
      });
    },
    [screenToFlowPosition],
  );

  const closeAnnotationMenu = useCallback(() => {
    setAnnotationMenu((previous) => ({ ...previous, visible: false }));
  }, []);

  const closeEdgeMenu = useCallback(() => {
    setEdgeMenu((previous) => ({ ...previous, visible: false, edgeId: null }));
  }, []);

  const handleEdgeContextMenu = useCallback(
    (event: React.MouseEvent<Element, MouseEvent> | MouseEvent, edge: Edge) => {
      event.preventDefault();
      event.stopPropagation();

      closeAnnotationMenu();
      setFlowAlertMessage(null);

      setEdgeMenu({
        visible: true,
        x: event.clientX,
        y: event.clientY,
        edgeId: edge.id,
      });
    },
    [closeAnnotationMenu],
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

  return (
    <div
      className="flow-canvas"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <ReactFlow
        nodes={renderedNodes}
        edges={renderedEdges}
        nodeTypes={flowNodeTypes}
        edgeTypes={flowEdgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        isValidConnection={isValidConnection}
        zoomOnDoubleClick={false}
        onNodeClick={(_, node) => {
          handleCancelEdgeAnnotation();
          closeEdgeMenu();
          closeAnnotationMenu();
          setFlowAlertMessage(null);
          setFlowActiveNodeId(node.id);
          if (node.type === 'annotationNode') {
            setTraceActiveNodeId(null);
            return;
          }

          setTraceActiveNodeId(node.id);
        }}
        onPaneClick={() => {
          setTraceActiveNodeId(null);
          setFlowActiveNodeId(null);
          handleCommitEdgeAnnotation();
          closeEdgeMenu();
          closeAnnotationMenu();
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
        onPaneContextMenu={handlePaneContextMenu}
        defaultEdgeOptions={{
          type: 'annotatedEdge',
          animated: false,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: DEFAULT_EDGE_COLOR,
          },
          style: {
            stroke: DEFAULT_EDGE_COLOR,
            strokeWidth: 1.6,
          },
        }}
        fitView
      >
        <MiniMap zoomable pannable />
        <Controls />
        <Background gap={16} size={1} />
      </ReactFlow>

      {annotationMenu.visible ? (
        <div className="flow-context-menu" style={{ left: annotationMenu.x, top: annotationMenu.y }}>
          <button
            className="flow-context-menu__item"
            type="button"
            onClick={handleCreateAnnotationFromMenu}
          >
            新建注释
          </button>
        </div>
      ) : null}

      {edgeMenu.visible ? (
        <div className="flow-context-menu" style={{ left: edgeMenu.x, top: edgeMenu.y }}>
          <button
            className="flow-context-menu__item"
            type="button"
            onClick={handleDeleteEdgeFromMenu}
          >
            删除连线
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
  );
};

const FlowBody: React.FC = () => {
  return (
    <div className="flow-body">
      <div className="flow-body-topbar" />
      <div className="flow-body-content">
        <ReactFlowProvider>
          <FlowCanvas />
        </ReactFlowProvider>
      </div>
    </div>
  );
};

export default FlowBody;
