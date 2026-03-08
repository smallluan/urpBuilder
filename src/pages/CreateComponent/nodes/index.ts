import type { NodeTypes } from '@xyflow/react';
import AnnotationNode from './AnnotationNode';
import CodeNode from './CodeNode';
import ComponentFlowNode from './ComponentFlowNode';
import EventFilterNode from './EventFilterNode';
import NetworkRequestNode from './NetworkRequestNode';

export const flowNodeTypes: NodeTypes = {
  componentNode: ComponentFlowNode,
  eventFilterNode: EventFilterNode,
  annotationNode: AnnotationNode,
  codeNode: CodeNode,
  networkRequestNode: NetworkRequestNode,
};
