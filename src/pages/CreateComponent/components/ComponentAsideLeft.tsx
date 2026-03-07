import React from 'react';
import { Empty, Input, Tree } from 'tdesign-react';
import { SearchIcon } from 'tdesign-icons-react';
import { useCreateComponentStore } from '../store';

const ComponentAsideLeft: React.FC = () => {
  const uiTreeData = useCreateComponentStore((state) => state.uiTreeData);

  return (
    <aside className="aside-left">
      <div className="structure-top">
        <div className="structure-panel">
          <div className="search-row">
            <Input placeholder="搜索组件（示例）" clearable suffix={<SearchIcon />} />
          </div>

          <div className="structure-tree" role="tree">
            <Tree activable line expandAll data={[uiTreeData]} />
          </div>
        </div>
      </div>

      <div className="structure-bottom">
        <Empty description="暂无页面元素" />
      </div>
    </aside>
  );
};

export default React.memo(ComponentAsideLeft);
