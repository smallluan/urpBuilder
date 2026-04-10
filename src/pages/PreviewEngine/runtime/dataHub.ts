import cloneDeep from 'lodash/cloneDeep';
import { DialogPlugin, MessagePlugin } from 'tdesign-react';
import type { UiTreeNode } from '../../../builder/store/types';
import requestClient from '../../../api/request';
import { getAccessToken, migrateLegacyToken } from '../../../auth/storage';

const DEFAULT_SCOPE_ID = 'root';

export const composeComponentRef = (scopeId: string, componentKey: string) => {
  const normalizedScope = String(scopeId || DEFAULT_SCOPE_ID).trim() || DEFAULT_SCOPE_ID;
  const normalizedKey = String(componentKey || '').trim();
  return normalizedKey ? `${normalizedScope}::${normalizedKey}` : '';
};

export interface ComponentStateRecord {
  ref: string;
  scopeId: string;
  key: string;
  label: string;
  type?: string;
  lifetimes: string[];
  props: Record<string, unknown>;
}

export type ComponentPatch = Record<string, unknown>;

export interface DataHubRouterState {
  path: string;
  routeId?: string;
  matched: boolean;
}

export interface DataHubRouterContext {
  current: () => DataHubRouterState;
  push: (path: string, params?: Record<string, unknown>) => boolean;
  replace: (path: string, params?: Record<string, unknown>) => boolean;
  back: () => void;
  subscribe: (handler: (state: DataHubRouterState) => void) => () => void;
}

export interface DataHubCloudInvokeOptions {
  endpoint?: string;
  timeoutMs?: number;
  headers?: Record<string, string>;
}

export interface DataHubCloudContext {
  invoke: (functionIdOrName: string, payload?: unknown, options?: DataHubCloudInvokeOptions) => Promise<unknown>;
}

export type DataHubMessageType = 'info' | 'success' | 'warning' | 'error';

export interface DataHubMessageOptions {
  type?: DataHubMessageType;
  duration?: number;
  closeBtn?: boolean;
}

export interface DataHubDialogOptions {
  title?: string;
  content?: string;
  confirmText?: string;
  cancelText?: string;
  theme?: string;
  closeOnOverlayClick?: boolean;
}

export interface DataHubMessageContext {
  (content: string, options?: DataHubMessageOptions): void;
  info: (content: string, options?: Omit<DataHubMessageOptions, 'type'>) => void;
  success: (content: string, options?: Omit<DataHubMessageOptions, 'type'>) => void;
  warning: (content: string, options?: Omit<DataHubMessageOptions, 'type'>) => void;
  error: (content: string, options?: Omit<DataHubMessageOptions, 'type'>) => void;
}

export interface DataHubDialogContext {
  alert: (contentOrOptions: string | DataHubDialogOptions) => Promise<void>;
  confirm: (contentOrOptions: string | DataHubDialogOptions) => Promise<boolean>;
}

/** 仅内存的临时状态（刷新即失），按 scope 隔离 */
export interface DataHubMemoryStorage {
  get: (key: string) => unknown;
  set: (key: string, value: unknown) => void;
  remove: (key: string) => void;
  clear: () => void;
}

/** sessionStorage / localStorage 封装，key 自动加前缀，值支持 JSON 可序列化对象 */
export interface DataHubWebStorageSlice {
  get: (key: string) => unknown;
  set: (key: string, value: unknown) => void;
  remove: (key: string) => void;
  clear: () => void;
}

export interface DataHubStorageContext {
  memory: DataHubMemoryStorage;
  session: DataHubWebStorageSlice;
  local: DataHubWebStorageSlice;
}

/** 代码节点内允许使用的宿主能力（勿直接使用全局 fetch / window） */
export interface DataHubRuntimeContext {
  fetch: typeof fetch;
  console: Pick<Console, 'log' | 'info' | 'warn' | 'error' | 'debug'>;
  setTimeout: typeof setTimeout;
  clearTimeout: typeof clearTimeout;
  setInterval: typeof setInterval;
  clearInterval: typeof clearInterval;
}

