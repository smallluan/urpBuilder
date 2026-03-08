import React, { useEffect, useMemo, useRef } from 'react';
import { Input, Tree } from 'tdesign-react';
import type { TreeInstanceFunctions } from 'tdesign-react';
import { SearchIcon } from 'tdesign-icons-react';
import DragableWrapper from '../../../components/DragableWrapper';
import { useCreateComponentStore } from '../store';
import type { UiTreeNode } from '../store/type';

interface RenderUiTreeNode extends Omit<UiTreeNode, 'label' | 'children'> {
  label: React.ReactNode;
  children?: RenderUiTreeNode[];
}

const FlowAsideLeft: React.FC = () => {
  const uiPageData = useCreateComponentStore((state) => state.uiPageData);
  const activeNodeKey = useCreateComponentStore((state) => state.activeNodeKey);
  const setTreeInstance = useCreateComponentStore((state) => state.setTreeInstance);
  const toggleActiveNode = useCreateComponentStore((state) => state.toggleActiveNode);

  const treeRef = useRef<TreeInstanceFunctions<any>>(null);

  const handleDragStart = (event: React.DragEvent<HTMLDivElement>, node: UiTreeNode) => {
    const payload = {
      name: String(node.label ?? '节点'),
      type: String(node.type ?? 'Flow.Node'),
      props: node.props ?? {},
      lifetimes: node.lifetimes ?? [],
    };

    event.dataTransfer?.setData('drag-component-data', JSON.stringify(payload));
    event.dataTransfer.effectAllowed = 'copy';
  };

  const flowTreeData = useMemo(() => {
    const transformNode = (node: UiTreeNode): RenderUiTreeNode => {
      const children = Array.isArray(node.children) ? node.children.map((child) => transformNode(child)) : [];

      return {
        ...node,
        label: (
          <DragableWrapper data={node} onDragStart={handleDragStart}>
            <div className="tree-node-label">{String(node.label ?? '节点')}</div>
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

      <div className="structure-bottom">
        <div className="right-panel-body right-panel-empty">流程模式下暂无组件配置</div>
      </div>
    </aside>
  );
};

export default React.memo(FlowAsideLeft);
