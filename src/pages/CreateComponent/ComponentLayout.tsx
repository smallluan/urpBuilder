import React from 'react';
import { Input, Empty } from 'tdesign-react';
import { SearchIcon } from 'tdesign-icons-react';
import ComponentBody from './ComponentBody';
import './style.less';

const ComponentLayout: React.FC = () => {
  return (
    <div className="create-body">
      <aside className="aside-left">
        <div className="structure-top">
          <div className="structure-header">
            <div className="search-row">
              <Input placeholder="搜索组件（示例）" clearable suffix={<SearchIcon />} />
              <div className="search-toolbar">
                <span className="match-count">匹配 0 项</span>
              </div>
            </div>
          </div>

          <div className="structure-tree" role="tree">
            <ul>
              <li>组件容器</li>
              <li>  ├─ Button</li>
              <li>  ├─ Input</li>
              <li>  └─ Table</li>
            </ul>
          </div>
        </div>

        <div className="structure-bottom">
          <Empty description="暂无页面元素" />
        </div>
      </aside>

      <main className="main-body">
        <div className="main-inner">
          <ComponentBody />
        </div>
      </main>

      <aside className="aside-right">
        <div style={{ padding: 8 }}>
          <h4>预览</h4>
          <p>这里放组件预览或属性面板。</p>
        </div>
      </aside>
    </div>
  );
};

export default ComponentLayout;
