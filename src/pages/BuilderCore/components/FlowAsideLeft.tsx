import React, { useEffect, useMemo, useRef } from 'react';
import { Input, Tree } from 'tdesign-react';
import type { TreeInstanceFunctions } from 'tdesign-react';
import { SearchIcon } from 'tdesign-icons-react';
import DragableWrapper from '../../../components/DragableWrapper';
import { useBuilderContext } from '../context/BuilderContext';
import type { UiTreeNode } from '../store/types';
import { isSlotNode } from '../utils/slot';
import type { FlowComponentDragPayload } from '../../../types/flow';

interface RenderUiTreeNode extends Omit<UiTreeNode, 'label' | 'children'> {
	label: React.ReactNode;
	children?: RenderUiTreeNode[];
}

const FlowAsideLeft: React.FC = () => {
	const { useStore } = useBuilderContext();
	const uiPageData = useStore((state) => state.uiPageData);
	const activeNodeKey = useStore((state) => state.activeNodeKey);
	const setTreeInstance = useStore((state) => state.setTreeInstance);
	const toggleActiveNode = useStore((state) => state.toggleActiveNode);

	const treeRef = useRef<TreeInstanceFunctions<any>>(null);

	const handleDragStart = (event: React.DragEvent<HTMLDivElement>, node: UiTreeNode) => {
		if (isSlotNode(node)) {
			return;
		}

		const payload: FlowComponentDragPayload = {
			kind: 'component-node',
			name: String(node.label ?? '节点'),
			componentType: String(node.type ?? 'Unknown'),
			sourceKey: node.key,
			lifetimes: Array.isArray(node.lifetimes) ? node.lifetimes : [],
		};

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

		toggleActiveNode(key);
	};

	useEffect(() => {
		setTreeInstance(treeRef.current);
		return () => setTreeInstance(null);
	}, [setTreeInstance]);

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
							data={flowTreeData}
							actived={activeNodeKey ? [activeNodeKey] : []}
							onClick={handleTreeClick}
						/>
					</div>
				</div>
			</div>
		</aside>
	);
};

export default React.memo(FlowAsideLeft);
