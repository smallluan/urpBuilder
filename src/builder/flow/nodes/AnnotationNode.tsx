import React, { useEffect, useRef, useState } from 'react';
import type { NodeProps } from '@xyflow/react';
import { useFlowNodeActions } from '../context/FlowNodeActionsContext';
import { useFlowNodeChromeActions } from '../hooks/useFlowNodeChromeActions';
import NodeActionButtons from './NodeActionButtons';
import type { AnnotationNodeData } from '../../../types/flow';

const AnnotationNode: React.FC<NodeProps> = ({ id, data, selected }) => {
	const nodeData = (data ?? {}) as AnnotationNodeData;
	const flowActions = useFlowNodeActions();
	const chrome = useFlowNodeChromeActions(id, nodeData);
	const [isExpanded, setIsExpanded] = useState(true);
	const textareaRef = useRef<HTMLTextAreaElement | null>(null);

	useEffect(() => {
		if (!isExpanded) {
			return;
		}

		textareaRef.current?.focus();
	}, [isExpanded]);

	const text = nodeData.text ?? '';
	const collapsedText = text.trim() || '输入注释...';

	return (
		<div className={`flow-annotation-node${selected ? ' is-selected' : ''}${isExpanded ? '' : ' is-collapsed'}`}>
			{isExpanded ? (
				<textarea
					ref={textareaRef}
					className="flow-annotation-node__textarea nodrag"
					value={text}
					placeholder="输入注释..."
					onMouseDown={(event) => event.stopPropagation()}
					onClick={(event) => event.stopPropagation()}
					onBlur={() => setIsExpanded(false)}
					onChange={(event) => {
						const v = event.target.value;
						if (flowActions) {
							flowActions.setAnnotationText(id, v);
						} else {
							nodeData.onChange?.(id, v);
						}
					}}
				/>
			) : (
				<div
					className="flow-annotation-node__collapsed nodrag"
					title={collapsedText}
					onMouseDown={(event) => event.stopPropagation()}
					onClick={(event) => {
						event.stopPropagation();
						setIsExpanded(true);
					}}
				>
					{collapsedText}
				</div>
			)}

			<div className="flow-node-actions-row flow-node-actions-row--end">
				<NodeActionButtons
					suppress={Boolean(nodeData.__suppressFlowActions)}
					onDelete={chrome.onDelete}
					onFlipHorizontal={chrome.onFlipHorizontal}
					onFlipVertical={chrome.onFlipVertical}
				/>
			</div>
		</div>
	);
};

export default React.memo(AnnotationNode);
