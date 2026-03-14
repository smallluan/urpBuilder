import type { Edge, Node } from '@xyflow/react';
import type { UiTreeNode } from '../store/types';
import type { LifecycleExposeNodeData, PropExposeNodeData } from '../../types/flow';

export interface ComponentExposedProp {
  propKey: string;
  sourceKey: string;
  sourceLabel?: string;
}

export interface ComponentExposedLifecycle {
  lifetime: string;
  sourceNodeId?: string;
  sourceLabel?: string;
}

export interface ComponentContract {
  version: 1;
  exposedProps: ComponentExposedProp[];
  exposedLifecycles: ComponentExposedLifecycle[];
}

const getNodeById = (nodes: Node[], nodeId?: string) => {
  if (!nodeId) {
    return null;
  }

  return nodes.find((node) => node.id === nodeId) ?? null;
};

const dedupeBy = <T>(items: T[], resolver: (item: T) => string): T[] => {
  const map = new Map<string, T>();
  items.forEach((item) => {
    map.set(resolver(item), item);
  });
  return Array.from(map.values());
};

export const buildComponentContract = (
  _uiTreeData: UiTreeNode,
  flowNodes: Node[],
  _flowEdges: Edge[],
): ComponentContract => {
  const exposedProps = flowNodes
    .filter((node) => node.type === 'propExposeNode')
    .flatMap((node) => {
      const data = (node.data ?? {}) as PropExposeNodeData;
      const sourceKey = String(data.sourceKey ?? '').trim();
      const sourceLabel = String(data.sourceLabel ?? '').trim();
      const selectedPropKeys = Array.isArray(data.selectedPropKeys)
        ? data.selectedPropKeys.map((item) => String(item).trim()).filter(Boolean)
        : [];

      if (!sourceKey || selectedPropKeys.length === 0) {
        return [] as ComponentExposedProp[];
      }

      return selectedPropKeys.map((propKey) => ({
        propKey,
        sourceKey,
        sourceLabel: sourceLabel || undefined,
      }));
    });

  const exposedLifecycles = flowNodes
    .filter((node) => node.type === 'lifecycleExposeNode')
    .flatMap((node) => {
      const data = (node.data ?? {}) as LifecycleExposeNodeData;
      const selectedLifetimes = Array.isArray(data.selectedLifetimes)
        ? data.selectedLifetimes.map((item) => String(item).trim()).filter(Boolean)
        : [];

      if (selectedLifetimes.length === 0) {
        return [] as ComponentExposedLifecycle[];
      }

      const upstreamNode = getNodeById(flowNodes, data.upstreamNodeId);
      const upstreamLabel = String(data.upstreamLabel ?? (upstreamNode?.data as { label?: string } | undefined)?.label ?? '').trim();

      return selectedLifetimes.map((lifetime) => ({
        lifetime,
        sourceNodeId: data.upstreamNodeId,
        sourceLabel: upstreamLabel || undefined,
      }));
    });

  return {
    version: 1,
    exposedProps: dedupeBy(exposedProps, (item) => `${item.sourceKey}::${item.propKey}`),
    exposedLifecycles: dedupeBy(exposedLifecycles, (item) => `${item.sourceNodeId || '-'}::${item.lifetime}`),
  };
};