export interface DataHubCodeContext {
  scopeId: string;
  composeRef: (componentKey: string) => string;
  getComponentStateByRef: (componentRef: string) => ComponentStateRecord | undefined;
  getComponentPropByRef: (componentRef: string, propKey: string) => unknown;
  getComponentState: (componentKey: string) => ComponentStateRecord | undefined;
  getComponentProp: (componentKey: string, propKey: string) => unknown;
  getAllComponentStates: () => ComponentStateRecord[];
  message: DataHubMessageContext;
  dialog: DataHubDialogContext;
  router: DataHubRouterContext;
  cloud: DataHubCloudContext;
  /** 临时 / 会话 / 持久存储（按 scope 隔离），替代直接访问 localStorage */
  storage: DataHubStorageContext;
  /** 白名单宿主 API（网络、定时器等），替代 window 上的同名全局 */
  runtime: DataHubRuntimeContext;
}

type DataHubEventHandler = (payload: unknown) => void;

const safeMessage = (type: DataHubMessageType, content: string, options?: Omit<DataHubMessageOptions, 'type'>) => {
  const payload = {
    content,
    duration: options?.duration,
    closeBtn: options?.closeBtn,
  };
  try {
    if (type === 'success') {
      MessagePlugin.success(payload as any);
      return;
    }
    if (type === 'warning') {
      MessagePlugin.warning(payload as any);
      return;
    }
    if (type === 'error') {
      MessagePlugin.error(payload as any);
      return;
    }
    MessagePlugin.info(payload as any);
  } catch {
    // fallback: when UI plugin is unavailable, avoid breaking runtime script
    // eslint-disable-next-line no-console
    console.info(`[dataHub.message.${type}]`, content);
  }
};

const createMessageContext = (): DataHubMessageContext => {
  const message = ((content: string, options?: DataHubMessageOptions) => {
    const normalizedContent = String(content ?? '');
    safeMessage(options?.type ?? 'info', normalizedContent, options);
  }) as DataHubMessageContext;

  message.info = (content, options) => safeMessage('info', String(content ?? ''), options);
  message.success = (content, options) => safeMessage('success', String(content ?? ''), options);
  message.warning = (content, options) => safeMessage('warning', String(content ?? ''), options);
  message.error = (content, options) => safeMessage('error', String(content ?? ''), options);
  return message;
};

const normalizeDialogOptions = (
  contentOrOptions: string | DataHubDialogOptions,
  defaultTitle: string,
): Required<Pick<DataHubDialogOptions, 'title' | 'content' | 'confirmText' | 'cancelText'>> & DataHubDialogOptions => {
  if (typeof contentOrOptions === 'string') {
    return {
      title: defaultTitle,
      content: contentOrOptions,
      confirmText: '确定',
      cancelText: '取消',
    };
  }

  return {
    title: String(contentOrOptions.title ?? defaultTitle),
    content: String(contentOrOptions.content ?? ''),
    confirmText: String(contentOrOptions.confirmText ?? '确定'),
    cancelText: String(contentOrOptions.cancelText ?? '取消'),
    ...contentOrOptions,
  };
};

