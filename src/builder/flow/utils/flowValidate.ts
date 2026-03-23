import type { Edge, Node } from '@xyflow/react';
import { detectCycles, findIsolatedNodes } from './graphAnalyze';

export type FlowDiagnosticLevel = 'info' | 'warning' | 'error';
export type FlowDiagnosticKind = 'cycle' | 'isolate' | 'config';

export interface FlowDiagnosticItem {
  id: string;
  level: FlowDiagnosticLevel;
  kind: FlowDiagnosticKind;
  message: string;
  nodeIds: string[];
}

const toNodeLabel = (node: Node): string => {
  const nodeData = (node.data ?? {}) as { label?: unknown; text?: unknown };
  return String(nodeData.label ?? nodeData.text ?? node.id);
};

const getCycleLabelPath = (cycle: string[], nodeLabelMap: Map<string, string>): string => {
  return cycle
    .map((nodeId) => nodeLabelMap.get(nodeId) ?? nodeId)
    .join(' -> ');
};

const validateNodeConfig = (nodes: Node[]): FlowDiagnosticItem[] => {
  const issues: FlowDiagnosticItem[] = [];

  nodes.forEach((node) => {
    const data = (node.data ?? {}) as Record<string, unknown>;
    if (node.type === 'networkRequestNode') {
      const endpoint = String(data.endpoint ?? '').trim();
      if (!endpoint) {
        issues.push({
          id: `config-network-${node.id}`,
          level: 'warning',
          kind: 'config',
          message: `网络请求节点 ${toNodeLabel(node)} 缺少 URL(endpoint)`,
          nodeIds: [node.id],
        });
      }
    }

    if (node.type === 'codeNode') {
      const code = String(data.code ?? '').trim();
      if (!code) {
        issues.push({
          id: `config-code-${node.id}`,
          level: 'warning',
          kind: 'config',
          message: `代码节点 ${toNodeLabel(node)} 代码为空`,
          nodeIds: [node.id],
        });
      }
    }
  });

  return issues;
};

export const runFlowDiagnostics = (nodes: Node[], edges: Edge[]): FlowDiagnosticItem[] => {
  const diagnostics: FlowDiagnosticItem[] = [];
  const nodeLabelMap = new Map(nodes.map((node) => [node.id, toNodeLabel(node)]));

  const cycles = detectCycles(nodes, edges);
  cycles.forEach((cycle, index) => {
    diagnostics.push({
      id: `cycle-${index + 1}`,
      level: 'error',
      kind: 'cycle',
      message: `检测到循环依赖：${getCycleLabelPath(cycle, nodeLabelMap)}`,
      nodeIds: cycle.slice(0, -1),
    });
  });

  findIsolatedNodes(nodes, edges).forEach((node) => {
    diagnostics.push({
      id: `isolate-${node.id}`,
      level: 'info',
      kind: 'isolate',
      message: `孤立节点：${toNodeLabel(node)}`,
      nodeIds: [node.id],
    });
  });

  diagnostics.push(...validateNodeConfig(nodes));
  return diagnostics;
};
