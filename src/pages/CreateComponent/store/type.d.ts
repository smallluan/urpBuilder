export type ScreenSize = string | number;

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
  node: UiTreeNode;
  timestamp: number;
}

export interface RemoveHistoryAction {
  type: 'remove';
  parentKey: string;
  index: number;
  node: UiTreeNode;
  timestamp: number;
}

export type UiHistoryAction = AddHistoryAction | RemoveHistoryAction;

export interface UiHistoryState {
  pointer: number;
  actions: UiHistoryAction[];
}

export interface CreateComponentStore {
  screenSize: ScreenSize;
  autoWidth: number;
  uiPageData: UiTreeNode;
  treeInstance: UiTreeInstance | null;
  history: UiHistoryState;
  setScreenSize: (screenSize: ScreenSize) => void;
  setAutoWidth: (width: number) => void;
  setTreeInstance: (instance: UiTreeInstance | null) => void;
  insertToUiPageData: (parentKey: string, componentData: Record<string, unknown>) => void;
  removeFromUiPageData: (nodeKey: string) => void;
  undo: () => void;
  redo: () => void;
}
