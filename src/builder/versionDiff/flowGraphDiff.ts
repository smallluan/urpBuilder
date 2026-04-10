import isEqual from 'lodash/isEqual';
import { MarkerType, type Edge, type Node } from '@xyflow/react';

export type FlowItemDiffStatus = 'added' | 'removed' | 'modified' | 'unchanged';

function nodeSig(n: Node): unknown {
  return {
    id: n.id,
    type: n.type,
    position: n.position,
    data: n.data,
    width: n.width,
    height: n.height,
    style: n.style,
  };
}

function edgeSig(e: Edge): unknown {
  return {
    id: e.id,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle,
    targetHandle: e.targetHandle,
    type: e.type,
    label: e.label,
    data: e.data,
    markerEnd: e.markerEnd,
    style: e.style,
  };
}

export function computeFlowDiff(baseNodes: Node[], baseEdges: Edge[], compareNodes: Node[], compareEdges: Edge[]): {
  nodeBase: Map<string, FlowItemDiffStatus>;
  nodeCompare: Map<string, FlowItemDiffStatus>;
  edgeBase: Map<string, FlowItemDiffStatus>;
  edgeCompare: Map<string, FlowItemDiffStatus>;
} {
  const bn = new Map(baseNodes.map((n) => [n.id, n]));
  const cn = new Map(compareNodes.map((n) => [n.id, n]));
  const be = new Map(baseEdges.map((e) => [e.id, e]));
  const ce = new Map(compareEdges.map((e) => [e.id, e]));

  const nodeBase = new Map<string, FlowItemDiffStatus>();
  const nodeCompare = new Map<string, FlowItemDiffStatus>();
  const edgeBase = new Map<string, FlowItemDiffStatus>();
  const edgeCompare = new Map<string, FlowItemDiffStatus>();

  for (const [id, b] of bn) {
    const c = cn.get(id);
    if (!c) {
      nodeBase.set(id, 'removed');
    } else {
      const same = isEqual(nodeSig(b), nodeSig(c));
      const st: FlowItemDiffStatus = same ? 'unchanged' : 'modified';
      nodeBase.set(id, st);
      nodeCompare.set(id, st);
    }
  }
  for (const [id] of cn) {
    if (!bn.has(id)) {
      nodeCompare.set(id, 'added');
    }
  }

  for (const [id, b] of be) {
    const c = ce.get(id);
    if (!c) {
      edgeBase.set(id, 'removed');
    } else {
      const same = isEqual(edgeSig(b), edgeSig(c));
      const st: FlowItemDiffStatus = same ? 'unchanged' : 'modified';
      edgeBase.set(id, st);
      edgeCompare.set(id, st);
    }
  }
  for (const [id] of ce) {
    if (!be.has(id)) {
      edgeCompare.set(id, 'added');
    }
  }

  return { nodeBase, nodeCompare, edgeBase, edgeCompare };
}

const edgeStrokeFor = (st: FlowItemDiffStatus | undefined, role: 'base' | 'compare'): string | undefined => {
  if (!st || st === 'unchanged') {
    return undefined;
  }
  if (role === 'base') {
    if (st === 'removed') {
      return '#d54941';
    }
    if (st === 'modified') {
      return '#0052d9';
    }
    return undefined;
  }
  if (st === 'added') {
    return '#2ba471';
  }
  if (st === 'modified') {
    return '#0052d9';
  }
  return undefined;
};

export function applyEdgeDiffStyles(edges: Edge[], statusMap: Map<string, FlowItemDiffStatus>, role: 'base' | 'compare'): Edge[] {
  return edges.map((e) => {
    const st = statusMap.get(e.id);
    const stroke = edgeStrokeFor(st, role);
    const merged = { ...(e.style ?? {}) } as Record<string, unknown>;
    if (stroke) {
      merged.stroke = stroke;
      merged.strokeWidth = 2;
    } else if (merged.stroke == null) {
      /* 对比页未挂 .flow-canvas 时仍保证连线可见；与 .flow-canvas .react-flow__edge-path 一致 */
      merged.stroke = 'var(--builder-flow-edge, #8b8e99)';
      merged.strokeWidth = merged.strokeWidth ?? 1.6;
    }
    return {
      ...e,
      type: 'annotatedEdge',
      markerEnd: e.markerEnd ?? { type: MarkerType.ArrowClosed },
      data: { ...(e.data ?? {}), __suppressFlowActions: true },
      style: merged,
    };
  });
}

export function applyFlowDiffStyles(
  nodes: Node[],
  statusMap: Map<string, FlowItemDiffStatus>,
  role: 'base' | 'compare',
): Node[] {
  const color = (s: FlowItemDiffStatus | undefined): string | undefined => {
    if (!s || s === 'unchanged') {
      return undefined;
    }
    if (role === 'base') {
      if (s === 'removed') {
        return '#d54941';
      }
      if (s === 'modified') {
        return '#0052d9';
      }
      return undefined;
    }
    if (s === 'added') {
      return '#2ba471';
    }
    if (s === 'modified') {
      return '#0052d9';
    }
    return undefined;
  };

  return nodes.map((n) => {
    const st = statusMap.get(n.id);
    const c = color(st);
    if (!c) {
      return n;
    }
    return {
      ...n,
      style: {
        ...(n.style ?? {}),
        border: `2px solid ${c}`,
        borderRadius: 8,
      },
      data: {
        ...(n.data ?? {}),
        __suppressFlowActions: true,
        __diffStatus: st,
      },
    };
  });
}
