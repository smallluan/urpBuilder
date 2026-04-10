import React, { useEffect, useMemo, useRef } from 'react';
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  MarkerType,
  type Edge,
  type Node,
  type ReactFlowInstance,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { flowNodeTypes } from '../../builder/flow/nodes';
import AnnotatedEdge from '../../builder/flow/edges/AnnotatedEdge';
import {
  applyFlowDiffStyles,
  applyEdgeDiffStyles,
  computeFlowDiff,
  type FlowItemDiffStatus,
} from '../../builder/versionDiff/flowGraphDiff';
import type { ComparePaneLayout } from './comparePaneLayout';

const edgeTypes = { annotatedEdge: AnnotatedEdge };

function filterEdgesForNodes(edges: Edge[], nodes: Node[]): Edge[] {
  const ids = new Set(nodes.map((n) => n.id));
  return edges.filter((e) => ids.has(e.source) && ids.has(e.target));
}

const FlowFit: React.FC<{ signature: string }> = ({ signature }) => {
  const rf = useReactFlow();
  useEffect(() => {
    const t = window.requestAnimationFrame(() => {
      try {
        rf.fitView({ padding: 0.2, duration: 0 });
      } catch {
        /* ignore */
      }
    });
    return () => window.cancelAnimationFrame(t);
  }, [rf, signature]);
  return null;
};

const FlowCanvas: React.FC<{
  styledNodes: Node[];
  styledEdges: Edge[];
  signature: string;
  peerRfRef: React.MutableRefObject<ReactFlowInstance | null> | null;
  syncLockRef: React.MutableRefObject<boolean>;
  selfRfRef: React.MutableRefObject<ReactFlowInstance | null>;
}> = ({ styledNodes, styledEdges, signature, peerRfRef, syncLockRef, selfRfRef }) => {
  const rf = useReactFlow();

  useEffect(() => {
    selfRfRef.current = rf;
    return () => {
      selfRfRef.current = null;
    };
  }, [rf, selfRfRef]);

  return (
    <>
      <FlowFit signature={signature} />
      <ReactFlow
        nodeTypes={flowNodeTypes}
        edgeTypes={edgeTypes}
        nodes={styledNodes}
        edges={styledEdges}
        fitView
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnScroll
        zoomOnScroll
        zoomOnPinch
        onMove={(_, viewport) => {
          const peer = peerRfRef?.current;
          if (!peer) {
            return;
          }
          if (syncLockRef.current) {
            return;
          }
          syncLockRef.current = true;
          peer.setViewport(viewport);
          queueMicrotask(() => {
            syncLockRef.current = false;
          });
        }}
        defaultEdgeOptions={{
          type: 'annotatedEdge',
          markerEnd: { type: MarkerType.ArrowClosed },
        }}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={16} />
        <Controls showInteractive={false} />
        <MiniMap pannable zoomable />
      </ReactFlow>
    </>
  );
};

const FlowColumn: React.FC<{
  title: string;
  nodes: Node[];
  edges: Edge[];
  nodeStatus: Map<string, FlowItemDiffStatus>;
  edgeStatus: Map<string, FlowItemDiffStatus>;
  role: 'base' | 'compare';
  peerRfRef: React.MutableRefObject<ReactFlowInstance | null> | null;
  syncLockRef: React.MutableRefObject<boolean>;
  selfRfRef: React.MutableRefObject<ReactFlowInstance | null>;
  /** 嵌入单页滚动条内的块 */
  unifiedPane?: boolean;
}> = ({ title, nodes, edges, nodeStatus, edgeStatus, role, peerRfRef, syncLockRef, selfRfRef, unifiedPane }) => {
  const styledNodes = useMemo(
    () => applyFlowDiffStyles(nodes, nodeStatus, role),
    [nodes, nodeStatus, role],
  );
  const styledEdges = useMemo(
    () => applyEdgeDiffStyles(edges, edgeStatus, role),
    [edges, edgeStatus, role],
  );

  const signature = `${styledNodes.map((n) => n.id).join('|')}::${styledEdges.map((e) => e.id).join('|')}`;

  const canvas = (
    <div className={`cv-diff-flow__canvas flow-canvas${unifiedPane ? ' cv-diff-flow__canvas--unified-pane' : ''}`}>
      <ReactFlowProvider>
        <FlowCanvas
          styledNodes={styledNodes}
          styledEdges={styledEdges}
          signature={signature}
          peerRfRef={peerRfRef}
          syncLockRef={syncLockRef}
          selfRfRef={selfRfRef}
        />
      </ReactFlowProvider>
    </div>
  );

  if (unifiedPane) {
    return (
      <div className={`cv-diff-flow__unified-pane cv-diff-flow__unified-pane--${role}`}>
        {title ? <div className="cv-diff-flow__unified-pane-head">{title}</div> : null}
        {canvas}
      </div>
    );
  }

  return (
    <div className="cv-diff-flow__column">
      {title ? <div className="cv-diff-flow__head">{title}</div> : null}
      {canvas}
    </div>
  );
};

