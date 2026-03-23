import type { Edge, Node } from '@xyflow/react';
import { buildAdjacency } from './graphAnalyze';

export type AutoLayoutDirection = 'LR' | 'TB';

export interface AutoLayoutOptions {
  direction?: AutoLayoutDirection;
  gapX?: number;
  gapY?: number;
  originX?: number;
  originY?: number;
  lockedNodeIds?: Set<string>;
}

type NodeId = string;

const CROSS_COMPONENT_GAP = 200;
const SWEEP_PASSES = 6;

const getSecondaryAxis = (node: Node, direction: AutoLayoutDirection) =>
  direction === 'LR' ? node.position.y : node.position.x;

const buildUndirectedAdjacency = (nodeIds: Set<NodeId>, outgoing: Map<NodeId, NodeId[]>, incoming: Map<NodeId, NodeId[]>) => {
  const undirected = new Map<NodeId, Set<NodeId>>();
  nodeIds.forEach((id) => undirected.set(id, new Set<NodeId>()));

  nodeIds.forEach((id) => {
    const neighbors = [...(outgoing.get(id) ?? []), ...(incoming.get(id) ?? [])];
    neighbors.forEach((neighborId) => {
      if (!nodeIds.has(neighborId)) {
        return;
      }
      undirected.get(id)?.add(neighborId);
      undirected.get(neighborId)?.add(id);
    });
  });

  return undirected;
};

const collectConnectedComponents = (
  nodeIds: Set<NodeId>,
  outgoing: Map<NodeId, NodeId[]>,
  incoming: Map<NodeId, NodeId[]>,
) => {
  const undirected = buildUndirectedAdjacency(nodeIds, outgoing, incoming);
  const visited = new Set<NodeId>();
  const components: NodeId[][] = [];

  nodeIds.forEach((startId) => {
    if (visited.has(startId)) {
      return;
    }
    const queue: NodeId[] = [startId];
    visited.add(startId);
    const component: NodeId[] = [];

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) {
        continue;
      }
      component.push(current);
      (undirected.get(current) ?? new Set<NodeId>()).forEach((neighborId) => {
        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          queue.push(neighborId);
        }
      });
    }

    components.push(component);
  });

  return components;
};

const computeLayersInComponent = (
  componentNodeIds: NodeId[],
  outgoing: Map<NodeId, NodeId[]>,
  incoming: Map<NodeId, NodeId[]>,
  previousPositionMap: Map<NodeId, Node['position']>,
  direction: AutoLayoutDirection,
) => {
  const idSet = new Set(componentNodeIds);
  const indegree = new Map<NodeId, number>();
  componentNodeIds.forEach((id) => {
    const value = (incoming.get(id) ?? []).filter((parentId) => idSet.has(parentId)).length;
    indegree.set(id, value);
  });

  const queue = componentNodeIds
    .filter((id) => (indegree.get(id) ?? 0) === 0)
    .sort((a, b) => {
      const pa = previousPositionMap.get(a);
      const pb = previousPositionMap.get(b);
      const axisA = pa ? (direction === 'LR' ? pa.y : pa.x) : 0;
      const axisB = pb ? (direction === 'LR' ? pb.y : pb.x) : 0;
      if (axisA !== axisB) {
        return axisA - axisB;
      }
      return a.localeCompare(b);
    });

  const layer = new Map<NodeId, number>();
  queue.forEach((id) => layer.set(id, 0));
  const visited = new Set<NodeId>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || visited.has(current)) {
      continue;
    }
    visited.add(current);
    const currentLayer = layer.get(current) ?? 0;

    (outgoing.get(current) ?? []).forEach((nextId) => {
      if (!idSet.has(nextId)) {
        return;
      }
      const nextLayer = Math.max(layer.get(nextId) ?? 0, currentLayer + 1);
      layer.set(nextId, nextLayer);
      indegree.set(nextId, Math.max(0, (indegree.get(nextId) ?? 0) - 1));
      if ((indegree.get(nextId) ?? 0) === 0) {
        queue.push(nextId);
      }
    });
  }

  // 循环图兜底：残留节点按原位置排序并补到后续层，避免全部挤到同一列/行
  const unresolved = componentNodeIds.filter((id) => !layer.has(id));
  if (unresolved.length > 0) {
    const maxLayer = Math.max(0, ...Array.from(layer.values()));
    unresolved
      .sort((a, b) => {
        const pa = previousPositionMap.get(a);
        const pb = previousPositionMap.get(b);
        const axisA = pa ? getSecondaryAxis({ id: a, position: pa } as Node, direction) : 0;
        const axisB = pb ? getSecondaryAxis({ id: b, position: pb } as Node, direction) : 0;
        if (axisA !== axisB) {
          return axisA - axisB;
        }
        return a.localeCompare(b);
      })
      .forEach((id, index) => {
        layer.set(id, maxLayer + 1 + Math.floor(index / 3));
      });
  }

  return layer;
};

const buildLayerBuckets = (componentNodeIds: NodeId[], layerMap: Map<NodeId, number>) => {
  const buckets = new Map<number, NodeId[]>();
  componentNodeIds.forEach((id) => {
    const layer = layerMap.get(id) ?? 0;
    const list = buckets.get(layer) ?? [];
    list.push(id);
    buckets.set(layer, list);
  });
  return buckets;
};

