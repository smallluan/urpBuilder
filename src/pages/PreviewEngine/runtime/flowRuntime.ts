import type { Edge, Node } from '@xyflow/react';
import type { PreviewDataHub } from './dataHub';

// 运行时事件：
// - lifecycle：由组件节点触发的生命周期事件
// - patch：代码节点产出的声明式属性更新
type RuntimeEvent =
  | {
      kind: 'lifecycle';
      lifetime: string;
      componentKey: string;
      payload?: unknown;
    }
  | {
      kind: 'patch';
      patch: Record<string, unknown>;
      fromCodeNodeId: string;
      payload?: unknown;
    };

interface ComponentFlowNodeData {
  sourceKey?: string;
}

interface EventFilterNodeData {
  selectedLifetimes?: string[];
}

interface CodeNodeData {
  code?: string;
}

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return !!value && typeof value === 'object' && !Array.isArray(value);
};

// 预览流程执行器：
// 负责将 nodes/edges 构造成可执行图，并驱动“组件生命周期 -> 事件过滤 -> 代码节点 -> 组件更新”链路。
export class PreviewFlowRuntime {
  private readonly dataHub: PreviewDataHub;

  private readonly nodeMap: Map<string, Node>;

  private readonly downstreamMap: Map<string, string[]>;

  // sourceKey -> componentNodeId[]
  // 一个组件可能在流程图中被拖入多个组件节点实例。
  private readonly componentNodeMap: Map<string, string[]>;

  constructor(nodes: Node[], edges: Edge[], dataHub: PreviewDataHub) {
    this.dataHub = dataHub;
    this.nodeMap = new Map(nodes.map((node) => [node.id, node]));
    this.downstreamMap = new Map<string, string[]>();
    this.componentNodeMap = new Map<string, string[]>();

    // 预构建邻接表，后续传播按 source -> target 快速查找。
    edges.forEach((edge) => {
      const nextTargets = this.downstreamMap.get(edge.source) ?? [];
      nextTargets.push(edge.target);
      this.downstreamMap.set(edge.source, nextTargets);
    });

    // 建立组件 key 到流程节点的索引，用于生命周期事件的入口定位。
    nodes.forEach((node) => {
      if (node.type !== 'componentNode') {
        return;
      }

      const data = (node.data ?? {}) as ComponentFlowNodeData;
      const sourceKey = typeof data.sourceKey === 'string' ? data.sourceKey : '';
      if (!sourceKey) {
        return;
      }

      const list = this.componentNodeMap.get(sourceKey) ?? [];
      list.push(node.id);
      this.componentNodeMap.set(sourceKey, list);
    });
  }

  emitLifecycle(componentKey: string, lifetime: string, payload?: unknown) {
    const componentNodeIds = this.componentNodeMap.get(componentKey) ?? [];
    if (componentNodeIds.length === 0) {
      return;
    }

    const runtimeEvent: RuntimeEvent = {
      kind: 'lifecycle',
      lifetime,
      componentKey,
      payload,
    };

    // 同一个组件 key 对应的全部组件节点实例都要作为触发起点。
    componentNodeIds.forEach((nodeId) => {
      this.propagate(nodeId, runtimeEvent);
    });
  }

  // 宽度优先传播：事件沿有向边向下游传递。
  // 通过 visited + hopCount 防止环路导致无限传播。
  private propagate(startNodeId: string, startEvent: RuntimeEvent) {
    const queue: Array<{ nodeId: string; event: RuntimeEvent }> = [{ nodeId: startNodeId, event: startEvent }];
    const visited = new Set<string>();
    let hopCount = 0;

    while (queue.length > 0 && hopCount < 300) {
      hopCount += 1;

      const current = queue.shift();
      if (!current) {
        continue;
      }

      const downstreamNodeIds = this.downstreamMap.get(current.nodeId) ?? [];

      downstreamNodeIds.forEach((downstreamNodeId) => {
        const visitKey = `${current.nodeId}->${downstreamNodeId}-${current.event.kind}`;
        if (visited.has(visitKey)) {
          return;
        }
        visited.add(visitKey);

        const nextNode = this.nodeMap.get(downstreamNodeId);
        if (!nextNode) {
          return;
        }

        const outputEvent = this.handleNode(nextNode, current.event, current.nodeId);
        if (!outputEvent) {
          return;
        }

        queue.push({
          nodeId: downstreamNodeId,
          event: outputEvent,
        });
      });
    }
  }

  private handleNode(node: Node, input: RuntimeEvent, upstreamNodeId: string): RuntimeEvent | null {
    if (node.type === 'eventFilterNode') {
      return this.handleEventFilterNode(node, input);
    }

    if (node.type === 'codeNode') {
      return this.handleCodeNode(node, input, upstreamNodeId);
    }

    if (node.type === 'componentNode') {
      return this.handleComponentNode(node, input);
    }

    // 其他节点类型默认透传，便于后续扩展（如网络请求节点）。
    return input;
  }

  // 事件过滤节点：只放行被订阅的生命周期。
  private handleEventFilterNode(node: Node, input: RuntimeEvent): RuntimeEvent | null {
    if (input.kind !== 'lifecycle') {
      return null;
    }

    const data = (node.data ?? {}) as EventFilterNodeData;
    const selectedLifetimes = Array.isArray(data.selectedLifetimes)
      ? data.selectedLifetimes.map((item) => String(item))
      : [];

    if (!selectedLifetimes.includes(input.lifetime)) {
      return null;
    }

    return input;
  }

  private handleCodeNode(node: Node, input: RuntimeEvent, upstreamNodeId: string): RuntimeEvent | null {
    const data = (node.data ?? {}) as CodeNodeData;
    const code = typeof data.code === 'string' ? data.code.trim() : '';
    if (!code) {
      return null;
    }

    try {
      // 代码节点以字符串整体执行：
      // - dataHub：只读上下文（由 createCodeContext 提供）
      // - ctx：本次事件上下文
      const executor = new Function('dataHub', 'ctx', `'use strict';\n${code}`);
      const result = executor(this.dataHub.createCodeContext(), {
        event: input,
        upstreamNodeId,
        currentNodeId: node.id,
      });

      // 仅接受“对象”作为声明式 patch，其他返回值视为无效。
      if (!isPlainObject(result)) {
        return null;
      }

      return {
        kind: 'patch',
        patch: result,
        fromCodeNodeId: node.id,
        payload: input,
      };
    } catch (error) {
      // 运行时错误不抛出到渲染层，改为统一事件上报。
      this.dataHub.publish('runtime:error', {
        nodeId: node.id,
        message: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  private handleComponentNode(node: Node, input: RuntimeEvent): RuntimeEvent | null {
    if (input.kind !== 'patch') {
      return input;
    }

    // 组件节点是 patch 终点：按 sourceKey 定位 UI 树组件并写入属性。
    const data = (node.data ?? {}) as ComponentFlowNodeData;
    const sourceKey = typeof data.sourceKey === 'string' ? data.sourceKey : '';
    if (!sourceKey) {
      return null;
    }

    this.dataHub.applyComponentPatch(sourceKey, input.patch);
    // patch 一旦消费即终止，不再向后传递，保证单向写入语义清晰。
    return null;
  }
}

export const createPreviewFlowRuntime = (nodes: Node[], edges: Edge[], dataHub: PreviewDataHub) => {
  return new PreviewFlowRuntime(nodes, edges, dataHub);
};