type Props = {
  baseNodes: Node[];
  baseEdges: Edge[];
  compareNodes: Node[];
  compareEdges: Edge[];
  paneLayout?: ComparePaneLayout;
};

const VersionDiffFlow: React.FC<Props> = ({
  baseNodes,
  baseEdges,
  compareNodes,
  compareEdges,
  paneLayout = 'unified',
}) => {
  const baseEdgesF = useMemo(() => filterEdgesForNodes(baseEdges, baseNodes), [baseEdges, baseNodes]);
  const compareEdgesF = useMemo(() => filterEdgesForNodes(compareEdges, compareNodes), [compareEdges, compareNodes]);

  const { nodeBase, nodeCompare, edgeBase, edgeCompare } = useMemo(
    () => computeFlowDiff(baseNodes, baseEdgesF, compareNodes, compareEdgesF),
    [baseNodes, baseEdgesF, compareNodes, compareEdgesF],
  );

  const baseRfRef = useRef<ReactFlowInstance | null>(null);
  const compareRfRef = useRef<ReactFlowInstance | null>(null);
  const noPeerRef = useRef<ReactFlowInstance | null>(null);
  const syncLockRef = useRef(false);

  const isDual = paneLayout === 'split' || paneLayout === 'stack';

  return (
    <div className="cv-diff-flow">
      <div className="cv-diff-ui__legend">
        <span>节点/连线：</span>
        <span className="cv-diff-ui__pill cv-diff-ui__pill--removed">删</span>
        <span>删除</span>
        <span className="cv-diff-ui__pill cv-diff-ui__pill--added">新</span>
        <span>新增</span>
        <span className="cv-diff-ui__pill cv-diff-ui__pill--modified">改</span>
        <span>修改</span>
        {isDual ? <span className="cv-diff-ui__legend-sync">· 双栏时平移/缩放同步</span> : null}
        {paneLayout === 'unified' ? (
          <span className="cv-diff-ui__legend-sync">· 单页内上旧下新</span>
        ) : null}
      </div>
      <div className={`cv-diff-flow__split cv-diff-flow__split--${paneLayout}`}>
        {paneLayout === 'unified' ? (
          <div className="cv-diff-flow__unified-scroll">
            <FlowColumn
              unifiedPane
              title="旧版（Base）流程"
              nodes={baseNodes}
              edges={baseEdgesF}
              nodeStatus={nodeBase}
              edgeStatus={edgeBase}
              role="base"
              selfRfRef={baseRfRef}
              peerRfRef={noPeerRef}
              syncLockRef={syncLockRef}
            />
            <div className="cv-diff-flow__unified-sep" role="separator" aria-hidden />
            <FlowColumn
              unifiedPane
              title="新版（Compare）流程"
              nodes={compareNodes}
              edges={compareEdgesF}
              nodeStatus={nodeCompare}
              edgeStatus={edgeCompare}
              role="compare"
              selfRfRef={compareRfRef}
              peerRfRef={noPeerRef}
              syncLockRef={syncLockRef}
            />
          </div>
        ) : null}
        {isDual ? (
          <>
            <FlowColumn
              title="Base 流程"
              nodes={baseNodes}
              edges={baseEdgesF}
              nodeStatus={nodeBase}
              edgeStatus={edgeBase}
              role="base"
              selfRfRef={baseRfRef}
              peerRfRef={compareRfRef}
              syncLockRef={syncLockRef}
            />
            <FlowColumn
              title="Compare 流程"
              nodes={compareNodes}
              edges={compareEdgesF}
              nodeStatus={nodeCompare}
              edgeStatus={edgeCompare}
              role="compare"
              selfRfRef={compareRfRef}
              peerRfRef={baseRfRef}
              syncLockRef={syncLockRef}
            />
          </>
        ) : null}
      </div>
    </div>
  );
};

export default React.memo(VersionDiffFlow);
