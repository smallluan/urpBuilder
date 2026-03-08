import React, { useCallback } from 'react';
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
}

const FlowCanvas: React.FC = () => {
  const nodes = useCreateComponentStore((state) => state.flowNodes);
  const edges = useCreateComponentStore((state) => state.flowEdges);
  const setFlowNodes = useCreateComponentStore((state) => state.setFlowNodes);
  const setFlowEdges = useCreateComponentStore((state) => state.setFlowEdges);
  const { screenToFlowPosition } = useReactFlow();

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
      const sourceNode = currentNodes.find((item) => item.id === params.source);
      const targetNode = currentNodes.find((item) => item.id === params.target);

      if (sourceNode?.type === 'componentNode' && targetNode?.type === 'eventFilterNode') {
        const sourceData = (sourceNode.data ?? {}) as ComponentNodeData;
        const lifetimes = Array.isArray(sourceData.lifetimes) ? sourceData.lifetimes : [];

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
            },
          };
        });

        setFlowNodes(nextNodes);
      }

      const nextEdge: Edge = {
        id: `edge-${params.source}-${params.target}-${Date.now()}-${Math.round(Math.random() * 1000)}`,
        source: params.source,
        target: params.target,
        sourceHandle: params.sourceHandle,
        targetHandle: params.targetHandle,
        animated: true,
        type: 'smoothstep',
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: '#4b5563',
        },
        style: {
          stroke: '#4b5563',
          strokeWidth: 1.6,
        },
      };

      setFlowEdges((previous) => addEdge(nextEdge, previous));
    },
    [setFlowEdges, setFlowNodes],
  );

  const isValidConnection = useCallback(
    (params: Edge | Connection) => {
      const sourceNode = nodes.find((item) => item.id === params.source);
      const targetNode = nodes.find((item) => item.id === params.target);

      if (targetNode?.type === 'eventFilterNode') {
        return sourceNode?.type === 'componentNode';
      }

      return true;
    },
    [nodes],
  );

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
        const nodeId = `component-node-${Date.now()}-${Math.round(Math.random() * 1000)}`;
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
        const nodeId = `event-filter-node-${Date.now()}-${Math.round(Math.random() * 1000)}`;
        const nextNode: Node = {
          id: nodeId,
          type: 'eventFilterNode',
          position,
          data: {
            label: payload.label || '事件过滤节点',
            availableLifetimes: [],
          },
        };

        setFlowNodes((previous) => [...previous, nextNode]);
      }
    },
    [screenToFlowPosition, setFlowNodes],
  );

  return (
    <div className="flow-canvas" onDragOver={handleDragOver} onDrop={handleDrop}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={flowNodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        isValidConnection={isValidConnection}
        defaultEdgeOptions={{
          type: 'smoothstep',
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#4b5563',
          },
          style: {
            stroke: '#4b5563',
            strokeWidth: 1.6,
          },
        }}
        fitView
      >
        <MiniMap zoomable pannable />
        <Controls />
        <Background gap={16} size={1} />
      </ReactFlow>
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