const createDialogContext = (): DataHubDialogContext => {
  const alert: DataHubDialogContext['alert'] = (contentOrOptions) =>
    new Promise<void>((resolve) => {
      const options = normalizeDialogOptions(contentOrOptions, '提示');
      try {
        const dialog = DialogPlugin.alert({
          header: options.title,
          body: options.content,
          confirmBtn: options.confirmText,
          closeOnOverlayClick: options.closeOnOverlayClick ?? true,
          theme: options.theme as any,
          onConfirm: () => {
            dialog.destroy();
            resolve();
          },
          onCloseBtnClick: () => {
            dialog.destroy();
            resolve();
          },
          onCancel: () => {
            dialog.destroy();
            resolve();
          },
        });
      } catch {
        if (typeof window !== 'undefined') {
          window.alert(options.content);
        }
        resolve();
      }
    });

  const confirm: DataHubDialogContext['confirm'] = (contentOrOptions) =>
    new Promise<boolean>((resolve) => {
      const options = normalizeDialogOptions(contentOrOptions, '请确认');
      try {
        const dialog = DialogPlugin.confirm({
          header: options.title,
          body: options.content,
          confirmBtn: options.confirmText,
          cancelBtn: options.cancelText,
          closeOnOverlayClick: options.closeOnOverlayClick ?? true,
          theme: options.theme as any,
          onConfirm: () => {
            dialog.destroy();
            resolve(true);
          },
          onCancel: () => {
            dialog.destroy();
            resolve(false);
          },
          onCloseBtnClick: () => {
            dialog.destroy();
            resolve(false);
          },
        });
      } catch {
        if (typeof window !== 'undefined') {
          resolve(window.confirm(options.content));
          return;
        }
        resolve(false);
      }
    });

  return { alert, confirm };
};

const toPropsRecord = (node: UiTreeNode): Record<string, unknown> => {
  const source = (node.props ?? {}) as Record<string, unknown>;
  const entries = Object.entries(source).map(([propKey, schema]) => {
    const value = (schema as { value?: unknown } | null | undefined)?.value;
    return [propKey, value];
  });

  return Object.fromEntries(entries);
};

const collectNodeMaps = (root: UiTreeNode, scopeId: string) => {
  const keyMap = new Map<string, UiTreeNode>();
  const refMap = new Map<string, UiTreeNode>();

  const walk = (node: UiTreeNode) => {
    const key = String(node.key ?? '').trim();
    if (key && !keyMap.has(key)) {
      keyMap.set(key, node);
    }

    const componentRef = composeComponentRef(scopeId, key);
    if (componentRef) {
      refMap.set(componentRef, node);
    }

    (node.children ?? []).forEach(walk);
  };

  walk(root);
  return { keyMap, refMap };
};

const serializeStorageValue = (value: unknown): string => {
  if (typeof value === 'string') {
    return value;
  }
  return JSON.stringify(value ?? null);
};

const deserializeStorageValue = (raw: string | null): unknown => {
  if (raw == null) {
    return null;
  }
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return raw;
  }
};

const createRuntimeContext = (): DataHubRuntimeContext => ({
  fetch: (input: RequestInfo | URL, init?: RequestInit) => fetch(input, init),
  console: {
    log: (...args: unknown[]) => console.log(...args),
    info: (...args: unknown[]) => console.info(...args),
    warn: (...args: unknown[]) => console.warn(...args),
    error: (...args: unknown[]) => console.error(...args),
    debug: (...args: unknown[]) => console.debug(...args),
  },
  setTimeout: (...args: Parameters<typeof setTimeout>) => setTimeout(...args),
  clearTimeout: (...args: Parameters<typeof clearTimeout>) => clearTimeout(...args),
  setInterval: (...args: Parameters<typeof setInterval>) => setInterval(...args),
  clearInterval: (...args: Parameters<typeof clearInterval>) => clearInterval(...args),
});

const collectStateMaps = (root: UiTreeNode, scopeId: string) => {
  const keyMap = new Map<string, ComponentStateRecord>();
  const refMap = new Map<string, ComponentStateRecord>();

  const walk = (node: UiTreeNode) => {
    const key = String(node.key ?? '').trim();
    const componentRef = composeComponentRef(scopeId, key);
    const state: ComponentStateRecord = {
      ref: componentRef,
      scopeId,
      key,
      label: String(node.label ?? '未命名组件'),
      type: node.type,
      lifetimes: Array.isArray(node.lifetimes) ? node.lifetimes.map((item) => String(item)) : [],
      props: toPropsRecord(node),
    };

    if (key && !keyMap.has(key)) {
      keyMap.set(key, state);
    }

    if (componentRef) {
      refMap.set(componentRef, state);
    }

    (node.children ?? []).forEach(walk);
  };

  walk(root);
  return { keyMap, refMap };
};

