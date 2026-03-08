import type { NodeTypes } from '@xyflow/react';
import AnnotationNode from './AnnotationNode';
import ComponentFlowNode from './ComponentFlowNode';
import EventFilterNode from './EventFilterNode';

export const flowNodeTypes: NodeTypes = {
  componentNode: ComponentFlowNode,
  eventFilterNode: EventFilterNode,
  annotationNode: AnnotationNode,
};
