import { create } from 'zustand';
import type { RuntimeEvent } from '../../../types/flowRuntime';

export interface TraceEntry {
  id: string;
  nodeId: string;
  nodeLabel: string;
  nodeType: string;
  inputEvent: RuntimeEvent;
  outputEvent: RuntimeEvent | null;
  timestamp: number;
  durationMs: number;
}

export interface EventLogEntry {
  id: string;
  traceId: string;
  nodeId: string;
  nodeLabel: string;
  nodeType: string;
  event: RuntimeEvent;
  direction: 'in' | 'out';
  timestamp: number;
}

export interface ErrorEntry {
  id: string;
  nodeId: string;
  message: string;
  timestamp: number;
}

export interface RequestEntry {
  id: string;
  nodeId: string;
  method: string;
  endpoint: string;
  status?: number;
  durationMs: number;
  ok: boolean;
  timestamp: number;
}

type PauseResolver = (action: 'resume' | 'step') => void;

export interface DebugState {
  panelOpen: boolean;
  panelHeight: number;
  activeTab: 'flow' | 'data' | 'console';

  /** 流程图页右侧「数据」侧栏 */
  flowDataSidebarOpen: boolean;
  flowDataSidebarWidth: number;

  /** 调试 FAB：距视口右边、下边的距离（px） */
  fabRight: number;
  fabBottom: number;

  breakpoints: Set<string>;

  paused: boolean;
  pausedAtNodeId: string | null;
  pausedEvent: RuntimeEvent | null;
  currentTraceId: string | null;
  stepping: boolean;

  traceEntries: TraceEntry[];

  reachableNodeIds: Set<string>;
  reachableEdgeIds: Set<string>;
  /** 当前断点步：从上游指向下游的那条边（动画虚线高亮） */
  stepHighlightEdgeIds: Set<string>;

  /** 本次传播起点（生命周期入口组件节点 / 定时器节点等），用于区分「已走路径」与「图论不可达」 */
  propagationOriginNodeId: string | null;

  eventLog: EventLogEntry[];
  errors: ErrorEntry[];
  requests: RequestEntry[];

  _pauseResolver: PauseResolver | null;

  togglePanel: () => void;
  setPanelHeight: (h: number) => void;
  setActiveTab: (tab: DebugState['activeTab']) => void;
  setFlowDataSidebarOpen: (open: boolean) => void;
  setFlowDataSidebarWidth: (w: number) => void;
  setFabPosition: (right: number, bottom: number) => void;
  toggleBreakpoint: (nodeId: string) => void;
  clearBreakpoints: () => void;
  resume: () => void;
  stepOver: () => void;
  clearTrace: () => void;
  clearErrors: () => void;
  clearRequests: () => void;

  _setPaused: (nodeId: string, event: RuntimeEvent, resolver: PauseResolver) => void;
  _clearPaused: () => void;
  _addTraceEntry: (entry: TraceEntry) => void;
  _setTraceId: (traceId: string) => void;
  _setReachable: (nodeIds: Set<string>, edgeIds: Set<string>, stepEdgeIds?: Set<string>) => void;
  _setPropagationOrigin: (nodeId: string | null) => void;
  _addEventLog: (entry: EventLogEntry) => void;
  _addError: (entry: ErrorEntry) => void;
  _addRequest: (entry: RequestEntry) => void;
}

const MAX_EVENT_LOG = 500;
const MAX_ERRORS = 200;
const MAX_REQUESTS = 200;

const FAB_SIZE = 44;
const FAB_PAD = 8;

const clampFabIntoViewport = (
  right: number,
  bottom: number,
  panelOpen: boolean,
  panelHeight: number,
): { fabRight: number; fabBottom: number } => {
  if (typeof window === 'undefined') {
    return { fabRight: right, fabBottom: bottom };
  }
  const maxR = Math.max(FAB_PAD, window.innerWidth - FAB_SIZE - FAB_PAD);
  const maxB = Math.max(FAB_PAD, window.innerHeight - FAB_SIZE - FAB_PAD);
  const minB = panelOpen
    ? Math.min(maxB, Math.max(FAB_PAD, panelHeight + 16))
    : FAB_PAD;
  return {
    fabRight: Math.max(FAB_PAD, Math.min(maxR, right)),
    fabBottom: Math.max(minB, Math.min(maxB, bottom)),
  };
};

