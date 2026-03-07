export type ScreenSize = string | number;

export interface UiTreeNode {
  key: string;
  label: string;
  children?: UiTreeNode[];
}

export interface CreateComponentStore {
  screenSize: ScreenSize;
  autoWidth: number;
  uiTreeData: UiTreeNode;
  setScreenSize: (screenSize: ScreenSize) => void;
  setAutoWidth: (width: number) => void;
}
