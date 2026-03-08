import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';

export interface ComponentFlowNodeData {
  label?: string;
  componentType?: string;
  sourceKey?: string;
}

const ComponentFlowNode: React.FC<NodeProps> = ({ data, selected }) => {
  const nodeData = (data ?? {}) as ComponentFlowNodeData;
  const sourceText = nodeData.sourceKey ? String(nodeData.sourceKey).slice(0, 8) : '-';

  return (
    <div className={`flow-component-node${selected ? ' is-selected' : ''}`}>
      <Handle type="target" position={Position.Left} isConnectable />

      <div className="flow-component-node__top">
        <span className="flow-component-node__badge">组件节点</span>
        <span className="flow-component-node__type">{nodeData.componentType || 'Unknown'}</span>
      </div>

      <div className="flow-component-node__title">{nodeData.label || '组件节点'}</div>

      <div className="flow-component-node__meta" title={nodeData.sourceKey || ''}>
        源节点：{sourceText}
      </div>

      <Handle type="source" position={Position.Right} isConnectable />
    </div>
  );
};

export default React.memo(ComponentFlowNode);
