import type { Edge, Node } from '@xyflow/react';

export type ScreenSize = string | number;
export type StateAction<T> = T | ((previous: T) => T);

export interface UiTreeNode {
  key: string;
  value?: string | number;
  label: string;
  type?: string;
  props?: Record<string, unknown>;
  lifetimes?: string[];
  children?: UiTreeNode[];
}

export interface UiTreeInstance {
  appendTo: (value: string | number, newData: UiTreeNode | UiTreeNode[]) => void;
  getItem: (value: string | number) => { data: UiTreeNode } | undefined;
}

export interface AddHistoryAction {
  type: 'add';
  parentKey: string;
  index: number;
  nodeRef: string;
  nodeKey: string;
  nodeLabel: string;
  nodeType?: string;
  timestamp: number;
}

export interface RemoveHistoryAction {
  type: 'remove';
  parentKey: string;
  index: number;
  nodeRef: string;
  nodeKey: string;
  nodeLabel: string;
  nodeType?: string;
  timestamp: number;
}

export interface UpdateLabelHistoryAction {
  type: 'update-label';
  nodeKey: string;
  nodeType?: string;
  prevLabel: string;
  nextLabel: string;
  timestamp: number;
}

export interface UpdatePropHistoryAction {
  type: 'update-prop';
  nodeKey: string;
  nodeLabel: string;
  nodeType?: string;
  propKey: string;
  prevValue: unknown;
  nextValue: unknown;
  timestamp: number;
}

export type UiHistoryAction =
  | AddHistoryAction
  | RemoveHistoryAction
  | UpdateLabelHistoryAction
  | UpdatePropHistoryAction;

export interface UiHistoryState {
  pointer: number;
  actions: UiHistoryAction[];
}

export interface CreateComponentStore {
  screenSize: ScreenSize;
  autoWidth: number;
  flowNodes: Node[];
  flowEdges: Edge[];
  uiPageData: UiTreeNode;
  activeNodeKey: string | null;
  activeNode: UiTreeNode | null;
  treeInstance: UiTreeInstance | null;
  history: UiHistoryState;
  setScreenSize: (screenSize: ScreenSize) => void;
  setAutoWidth: (width: number) => void;
  setFlowNodes: (nodes: StateAction<Node[]>) => void;
  setFlowEdges: (edges: StateAction<Edge[]>) => void;
  setActiveNode: (nodeKey?: string) => void;
  toggleActiveNode: (nodeKey?: string) => void;
  updateActiveNodeLabel: (label: string) => void;
  updateActiveNodeProp: (propKey: string, value: unknown) => void;
  setTreeInstance: (instance: UiTreeInstance | null) => void;
  insertToUiPageData: (parentKey: string, componentData: Record<string, unknown>) => void;
  removeFromUiPageData: (nodeKey: string) => void;
  undo: () => void;
  redo: () => void;
  jumpToHistory: (pointer: number) => void;
}
