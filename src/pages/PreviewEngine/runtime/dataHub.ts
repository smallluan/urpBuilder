import cloneDeep from 'lodash/cloneDeep';
import type { UiTreeNode } from '../../BuilderCore/store/types';

export interface ComponentStateRecord {
  key: string;
  label: string;
  type?: string;
  lifetimes: string[];
  props: Record<string, unknown>;
}

export type ComponentPatch = Record<string, unknown>;

export interface DataHubCodeContext {
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

const collectNodeMap = (root: UiTreeNode) => {
  const map = new Map<string, UiTreeNode>();

  const walk = (node: UiTreeNode) => {
    map.set(node.key, node);
    (node.children ?? []).forEach(walk);
  };

  walk(root);
  return map;
};

const collectStateMap = (root: UiTreeNode) => {
  const map = new Map<string, ComponentStateRecord>();

  const walk = (node: UiTreeNode) => {
    map.set(node.key, {
      key: node.key,
      label: String(node.label ?? '未命名组件'),
      type: node.type,
      lifetimes: Array.isArray(node.lifetimes) ? node.lifetimes.map((item) => String(item)) : [],
      props: toPropsRecord(node),
    });
    (node.children ?? []).forEach(walk);
  };

  walk(root);
  return map;
};

export class PreviewDataHub {
  private readonly treeRoot: UiTreeNode;

  private readonly nodeMap: Map<string, UiTreeNode>;

  private readonly stateMap: Map<string, ComponentStateRecord>;

  private readonly eventMap = new Map<string, Set<DataHubEventHandler>>();

  constructor(uiTreeData: UiTreeNode) {
    this.treeRoot = cloneDeep(uiTreeData);
    this.nodeMap = collectNodeMap(this.treeRoot);
    this.stateMap = collectStateMap(this.treeRoot);
  }

  getComponentState(componentKey: string): ComponentStateRecord | undefined {
    const state = this.stateMap.get(componentKey);
    return state ? cloneDeep(state) : undefined;
  }

  getComponentProp(componentKey: string, propKey: string): unknown {
    return this.stateMap.get(componentKey)?.props?.[propKey];
  }

  getAllComponentStates(): ComponentStateRecord[] {
    return Array.from(this.stateMap.values()).map((item) => cloneDeep(item));
  }

  applyComponentPatch(componentKey: string, patch: ComponentPatch): boolean {
    const targetNode = this.nodeMap.get(componentKey);
    const targetState = this.stateMap.get(componentKey);
    if (!targetNode || !targetState || !patch || typeof patch !== 'object' || Array.isArray(patch)) {
      return false;
    }

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
      componentKey,
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
      getComponentState: (componentKey) => this.getComponentState(componentKey),
      getComponentProp: (componentKey, propKey) => this.getComponentProp(componentKey, propKey),
      getAllComponentStates: () => this.getAllComponentStates(),
    };
  }

  getTreeSnapshot(): UiTreeNode {
    return cloneDeep(this.treeRoot);
  }
}

export const createPreviewDataHub = (uiTreeData: UiTreeNode) => new PreviewDataHub(uiTreeData);

declare global {
  interface Window {
    dataHub?: PreviewDataHub;
  }
}