const average = (values: number[]) => {
  if (values.length === 0) {
    return Number.NaN;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const optimizeLayerOrdering = (
  sortedLayers: number[],
  buckets: Map<number, NodeId[]>,
  layerMap: Map<NodeId, number>,
  outgoing: Map<NodeId, NodeId[]>,
  incoming: Map<NodeId, NodeId[]>,
  previousPositionMap: Map<NodeId, Node['position']>,
  direction: AutoLayoutDirection,
) => {
  const nodeOrder = new Map<NodeId, number>();

  sortedLayers.forEach((layer) => {
    const ids = buckets.get(layer) ?? [];
    ids.sort((a, b) => {
      const pa = previousPositionMap.get(a);
      const pb = previousPositionMap.get(b);
      const axisA = pa ? (direction === 'LR' ? pa.y : pa.x) : 0;
      const axisB = pb ? (direction === 'LR' ? pb.y : pb.x) : 0;
      if (axisA !== axisB) {
        return axisA - axisB;
      }
      return a.localeCompare(b);
    });
    ids.forEach((id, index) => nodeOrder.set(id, index));
    buckets.set(layer, ids);
  });

  const getScore = (id: NodeId, neighborIds: NodeId[]) => {
    const values = neighborIds
      .map((neighborId) => nodeOrder.get(neighborId))
      .filter((value): value is number => typeof value === 'number');
    const score = average(values);
    if (!Number.isNaN(score)) {
      return score;
    }
    const previous = previousPositionMap.get(id);
    return previous ? (direction === 'LR' ? previous.y : previous.x) : 0;
  };

  const sortLayerWithScores = (layer: number, scoreGetter: (id: NodeId) => number) => {
    const ids = [...(buckets.get(layer) ?? [])];
    ids.sort((a, b) => {
      const scoreA = scoreGetter(a);
      const scoreB = scoreGetter(b);
      if (scoreA !== scoreB) {
        return scoreA - scoreB;
      }
      const orderA = nodeOrder.get(a) ?? 0;
      const orderB = nodeOrder.get(b) ?? 0;
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      return a.localeCompare(b);
    });
    buckets.set(layer, ids);
    ids.forEach((id, index) => nodeOrder.set(id, index));
  };

  for (let pass = 0; pass < SWEEP_PASSES; pass += 1) {
    // top-down: 让子节点靠近父节点重心，减少前向连线交叉
    for (let i = 1; i < sortedLayers.length; i += 1) {
      const layer = sortedLayers[i];
      sortLayerWithScores(layer, (id) => {
        const upstreamIds = (incoming.get(id) ?? []).filter((parentId) => (layerMap.get(parentId) ?? 0) < layer);
        return getScore(id, upstreamIds);
      });
    }

    // bottom-up: 让父节点靠近子节点重心，减少反向穿插
    for (let i = sortedLayers.length - 2; i >= 0; i -= 1) {
      const layer = sortedLayers[i];
      sortLayerWithScores(layer, (id) => {
        const downstreamIds = (outgoing.get(id) ?? []).filter((childId) => (layerMap.get(childId) ?? 0) > layer);
        return getScore(id, downstreamIds);
      });
    }
  }
};

export const autoLayoutNodes = (
  nodes: Node[],
  edges: Edge[],
  options?: AutoLayoutOptions,
): Node[] => {
  if (nodes.length <= 1) {
    return nodes;
  }

  const direction = options?.direction ?? 'LR';
  const gapX = options?.gapX ?? 260;
  const gapY = options?.gapY ?? 130;
  const originX = options?.originX ?? 80;
  const originY = options?.originY ?? 80;
  const lockedNodeIds = options?.lockedNodeIds ?? new Set<string>();
  const previousPositionMap = new Map(nodes.map((node) => [node.id, node.position]));

  const { outgoing, incoming } = buildAdjacency(nodes, edges);
  const nextPositionMap = new Map<string, { x: number; y: number }>();
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const nodeIds = new Set(nodes.map((node) => node.id));
  const components = collectConnectedComponents(nodeIds, outgoing, incoming);

  components.sort((a, b) => {
    const anchorA = Math.min(...a.map((id) => {
      const node = nodeMap.get(id);
      return node ? getSecondaryAxis(node, direction) : 0;
    }));
    const anchorB = Math.min(...b.map((id) => {
      const node = nodeMap.get(id);
      return node ? getSecondaryAxis(node, direction) : 0;
    }));
    if (anchorA !== anchorB) {
      return anchorA - anchorB;
    }
    return a[0].localeCompare(b[0]);
  });

  let componentOffset = 0;
  components.forEach((componentNodeIds) => {
    const layerMap = computeLayersInComponent(componentNodeIds, outgoing, incoming, previousPositionMap, direction);
    const buckets = buildLayerBuckets(componentNodeIds, layerMap);
    const sortedLayers = Array.from(buckets.keys()).sort((a, b) => a - b);
    optimizeLayerOrdering(
      sortedLayers,
      buckets,
      layerMap,
      outgoing,
      incoming,
      previousPositionMap,
      direction,
    );

    let maxOrder = 0;
    sortedLayers.forEach((layer) => {
      const ids = buckets.get(layer) ?? [];
      maxOrder = Math.max(maxOrder, ids.length - 1);
      ids.forEach((id, orderIndex) => {
        const x = direction === 'LR'
          ? originX + layer * gapX
          : originX + (componentOffset + orderIndex) * gapX;
        const y = direction === 'LR'
          ? originY + (componentOffset + orderIndex) * gapY
          : originY + layer * gapY;
        nextPositionMap.set(id, { x, y });
      });
    });

    componentOffset += maxOrder + 1 + Math.max(1, Math.round(CROSS_COMPONENT_GAP / (direction === 'LR' ? gapY : gapX)));
  });

  return nodes.map((node) => {
    if (lockedNodeIds.has(node.id)) {
      return node;
    }
    const next = nextPositionMap.get(node.id);
    if (!next) {
      return node;
    }
    return {
      ...node,
      position: next,
    };
  });
};
