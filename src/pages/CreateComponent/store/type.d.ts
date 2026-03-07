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

export interface CreateComponentStore {
  screenSize: ScreenSize;
  autoWidth: number;
  uiPageData: UiTreeNode;
  treeInstance: UiTreeInstance | null;
  setScreenSize: (screenSize: ScreenSize) => void;
  setAutoWidth: (width: number) => void;
  setTreeInstance: (instance: UiTreeInstance | null) => void;
  insertToUiPageData: (parentKey: string, componentData: Record<string, unknown>) => void;
}
