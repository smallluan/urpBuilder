import React from 'react';
import FlowBody from './FlowBody';
import FlowAsideLeft from './components/FlowAsideLeft';
import './style.less';

const FlowLayout: React.FC = () => {
  return (
    <div className="create-body">
      <FlowAsideLeft />

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
