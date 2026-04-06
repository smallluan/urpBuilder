import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useFlowNodeChromeActions } from '../hooks/useFlowNodeChromeActions';
import NodeActionButtons from './NodeActionButtons';
import type { NetworkRequestNodeData } from '../../../types/flow';

const NetworkRequestNode: React.FC<NodeProps> = ({ id, data, selected }) => {
	const nodeData = (data ?? {}) as NetworkRequestNodeData;
	const chrome = useFlowNodeChromeActions(id, nodeData);
	const targetPosition = nodeData.flipX ? Position.Right : Position.Left;
	const sourcePosition = nodeData.flipX ? Position.Left : Position.Right;

	return (
		<div className={`flow-network-request-node${selected ? ' is-selected' : ''}`}>
			<Handle type="target" position={targetPosition} isConnectable />

			<div className="flow-network-request-node__top">
				<span className="flow-network-request-node__badge">网络请求</span>
				<span className="flow-network-request-node__method">{nodeData.method || 'GET'}</span>
			</div>

			<div className="flow-network-request-node__title">{nodeData.label || '网络请求节点'}</div>
			<div className="flow-network-request-node__endpoint" title={nodeData.endpoint || '/api/example'}>
				{nodeData.endpoint || '/api/example'}
			</div>

			<div className="flow-node-actions-row flow-node-actions-row--end">
				<NodeActionButtons
					suppress={Boolean(nodeData.__suppressFlowActions)}
					onDelete={chrome.onDelete}
					onFlipHorizontal={chrome.onFlipHorizontal}
					onFlipVertical={chrome.onFlipVertical}
				/>
			</div>

			<Handle type="source" position={sourcePosition} isConnectable />
		</div>
	);
};

export default React.memo(NetworkRequestNode);
