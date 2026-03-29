import React, { useEffect, useMemo, useRef } from 'react';
import { Input, MessagePlugin, Tree } from 'tdesign-react';
import type { TreeInstanceFunctions } from 'tdesign-react';
import { SearchIcon } from 'tdesign-icons-react';
import DragableWrapper from '../../components/DragableWrapper';
import { applyBuilderDragPreview } from '../utils/dragPreview';
import { useBuilderContext } from '../context/BuilderContext';
import type { UiTreeInstance, UiTreeNode } from '../store/types';
import { isSlotNode } from '../utils/slot';
import type { FlowComponentDragPayload } from '../../types/flow';
import { BUILDER_STRUCTURE_TREE_SCROLL } from '../config/builderStructureTreeScroll';
import { findFirstFlowNodeIdBySourceKey, getFlowNodeStructureSourceKey } from '../utils/flowNodeSourceKey';

interface RenderUiTreeNode extends Omit<UiTreeNode, 'label' | 'children'> {
	label: React.ReactNode;
	children?: RenderUiTreeNode[];
}

const FlowAsideLeft: React.FC = () => {
	const { useStore } = useBuilderContext();
	const uiPageData = useStore((state) => state.uiPageData);
	const flowNodes = useStore((state) => state.flowNodes);
	const flowActiveNodeId = useStore((state) => state.flowActiveNodeId);
	const setFlowActiveNodeId = useStore((state) => state.setFlowActiveNodeId);
	const setFlowStructureTreeInstance = useStore((state) => state.setFlowStructureTreeInstance);

	const treeRef = useRef<TreeInstanceFunctions<any>>(null);

	const flowTreeActivedKeys = useMemo(() => {
		if (!flowActiveNodeId) {
			return [] as string[];
		}
		const node = flowNodes.find((item) => item.id === flowActiveNodeId);
		if (!node) {
			return [];
		}
		const sk = getFlowNodeStructureSourceKey(node);
		return sk ? [sk] : [];
	}, [flowActiveNodeId, flowNodes]);

	const handleDragStart = (event: React.DragEvent<HTMLDivElement>, node: UiTreeNode) => {
		if (isSlotNode(node)) {
			return;
		}

		const payload: FlowComponentDragPayload = {
			kind: 'component-node',
			name: String(node.label ?? '节点'),
			componentType: String(node.type ?? 'Unknown'),
			sourceKey: node.key,
			sourceRef: `root::${node.key}`,
			lifetimes: Array.isArray(node.lifetimes) ? node.lifetimes : [],
		};

		applyBuilderDragPreview(event, {
			kind: 'flow-component',
			title: String(node.label ?? '节点'),
			componentType: String(node.type ?? ''),
		});
		event.dataTransfer?.setData('drag-component-data', JSON.stringify(payload));
		event.dataTransfer.effectAllowed = 'copy';
	};

	const flowTreeData = useMemo(() => {
		const transformNode = (node: UiTreeNode): RenderUiTreeNode => {
			const children = Array.isArray(node.children) ? node.children.map((child) => transformNode(child)) : [];

			return {
				...node,
				label: isSlotNode(node) ? (
					<div className="tree-node-label">
						<div className="tree-node-item">
							<span className="tree-node-item__title">{String(node.label ?? '插槽')}</span>
						</div>
					</div>
				) : (
					<DragableWrapper data={node} onDragStart={handleDragStart}>
						<div className="tree-node-label">
							<div className="tree-node-item">
								<span className="tree-node-item__title">{String(node.label ?? '节点')}</span>
							</div>
						</div>
					</DragableWrapper>
				),
				children,
			};
		};

		return [transformNode(uiPageData)];
	}, [uiPageData]);

	const handleTreeClick = (context: any) => {
		const key = context?.node?.value ?? context?.node?.key;
		if (typeof key !== 'string') {
			return;
		}

		const flowNodeId = findFirstFlowNodeIdBySourceKey(flowNodes, key);
		if (!flowNodeId) {
			void MessagePlugin.info('当前结构节点未在流程图中放置为组件/属性暴露节点');
			return;
		}
		setFlowActiveNodeId(flowNodeId);
	};

	useEffect(() => {
		setFlowStructureTreeInstance(treeRef.current as unknown as UiTreeInstance);
		return () => setFlowStructureTreeInstance(null);
	}, [setFlowStructureTreeInstance]);

	return (
		<aside className="aside-left">
			<div className="structure-top">
				<div className="structure-panel">
					<div className="structure-title">
						<div className="structure-title__main">结构节点</div>
					</div>

					<div className="search-row">
						<Input placeholder="搜索流程节点（示例）" clearable suffix={<SearchIcon />} />
					</div>

					<div className="structure-tree" role="tree">
						<Tree
							keys={{ value: 'key' }}
							ref={treeRef}
							activable
							expandAll
							line
							scroll={BUILDER_STRUCTURE_TREE_SCROLL}
							data={flowTreeData}
							actived={flowTreeActivedKeys}
							onClick={handleTreeClick}
						/>
					</div>
				</div>
			</div>
		</aside>
	);
};

export default React.memo(FlowAsideLeft);
