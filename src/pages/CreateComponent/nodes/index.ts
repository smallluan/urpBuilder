import type { NodeTypes } from '@xyflow/react';
import ComponentFlowNode from './ComponentFlowNode';
import EventFilterNode from './EventFilterNode';

export const flowNodeTypes: NodeTypes = {
  componentNode: ComponentFlowNode,
  eventFilterNode: EventFilterNode,
};
