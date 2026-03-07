import React from 'react';
import { Input, Empty, Tree } from 'tdesign-react';
import { SearchIcon } from 'tdesign-icons-react';
import FlowBody from './FlowBody';
import './style.less';

const FlowLayout: React.FC = () => {
  return (
    <div className="create-body">
      <aside className="aside-left">
        <div className="structure-top">
          <div className="structure-header">
            <div className="search-row">
              <Input placeholder="搜索流程节点（示例）" clearable suffix={<SearchIcon />} />
              <div className="search-toolbar">
                <span className="match-count">匹配 0 项</span>
              </div>
            </div>
          </div>

          <div className="structure-tree" role="tree">
            <Tree/>
          </div>
        </div>

        <div className="structure-bottom">
          <Empty description="暂无流程节点" />
        </div>
      </aside>

      <main className="main-body">
        <div className="main-inner">
          <FlowBody />
        </div>
      </main>

      <aside className="aside-right">
        <div style={{ padding: 8 }}>
          <h4>流程信息</h4>
          <p>这里放置流程相关设置与属性。</p>
        </div>
      </aside>
    </div>
  );
};

export default FlowLayout;
