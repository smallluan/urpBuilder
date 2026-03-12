import type { Edge, Node } from '@xyflow/react';
import type { PreviewDataHub } from './dataHub';
import type {
  CodeNodeData,
  ComponentFlowNodeData,
  EventFilterNodeData,
  NetworkRequestNodeData,
} from '../../../types/flow';
import type { RuntimeEvent, RuntimeRequestError, RuntimeRequestSuccess } from '../../../types/flowRuntime';

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return !!value && typeof value === 'object' && !Array.isArray(value);
};

const normalizeMethod = (value: unknown) => {
  const method = String(value ?? 'GET').trim().toUpperCase();
  return method || 'GET';
};

const normalizeTimeoutMs = (value: unknown) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 5000;
  }

  return Math.max(100, Math.round(parsed));
};

const normalizeResponsePath = (value: unknown) => {
  const input = String(value ?? '').trim();
  return input || 'ctx.response';
};

const HOST_LIKE_ENDPOINT_PATTERN = /^(localhost|\d{1,3}(?:\.\d{1,3}){3}|[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+)(:\d+)?(?:\/.*)?$/;

const normalizeEndpoint = (value: unknown) => {
  const input = String(value ?? '').trim();
  if (!input) {
    return '';
  }

  if (/^https?:\/\//i.test(input)) {
    return input;
  }

  if (input.startsWith('//')) {
    return `${window.location.protocol}${input}`;
  }

  if (HOST_LIKE_ENDPOINT_PATTERN.test(input)) {
    return `http://${input}`;
  }

  return input;
};

const toHeaderRecord = (headers: Headers): Record<string, string> => {
  const record: Record<string, string> = {};
  headers.forEach((headerValue, headerName) => {
    record[headerName] = headerValue;
  });

  return record;
};

const tryParseJson = (value: string): unknown => {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const setValueByPath = (target: Record<string, unknown>, path: string, value: unknown) => {
  const normalizedPath = path
    .trim()
    .replace(/^ctx\./, '')
    .split('.')
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (normalizedPath.length === 0) {
    target.response = value;
    return;
  }

  let cursor: Record<string, unknown> = target;

  normalizedPath.forEach((segment, index) => {
    const isLast = index === normalizedPath.length - 1;
    if (isLast) {
      cursor[segment] = value;
      return;
    }

    const nextValue = cursor[segment];
    if (!isPlainObject(nextValue)) {
      cursor[segment] = {};
    }

    cursor = cursor[segment] as Record<string, unknown>;
  });
};

const buildRequestInit = (
  method: string,
  bodyType: string,
  bodyInput: string,
): { init: RequestInit; fallbackData?: unknown } => {
  const normalizedBodyType = String(bodyType ?? 'none').trim().toLowerCase();
  const trimmedBody = String(bodyInput ?? '');
  const upperMethod = method.toUpperCase();
  const hasBody = upperMethod !== 'GET' && upperMethod !== 'HEAD' && normalizedBodyType !== 'none';

  if (!hasBody) {
    return {
      init: { method: upperMethod },
    };
  }

  if (normalizedBodyType === 'json') {
    if (!trimmedBody.trim()) {
      return {
        init: {
          method: upperMethod,
          body: '{}',
          headers: {
            'Content-Type': 'application/json',
          },
        },
        fallbackData: {},
      };
    }

    const parsed = tryParseJson(trimmedBody);
    return {
      init: {
        method: upperMethod,
        body: JSON.stringify(parsed),
        headers: {
          'Content-Type': 'application/json',
        },
      },
      fallbackData: parsed,
    };
  }

  if (normalizedBodyType === 'x-www-form-urlencoded') {
    const params = new URLSearchParams(trimmedBody);
    return {
      init: {
        method: upperMethod,
        body: params,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        },
      },
      fallbackData: Object.fromEntries(params.entries()),
    };
  }

  if (normalizedBodyType === 'form-data') {
    const formData = new FormData();
    trimmedBody
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .forEach((line) => {
        const separatorIndex = line.indexOf('=');
        if (separatorIndex <= 0) {
          return;
        }

        const key = line.slice(0, separatorIndex).trim();
        const value = line.slice(separatorIndex + 1).trim();
        if (!key) {
          return;
        }

        formData.append(key, value);
      });

    return {
      init: {
        method: upperMethod,
        body: formData,
      },
      fallbackData: Object.fromEntries(formData.entries()),
    };
  }

  return {
    init: {
      method: upperMethod,
      body: trimmedBody,
      headers: {
        'Content-Type': 'text/plain;charset=UTF-8',
      },
    },
    fallbackData: trimmedBody,
  };
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
      void this.propagate(nodeId, runtimeEvent);
    });
  }

  // 宽度优先传播：事件沿有向边向下游传递。
  // 通过 visited + hopCount 防止环路导致无限传播。
  private async propagate(startNodeId: string, startEvent: RuntimeEvent) {
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

      for (const downstreamNodeId of downstreamNodeIds) {
        const visitKey = `${current.nodeId}->${downstreamNodeId}-${current.event.kind}`;
        if (visited.has(visitKey)) {
          continue;
        }
        visited.add(visitKey);

        const nextNode = this.nodeMap.get(downstreamNodeId);
        if (!nextNode) {
          continue;
        }

        const outputEvent = await this.handleNode(nextNode, current.event, current.nodeId);
        if (!outputEvent) {
          continue;
        }

        queue.push({
          nodeId: downstreamNodeId,
          event: outputEvent,
        });
      }
    }
  }

  private async handleNode(node: Node, input: RuntimeEvent, upstreamNodeId: string): Promise<RuntimeEvent | null> {
    if (node.type === 'eventFilterNode') {
      return this.handleEventFilterNode(node, input);
    }

    if (node.type === 'networkRequestNode') {
      return this.handleNetworkRequestNode(node, input);
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

    if (selectedLifetimes.length === 0) {
      return input;
    }

    if (!selectedLifetimes.includes(input.lifetime)) {
      return null;
    }

    return input;
  }

  private async handleCodeNode(node: Node, input: RuntimeEvent, upstreamNodeId: string): Promise<RuntimeEvent | null> {
    const data = (node.data ?? {}) as CodeNodeData;
    const code = typeof data.code === 'string' ? data.code.trim() : '';
    if (!code) {
      return null;
    }

    try {
      // 代码节点以字符串整体执行：
      // - dataHub：只读上下文（由 createCodeContext 提供）
      // - ctx：本次事件上下文
      const ctx: Record<string, unknown> = {
        event: input,
        upstreamNodeId,
        currentNodeId: node.id,
      };

      if (input.kind === 'request:success') {
        setValueByPath(ctx, input.request.responsePath, input.request.data);
        ctx.request = input.request;
      }

      if (input.kind === 'request:error') {
        setValueByPath(ctx, input.request.responsePath, input.request.fallbackData);
        ctx.request = input.request;
      }

      const executor = new Function('dataHub', 'ctx', `'use strict';\nreturn (async () => {\n${code}\n})();`);
      const result = await executor(this.dataHub.createCodeContext(), ctx);

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

  private async handleNetworkRequestNode(node: Node, input: RuntimeEvent): Promise<RuntimeEvent | null> {
    const data = (node.data ?? {}) as NetworkRequestNodeData;
    const method = normalizeMethod(data.method);
    const endpoint = normalizeEndpoint(data.endpoint);
    const timeoutMs = normalizeTimeoutMs(data.timeoutMs);
    const responsePath = normalizeResponsePath(data.responsePath);
    const onError = String(data.onError ?? 'throw').trim();
    const mockEnabled = Boolean(data.mockEnabled);

    if (!endpoint) {
      const message = '网络请求节点缺少 endpoint 配置';
      this.dataHub.publish('runtime:error', {
        nodeId: node.id,
        message,
      });

      if (onError === 'continue') {
        return {
          kind: 'request:error',
          request: {
            nodeId: node.id,
            method,
            endpoint,
            durationMs: 0,
            responsePath,
            message,
          },
          payload: input,
        };
      }

      return null;
    }

    if (mockEnabled) {
      const mockData = tryParseJson(String(data.body ?? ''));
      return {
        kind: 'request:success',
        request: {
          nodeId: node.id,
          method,
          endpoint,
          status: 200,
          ok: true,
          durationMs: 0,
          headers: {},
          rawText: typeof mockData === 'string' ? mockData : JSON.stringify(mockData),
          data: mockData,
          responsePath,
        },
        payload: input,
      };
    }

    const { init, fallbackData } = buildRequestInit(
      method,
      String(data.bodyType ?? 'none'),
      String(data.body ?? ''),
    );

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      controller.abort();
    }, timeoutMs);
    const startedAt = performance.now();

    try {
      const response = await fetch(endpoint, {
        ...init,
        signal: controller.signal,
      });

      const rawText = await response.text();
      const parsedData = tryParseJson(rawText);
      const durationMs = Math.round(performance.now() - startedAt);

      const requestResult: RuntimeRequestSuccess = {
        nodeId: node.id,
        method,
        endpoint,
        status: response.status,
        ok: response.ok,
        durationMs,
        headers: toHeaderRecord(response.headers),
        rawText,
        data: parsedData,
        responsePath,
      };

      this.dataHub.publish('runtime:request', requestResult);

      return {
        kind: 'request:success',
        request: requestResult,
        payload: input,
      };
    } catch (error) {
      const durationMs = Math.round(performance.now() - startedAt);
      const requestError: RuntimeRequestError = {
        nodeId: node.id,
        method,
        endpoint,
        durationMs,
        responsePath,
        message: error instanceof Error ? error.message : String(error),
        errorName: error instanceof Error ? error.name : undefined,
        fallbackData: onError === 'useFallback' ? fallbackData : undefined,
      };

      this.dataHub.publish('runtime:error', {
        nodeId: node.id,
        message: requestError.message,
      });

      if (onError === 'continue' || onError === 'useFallback') {
        return {
          kind: 'request:error',
          request: requestError,
          payload: input,
        };
      }

      return null;
    } finally {
      window.clearTimeout(timeoutId);
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
