import type { Edge, Node } from '@xyflow/react';
import type { UiTreeNode } from '../store/types';
import type { LifecycleExposeNodeData, PropExposeNodeData } from '../../types/flow';

export interface ComponentExposedProp {
  // propKey: 来源节点内部属性名（target node 中的属性 key）
  propKey: string;
  // key: 对外唯一标识（实例 props 上的 key / alias）。为兼容历史数据，propKey 也可能同时作为对外名称。
  key?: string;
  /** 属性面板展示名（如「块级元素」）；不填则沿用内部属性 schema 的 name */
  displayName?: string;
  sourceKey: string;
  sourceRef?: string;
  sourceLabel?: string;
}

export interface ComponentExposedLifecycle {
  lifetime: string;
  key?: string;
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

const sanitizeExposeKeyPart = (value: string) => {
  const text = String(value ?? '').trim();
  if (!text) {
    return '';
  }

  return text.replace(/\s+/g, '_').replace(/[^A-Za-z0-9_\-]/g, '_');
};

const ensureUniqueExposeKeys = (items: ComponentExposedProp[]): ComponentExposedProp[] => {
  const used = new Set<string>();

  return items.map((item) => {
    const fallbackBase = sanitizeExposeKeyPart(item.propKey) || 'prop';
    const requested = sanitizeExposeKeyPart(item.key ?? '') || fallbackBase;

    let candidate = requested;
    if (used.has(candidate)) {
      const sourceHint = sanitizeExposeKeyPart(item.sourceLabel || item.sourceKey || 'source') || 'source';
      candidate = `${sourceHint}_${fallbackBase}`;
    }

    let sequence = 2;
    while (used.has(candidate)) {
      candidate = `${requested}_${sequence}`;
      sequence += 1;
    }

    used.add(candidate);
    return {
      ...item,
      key: candidate,
    };
  });
};

const ensureUniqueLifecycleExposeKeys = (items: ComponentExposedLifecycle[]): ComponentExposedLifecycle[] => {
  const used = new Set<string>();

  return items.map((item) => {
    const fallbackBase = sanitizeExposeKeyPart(item.lifetime) || 'lifecycle';
    const requested = sanitizeExposeKeyPart(item.key ?? '') || fallbackBase;

    let candidate = requested;
    if (used.has(candidate)) {
      const sourceHint = sanitizeExposeKeyPart(item.sourceLabel || item.sourceNodeId || 'source') || 'source';
      candidate = `${sourceHint}_${fallbackBase}`;
    }

    let sequence = 2;
    while (used.has(candidate)) {
      candidate = `${requested}_${sequence}`;
      sequence += 1;
    }

    used.add(candidate);
    return {
      ...item,
      key: candidate,
    };
  });
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
      const sourceRef = String(data.sourceRef ?? '').trim();
      const sourceLabel = String(data.sourceLabel ?? '').trim();
      const selectedPropKeys = Array.isArray(data.selectedPropKeys)
        ? data.selectedPropKeys.map((item) => String(item).trim()).filter(Boolean)
        : [];

      const selectedMappings = Array.isArray((data as any).selectedMappings)
        ? (data as any).selectedMappings as Array<{ sourcePropKey?: string; alias?: string; displayName?: string }>
        : [];

      if (!sourceKey || selectedPropKeys.length === 0) {
        return [] as ComponentExposedProp[];
      }

      return selectedPropKeys.map((propKey) => {
        const mapping = selectedMappings.find((m) => String(m?.sourcePropKey ?? '').trim() === propKey);
        const externalKey = mapping && typeof mapping.alias === 'string' && mapping.alias.trim() ? mapping.alias.trim() : propKey;
        const displayName = mapping && typeof mapping.displayName === 'string' && mapping.displayName.trim()
          ? mapping.displayName.trim()
          : undefined;
        return {
          propKey,
          key: externalKey,
          displayName,
          sourceKey,
          sourceRef: sourceRef || undefined,
          sourceLabel: sourceLabel || undefined,
        };
      });
    });

  const exposedLifecycles = flowNodes
    .filter((node) => node.type === 'lifecycleExposeNode')
    .flatMap((node) => {
      const data = (node.data ?? {}) as LifecycleExposeNodeData;
      const selectedMappings = Array.isArray((data as any).selectedMappings)
        ? (data as any).selectedMappings as Array<{ sourceLifetime?: string; alias?: string }>
        : [];

      const selectedLifetimes = selectedMappings.length > 0
        ? selectedMappings
          .map((item) => String(item?.sourceLifetime ?? '').trim())
          .filter(Boolean)
        : (Array.isArray(data.selectedLifetimes)
          ? data.selectedLifetimes.map((item) => String(item).trim()).filter(Boolean)
          : []);

      if (selectedLifetimes.length === 0) {
        return [] as ComponentExposedLifecycle[];
      }

      const upstreamNode = getNodeById(flowNodes, data.upstreamNodeId);
      const upstreamLabel = String(data.upstreamLabel ?? (upstreamNode?.data as { label?: string } | undefined)?.label ?? '').trim();

      return selectedLifetimes.map((lifetime) => {
        const mapping = selectedMappings.find((item) => String(item?.sourceLifetime ?? '').trim() === lifetime);
        const exposeKey = mapping && typeof mapping.alias === 'string' && mapping.alias.trim() ? mapping.alias.trim() : lifetime;
        return {
          lifetime,
          key: exposeKey,
          sourceNodeId: data.upstreamNodeId,
          sourceLabel: upstreamLabel || undefined,
        };
      });
    });

  const uniqueExposedProps = ensureUniqueExposeKeys(
    dedupeBy(exposedProps, (item) => `${item.sourceKey}::${item.propKey}`),
  );

  const uniqueExposedLifecycles = ensureUniqueLifecycleExposeKeys(
    dedupeBy(exposedLifecycles, (item) => `${item.sourceNodeId || '-'}::${item.lifetime}`),
  );

  return {
    version: 1,
    exposedProps: uniqueExposedProps,
    exposedLifecycles: uniqueExposedLifecycles,
  };
};
