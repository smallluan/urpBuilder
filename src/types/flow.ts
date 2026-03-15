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
   * 支持为来源属性配置对外别名（alias）。
   * sourcePropKey: 来源组件内部的属性名
   * alias: 在外部暴露为的名称（可选，若不填则使用 sourcePropKey）
   */
  selectedMappings?: Array<{ sourcePropKey: string; alias?: string }>;
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
  selectedMappings?: Array<{ sourcePropKey: string; alias?: string }>;
}

export interface LifecycleExposeNodeFormState {
  label: string;
  upstreamLabel: string;
  availableLifetimes: string[];
  selectedLifetimes: string[];
  selectedMappings?: Array<{ sourceLifetime: string; alias?: string }>;
}