import AnnotationNode from './AnnotationNode';
import CodeNode from './CodeNode';
import ComponentFlowNode from './ComponentFlowNode';
import EventFilterNode from './EventFilterNode';
import LifecycleExposeNode from './LifecycleExposeNode';
import NetworkRequestNode from './NetworkRequestNode';
import PropExposeNode from './PropExposeNode';
import TimerNode from './TimerNode';

export {
  AnnotationNode,
  CodeNode,
  ComponentFlowNode,
  EventFilterNode,
  LifecycleExposeNode,
  NetworkRequestNode,
  PropExposeNode,
  TimerNode,
};

export const flowNodeTypes = {
  componentNode: ComponentFlowNode,
  eventFilterNode: EventFilterNode,
  codeNode: CodeNode,
  networkRequestNode: NetworkRequestNode,
  timerNode: TimerNode,
  propExposeNode: PropExposeNode,
  lifecycleExposeNode: LifecycleExposeNode,
  annotationNode: AnnotationNode,
};
