import type { Edge, Node } from '@xyflow/react';

export interface GraphAdjacency {
  outgoing: Map<string, string[]>;
  incoming: Map<string, string[]>;
}

export const buildAdjacency = (nodes: Node[], edges: Edge[]): GraphAdjacency => {
  const nodeIds = new Set(nodes.map((node) => node.id));
  const outgoing = new Map<string, string[]>();
  const incoming = new Map<string, string[]>();

  nodeIds.forEach((id) => {
    outgoing.set(id, []);
    incoming.set(id, []);
  });

  edges.forEach((edge) => {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      return;
    }
    outgoing.get(edge.source)?.push(edge.target);
    incoming.get(edge.target)?.push(edge.source);
  });

  return { outgoing, incoming };
};

const canonicalizeCycle = (cycle: string[]): string => {
  if (cycle.length <= 1) {
    return cycle.join('>');
  }
  const normalized = cycle.slice(0, -1);
  let best = normalized;
  for (let i = 1; i < normalized.length; i += 1) {
    const rotated = normalized.slice(i).concat(normalized.slice(0, i));
    if (rotated.join('>') < best.join('>')) {
      best = rotated;
    }
  }
  return best.concat(best[0]).join('>');
};

export const detectCycles = (nodes: Node[], edges: Edge[]): string[][] => {
  const { outgoing } = buildAdjacency(nodes, edges);
  const visited = new Set<string>();
  const inStack = new Set<string>();
  const path: string[] = [];
  const cycleSet = new Set<string>();
  const cycles: string[][] = [];

  const dfs = (nodeId: string) => {
    visited.add(nodeId);
    inStack.add(nodeId);
    path.push(nodeId);

    const neighbors = outgoing.get(nodeId) ?? [];
    neighbors.forEach((nextId) => {
      if (!visited.has(nextId)) {
        dfs(nextId);
        return;
      }
      if (inStack.has(nextId)) {
        const start = path.indexOf(nextId);
        if (start >= 0) {
          const cycle = path.slice(start).concat(nextId);
          const key = canonicalizeCycle(cycle);
          if (!cycleSet.has(key)) {
            cycleSet.add(key);
            cycles.push(cycle);
          }
        }
      }
    });

    path.pop();
    inStack.delete(nodeId);
  };

  nodes.forEach((node) => {
    if (!visited.has(node.id)) {
      dfs(node.id);
    }
  });

  return cycles;
};

export const findIsolatedNodes = (nodes: Node[], edges: Edge[]): Node[] => {
  const { outgoing, incoming } = buildAdjacency(nodes, edges);
  return nodes.filter((node) => {
    const outCount = (outgoing.get(node.id) ?? []).length;
    const inCount = (incoming.get(node.id) ?? []).length;
    return outCount === 0 && inCount === 0;
  });
};

export const collectReachableNodeIds = (
  seedNodeIds: string[],
  adjacency: GraphAdjacency,
): Set<string> => {
  const visited = new Set<string>();
  const queue = [...seedNodeIds];

  while (queue.length > 0) {
    const nodeId = queue.shift();
    if (!nodeId || visited.has(nodeId)) {
      continue;
    }
    visited.add(nodeId);

    const nextIds = [
      ...(adjacency.outgoing.get(nodeId) ?? []),
      ...(adjacency.incoming.get(nodeId) ?? []),
    ];
    nextIds.forEach((nextId) => {
      if (!visited.has(nextId)) {
        queue.push(nextId);
      }
    });
  }

  return visited;
};