export const useDebugStore = create<DebugState>((set, get) => ({
  panelOpen: false,
  panelHeight: 320,
  activeTab: 'flow',

  flowDataSidebarOpen: true,
  flowDataSidebarWidth: 300,

  fabRight: 24,
  fabBottom: 24,

  breakpoints: new Set<string>(),

  paused: false,
  pausedAtNodeId: null,
  pausedEvent: null,
  currentTraceId: null,
  stepping: false,

  traceEntries: [],

  reachableNodeIds: new Set<string>(),
  reachableEdgeIds: new Set<string>(),
  stepHighlightEdgeIds: new Set<string>(),

  propagationOriginNodeId: null,

  eventLog: [],
  errors: [],
  requests: [],

  _pauseResolver: null,

  togglePanel: () => {
    const s = get();
    if (!s.panelOpen) {
      set({ panelOpen: true });
      const opened = get();
      const cOpen = clampFabIntoViewport(opened.fabRight, opened.fabBottom, true, opened.panelHeight);
      if (cOpen.fabRight !== opened.fabRight || cOpen.fabBottom !== opened.fabBottom) {
        set({ fabRight: cOpen.fabRight, fabBottom: cOpen.fabBottom });
      }
      return;
    }
    // 关闭面板：放行当前断点、退出单步；面板关闭期间不再进入断点（见 InstrumentedFlowRuntime shouldBreak）
    if (s.paused && s._pauseResolver) {
      s._pauseResolver('resume');
    }
    set({
      panelOpen: false,
      stepping: false,
      ...(s.paused
        ? {
            paused: false,
            pausedAtNodeId: null,
            pausedEvent: null,
            _pauseResolver: null,
            reachableNodeIds: new Set(),
            reachableEdgeIds: new Set(),
            stepHighlightEdgeIds: new Set(),
          }
        : {}),
    });
    const next = get();
    const c = clampFabIntoViewport(next.fabRight, next.fabBottom, false, next.panelHeight);
    if (c.fabRight !== next.fabRight || c.fabBottom !== next.fabBottom) {
      set({ fabRight: c.fabRight, fabBottom: c.fabBottom });
    }
  },

  setPanelHeight: (h) => {
    const clamped = Math.max(200, Math.min(h, window.innerHeight * 0.7));
    set({ panelHeight: clamped });
  },

  setActiveTab: (tab) => set({ activeTab: tab }),

  setFlowDataSidebarOpen: (open) => set({ flowDataSidebarOpen: open }),

  setFlowDataSidebarWidth: (w) => {
    set({ flowDataSidebarWidth: Math.max(200, w) });
  },

  setFabPosition: (right, bottom) => {
    const { panelOpen, panelHeight } = get();
    const c = clampFabIntoViewport(right, bottom, panelOpen, panelHeight);
    set({ fabRight: c.fabRight, fabBottom: c.fabBottom });
  },

  toggleBreakpoint: (nodeId) => set((s) => {
    const next = new Set(s.breakpoints);
    if (next.has(nodeId)) {
      next.delete(nodeId);
    } else {
      next.add(nodeId);
    }
    return { breakpoints: next };
  }),

  clearBreakpoints: () => set({ breakpoints: new Set() }),

  resume: () => {
    const { _pauseResolver } = get();
    if (_pauseResolver) {
      _pauseResolver('resume');
    }
    set({
      paused: false,
      pausedAtNodeId: null,
      pausedEvent: null,
      stepping: false,
      _pauseResolver: null,
      reachableNodeIds: new Set(),
      reachableEdgeIds: new Set(),
      stepHighlightEdgeIds: new Set(),
    });
  },

  stepOver: () => {
    const { _pauseResolver } = get();
    if (_pauseResolver) {
      _pauseResolver('step');
    }
    set({
      paused: false,
      pausedAtNodeId: null,
      pausedEvent: null,
      stepping: true,
      _pauseResolver: null,
      reachableNodeIds: new Set(),
      reachableEdgeIds: new Set(),
      stepHighlightEdgeIds: new Set(),
    });
  },

  clearTrace: () => set({ traceEntries: [], currentTraceId: null }),

  _setPropagationOrigin: (nodeId) => set({ propagationOriginNodeId: nodeId }),
  clearErrors: () => set({ errors: [] }),
  clearRequests: () => set({ requests: [] }),

  _setPaused: (nodeId, event, resolver) => set({
    paused: true,
    pausedAtNodeId: nodeId,
    pausedEvent: event,
    _pauseResolver: resolver,
  }),

  _clearPaused: () => set({
    paused: false,
    pausedAtNodeId: null,
    pausedEvent: null,
    stepping: false,
    _pauseResolver: null,
    reachableNodeIds: new Set(),
    reachableEdgeIds: new Set(),
    stepHighlightEdgeIds: new Set(),
    propagationOriginNodeId: null,
  }),

  _addTraceEntry: (entry) => set((s) => ({
    traceEntries: [...s.traceEntries, entry],
  })),

  _setTraceId: (traceId) => set({ currentTraceId: traceId }),

  _setReachable: (nodeIds, edgeIds, stepEdgeIds) => set({
    reachableNodeIds: nodeIds,
    reachableEdgeIds: edgeIds,
    stepHighlightEdgeIds: stepEdgeIds ?? new Set(),
  }),

  _addEventLog: (entry) => set((s) => {
    const next = [...s.eventLog, entry];
    return { eventLog: next.length > MAX_EVENT_LOG ? next.slice(-MAX_EVENT_LOG) : next };
  }),

  _addError: (entry) => set((s) => {
    const next = [...s.errors, entry];
    return { errors: next.length > MAX_ERRORS ? next.slice(-MAX_ERRORS) : next };
  }),

  _addRequest: (entry) => set((s) => {
    const next = [...s.requests, entry];
    return { requests: next.length > MAX_REQUESTS ? next.slice(-MAX_REQUESTS) : next };
  }),
}));
