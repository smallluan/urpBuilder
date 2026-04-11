import type { Edge, Node } from '@xyflow/react';
import type { UiTreeNode } from '../store/types';
import type { CodeNodeData, ComponentFlowNodeData } from '../../types/flow';
import { normalizeDataSourceConfig } from '../../types/dataSource';

const getDataSourceConfigValue = (node: UiTreeNode): unknown => {
  const wrapped = node.props?.dataSourceConfig as { value?: unknown } | undefined;
  return wrapped?.value;
};

/** 是否存在动态列表将本代码节点选为 flowCode 数据源 */
export function isFlowCodeNodeReferencedByDynamicList(uiRoot: UiTreeNode | null | undefined, codeNodeId: string): boolean {
  if (!uiRoot || !codeNodeId) {
    return false;
  }

  const walk = (n: UiTreeNode): boolean => {
    if (n.type === 'DynamicList') {
      const cfg = normalizeDataSourceConfig(getDataSourceConfigValue(n));
      if (cfg.type === 'flowCode' && cfg.flowCodeNodeId === codeNodeId) {
        return true;
      }
    }
    const children = n.children ?? [];
    return children.some((c) => walk(c));
  };

  return walk(uiRoot);
}

/** 与流程图 component 节点 sourceKey 对齐：仅匹配 sourceKey（页面搭建常用） */
export function findComponentFlowNodeIdsForUiKey(flowNodes: Node[], uiNodeKey: string): string[] {
  const key = String(uiNodeKey ?? '').trim();
  if (!key) {
    return [];
  }
  return flowNodes
    .filter((n) => n.type === 'componentNode')
    .filter((n) => {
      const d = (n.data ?? {}) as ComponentFlowNodeData;
      return String(d.sourceKey ?? '').trim() === key;
    })
    .map((n) => n.id);
}

/** 指向该组件流程节点的上游代码节点（用于动态列表数据源下拉） */
export function listUpstreamCodeNodesForComponentFlow(
  flowEdges: Edge[],
  flowNodes: Node[],
  componentFlowNodeId: string,
): Array<{ id: string; label: string }> {
  const sourceIds = flowEdges.filter((e) => e.target === componentFlowNodeId).map((e) => e.source);
  const out: Array<{ id: string; label: string }> = [];
  for (const sid of sourceIds) {
    const node = flowNodes.find((n) => n.id === sid);
    if (node?.type !== 'codeNode') {
      continue;
    }
    const data = (node.data ?? {}) as CodeNodeData;
    out.push({ id: sid, label: String(data.label ?? '代码节点') });
  }
  return out;
}
