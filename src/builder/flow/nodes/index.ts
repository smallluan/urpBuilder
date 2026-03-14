import AnnotationNode from './AnnotationNode';
import CodeNode from './CodeNode';
import ComponentFlowNode from './ComponentFlowNode';
import EventFilterNode from './EventFilterNode';
import NetworkRequestNode from './NetworkRequestNode';
import TimerNode from './TimerNode';

export { AnnotationNode, CodeNode, ComponentFlowNode, EventFilterNode, NetworkRequestNode, TimerNode };

export const flowNodeTypes = {
  componentNode: ComponentFlowNode,
  eventFilterNode: EventFilterNode,
  codeNode: CodeNode,
  networkRequestNode: NetworkRequestNode,
  timerNode: TimerNode,
  annotationNode: AnnotationNode,
};
