import React, { useEffect, useMemo, useRef } from 'react';
import { Input, Tree } from 'tdesign-react';
import type { TreeInstanceFunctions } from 'tdesign-react';
import { SearchIcon, ApiIcon, CodeIcon, UploadIcon } from 'tdesign-icons-react';
import DragableWrapper from '../../../components/DragableWrapper';
import { useCreateComponentStore } from '../store';
import type { UiTreeNode } from '../store/type';
import { isSlotNode } from '../utils/slot';

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
    if (isSlotNode(node)) {
      return;
    }

    const payload = {
      kind: 'component-node',
      name: String(node.label ?? '节点'),
      componentType: String(node.type ?? 'Unknown'),
      sourceKey: node.key,
      lifetimes: Array.isArray(node.lifetimes) ? node.lifetimes : [],
    };

    event.dataTransfer?.setData('drag-component-data', JSON.stringify(payload));
    event.dataTransfer.effectAllowed = 'copy';
  };

  const handleBuiltinDragStart = (event: React.DragEvent<HTMLDivElement>, data: Record<string, unknown>) => {
    event.dataTransfer?.setData('drag-component-data', JSON.stringify(data));
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

  const builtinNodes = [
    {
      nodeType: 'eventFilterNode',
      label: '事件过滤节点',
      theme: 'event',
      icon: <ApiIcon />,
    },
    {
      nodeType: 'codeNode',
      label: '代码节点',
      theme: 'code',
      icon: <CodeIcon />,
    },
    {
      nodeType: 'networkRequestNode',
      label: '网络请求节点',
      theme: 'request',
      icon: <UploadIcon />,
    },
  ] as const;

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

      <div className="structure-bottom">
        <div className="right-panel-body">
          <div className="flow-builtins-panel">
            <div className="flow-builtins-header">
              <div className="flow-builtins-title">内置节点</div>
            </div>
            {builtinNodes.map((item) => (
              <DragableWrapper
                key={item.nodeType}
                data={{ kind: 'builtin-node', nodeType: item.nodeType, label: item.label }}
                onDragStart={handleBuiltinDragStart}
              >
                <div className={`flow-builtins-item flow-builtins-item--${item.theme}`}>
                  <span className="flow-builtins-item__left">
                    <span className={`flow-builtins-item__icon flow-builtins-item__icon--${item.theme}`}>
                      {item.icon}
                    </span>
                    <span className="flow-builtins-item__name">{item.label}</span>
                  </span>
                </div>
              </DragableWrapper>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
};

export default React.memo(FlowAsideLeft);
