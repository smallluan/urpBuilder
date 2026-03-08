import React, { useEffect, useMemo, useRef } from 'react';
import cloneDeep from 'lodash/cloneDeep';
import { Input, Tree } from 'tdesign-react';
import type { TreeInstanceFunctions } from 'tdesign-react';
import { SearchIcon } from 'tdesign-icons-react';
import { useCreateComponentStore } from '../store';
import type { UiTreeNode } from '../store/type';
import ComponentConfigPanel from './ComponentConfigPanel';

interface RenderUiTreeNode extends Omit<UiTreeNode, 'label' | 'children'> {
  label: React.ReactNode;
  children?: RenderUiTreeNode[];
}

const ComponentAsideLeft: React.FC = () => {
  const uiPageData = useCreateComponentStore((state) => state.uiPageData);
  const setTreeInstance = useCreateComponentStore((state) => state.setTreeInstance);
  const activeNodeKey = useCreateComponentStore((state) => state.activeNodeKey);
  const toggleActiveNode = useCreateComponentStore((state) => state.toggleActiveNode);

  const uiPageDataWithWrappedLabel = useMemo(() => {
    const cloned = cloneDeep(uiPageData) as UiTreeNode;

    const transformNode = (node: UiTreeNode): RenderUiTreeNode => {
      const children = Array.isArray(node.children)
        ? node.children.map((child) => transformNode(child))
        : [];

      return {
        ...node,
        label: typeof node.label === 'string' ? <div>{node.label}</div> : node.label,
        children,
      };
    };

    return transformNode(cloned);
  }, [uiPageData]);

  const treeData = useMemo(() => [uiPageDataWithWrappedLabel], [uiPageDataWithWrappedLabel]);
  const treeRef = useRef<TreeInstanceFunctions<any>>(null);

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
            <Input placeholder="搜索组件（示例）" clearable suffix={<SearchIcon />} />
          </div>

          <div className="structure-tree" role="tree">
            <Tree
              keys={{ value: 'key' }}
              ref={treeRef}
              activable
              expandAll
              line
              data={treeData}
              actived={activeNodeKey ? [activeNodeKey] : []}
              onClick={handleTreeClick}
            />
          </div>
        </div>
      </div>

      <div className="structure-bottom">
        <ComponentConfigPanel />
      </div>
    </aside>
  );
};

export default React.memo(ComponentAsideLeft);
