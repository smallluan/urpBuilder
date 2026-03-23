import { MarkerType, type Edge } from '@xyflow/react';

const DEFAULT_EDGE_COLOR = '#9aa5b5';

const toEdgeKey = (edge: Edge) =>
  `${edge.source}::${edge.sourceHandle || ''}=>${edge.target}::${edge.targetHandle || ''}`;

export interface EdgeNormalizeReport {
  dedupedCount: number;
  clearedAnnotationCount: number;
}

export const normalizeEdgesWithReport = (edges: Edge[]): { edges: Edge[]; report: EdgeNormalizeReport } => {
  const keyMap = new Map<string, Edge>();
  const dedupedCount = Math.max(0, edges.length - new Set(edges.map(toEdgeKey)).size);
  let clearedAnnotationCount = 0;

  edges.forEach((edge) => {
    const key = toEdgeKey(edge);
    if (!keyMap.has(key)) {
      keyMap.set(key, edge);
    }
  });

  const normalizedEdges = Array.from(keyMap.values()).map((edge) => {
    const data = (edge.data ?? {}) as Record<string, unknown>;
    const annotation = typeof data.annotation === 'string' ? data.annotation.trim() : '';
    const nextData = annotation ? { ...data, annotation } : (() => {
      if (typeof data.annotation === 'string' && data.annotation.length > 0) {
        clearedAnnotationCount += 1;
      }
      const { annotation: _drop, ...rest } = data;
      return rest;
    })();

    return {
      ...edge,
      data: nextData,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: DEFAULT_EDGE_COLOR,
      },
      style: {
        ...(edge.style ?? {}),
        stroke: DEFAULT_EDGE_COLOR,
        strokeWidth: 1.6,
        strokeDasharray: undefined,
        opacity: 1,
      },
    };
  });

  return {
    edges: normalizedEdges,
    report: {
      dedupedCount,
      clearedAnnotationCount,
    },
  };
};

export const normalizeEdges = (edges: Edge[]): Edge[] => normalizeEdgesWithReport(edges).edges;
