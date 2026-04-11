import React, { useMemo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Popup } from 'tdesign-react';
import { ErrorTriangleIcon } from 'tdesign-icons-react';
import { useBuilderContext } from '../../context/BuilderContext';
import { useFlowNodeChromeActions } from '../hooks/useFlowNodeChromeActions';
import NodeActionButtons from './NodeActionButtons';
import type { CodeNodeData } from '../../../types/flow';
import { isFlowCodeNodeReferencedByDynamicList } from '../flowDynamicListUpstream';

const CodeNode: React.FC<NodeProps> = ({ id, data, selected }) => {
	const { useStore } = useBuilderContext();
	const uiPageData = useStore((s) => s.uiPageData);
	const nodeData = (data ?? {}) as CodeNodeData;
	const chrome = useFlowNodeChromeActions(id, nodeData);
	const language = nodeData.language || 'javascript';
	const note = nodeData.note || '注释信息';
	const targetPosition = nodeData.flipX ? Position.Right : Position.Left;
	const sourcePosition = nodeData.flipX ? Position.Left : Position.Right;

	const contractFields = nodeData.listOutputContract?.fields;
	const contractMissing = !contractFields?.length;

	const referencedByDynamicList = useMemo(
		() => isFlowCodeNodeReferencedByDynamicList(uiPageData, id),
		[uiPageData, id],
	);

	const showContractWarning = referencedByDynamicList && contractMissing;

	const rootClass = [
		'flow-code-node',
		selected ? 'is-selected' : '',
		showContractWarning ? 'flow-code-node--contract-missing' : '',
	]
		.filter(Boolean)
		.join(' ');

	return (
		<div className={rootClass}>
			<Handle type="target" position={targetPosition} isConnectable />

			<div className="flow-code-node__top">
				<span className="flow-code-node__badge">代码节点</span>
				<span className="flow-code-node__lang">{language}</span>
				{showContractWarning ? (
					<Popup
						content={
							<div style={{ maxWidth: 260 }}>
								<div style={{ fontSize: 13, lineHeight: 1.5 }}>
									当前节点被选为动态列表数据源，需在右侧「节点配置」中找到「动态列表输出契约」并配置字段。
								</div>
							</div>
						}
						trigger="hover"
						placement="top-right"
						showArrow
					>
						<span className="flow-code-node__warn-badge" aria-label="缺少列表输出契约">
							<ErrorTriangleIcon size={16} />
						</span>
					</Popup>
				) : null}
			</div>

			<div className="flow-code-node__title">{nodeData.label || '代码节点'}</div>
			<div className="flow-code-node__note" title={note}>{note}</div>

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

export default React.memo(CodeNode);
