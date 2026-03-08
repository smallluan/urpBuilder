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
  type EdgeChange,
  type NodeChange,
  type Connection,
  type Edge,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { flowNodeTypes } from './nodes';
import { useCreateComponentStore } from './store';

const FLOW_DRAG_DATA_KEY = 'drag-component-data';

interface FlowComponentDragPayload {
  kind?: string;
  name?: string;
  componentType?: string;
  sourceKey?: string;
  lifetimes?: string[];
  nodeType?: string;
  label?: string;
}

interface ComponentNodeData {
  label?: string;
  componentType?: string;
  sourceKey?: string;
  lifetimes?: string[];
}

interface EventFilterNodeData {
  label?: string;
  upstreamNodeId?: string;
  upstreamLabel?: string;
  availableLifetimes?: string[];
  selectedLifetimes?: string[];
}

interface AnnotationNodeData {
  text?: string;
  onChange?: (nodeId: string, text: string) => void;
  flipX?: boolean;
  flipY?: boolean;
  onDeleteNode?: (nodeId: string) => void;
  onFlipHorizontal?: (nodeId: string) => void;
  onFlipVertical?: (nodeId: string) => void;
}

const DEFAULT_EDGE_COLOR = '#9aa5b5';
const COMPONENT_TRACE_COLOR = '#0052d9';
const EVENT_FILTER_TRACE_COLOR = '#2ba471';
const CODE_TRACE_COLOR = '#6f5af0';

const createFlowNodeId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.round(Math.random() * 1000)}`;

const createFlowEdgeId = (source: string, target: string) =>
  `edge-${source}-${target}-${Date.now()}-${Math.round(Math.random() * 1000)}`;

const FlowCanvas: React.FC = () => {
  const nodes = useCreateComponentStore((state) => state.flowNodes);
  const edges = useCreateComponentStore((state) => state.flowEdges);
  const setFlowNodes = useCreateComponentStore((state) => state.setFlowNodes);
  const setFlowEdges = useCreateComponentStore((state) => state.setFlowEdges);
  const [traceActiveNodeId, setTraceActiveNodeId] = useState<string | null>(null);
  const [flowAlertMessage, setFlowAlertMessage] = useState<string | null>(null);
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
  const { screenToFlowPosition } = useReactFlow();

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

      setFlowNodes((previous) => [...previous, nextNode]);
    },
    [setFlowNodes],
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
      const activeSourceKey = (activeNode.data as ComponentNodeData | undefined)?.sourceKey;
      if (activeSourceKey) {
        nodes.forEach((item) => {
          if (item.type !== 'componentNode') {
            return;
          }

          const sourceKey = (item.data as ComponentNodeData | undefined)?.sourceKey;
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
      const highlighted =
        traceNodeIds.size > 0 && traceNodeIds.has(edge.source) && traceNodeIds.has(edge.target);

      return {
        ...edge,
        animated: highlighted,
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
  }, [edges, traceColor, traceNodeIds]);

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
      setFlowNodes((previous) => previous.filter((node) => node.id !== nodeId));
      setFlowEdges((previous) =>
        previous.filter((edge) => edge.source !== nodeId && edge.target !== nodeId),
      );

      setTraceActiveNodeId((previous) => (previous === nodeId ? null : previous));
    },
    [setFlowEdges, setFlowNodes],
  );

  const handleFlipFlowNode = useCallback(
    (nodeId: string, axis: 'x' | 'y') => {
      const { flowNodes: currentNodes, flowEdges: currentEdges } = useCreateComponentStore.getState();
      const targetNode = currentNodes.find((node) => node.id === nodeId);
      if (!targetNode) {
        return;
      }

      if (
        axis === 'y' &&
        (targetNode.type === 'componentNode' ||
          targetNode.type === 'codeNode' ||
          targetNode.type === 'eventFilterNode')
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

      setFlowNodes(nextNodes);
      setFlowEdges(nextEdges);
      setTraceActiveNodeId((previous) => (previous === nodeId ? nextNodeId : previous));
    },
    [setFlowEdges, setFlowNodes],
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

      const currentNodes = useCreateComponentStore.getState().flowNodes;
      const currentEdges = useCreateComponentStore.getState().flowEdges;
      const sourceNode = currentNodes.find((item) => item.id === params.source);
      const targetNode = currentNodes.find((item) => item.id === params.target);

      if (sourceNode?.type === 'componentNode' && targetNode?.type === 'eventFilterNode') {
        const sourceData = (sourceNode.data ?? {}) as ComponentNodeData;
        const sourceKey = sourceData.sourceKey ?? '';

        const existingUpstreamSourceIds = currentEdges
          .filter((edge) => edge.target === targetNode.id)
          .map((edge) => edge.source);

        const hasDifferentSourceKey = existingUpstreamSourceIds
          .map((sourceId) => currentNodes.find((node) => node.id === sourceId))
          .filter((node): node is Node => !!node && node.type === 'componentNode')
          .some((node) => {
            const upstreamData = (node.data ?? {}) as ComponentNodeData;
            return (upstreamData.sourceKey ?? '') !== sourceKey;
          });

        if (hasDifferentSourceKey) {
          setFlowAlertMessage('事件过滤节点仅支持连接同一树节点示例（sourceKey 相同）的组件。');
          return;
        }

        const lifetimes = Array.isArray(sourceData.lifetimes) ? sourceData.lifetimes : [];
        const selectedLifetimes = lifetimes.length === 1 ? [lifetimes[0]] : [];

        const nextNodes = currentNodes.map((item) => {
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

        setFlowNodes(nextNodes);
      }

      const nextEdge: Edge = {
        id: createFlowEdgeId(params.source, params.target),
        source: params.source,
        target: params.target,
        sourceHandle: params.sourceHandle,
        targetHandle: params.targetHandle,
        animated: false,
        type: 'smoothstep',
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: DEFAULT_EDGE_COLOR,
        },
        style: {
          stroke: DEFAULT_EDGE_COLOR,
          strokeWidth: 1.6,
        },
      };

      setFlowEdges((previous) => addEdge(nextEdge, previous));
    },
    [setFlowEdges, setFlowNodes],
  );

  const isValidConnection = useCallback((params: Edge | Connection) => {
    if (!params.source || !params.target) {
      return true;
    }

    const currentNodes = useCreateComponentStore.getState().flowNodes;
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
            lifetimes: Array.isArray(payload.lifetimes) ? payload.lifetimes : [],
          },
        };

        setFlowNodes((previous) => [...previous, nextNode]);
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

        setFlowNodes((previous) => [...previous, nextNode]);
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
            note: '注释信息',
          },
        };

        setFlowNodes((previous) => [...previous, nextNode]);
        return;
      }

    },
    [screenToFlowPosition, setFlowNodes],
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
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        isValidConnection={isValidConnection}
        zoomOnDoubleClick={false}
        onNodeClick={(_, node) => {
          closeAnnotationMenu();
          setFlowAlertMessage(null);
          if (node.type === 'annotationNode') {
            setTraceActiveNodeId(null);
            return;
          }

          setTraceActiveNodeId(node.id);
        }}
        onPaneClick={() => {
          setTraceActiveNodeId(null);
          closeAnnotationMenu();
          setFlowAlertMessage(null);
        }}
        onPaneContextMenu={handlePaneContextMenu}
        defaultEdgeOptions={{
          type: 'smoothstep',
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
