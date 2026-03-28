import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  useReactFlow,
  MarkerType,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { flowNodeTypes } from '../../../builder/flow/nodes';
import AnnotatedEdge, { type AnnotatedEdgeData } from '../../../builder/flow/edges/AnnotatedEdge';
import { useDebugStore } from './debugStore';

const flowEdgeTypes = { annotatedEdge: AnnotatedEdge };

const DEFAULT_EDGE_COLOR = '#9aa5b5';
const TRACE_BY_NODE_TYPE: Record<string, string> = {
  componentNode: '#0052d9',
  eventFilterNode: '#2ba471',
  codeNode: '#6f5af0',
  networkRequestNode: '#eb6f0a',
  timerNode: '#0f766e',
  propExposeNode: '#2f7cf6',
  lifecycleExposeNode: '#7b61ff',
};

const traceColorForType = (type: string | undefined) => TRACE_BY_NODE_TYPE[type ?? ''] ?? '#0052d9';

interface DebugFlowTabProps {
  flowNodes: Node[];
  flowEdges: Edge[];
}

const DebugFlowCanvas: React.FC<DebugFlowTabProps> = ({ flowNodes, flowEdges }) => {
  const [searchText, setSearchText] = useState('');
  const [matchedNodeId, setMatchedNodeId] = useState<string | null>(null);
  const reactFlowInstance = useReactFlow();
  const hasInitialFitRef = useRef(false);

  const breakpoints = useDebugStore((s) => s.breakpoints);
  const paused = useDebugStore((s) => s.paused);
  const pausedAtNodeId = useDebugStore((s) => s.pausedAtNodeId);
  const propagationOriginNodeId = useDebugStore((s) => s.propagationOriginNodeId);
  const traceEntries = useDebugStore((s) => s.traceEntries);
  const reachableNodeIds = useDebugStore((s) => s.reachableNodeIds);
  const stepHighlightEdgeIds = useDebugStore((s) => s.stepHighlightEdgeIds);
  const toggleBreakpoint = useDebugStore((s) => s.toggleBreakpoint);

  const collectivelyVisibleNodeIds = useMemo(() => {
    const s = new Set<string>();
    if (propagationOriginNodeId) s.add(propagationOriginNodeId);
    for (const e of traceEntries) s.add(e.nodeId);
    if (pausedAtNodeId) s.add(pausedAtNodeId);
    for (const id of reachableNodeIds) s.add(id);
    return s;
  }, [propagationOriginNodeId, traceEntries, pausedAtNodeId, reachableNodeIds]);

  const flowSignature = useMemo(
    () => `${flowNodes.map((n) => n.id).join('|')}::${flowEdges.map((e) => e.id).join('|')}`,
    [flowNodes, flowEdges],
  );

  useEffect(() => {
    hasInitialFitRef.current = false;
  }, [flowSignature]);

  useEffect(() => {
    if (flowNodes.length === 0) return;
    const t = window.requestAnimationFrame(() => {
      reactFlowInstance.fitView({ padding: 0.18, duration: hasInitialFitRef.current ? 220 : 0 });
      hasInitialFitRef.current = true;
    });
    return () => window.cancelAnimationFrame(t);
  }, [flowSignature, flowNodes.length, reactFlowInstance]);

  useEffect(() => {
    if (!paused || !pausedAtNodeId) return;
    const id = pausedAtNodeId;
    let raf1 = 0;
    let raf2 = 0;
    raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(() => {
        try {
          reactFlowInstance.fitView({
            nodes: [{ id }],
            padding: 0.48,
            duration: 320,
            maxZoom: 1.4,
            minZoom: 0.12,
          });
        } catch {
          const n = flowNodes.find((x) => x.id === id);
          if (n) {
            reactFlowInstance.setCenter(
              (n.position?.x ?? 0) + 95,
              (n.position?.y ?? 0) + 40,
              { zoom: 1.15, duration: 300 },
            );
          }
        }
      });
    });
    return () => {
      window.cancelAnimationFrame(raf1);
      window.cancelAnimationFrame(raf2);
    };
  }, [paused, pausedAtNodeId, flowNodes, reactFlowInstance]);

  const pausedNodeType = useMemo(() => {
    if (!pausedAtNodeId) return undefined;
    return flowNodes.find((n) => n.id === pausedAtNodeId)?.type;
  }, [flowNodes, pausedAtNodeId]);

  const traceColor = traceColorForType(pausedNodeType);

  const styledNodes = useMemo(() => {
    return flowNodes.map((node) => {
      const hasBreakpoint = breakpoints.has(node.id);
      const isPausedAt = paused && pausedAtNodeId === node.id;
      const isDimmed =
        paused &&
        collectivelyVisibleNodeIds.size > 0 &&
        !collectivelyVisibleNodeIds.has(node.id);
      const isMatched = matchedNodeId === node.id;

      const classNames: string[] = [];
      if (hasBreakpoint) classNames.push('debug-flow-node--breakpoint');
      if (isPausedAt) classNames.push('debug-flow-node--paused');
      if (isDimmed) classNames.push('debug-flow-node--dimmed');

      return {
        ...node,
        data: { ...(node.data ?? {}), __suppressFlowActions: true },
        className: [node.className ?? '', ...classNames].filter(Boolean).join(' '),
        style: {
          ...(node.style ?? {}),
          ...(isMatched && !isPausedAt ? { boxShadow: '0 0 0 3px #dcdcaa, 0 0 12px rgba(220, 220, 170, 0.45)' } : {}),
        },
        draggable: false,
        connectable: false,
        selectable: true,
      };
    });
  }, [flowNodes, breakpoints, paused, pausedAtNodeId, collectivelyVisibleNodeIds, matchedNodeId]);

  const styledEdges = useMemo(() => {
    const dimUnreachableWhilePaused = paused && collectivelyVisibleNodeIds.size > 0;

    return flowEdges.map((edge) => {
      const edgeData = (edge.data ?? {}) as AnnotatedEdgeData;
      const isStepEdge = stepHighlightEdgeIds.has(edge.id);
      const sourceVisible = collectivelyVisibleNodeIds.has(edge.source);
      const targetVisible = collectivelyVisibleNodeIds.has(edge.target);
      const edgeTouchesUnreachable =
        dimUnreachableWhilePaused && (!sourceVisible || !targetVisible);

      const highlighted = isStepEdge;
      const baseStyle = (edge.style ?? {}) as Record<string, unknown>;

      return {
        ...edge,
        type: 'annotatedEdge',
        animated: highlighted,
        data: {
          ...edgeData,
          annotation: typeof edgeData.annotation === 'string' ? edgeData.annotation : '',
          isEditing: false,
        } as AnnotatedEdgeData,
        style: {
          ...baseStyle,
          stroke: highlighted ? traceColor : DEFAULT_EDGE_COLOR,
          strokeWidth: highlighted ? 2 : 1.6,
          strokeDasharray: highlighted ? '6 4' : undefined,
          opacity: dimUnreachableWhilePaused ? (edgeTouchesUnreachable ? 0.28 : 1) : 1,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: highlighted ? traceColor : DEFAULT_EDGE_COLOR,
        },
      } as Edge;
    });
  }, [flowEdges, paused, collectivelyVisibleNodeIds, stepHighlightEdgeIds, traceColor]);

  const handleSearch = useCallback(() => {
    const text = searchText.trim().toLowerCase();
    if (!text) {
      setMatchedNodeId(null);
      return;
    }

    const found = flowNodes.find((n) => {
      const data = (n.data ?? {}) as Record<string, unknown>;
      const label = String(data.label ?? '').toLowerCase();
      const id = n.id.toLowerCase();
      const type = String(n.type ?? '').toLowerCase();
      return label.includes(text) || id.includes(text) || type.includes(text);
    });

    if (found) {
      setMatchedNodeId(found.id);
      window.requestAnimationFrame(() => {
        try {
          reactFlowInstance.fitView({
            nodes: [{ id: found.id }],
            padding: 0.45,
            duration: 380,
            maxZoom: 1.35,
            minZoom: 0.15,
          });
        } catch {
          reactFlowInstance.setCenter(
            (found.position?.x ?? 0) + 95,
            (found.position?.y ?? 0) + 40,
            { zoom: 1.15, duration: 350 },
          );
        }
      });
    } else {
      setMatchedNodeId(null);
    }
  }, [searchText, flowNodes, reactFlowInstance]);

  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  }, [handleSearch]);

  const handleNodeContextMenu = useCallback((e: React.MouseEvent, node: Node) => {
    e.preventDefault();
    toggleBreakpoint(node.id);
  }, [toggleBreakpoint]);

  const lastClickRef = useRef<{ nodeId: string; time: number } | null>(null);
  const handleNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    const now = Date.now();
    const last = lastClickRef.current;
    if (last && last.nodeId === node.id && now - last.time < 350) {
      toggleBreakpoint(node.id);
      lastClickRef.current = null;
    } else {
      lastClickRef.current = { nodeId: node.id, time: now };
    }
  }, [toggleBreakpoint]);

  return (
    <div className="debug-flow-tab">
      <div className="debug-flow-tab__toolbar">
        <input
          type="text"
          className="debug-flow-tab__search"
          placeholder="搜索节点（名称 / ID / 类型），按 Enter 定位"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          onKeyDown={handleSearchKeyDown}
        />
        <span className="debug-flow-tab__hint">双击或右键节点切换断点 · 连线样式与搭建器一致</span>
      </div>
      <div className="debug-flow-tab__canvas">
        <div className="flow-canvas debug-flow-tab__canvas-shell">
          <ReactFlow
            nodes={styledNodes}
            edges={styledEdges}
            nodeTypes={flowNodeTypes}
            edgeTypes={flowEdgeTypes}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable
            minZoom={0.08}
            maxZoom={2}
            proOptions={{ hideAttribution: true }}
            onNodeContextMenu={handleNodeContextMenu}
            onNodeClick={handleNodeClick}
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
          >
            <Background gap={16} size={1} />
            <Controls showInteractive={false} />
            <MiniMap
              pannable
              zoomable
              style={{ background: '#f1f5f9' }}
              maskColor="rgba(15, 23, 42, 0.12)"
            />
          </ReactFlow>
        </div>
      </div>
    </div>
  );
};

const DebugFlowTab: React.FC<DebugFlowTabProps> = (props) => (
  <ReactFlowProvider>
    <DebugFlowCanvas {...props} />
  </ReactFlowProvider>
);

export default DebugFlowTab;
