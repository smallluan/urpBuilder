export interface FlowComponentDragPayload {
  kind?: string;
  name?: string;
  componentType?: string;
  sourceKey?: string;
  lifetimes?: string[];
  nodeType?: string;
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