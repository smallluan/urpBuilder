export interface FlowComponentDragPayload {
  kind?: string;
  name?: string;
  componentType?: string;
  sourceKey?: string;
  sourceRef?: string;
  lifetimes?: string[];
  nodeType?:
    | 'eventFilterNode'
    | 'codeNode'
    | 'networkRequestNode'
    | 'timerNode'
    | 'propExposeNode'
    | 'lifecycleExposeNode';
  label?: string;
}

export interface FlowNodeActionHandlers {
  flipX?: boolean;
  flipY?: boolean;
  onDeleteNode?: (nodeId: string) => void;
  onFlipHorizontal?: (nodeId: string) => void;
  onFlipVertical?: (nodeId: string) => void;
  /** 预览调试只读流程图：隐藏删除/翻转按钮 */
  __suppressFlowActions?: boolean;
}

export interface ComponentFlowNodeData extends FlowNodeActionHandlers {
  label?: string;
  componentType?: string;
  sourceKey?: string;
  sourceRef?: string;
  lifetimes?: string[];
}

export interface EventFilterNodeData extends FlowNodeActionHandlers {
  label?: string;
  upstreamNodeId?: string;
  upstreamLabel?: string;
  availableLifetimes?: string[];
  selectedLifetimes?: string[];
}

export interface CodeNodeData extends FlowNodeActionHandlers {
  label?: string;
  language?: string;
  note?: string;
  code?: string;
}

export interface NetworkRequestNodeData extends FlowNodeActionHandlers {
  label?: string;
  method?: string;
  endpoint?: string;
  timeoutMs?: number;
  responsePath?: string;
  bodyType?: string;
  body?: string;
  onError?: string;
  mockEnabled?: boolean;
}

export interface TimerNodeData extends FlowNodeActionHandlers {
  label?: string;
  intervalMs?: number;
}

export interface PropExposeNodeData extends FlowNodeActionHandlers {
  label?: string;
  sourceNodeId?: string;
  sourceKey?: string;
  sourceRef?: string;
  sourceLabel?: string;
  availablePropKeys?: string[];
  selectedPropKeys?: string[];
  /**
   * sourcePropKey: 来源组件内部的属性 key（DSL 字段名）
   * alias: 对外唯一标识，用于实例 props 上的 key（建议英文/camelCase；不填则与 sourcePropKey 相同）
   * displayName: 属性面板展示名（如「块级元素」；不填则沿用内部属性 schema 的 name）
   */
  selectedMappings?: Array<{ sourcePropKey: string; alias?: string; displayName?: string }>;
}

export interface LifecycleExposeNodeData extends FlowNodeActionHandlers {
  label?: string;
  upstreamNodeId?: string;
  upstreamLabel?: string;
  availableLifetimes?: string[];
  selectedLifetimes?: string[];
  selectedMappings?: Array<{ sourceLifetime: string; alias?: string }>;
}

export interface AnnotationNodeData extends FlowNodeActionHandlers {
  text?: string;
  onChange?: (nodeId: string, text: string) => void;
}

export interface NetworkRequestFormState {
  label: string;
  method: string;
  endpoint: string;
  timeoutMs: number;
  responsePath: string;
  bodyType: string;
  body: string;
  onError: string;
  mockEnabled: boolean;
}

export interface EventFilterFormState {
  label: string;
  upstreamLabel: string;
  availableLifetimes: string[];
  selectedLifetimes: string[];
}

export interface TimerNodeFormState {
  label: string;
  intervalMs: number;
}

export interface PropExposeNodeFormState {
  label: string;
  sourceLabel: string;
  availablePropKeys: string[];
  selectedPropKeys: string[];
  selectedMappings?: Array<{ sourcePropKey: string; alias?: string; displayName?: string }>;
}

export interface LifecycleExposeNodeFormState {
  label: string;
  upstreamLabel: string;
  availableLifetimes: string[];
  selectedLifetimes: string[];
  selectedMappings?: Array<{ sourceLifetime: string; alias?: string }>;
}