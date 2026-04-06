import type { Edge, Node } from '@xyflow/react';
import { composeComponentRef, type PreviewDataHub } from '../runtime/dataHub';
import type {
  CodeNodeData,
  ComponentFlowNodeData,
  EventFilterNodeData,
  NetworkRequestNodeData,
  TimerNodeData,
} from '../../../types/flow';
import type { RuntimeEvent, RuntimeRequestError, RuntimeRequestSuccess } from '../../../types/flowRuntime';
import type { DebugState } from './debugStore';
import type { StoreApi } from 'zustand';

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

const normalizeMethod = (value: unknown) => String(value ?? 'GET').trim().toUpperCase() || 'GET';

const normalizeTimeoutMs = (value: unknown) => {
  const parsed = Number(value);
  return !Number.isFinite(parsed) || parsed <= 0 ? 5000 : Math.max(100, Math.round(parsed));
};

const normalizeResponsePath = (value: unknown) => String(value ?? '').trim() || 'ctx.response';

const HOST_LIKE_ENDPOINT_PATTERN = /^(localhost|\d{1,3}(?:\.\d{1,3}){3}|[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+)(:\d+)?(?:\/.*)?$/;

const normalizeEndpoint = (value: unknown) => {
  const input = String(value ?? '').trim();
  if (!input) return '';
  if (/^https?:\/\//i.test(input)) return input;
  if (input.startsWith('//')) return `${window.location.protocol}${input}`;
  if (HOST_LIKE_ENDPOINT_PATTERN.test(input)) return `http://${input}`;
  return input;
};

const toHeaderRecord = (headers: Headers): Record<string, string> => {
  const r: Record<string, string> = {};
  headers.forEach((v, k) => { r[k] = v; });
  return r;
};

const tryParseJson = (value: string): unknown => {
  try { return JSON.parse(value); } catch { return value; }
};

const setValueByPath = (target: Record<string, unknown>, path: string, value: unknown) => {
  const parts = path.trim().replace(/^ctx\./, '').split('.').map((s) => s.trim()).filter(Boolean);
  if (parts.length === 0) { target.response = value; return; }
  let cursor: Record<string, unknown> = target;
  parts.forEach((seg, i) => {
    if (i === parts.length - 1) { cursor[seg] = value; return; }
    if (!isPlainObject(cursor[seg])) cursor[seg] = {};
    cursor = cursor[seg] as Record<string, unknown>;
  });
};

const buildRequestInit = (method: string, bodyType: string, bodyInput: string): { init: RequestInit; fallbackData?: unknown } => {
  const normalizedBodyType = String(bodyType ?? 'none').trim().toLowerCase();
  const trimmedBody = String(bodyInput ?? '');
  const upperMethod = method.toUpperCase();
  const hasBody = upperMethod !== 'GET' && upperMethod !== 'HEAD' && normalizedBodyType !== 'none';
  if (!hasBody) return { init: { method: upperMethod } };

  if (normalizedBodyType === 'json') {
    if (!trimmedBody.trim()) return { init: { method: upperMethod, body: '{}', headers: { 'Content-Type': 'application/json' } }, fallbackData: {} };
    const parsed = tryParseJson(trimmedBody);
    return { init: { method: upperMethod, body: JSON.stringify(parsed), headers: { 'Content-Type': 'application/json' } }, fallbackData: parsed };
  }

  if (normalizedBodyType === 'x-www-form-urlencoded') {
    const params = new URLSearchParams(trimmedBody);
    return { init: { method: upperMethod, body: params, headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' } }, fallbackData: Object.fromEntries(params.entries()) };
  }

  if (normalizedBodyType === 'form-data') {
    const formData = new FormData();
    trimmedBody.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).forEach((line) => {
      const idx = line.indexOf('=');
      if (idx <= 0) return;
      const key = line.slice(0, idx).trim();
      const val = line.slice(idx + 1).trim();
      if (key) formData.append(key, val);
    });
    return { init: { method: upperMethod, body: formData }, fallbackData: Object.fromEntries(formData.entries()) };
  }

  return { init: { method: upperMethod, body: trimmedBody, headers: { 'Content-Type': 'text/plain;charset=UTF-8' } }, fallbackData: trimmedBody };
};

let traceCounter = 0;
const nextTraceId = () => `trace-${Date.now()}-${++traceCounter}`;
const nextEntryId = () => `entry-${Date.now()}-${++traceCounter}`;

const getNodeLabel = (node: Node): string => {
  const data = (node.data ?? {}) as Record<string, unknown>;
  return String(data.label ?? node.type ?? node.id);
};

export class InstrumentedFlowRuntime {
  private readonly dataHub: PreviewDataHub;
  private readonly nodeMap: Map<string, Node>;
  private readonly downstreamMap: Map<string, string[]>;
  private readonly edgeMap: Map<string, Edge>;
  private readonly componentNodeMap: Map<string, string[]>;
  private readonly timerHandles = new Map<string, number>();
  private readonly timerEnabledMap = new Map<string, boolean>();
  private readonly codeFnCache = new Map<string, Function>();
  private readonly store: StoreApi<DebugState>;
  private destroyed = false;
  /** 串行化所有传播，避免 await 断点期间与其它 propagate 交错导致组件 patch 竞态 */
  private propagationChain: Promise<void> = Promise.resolve();

  constructor(nodes: Node[], edges: Edge[], dataHub: PreviewDataHub, store: StoreApi<DebugState>) {
    this.dataHub = dataHub;
    this.store = store;
    this.nodeMap = new Map(nodes.map((n) => [n.id, n]));
    this.downstreamMap = new Map<string, string[]>();
    this.componentNodeMap = new Map<string, string[]>();
    this.edgeMap = new Map<string, Edge>();

    edges.forEach((edge) => {
      this.edgeMap.set(edge.id, edge);
      const targets = this.downstreamMap.get(edge.source) ?? [];
      targets.push(edge.target);
      this.downstreamMap.set(edge.source, targets);
    });

    nodes.forEach((node) => {
      if (node.type !== 'componentNode') return;
      const data = (node.data ?? {}) as ComponentFlowNodeData;
      const identity = this.resolveSourceIdentity(data);
      if (!identity) return;
      const list = this.componentNodeMap.get(identity) ?? [];
      list.push(node.id);
      this.componentNodeMap.set(identity, list);
    });

    this.startTimerNodes();
  }

  destroy() {
    this.destroyed = true;
    this.timerHandles.forEach((h) => window.clearInterval(h));
    this.timerHandles.clear();
    this.timerEnabledMap.clear();
    this.codeFnCache.clear();
    const state = this.store.getState();
    if (state.paused && state._pauseResolver) {
      state._pauseResolver('resume');
    }
    state._clearPaused();
  }

  emitLifecycle(componentKey: string, lifetime: string, payload?: unknown) {
    const rawKey = String(componentKey ?? '').trim();
    if (!rawKey) return;

    if (String(lifetime ?? '').trim() === '__customComponentPropSync' && isPlainObject(payload)) {
      const patch = (payload as { patch?: unknown }).patch;
      if (isPlainObject(patch)) this.dataHub.applyComponentPatch(rawKey, patch);
      return;
    }

    const normalizedRef = rawKey.includes('::') ? rawKey : composeComponentRef(this.dataHub.getScopeId(), rawKey);
    const nodeIds = [...(this.componentNodeMap.get(rawKey) ?? []), ...(this.componentNodeMap.get(normalizedRef) ?? [])];
    if (nodeIds.length === 0) return;

    const event: RuntimeEvent = { kind: 'lifecycle', lifetime, componentKey: rawKey, payload };
    Array.from(new Set(nodeIds)).forEach((nodeId) => {
      this.enqueuePropagation(() => this.propagate(nodeId, event));
    });
  }

  private enqueuePropagation(run: () => Promise<void>): void {
    this.propagationChain = this.propagationChain
      .then(() => run())
      .catch(() => {});
  }

  private resolveSourceIdentity(data: ComponentFlowNodeData): string {
    const sourceRef = typeof data.sourceRef === 'string' ? data.sourceRef.trim() : '';
    if (sourceRef) return sourceRef;
    const sourceKey = typeof data.sourceKey === 'string' ? data.sourceKey.trim() : '';
    if (!sourceKey) return '';
    return composeComponentRef(this.dataHub.getScopeId(), sourceKey);
  }

  private computeReachableFromNode(startNodeId: string): { nodeIds: Set<string>; edgeIds: Set<string> } {
    const reachableNodes = new Set<string>();
    const reachableEdges = new Set<string>();
    const queue = [startNodeId];
    reachableNodes.add(startNodeId);

    while (queue.length > 0) {
      const current = queue.shift()!;
      const downIds = this.downstreamMap.get(current) ?? [];
      for (const targetId of downIds) {
        for (const [edgeId, edge] of this.edgeMap) {
          if (edge.source === current && edge.target === targetId) {
            reachableEdges.add(edgeId);
          }
        }
        if (!reachableNodes.has(targetId)) {
          reachableNodes.add(targetId);
          queue.push(targetId);
        }
      }
    }

    return { nodeIds: reachableNodes, edgeIds: reachableEdges };
  }

  private findEdgeIdsBetween(fromId: string, toId: string): Set<string> {
    const ids = new Set<string>();
    this.edgeMap.forEach((edge) => {
      if (edge.source === fromId && edge.target === toId) {
        ids.add(edge.id);
      }
    });
    return ids;
  }

  private async waitForUserAction(
    upstreamNodeId: string,
    pausedNodeId: string,
    event: RuntimeEvent,
  ): Promise<'resume' | 'step'> {
    const { nodeIds, edgeIds } = this.computeReachableFromNode(pausedNodeId);
    const stepEdges = this.findEdgeIdsBetween(upstreamNodeId, pausedNodeId);
    this.store.getState()._setReachable(nodeIds, edgeIds, stepEdges);

    return new Promise<'resume' | 'step'>((resolve) => {
      this.store.getState()._setPaused(pausedNodeId, event, resolve);
    });
  }

  private async propagate(startNodeId: string, startEvent: RuntimeEvent) {
    if (this.destroyed) return;

    const traceId = nextTraceId();
    this.store.getState()._setTraceId(traceId);
    this.store.getState().clearTrace();
    this.store.getState()._setPropagationOrigin(startNodeId);

    try {
      const queue: Array<{ nodeId: string; event: RuntimeEvent }> = [
        { nodeId: startNodeId, event: startEvent },
      ];
      const visited = new Set<string>();
      let hopCount = 0;

      while (queue.length > 0 && hopCount < 300) {
        if (this.destroyed) return;
        hopCount += 1;

        const current = queue.shift();
        if (!current) continue;

        const downstreamNodeIds = this.downstreamMap.get(current.nodeId) ?? [];

        for (const downstreamNodeId of downstreamNodeIds) {
          if (this.destroyed) return;

          const visitKey = `${current.nodeId}->${downstreamNodeId}-${current.event.kind}`;
          if (visited.has(visitKey)) continue;
          visited.add(visitKey);

          const nextNode = this.nodeMap.get(downstreamNodeId);
          if (!nextNode) continue;

          const state = this.store.getState();
          // 仅当调试面板打开时才进入断点/单步等待（与浏览器 DevTools 行为一致；面板关闭时断点配置仍保留）
          const shouldBreak =
            state.panelOpen && (state.breakpoints.has(downstreamNodeId) || state.stepping);

          if (shouldBreak) {
            const action = await this.waitForUserAction(current.nodeId, downstreamNodeId, current.event);
            if (this.destroyed) return;
            if (action === 'step') {
              this.store.setState({ stepping: true });
            }
          }

          const entryStart = performance.now();

          this.store.getState()._addEventLog({
            id: nextEntryId(),
            traceId,
            nodeId: downstreamNodeId,
            nodeLabel: getNodeLabel(nextNode),
            nodeType: String(nextNode.type ?? ''),
            event: current.event,
            direction: 'in',
            timestamp: Date.now(),
          });

          const outputEvent = await this.handleNode(nextNode, current.event, current.nodeId);

          const durationMs = Math.round((performance.now() - entryStart) * 100) / 100;

          this.store.getState()._addTraceEntry({
            id: nextEntryId(),
            nodeId: downstreamNodeId,
            nodeLabel: getNodeLabel(nextNode),
            nodeType: String(nextNode.type ?? ''),
            inputEvent: current.event,
            outputEvent,
            timestamp: Date.now(),
            durationMs,
          });

          if (outputEvent) {
            this.store.getState()._addEventLog({
              id: nextEntryId(),
              traceId,
              nodeId: downstreamNodeId,
              nodeLabel: getNodeLabel(nextNode),
              nodeType: String(nextNode.type ?? ''),
              event: outputEvent,
              direction: 'out',
              timestamp: Date.now(),
            });

            queue.push({ nodeId: downstreamNodeId, event: outputEvent });
          }
        }
      }
    } finally {
      this.store.getState()._setPropagationOrigin(null);
    }
  }

  private async handleNode(node: Node, input: RuntimeEvent, upstreamNodeId: string): Promise<RuntimeEvent | null> {
    if (node.type === 'eventFilterNode') return this.handleEventFilterNode(node, input);
    if (node.type === 'networkRequestNode') return this.handleNetworkRequestNode(node, input);
    if (node.type === 'codeNode') return this.handleCodeNode(node, input, upstreamNodeId);
    if (node.type === 'componentNode') return this.handleComponentNode(node, input);
    if (node.type === 'timerNode') return this.handleTimerNode(node, input);
    return input;
  }

  private startTimerNodes() {
    this.nodeMap.forEach((node) => {
      if (node.type !== 'timerNode') return;
      this.timerEnabledMap.set(node.id, true);
      this.startSingleTimer(node);
    });
  }

  private startSingleTimer(node: Node) {
    const existing = this.timerHandles.get(node.id);
    if (typeof existing === 'number') window.clearInterval(existing);
    const data = (node.data ?? {}) as TimerNodeData;
    const intervalMs = typeof data.intervalMs === 'number' && Number.isFinite(data.intervalMs)
      ? Math.max(100, Math.round(data.intervalMs)) : 1000;

    const handle = window.setInterval(() => {
      if (this.timerEnabledMap.get(node.id) === false) return;
      const evt: RuntimeEvent = { kind: 'timer', timerNodeId: node.id, intervalMs, tickAt: Date.now() };
      this.enqueuePropagation(() => this.propagate(node.id, evt));
    }, intervalMs);
    this.timerHandles.set(node.id, handle);
  }

  private stopSingleTimer(nodeId: string) {
    const h = this.timerHandles.get(nodeId);
    if (typeof h === 'number') { window.clearInterval(h); this.timerHandles.delete(nodeId); }
  }

  private setTimerEnabled(nodeId: string, enabled: boolean) {
    if (this.timerEnabledMap.get(nodeId) === enabled) return;
    this.timerEnabledMap.set(nodeId, enabled);
    if (!enabled) { this.stopSingleTimer(nodeId); return; }
    const node = this.nodeMap.get(nodeId);
    if (node?.type === 'timerNode') this.startSingleTimer(node);
  }

  private handleEventFilterNode(node: Node, input: RuntimeEvent): RuntimeEvent | null {
    if (input.kind !== 'lifecycle') return null;
    const data = (node.data ?? {}) as EventFilterNodeData;
    const selected = Array.isArray(data.selectedLifetimes) ? data.selectedLifetimes.map(String) : [];
    if (selected.length === 0) return input;
    const incoming = String(input.lifetime ?? '');
    const matches = selected.some((s) =>
      s === incoming
      || (s === 'onMount' && incoming === 'onMounted')
      || (s === 'onMounted' && incoming === 'onMount'),
    );
    return matches ? input : null;
  }

  private async handleCodeNode(node: Node, input: RuntimeEvent, upstreamNodeId: string): Promise<RuntimeEvent | null> {
    const data = (node.data ?? {}) as CodeNodeData;
    const code = typeof data.code === 'string' ? data.code.trim() : '';
    if (!code) return null;

    try {
      const ctx: Record<string, unknown> = { event: input, upstreamNodeId, currentNodeId: node.id };
      if (input.kind === 'request:success') {
        setValueByPath(ctx, input.request.responsePath, input.request.data);
        ctx.request = input.request;
      }
      if (input.kind === 'request:error') {
        setValueByPath(ctx, input.request.responsePath, input.request.fallbackData);
        ctx.request = input.request;
      }
      let executor = this.codeFnCache.get(node.id);
      if (!executor) {
        executor = new Function('dataHub', 'ctx', `'use strict';\nreturn (async () => {\n${code}\n})();`);
        this.codeFnCache.set(node.id, executor);
      }
      const result = await executor(this.dataHub.createCodeContext(), ctx);

      if (typeof result === 'boolean') {
        return { kind: 'value', value: result, fromCodeNodeId: node.id, payload: input };
      }
      if (!isPlainObject(result)) return null;
      return { kind: 'patch', patch: result, fromCodeNodeId: node.id, payload: input };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.dataHub.publish('runtime:error', { nodeId: node.id, message: msg });
      this.store.getState()._addError({
        id: nextEntryId(),
        nodeId: node.id,
        message: msg,
        timestamp: Date.now(),
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
      this.dataHub.publish('runtime:error', { nodeId: node.id, message });
      this.store.getState()._addError({ id: nextEntryId(), nodeId: node.id, message, timestamp: Date.now() });
      if (onError === 'continue') {
        return { kind: 'request:error', request: { nodeId: node.id, method, endpoint, durationMs: 0, responsePath, message } as RuntimeRequestError, payload: input };
      }
      return null;
    }

    if (mockEnabled) {
      const mockData = tryParseJson(String(data.body ?? ''));
      const req: RuntimeRequestSuccess = { nodeId: node.id, method, endpoint, status: 200, ok: true, durationMs: 0, headers: {}, rawText: typeof mockData === 'string' ? mockData : JSON.stringify(mockData), data: mockData, responsePath };
      this.store.getState()._addRequest({ id: nextEntryId(), nodeId: node.id, method, endpoint, status: 200, durationMs: 0, ok: true, timestamp: Date.now() });
      return { kind: 'request:success', request: req, payload: input };
    }

    const { init, fallbackData } = buildRequestInit(method, String(data.bodyType ?? 'none'), String(data.body ?? ''));
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
    const startedAt = performance.now();

    try {
      const response = await fetch(endpoint, { ...init, signal: controller.signal });
      const rawText = await response.text();
      const parsedData = tryParseJson(rawText);
      const durationMs = Math.round(performance.now() - startedAt);
      const req: RuntimeRequestSuccess = { nodeId: node.id, method, endpoint, status: response.status, ok: response.ok, durationMs, headers: toHeaderRecord(response.headers), rawText, data: parsedData, responsePath };
      this.dataHub.publish('runtime:request', req);
      this.store.getState()._addRequest({ id: nextEntryId(), nodeId: node.id, method, endpoint, status: response.status, durationMs, ok: response.ok, timestamp: Date.now() });
      return { kind: 'request:success', request: req, payload: input };
    } catch (error) {
      const durationMs = Math.round(performance.now() - startedAt);
      const msg = error instanceof Error ? error.message : String(error);
      const req: RuntimeRequestError = { nodeId: node.id, method, endpoint, durationMs, responsePath, message: msg, errorName: error instanceof Error ? error.name : undefined, fallbackData: onError === 'useFallback' ? fallbackData : undefined };
      this.dataHub.publish('runtime:error', { nodeId: node.id, message: msg });
      this.store.getState()._addError({ id: nextEntryId(), nodeId: node.id, message: msg, timestamp: Date.now() });
      this.store.getState()._addRequest({ id: nextEntryId(), nodeId: node.id, method, endpoint, durationMs, ok: false, timestamp: Date.now() });
      if (onError === 'continue' || onError === 'useFallback') {
        return { kind: 'request:error', request: req, payload: input };
      }
      return null;
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  private handleComponentNode(node: Node, input: RuntimeEvent): RuntimeEvent | null {
    if (input.kind !== 'patch') return input;
    const data = (node.data ?? {}) as ComponentFlowNodeData;
    const identity = this.resolveSourceIdentity(data);
    if (!identity) return null;
    this.dataHub.applyComponentPatch(identity, input.patch);
    return null;
  }

  private handleTimerNode(node: Node, input: RuntimeEvent): RuntimeEvent | null {
    if (input.kind !== 'value' || typeof input.value !== 'boolean') return null;
    this.setTimerEnabled(node.id, input.value);
    return null;
  }
}

export const createInstrumentedFlowRuntime = (
  nodes: Node[],
  edges: Edge[],
  dataHub: PreviewDataHub,
  store: StoreApi<DebugState>,
) => new InstrumentedFlowRuntime(nodes, edges, dataHub, store);
