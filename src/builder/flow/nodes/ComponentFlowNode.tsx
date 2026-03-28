import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import NodeActionButtons from './NodeActionButtons';
import type { ComponentFlowNodeData } from '../../../types/flow';

const ComponentFlowNode: React.FC<NodeProps> = ({ id, data, selected }) => {
	const nodeData = (data ?? {}) as ComponentFlowNodeData;
	const sourceText = nodeData.sourceKey ? String(nodeData.sourceKey).slice(0, 8) : '-';
	const targetPosition = nodeData.flipX ? Position.Right : Position.Left;
	const sourcePosition = nodeData.flipX ? Position.Left : Position.Right;

	return (
		<div className={`flow-component-node${selected ? ' is-selected' : ''}`}>
			<Handle type="target" position={targetPosition} isConnectable />

			<div className="flow-component-node__top">
				<span className="flow-component-node__badge">组件节点</span>
				<span className="flow-component-node__type">{nodeData.componentType || 'Unknown'}</span>
			</div>

			<div className="flow-component-node__title">{nodeData.label || '组件节点'}</div>

			<div className="flow-component-node__meta" title={nodeData.sourceKey || ''}>
				源节点：{sourceText}
			</div>

			<div className="flow-node-actions-row flow-node-actions-row--end">
				<NodeActionButtons
					suppress={Boolean(nodeData.__suppressFlowActions)}
					onDelete={() => nodeData.onDeleteNode?.(id)}
					onFlipHorizontal={() => nodeData.onFlipHorizontal?.(id)}
					onFlipVertical={() => nodeData.onFlipVertical?.(id)}
				/>
			</div>

			<Handle type="source" position={sourcePosition} isConnectable />
		</div>
	);
};

export default React.memo(ComponentFlowNode);
