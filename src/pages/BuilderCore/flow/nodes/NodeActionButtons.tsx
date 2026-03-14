import React from 'react';
import { FlipHorizontal2, FlipVertical2, Trash2 } from 'lucide-react';

interface NodeActionButtonsProps {
	onDelete?: () => void;
	onFlipHorizontal?: () => void;
	onFlipVertical?: () => void;
}

const NodeActionButtons: React.FC<NodeActionButtonsProps> = ({
	onDelete,
	onFlipHorizontal,
	onFlipVertical,
}) => {
	const stopBubble = (event: React.MouseEvent | React.MouseEvent<HTMLButtonElement>) => {
		event.stopPropagation();
	};

	return (
		<div className="flow-node-actions nodrag nopan" onMouseDown={stopBubble} onClick={stopBubble}>
			<button
				type="button"
				className="flow-node-actions__btn"
				title="删除节点"
				onClick={() => onDelete?.()}
			>
				<Trash2 size={11} />
			</button>

			<button
				type="button"
				className="flow-node-actions__btn"
				title="水平翻转"
				onClick={() => onFlipHorizontal?.()}
			>
				<FlipHorizontal2 size={11} />
			</button>

			<button
				type="button"
				className="flow-node-actions__btn"
				title="垂直翻转"
				onClick={() => onFlipVertical?.()}
			>
				<FlipVertical2 size={11} />
			</button>
		</div>
	);
};

export default React.memo(NodeActionButtons);
