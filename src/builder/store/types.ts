import type { Edge, Node } from '@xyflow/react';

// ===========================
// 基础类型
// ===========================

export type ScreenSize = string | number;
export type StateAction<T> = T | ((previous: T) => T);
export type BuilderResourceVisibility = 'private' | 'public';

export type RouteScopeMode = 'private' | 'all' | 'include';

export interface RouteScopeConfig {
  mode: RouteScopeMode;
  routeIds?: string[];
}

export interface PageRouteConfig {
  routePath: string;
  routeName: string;
  pageTitle: string;
  menuTitle: string;
  useLayout: boolean;
}

export interface PageRouteRecord {
  routeId: string;
  routeConfig: PageRouteConfig;
  uiTree: UiTreeNode;
  flowNodes: Node[];
  flowEdges: Edge[];
  selectedLayoutTemplateId: BuiltInLayoutTemplateId | null;
  history: UiHistoryState;
}

/** 内置布局模板 ID。定义在此处以避免与具体模板数据产生循环依赖。 */
export type BuiltInLayoutTemplateId =
  | 'header-body'
  | 'header-aside-body'
  | 'header-body-footer'
  | 'header-aside-body-footer';

// ===========================
// UI 树节点
// ===========================

export interface UiTreeNode {
  key: string;
  value?: string | number;
  label: string;
  type?: string;
  props?: Record<string, unknown>;
  lifetimes?: string[];
  children?: UiTreeNode[];
}

export interface DropDataOptions {
  slotKey?: string;
}

export type UiDropDataHandler = (
  dropData: unknown,
  parent: UiTreeNode | undefined,
  options?: DropDataOptions,
) => void;

export interface UiTreeInstance {
  appendTo: (value: string | number, newData: UiTreeNode | UiTreeNode[]) => void;
  getItem: (value: string | number) => { data: UiTreeNode } | undefined;
}

// ===========================
// 历史记录动作类型
// ===========================

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

export interface MoveHistoryAction {
  type: 'move';
  nodeKey: string;
  nodeLabel: string;
  nodeType?: string;
  fromParentKey: string;
  fromIndex: number;
  toParentKey: string;
  toIndex: number;
  prevSlotKey?: string;
  nextSlotKey?: string;
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

export interface ReplaceLayoutHistoryAction {
  type: 'replace-layout';
  prevChildren: UiTreeNode[];
  nextChildren: UiTreeNode[];
  prevLayoutTemplateId: BuiltInLayoutTemplateId | null;
  nextLayoutTemplateId: BuiltInLayoutTemplateId;
  timestamp: number;
}

export type UiHistoryAction =
  | AddHistoryAction
  | RemoveHistoryAction
  | MoveHistoryAction
  | UpdateLabelHistoryAction
  | UpdatePropHistoryAction
  | FlowEditHistoryAction
  | ReplaceLayoutHistoryAction;

export interface UiHistoryState {
  pointer: number;
  actions: UiHistoryAction[];
}

export interface UpdateNodeKeyResult {
  success: boolean;
  message?: string;
}

// ===========================
// 核心 Store 接口
// 用作 builder 基础类型；具体页面可通过 CreateComponentStore 等别名引用。
// ===========================

export interface BuilderStore {
  // 视图环境
  screenSize: ScreenSize;
  autoWidth: number;
  currentPageId: string;
  currentPageName: string;
  currentPageDescription: string;
  currentPageVisibility: BuilderResourceVisibility;
  pageRouteConfig: PageRouteConfig | null;
  pageRoutes: PageRouteRecord[];
  activePageRouteId: string | null;
  activeRouteOutletKey: string | null;
  sharedUiTree: UiTreeNode | null;
  sharedFlowNodes: Node[];
  sharedFlowEdges: Edge[];

  // 流程图状态
  flowNodes: Node[];
  flowEdges: Edge[];
  flowActiveNodeId: string | null;

  // UI 树状态
  uiPageData: UiTreeNode;
  activeNodeKey: string | null;
  activeNode: UiTreeNode | null;
  selectedLayoutTemplateId: BuiltInLayoutTemplateId | null;
  treeInstance: UiTreeInstance | null;

  // 历史系统
  history: UiHistoryState;

  // Actions — 视图环境
  setScreenSize: (screenSize: ScreenSize) => void;
  setAutoWidth: (width: number) => void;
  setCurrentPageMeta: (payload: {
    pageId?: string;
    pageName?: string;
    description?: string;
    visibility?: BuilderResourceVisibility;
  }) => void;
  setPageRouteConfig: (config: PageRouteConfig | null | ((previous: PageRouteConfig | null) => PageRouteConfig | null)) => void;
  setPageRoutes: (routes: PageRouteRecord[], activeRouteId?: string | null) => void;
  addPageRoute: (route?: Partial<PageRouteRecord>) => string;
  switchPageRoute: (routeId: string) => void;
  removePageRoute: (routeId: string) => void;
  setDefaultPageRoute: (routeId: string) => void;
  setActiveRouteOutletKey: (outletKey: string | null) => void;
  syncActivePageRouteSnapshot: () => void;
  setActiveNodeRouteScope: (scope: RouteScopeConfig) => void;

  // Actions — 流程图
  setFlowNodes: (nodes: StateAction<Node[]>) => void;
  setFlowEdges: (edges: StateAction<Edge[]>) => void;
  setFlowActiveNodeId: (nodeId: string | null) => void;

  // Actions — UI 树
  setActiveNode: (nodeKey?: string) => void;
  toggleActiveNode: (nodeKey?: string) => void;
  updateActiveNodeLabel: (label: string) => void;
  updateActiveNodeKey: (nextKey: string) => UpdateNodeKeyResult;
  updateActiveNodeProp: (propKey: string, value: unknown) => void;
  setTreeInstance: (instance: UiTreeInstance | null) => void;
  insertToUiPageData: (parentKey: string, componentData: Record<string, unknown>, slotKey?: string) => void;
  removeFromUiPageData: (nodeKey: string) => void;
  moveUiNode: (nodeKey: string, targetParentKey: string, targetIndex: number, slotKey?: string) => void;

  // Actions — 流程历史
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

  // Actions — 布局模板
  applyBuiltInLayoutTemplate: (templateId: BuiltInLayoutTemplateId) => void;

  // Actions — 历史记录
  undo: () => void;
  redo: () => void;
  jumpToHistory: (pointer: number) => void;
}
