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
  const indegree = new Map<string, number>();
  nodes.forEach((node) => indegree.set(node.id, (incoming.get(node.id) ?? []).length));

  const queue: string[] = nodes
    .map((node) => node.id)
    .filter((id) => (indegree.get(id) ?? 0) === 0);

  if (queue.length === 0 && nodes.length > 0) {
    queue.push(nodes[0].id);
  }

  const layer = new Map<string, number>();
  const visited = new Set<string>();

  while (queue.length > 0) {
    const current = queue.shift() as string;
    if (visited.has(current)) {
      continue;
    }
    visited.add(current);

    const currentLayer = layer.get(current) ?? 0;
    (outgoing.get(current) ?? []).forEach((nextId) => {
      const nextLayer = Math.max(layer.get(nextId) ?? 0, currentLayer + 1);
      layer.set(nextId, nextLayer);
      indegree.set(nextId, Math.max(0, (indegree.get(nextId) ?? 0) - 1));
      if ((indegree.get(nextId) ?? 0) === 0) {
        queue.push(nextId);
      }
    });
  }

  // 容错：对循环图中的残留节点按当前最大层补齐
  const maxLayer = Math.max(0, ...Array.from(layer.values()));
  nodes.forEach((node, index) => {
    if (!layer.has(node.id)) {
      layer.set(node.id, maxLayer + (index % 3));
    }
  });

  const buckets = new Map<number, Node[]>();
  nodes.forEach((node) => {
    const bucket = layer.get(node.id) ?? 0;
    const list = buckets.get(bucket) ?? [];
    list.push(node);
    buckets.set(bucket, list);
  });

  const sortedLayers = Array.from(buckets.keys()).sort((a, b) => a - b);
  const layerOrderMap = new Map<string, number>();

  sortedLayers.forEach((layerIndex) => {
    const layerNodes = buckets.get(layerIndex) ?? [];
    const orderedLayerNodes = [...layerNodes].sort((a, b) => {
      const parentIdsA = incoming.get(a.id) ?? [];
      const parentIdsB = incoming.get(b.id) ?? [];
      const centerA = parentIdsA.length > 0
        ? parentIdsA.reduce((sum, id) => sum + (layerOrderMap.get(id) ?? 0), 0) / parentIdsA.length
        : ((direction === 'LR'
          ? (previousPositionMap.get(a.id)?.y ?? 0)
          : (previousPositionMap.get(a.id)?.x ?? 0)) / Math.max(1, gapY));
      const centerB = parentIdsB.length > 0
        ? parentIdsB.reduce((sum, id) => sum + (layerOrderMap.get(id) ?? 0), 0) / parentIdsB.length
        : ((direction === 'LR'
          ? (previousPositionMap.get(b.id)?.y ?? 0)
          : (previousPositionMap.get(b.id)?.x ?? 0)) / Math.max(1, gapY));

      if (centerA !== centerB) {
        return centerA - centerB;
      }
      return a.id.localeCompare(b.id);
    });

    buckets.set(layerIndex, orderedLayerNodes);
    orderedLayerNodes.forEach((node, rowIndex) => {
      layerOrderMap.set(node.id, rowIndex);
    });
  });

  const nextPositionMap = new Map<string, { x: number; y: number }>();

  sortedLayers.forEach((layerIndex) => {
    const layerNodes = buckets.get(layerIndex) ?? [];
    layerNodes.forEach((node, rowIndex) => {
      const x = direction === 'LR' ? originX + layerIndex * gapX : originX + rowIndex * gapX;
      const y = direction === 'LR' ? originY + rowIndex * gapY : originY + layerIndex * gapY;
      nextPositionMap.set(node.id, { x, y });
    });
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
