import type { Edge, Node } from '@xyflow/react';

const nextId = (prefix: string) => `${prefix}-${Date.now()}-${Math.round(Math.random() * 1000)}`;

const nodeTypeToPrefix = (type: string | undefined): string => {
  switch (type) {
    case 'annotationNode':
      return 'annotation-node';
    case 'componentNode':
      return 'component-node';
    case 'eventFilterNode':
      return 'event-filter-node';
    case 'codeNode':
      return 'code-node';
    case 'networkRequestNode':
      return 'network-request-node';
    case 'timerNode':
      return 'timer-node';
    case 'propExposeNode':
      return 'prop-expose-node';
    case 'lifecycleExposeNode':
      return 'lifecycle-expose-node';
    default:
      return 'flow-node';
  }
};

/** 无测量尺寸时的占位宽高（与流程节点大致体量一致即可，用于算粘贴对齐中心） */
function defaultNodeSize(type: string | undefined): { w: number; h: number } {
  switch (type) {
    case 'annotationNode':
      return { w: 200, h: 56 };
    case 'eventFilterNode':
    case 'codeNode':
    case 'networkRequestNode':
    case 'timerNode':
      return { w: 220, h: 72 };
    case 'propExposeNode':
    case 'lifecycleExposeNode':
      return { w: 240, h: 88 };
    case 'componentNode':
    default:
      return { w: 280, h: 96 };
  }
}

function computeSubgraphCenter(nodes: Node[]): { x: number; y: number } {
  if (nodes.length === 0) {
    return { x: 0, y: 0 };
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const n of nodes) {
    const { w, h } = defaultNodeSize(n.type);
    const mw = typeof n.width === 'number' && n.width > 0 ? n.width : w;
    const mh = typeof n.height === 'number' && n.height > 0 ? n.height : h;
    const x1 = n.position.x;
    const y1 = n.position.y;
    const x2 = x1 + mw;
    const y2 = y1 + mh;
    minX = Math.min(minX, x1);
    minY = Math.min(minY, y1);
    maxX = Math.max(maxX, x2);
    maxY = Math.max(maxY, y2);
  }
  return { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
}

export interface CloneFlowSubgraphPasteOptions {
  /** 将子图包围盒中心对齐到该 flow 坐标 */
  anchorFlow?: { x: number; y: number };
  /** 相对原位置的平移（与 anchorFlow 二选一，anchor 优先） */
  offset?: { x: number; y: number };
  /** 无 anchor 且未传 offset 时的默认平移 */
  fallbackOffset?: { x: number; y: number };
  /** 粘贴后选中新建节点，便于整组拖动 */
  selectPasted?: boolean;
}

/** 复制子图：新 id、整体平移或按锚点对齐、可选选中 */
export function cloneFlowSubgraphWithNewIds(
  nodes: Node[],
  edges: Edge[],
  options: CloneFlowSubgraphPasteOptions = {},
): { nodes: Node[]; edges: Edge[] } {
  const center = computeSubgraphCenter(nodes);
  let dx: number;
  let dy: number;
  if (options.anchorFlow) {
    dx = options.anchorFlow.x - center.x;
    dy = options.anchorFlow.y - center.y;
  } else if (options.offset) {
    dx = options.offset.x;
    dy = options.offset.y;
  } else {
    const fo = options.fallbackOffset ?? { x: 48, y: 48 };
    dx = fo.x;
    dy = fo.y;
  }

  const idMap = new Map<string, string>();
  nodes.forEach((node) => {
    idMap.set(node.id, nextId(nodeTypeToPrefix(node.type)));
  });

  const selected = Boolean(options.selectPasted);
  const newNodes = nodes.map((node) => ({
    ...node,
    id: idMap.get(node.id)!,
    position: { x: node.position.x + dx, y: node.position.y + dy },
    selected,
  }));

  const newEdges = edges.map((edge) => {
    const s = idMap.get(edge.source);
    const t = idMap.get(edge.target);
    if (!s || !t) {
      return edge;
    }
    return {
      ...edge,
      id: nextId('edge'),
      source: s,
      target: t,
      selected: false,
    };
  });

  return { nodes: newNodes, edges: newEdges };
}