export class PreviewDataHub {
  private readonly treeRoot: UiTreeNode;

  private readonly scopeId: string;

  private readonly nodeKeyMap: Map<string, UiTreeNode>;

  private readonly nodeRefMap: Map<string, UiTreeNode>;

  private readonly stateKeyMap: Map<string, ComponentStateRecord>;

  private readonly stateRefMap: Map<string, ComponentStateRecord>;

  private readonly eventMap = new Map<string, Set<DataHubEventHandler>>();

  private readonly routerContext: DataHubRouterContext;

  private readonly cloudContext: DataHubCloudContext;

  private readonly messageContext: DataHubMessageContext;

  private readonly dialogContext: DataHubDialogContext;

  /** 代码节点 storage.memory 后端 */
  private readonly memoryStore = new Map<string, unknown>();

  constructor(uiTreeData: UiTreeNode, options?: { scopeId?: string; router?: DataHubRouterContext; cloud?: DataHubCloudContext }) {
    this.treeRoot = cloneDeep(uiTreeData);
    this.scopeId = String(options?.scopeId ?? DEFAULT_SCOPE_ID).trim() || DEFAULT_SCOPE_ID;
    const nodeMaps = collectNodeMaps(this.treeRoot, this.scopeId);
    const stateMaps = collectStateMaps(this.treeRoot, this.scopeId);
    this.nodeKeyMap = nodeMaps.keyMap;
    this.nodeRefMap = nodeMaps.refMap;
    this.stateKeyMap = stateMaps.keyMap;
    this.stateRefMap = stateMaps.refMap;
    this.routerContext = options?.router ?? {
      current: () => ({ path: '/', matched: true }),
      push: () => false,
      replace: () => false,
      back: () => {
        window.history.back();
      },
      subscribe: () => () => {},
    };
    this.cloudContext = options?.cloud ?? {
      invoke: async (functionIdOrName, payload, invokeOptions) => {
        const identifier = String(functionIdOrName ?? '').trim();
        if (!identifier) {
          throw new Error('cloud.invoke 需要提供函数标识（id 或名称）');
        }

        const timeoutMs = Number.isFinite(Number(invokeOptions?.timeoutMs))
          ? Math.max(100, Math.round(Number(invokeOptions?.timeoutMs)))
          : 10000;
        const customHeaders = (invokeOptions?.headers ?? {}) as Record<string, string>;
        const token = getAccessToken() || migrateLegacyToken();
        const hasAuthHeader = Boolean(customHeaders.Authorization || customHeaders.authorization);
        const requestHeaders = hasAuthHeader
          ? customHeaders
          : (token ? { ...customHeaders, Authorization: `Bearer ${token}` } : customHeaders);

        try {
          const response = await requestClient.post('/cloud-functions/' + encodeURIComponent(identifier) + '/execute', {
            payload: payload ?? {},
          }, {
            timeout: timeoutMs,
            headers: requestHeaders,
          });
          return (response.data as { data?: unknown })?.data;
        } catch (error) {
          const message = (error as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message
            || (error as { message?: string })?.message
            || '云函数调用失败';
          throw new Error(message);
        }
      },
    };
    this.messageContext = createMessageContext();
    this.dialogContext = createDialogContext();
  }

  getScopeId() {
    return this.scopeId;
  }

  toComponentRef(componentKey: string) {
    return composeComponentRef(this.scopeId, componentKey);
  }

  getComponentStateByRef(componentRef: string): ComponentStateRecord | undefined {
    const state = this.stateRefMap.get(String(componentRef ?? '').trim());
    return state ? cloneDeep(state) : undefined;
  }

  getComponentPropByRef(componentRef: string, propKey: string): unknown {
    return this.stateRefMap.get(String(componentRef ?? '').trim())?.props?.[propKey];
  }

  getComponentState(componentKey: string): ComponentStateRecord | undefined {
    const normalizedRef = String(componentKey ?? '').trim();
    const directRefState = this.stateRefMap.get(normalizedRef);
    if (directRefState) {
      return cloneDeep(directRefState);
    }

    const state = this.stateKeyMap.get(normalizedRef);
    return state ? cloneDeep(state) : undefined;
  }

  getComponentProp(componentKey: string, propKey: string): unknown {
    const normalizedRef = String(componentKey ?? '').trim();
    return this.stateRefMap.get(normalizedRef)?.props?.[propKey]
      ?? this.stateKeyMap.get(normalizedRef)?.props?.[propKey];
  }

  getAllComponentStates(): ComponentStateRecord[] {
    return Array.from(this.stateRefMap.values()).map((item) => cloneDeep(item));
  }

  applyComponentPatchByRef(componentRef: string, patch: ComponentPatch): boolean {
    const normalizedRef = String(componentRef ?? '').trim();
    const targetNode = this.nodeRefMap.get(normalizedRef);
    const targetState = this.stateRefMap.get(normalizedRef);
    if (!targetNode || !targetState || !patch || typeof patch !== 'object' || Array.isArray(patch)) {
      return false;
    }

    return this.applyPatchToTarget(targetNode, targetState, normalizedRef, patch);
  }

  applyComponentPatch(componentKey: string, patch: ComponentPatch): boolean {
    const normalizedRef = String(componentKey ?? '').trim();
    const targetNode = this.nodeRefMap.get(normalizedRef) ?? this.nodeKeyMap.get(normalizedRef);
    const targetState = this.stateRefMap.get(normalizedRef) ?? this.stateKeyMap.get(normalizedRef);
    if (!targetNode || !targetState || !patch || typeof patch !== 'object' || Array.isArray(patch)) {
      return false;
    }

    const ref = targetState.ref || this.toComponentRef(targetState.key);
    return this.applyPatchToTarget(targetNode, targetState, ref, patch);
  }

  private applyPatchToTarget(
    targetNode: UiTreeNode,
    targetState: ComponentStateRecord,
    componentRef: string,
    patch: ComponentPatch,
  ): boolean {

    const normalizedPatch = { ...(patch as Record<string, unknown>) };
    if (!('visible' in normalizedPatch) && 'isible' in normalizedPatch) {
      normalizedPatch.visible = normalizedPatch.isible;
    }

    const propsMap = (targetNode.props ?? {}) as Record<string, unknown>;
    let hasChanged = false;
    Object.entries(normalizedPatch).forEach(([propKey, nextValue]) => {
      const currentSchema = (propsMap[propKey] ?? {}) as Record<string, unknown>;
      const previousValue = (currentSchema as { value?: unknown }).value;
      if (Object.is(previousValue, nextValue)) {
        return;
      }

      hasChanged = true;
      propsMap[propKey] = {
        ...currentSchema,
        value: nextValue,
      };
      targetState.props[propKey] = nextValue;
    });

    if (!hasChanged) {
      return false;
    }

    targetNode.props = propsMap;
    this.publish('component:patched', {
      componentRef,
      componentKey: targetState.key,
      patch: cloneDeep(normalizedPatch),
    });

    return true;
  }

  subscribe(eventName: string, handler: DataHubEventHandler): () => void {
    const set = this.eventMap.get(eventName) ?? new Set<DataHubEventHandler>();
    set.add(handler);
    this.eventMap.set(eventName, set);

    return () => {
      const current = this.eventMap.get(eventName);
      if (!current) {
        return;
      }
      current.delete(handler);
      if (current.size === 0) {
        this.eventMap.delete(eventName);
      }
    };
  }

  publish(eventName: string, payload: unknown): void {
    const handlers = this.eventMap.get(eventName);
    if (!handlers || handlers.size === 0) {
      return;
    }

    handlers.forEach((handler) => handler(payload));
  }

  private memStorageKey(key: string): string {
    return `mem:${this.scopeId}:${String(key)}`;
  }

  private webStoragePrefix(kind: 'sess' | 'loc'): string {
    return `urpbuilder:dh:${this.scopeId}:${kind}:`;
  }

  private clearWebStorage(kind: 'sess' | 'loc'): void {
    if (typeof window === 'undefined') {
      return;
    }
    const store = kind === 'sess' ? window.sessionStorage : window.localStorage;
    const prefix = this.webStoragePrefix(kind);
    const toRemove: string[] = [];
    for (let i = 0; i < store.length; i += 1) {
      const k = store.key(i);
      if (k?.startsWith(prefix)) {
        toRemove.push(k);
      }
    }
    toRemove.forEach((k) => store.removeItem(k));
  }

  private createStorageContext(): DataHubStorageContext {
    const scopeId = this.scopeId;

    const memory: DataHubMemoryStorage = {
      get: (key) => {
        const v = this.memoryStore.get(this.memStorageKey(key));
        return v === undefined ? undefined : cloneDeep(v);
      },
      set: (key, value) => {
        this.memoryStore.set(this.memStorageKey(key), cloneDeep(value));
      },
      remove: (key) => {
        this.memoryStore.delete(this.memStorageKey(key));
      },
      clear: () => {
        const p = `mem:${scopeId}:`;
        for (const k of [...this.memoryStore.keys()]) {
          if (k.startsWith(p)) {
            this.memoryStore.delete(k);
          }
        }
      },
    };

    const makeWeb = (kind: 'sess' | 'loc'): DataHubWebStorageSlice => ({
      get: (key) => {
        if (typeof window === 'undefined') {
          return null;
        }
        const store = kind === 'sess' ? window.sessionStorage : window.localStorage;
        const raw = store.getItem(this.webStoragePrefix(kind) + encodeURIComponent(String(key)));
        return deserializeStorageValue(raw);
      },
      set: (key, value) => {
        if (typeof window === 'undefined') {
          return;
        }
        const store = kind === 'sess' ? window.sessionStorage : window.localStorage;
        const fullKey = this.webStoragePrefix(kind) + encodeURIComponent(String(key));
        try {
          store.setItem(fullKey, serializeStorageValue(value));
        } catch {
          /* quota / private mode */
        }
      },
      remove: (key) => {
        if (typeof window === 'undefined') {
          return;
        }
        const store = kind === 'sess' ? window.sessionStorage : window.localStorage;
        store.removeItem(this.webStoragePrefix(kind) + encodeURIComponent(String(key)));
      },
      clear: () => {
        this.clearWebStorage(kind);
      },
    });

    return {
      memory,
      session: makeWeb('sess'),
      local: makeWeb('loc'),
    };
  }

  createCodeContext(): DataHubCodeContext {
    return {
      scopeId: this.scopeId,
      composeRef: (componentKey) => this.toComponentRef(componentKey),
      getComponentStateByRef: (componentRef) => this.getComponentStateByRef(componentRef),
      getComponentPropByRef: (componentRef, propKey) => this.getComponentPropByRef(componentRef, propKey),
      getComponentState: (componentKey) => this.getComponentState(componentKey),
      getComponentProp: (componentKey, propKey) => this.getComponentProp(componentKey, propKey),
      getAllComponentStates: () => this.getAllComponentStates(),
      message: this.messageContext,
      dialog: this.dialogContext,
      router: this.routerContext,
      cloud: this.cloudContext,
      storage: this.createStorageContext(),
      runtime: createRuntimeContext(),
    };
  }

  getTreeSnapshot(): UiTreeNode {
    return cloneDeep(this.treeRoot);
  }
}

export const createPreviewDataHub = (
  uiTreeData: UiTreeNode,
  options?: { scopeId?: string; router?: DataHubRouterContext; cloud?: DataHubCloudContext },
) =>
  new PreviewDataHub(uiTreeData, options);

declare global {
  interface Window {
    dataHub?: PreviewDataHub;
  }
}
