import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import NodeActionButtons from './NodeActionButtons';
import type { EventFilterNodeData } from '../../../types/flow';

const EventFilterNode: React.FC<NodeProps> = ({ id, data, selected }) => {
	const nodeData = (data ?? {}) as EventFilterNodeData;
	const selectedLifetimes = Array.isArray(nodeData.selectedLifetimes) ? nodeData.selectedLifetimes : [];
	const maxVisibleTags = 2;
	const visibleLifetimes = selectedLifetimes.slice(0, maxVisibleTags);
	const remainingCount = Math.max(0, selectedLifetimes.length - visibleLifetimes.length);
	const targetPosition = nodeData.flipX ? Position.Right : Position.Left;
	const sourcePosition = nodeData.flipX ? Position.Left : Position.Right;

	return (
		<div className={`flow-event-filter-node${selected ? ' is-selected' : ''}`}>
			<Handle type="target" position={targetPosition} isConnectable />

			<div className="flow-event-filter-node__top">
				<span className="flow-event-filter-node__badge">事件过滤</span>
			</div>

			<div className="flow-event-filter-node__title">{nodeData.label || '事件过滤节点'}</div>

			<div className="flow-event-filter-node__lifetimes">
				{selectedLifetimes.length > 0 ? (
					<>
						{visibleLifetimes.map((item) => (
							<span className="flow-event-filter-node__tag" key={item}>{item}</span>
						))}
						{remainingCount > 0 ? (
							<span className="flow-event-filter-node__tag flow-event-filter-node__tag--more">+{remainingCount}</span>
						) : null}
					</>
				) : (
					<span className="flow-event-filter-node__empty">未选择生命周期事件</span>
				)}
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

export default React.memo(EventFilterNode);
