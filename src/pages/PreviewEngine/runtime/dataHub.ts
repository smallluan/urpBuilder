import cloneDeep from 'lodash/cloneDeep';
import type { UiTreeNode } from '../../../builder/store/types';

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

export interface DataHubCodeContext {
  scopeId: string;
  composeRef: (componentKey: string) => string;
  getComponentStateByRef: (componentRef: string) => ComponentStateRecord | undefined;
  getComponentPropByRef: (componentRef: string, propKey: string) => unknown;
  getComponentState: (componentKey: string) => ComponentStateRecord | undefined;
  getComponentProp: (componentKey: string, propKey: string) => unknown;
  getAllComponentStates: () => ComponentStateRecord[];
}

type DataHubEventHandler = (payload: unknown) => void;

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

  constructor(uiTreeData: UiTreeNode, options?: { scopeId?: string }) {
    this.treeRoot = cloneDeep(uiTreeData);
    this.scopeId = String(options?.scopeId ?? DEFAULT_SCOPE_ID).trim() || DEFAULT_SCOPE_ID;
    const nodeMaps = collectNodeMaps(this.treeRoot, this.scopeId);
    const stateMaps = collectStateMaps(this.treeRoot, this.scopeId);
    this.nodeKeyMap = nodeMaps.keyMap;
    this.nodeRefMap = nodeMaps.refMap;
    this.stateKeyMap = stateMaps.keyMap;
    this.stateRefMap = stateMaps.refMap;
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

  createCodeContext(): DataHubCodeContext {
    return {
      scopeId: this.scopeId,
      composeRef: (componentKey) => this.toComponentRef(componentKey),
      getComponentStateByRef: (componentRef) => this.getComponentStateByRef(componentRef),
      getComponentPropByRef: (componentRef, propKey) => this.getComponentPropByRef(componentRef, propKey),
      getComponentState: (componentKey) => this.getComponentState(componentKey),
      getComponentProp: (componentKey, propKey) => this.getComponentProp(componentKey, propKey),
      getAllComponentStates: () => this.getAllComponentStates(),
    };
  }

  getTreeSnapshot(): UiTreeNode {
    return cloneDeep(this.treeRoot);
  }
}

export const createPreviewDataHub = (uiTreeData: UiTreeNode, options?: { scopeId?: string }) =>
  new PreviewDataHub(uiTreeData, options);

declare global {
  interface Window {
    dataHub?: PreviewDataHub;
  }
}
