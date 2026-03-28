import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import NodeActionButtons from './NodeActionButtons';
import type { CodeNodeData } from '../../../types/flow';

const CodeNode: React.FC<NodeProps> = ({ id, data, selected }) => {
	const nodeData = (data ?? {}) as CodeNodeData;
	const language = nodeData.language || 'javascript';
	const note = nodeData.note || '注释信息';
	const targetPosition = nodeData.flipX ? Position.Right : Position.Left;
	const sourcePosition = nodeData.flipX ? Position.Left : Position.Right;

	return (
		<div className={`flow-code-node${selected ? ' is-selected' : ''}`}>
			<Handle type="target" position={targetPosition} isConnectable />

			<div className="flow-code-node__top">
				<span className="flow-code-node__badge">代码节点</span>
				<span className="flow-code-node__lang">{language}</span>
			</div>

			<div className="flow-code-node__title">{nodeData.label || '代码节点'}</div>
			<div className="flow-code-node__note" title={note}>{note}</div>

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

export default React.memo(CodeNode);
