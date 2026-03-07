import React from 'react';

const ComponentAsideRight: React.FC = () => {
  return (
    <aside className="aside-right">
      <div style={{ padding: 8 }}>
        <h4>预览</h4>
        <p>这里放组件预览或属性面板。</p>
      </div>
    </aside>
  );
};

export default React.memo(ComponentAsideRight);
