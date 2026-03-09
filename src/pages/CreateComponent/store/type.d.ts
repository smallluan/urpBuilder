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

export interface FlowHistorySnapshot {
  nodes: Node[];
  edges: Edge[];
}

export interface RemoveHistoryAction {
  type: 'remove';
  parentKey: string;
  index: number;
  nodeRef: string;
  nodeKey: string;
  nodeLabel: string;
  nodeType?: string;
  flowSnapshot?: FlowHistorySnapshot;
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

export interface FlowEditHistoryAction {
  type: 'flow-edit';
  actionLabel: string;
  nodePatch: {
    added: Node[];
    removed: Node[];
    updated: Array<{
      before: Node;
      after: Node;
    }>;
  };
  edgePatch: {
    added: Edge[];
    removed: Edge[];
    updated: Array<{
      before: Edge;
      after: Edge;
    }>;
  };
  timestamp: number;
}

export type UiHistoryAction =
  | AddHistoryAction
  | RemoveHistoryAction
  | UpdateLabelHistoryAction
  | UpdatePropHistoryAction
  | FlowEditHistoryAction;

export interface UiHistoryState {
  pointer: number;
  actions: UiHistoryAction[];
}

export interface UpdateNodeKeyResult {
  success: boolean;
  message?: string;
}

export interface CreateComponentStore {
  screenSize: ScreenSize;
  autoWidth: number;
  flowNodes: Node[];
  flowEdges: Edge[];
  flowActiveNodeId: string | null;
  uiPageData: UiTreeNode;
  activeNodeKey: string | null;
  activeNode: UiTreeNode | null;
  treeInstance: UiTreeInstance | null;
  history: UiHistoryState;
  setScreenSize: (screenSize: ScreenSize) => void;
  setAutoWidth: (width: number) => void;
  setFlowNodes: (nodes: StateAction<Node[]>) => void;
  setFlowEdges: (edges: StateAction<Edge[]>) => void;
  setFlowActiveNodeId: (nodeId: string | null) => void;
  setActiveNode: (nodeKey?: string) => void;
  toggleActiveNode: (nodeKey?: string) => void;
  updateActiveNodeLabel: (label: string) => void;
  updateActiveNodeKey: (nextKey: string) => UpdateNodeKeyResult;
  updateActiveNodeProp: (propKey: string, value: unknown) => void;
  setTreeInstance: (instance: UiTreeInstance | null) => void;
  insertToUiPageData: (parentKey: string, componentData: Record<string, unknown>, slotKey?: string) => void;
  removeFromUiPageData: (nodeKey: string) => void;
  recordFlowEditHistory: (
    actionLabel: string,
    prevFlowNodes: Node[],
    prevFlowEdges: Edge[],
    nextFlowNodes: Node[],
    nextFlowEdges: Edge[],
  ) => void;
  updateFlowNodeData: (
    nodeId: string,
    updater: (data: Record<string, unknown>) => Record<string, unknown>,
    actionLabel?: string,
  ) => void;
  undo: () => void;
  redo: () => void;
  jumpToHistory: (pointer: number) => void;
}
