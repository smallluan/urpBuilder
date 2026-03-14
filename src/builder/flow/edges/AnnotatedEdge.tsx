import React from 'react';
import {
	BaseEdge,
	EdgeLabelRenderer,
	Position,
	getSmoothStepPath,
	type EdgeProps,
} from '@xyflow/react';

export interface AnnotatedEdgeData {
	annotation?: string;
	isEditing?: boolean;
	editingValue?: string;
	onStartEdit?: (edgeId: string) => void;
	onChangeEditingValue?: (value: string) => void;
	onCommitEdit?: () => void;
	onCancelEdit?: () => void;
}

const AnnotatedEdge: React.FC<EdgeProps> = ({
	id,
	sourceX,
	sourceY,
	targetX,
	targetY,
	sourcePosition,
	targetPosition,
	markerEnd,
	style,
	data,
}) => {
	const edgeData = (data ?? {}) as AnnotatedEdgeData;

	const [edgePath, labelX, labelY] = getSmoothStepPath({
		sourceX,
		sourceY,
		targetX,
		targetY,
		sourcePosition: sourcePosition ?? Position.Right,
		targetPosition: targetPosition ?? Position.Left,
	});

	const annotation = (edgeData.annotation ?? '').trim();
	const hasAnnotation = annotation.length > 0;
	const isEditing = !!edgeData.isEditing;

	return (
		<>
			<BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={style} />

			{(hasAnnotation || isEditing) ? (
				<EdgeLabelRenderer>
					<div
						className="flow-edge-label"
						style={{
							transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
						}}
					>
						{isEditing ? (
							<div className="flow-edge-editor" onMouseDown={(event) => event.stopPropagation()}>
								<input
									autoFocus
									className="flow-edge-editor__input"
									value={edgeData.editingValue ?? ''}
									placeholder="输入连线注释"
									onChange={(event) => edgeData.onChangeEditingValue?.(event.target.value)}
									onBlur={() => edgeData.onCommitEdit?.()}
									onKeyDown={(event) => {
										if (event.key === 'Enter') {
											event.preventDefault();
											edgeData.onCommitEdit?.();
											return;
										}

										if (event.key === 'Escape') {
											event.preventDefault();
											edgeData.onCancelEdit?.();
										}
									}}
								/>
							</div>
						) : (
							<button
								type="button"
								className="flow-edge-note"
								title={annotation}
								onMouseDown={(event) => event.stopPropagation()}
								onDoubleClick={(event) => {
									event.stopPropagation();
									edgeData.onStartEdit?.(id);
								}}
							>
								{annotation}
							</button>
						)}
					</div>
				</EdgeLabelRenderer>
			) : null}
		</>
	);
};

export default React.memo(AnnotatedEdge);
