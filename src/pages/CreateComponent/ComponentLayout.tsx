import React from 'react';
import { Input, Empty, Space, Select, Typography } from 'tdesign-react';
const { Text } = Typography;
import { SearchIcon } from 'tdesign-icons-react';
import ComponentBody from './ComponentBody';
import SCREEN_SIZES from './screenSizes';
import './style.less';

const ComponentLayout: React.FC = () => {
  return (
    <div className="create-body">
      <aside className="aside-left">
        <div className="structure-top">
          <div className="structure-header">
            <div className="search-row">
              <Input placeholder="搜索组件（示例）" clearable suffix={<SearchIcon />} />
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
        {/* 这里是模拟器的页面布局配置，比如布局选项，页面尺寸等等 */}
        <div style={{
          backgroundColor: 'white',
          padding:'8px',
          boxSizing: 'border-box',
          borderRadius: '4px'
        }}>
          <Space size={8} align='center'>
            <Text style={{fontSize: '12px'}}>开发尺寸：</Text>
            <Select style={{ width: '200px' }} options={SCREEN_SIZES} />
            <Input type='number' style={{width: '100px'}}/>
          </Space>
        </div>
        
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
