import type { Node } from '@xyflow/react';
import type { ComponentFlowNodeData, PropExposeNodeData } from '../../types/flow';

/** 从流程节点 data 解析绑定的 UI 树 sourceKey（若有） */
export const getFlowNodeStructureSourceKey = (node: Node): string | null => {
  if (node.type === 'componentNode') {
    const d = (node.data ?? {}) as ComponentFlowNodeData;
    if (typeof d.sourceKey === 'string' && d.sourceKey.trim()) {
      return d.sourceKey.trim();
    }
  }
  if (node.type === 'propExposeNode') {
    const d = (node.data ?? {}) as PropExposeNodeData;
    if (typeof d.sourceKey === 'string' && d.sourceKey.trim()) {
      return d.sourceKey.trim();
    }
  }
  return null;
};

/** 按 UI 树节点 key 查找第一个绑定的流程节点 id */
export const findFirstFlowNodeIdBySourceKey = (flowNodes: Node[], treeKey: string): string | null => {
  const k = String(treeKey ?? '').trim();
  if (!k) {
    return null;
  }
  for (const n of flowNodes) {
    const sk = getFlowNodeStructureSourceKey(n);
    if (sk === k) {
      return n.id;
    }
  }
  return null;
};
