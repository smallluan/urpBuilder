import React, { useEffect, useState } from 'react';
import { Input, Empty, Space, Select, Typography, Tree } from 'tdesign-react';
const { Text } = Typography;
import { SearchIcon } from 'tdesign-icons-react';
import ComponentBody from './ComponentBody';
import SCREEN_SIZES from './screenSizes';
import { useCreateComponentStore } from './store';
import './style.less';

const ComponentLayout: React.FC = () => {
  const screenSize = useCreateComponentStore((state) => state.screenSize);
  const autoWidth = useCreateComponentStore((state) => state.autoWidth);
  const setScreenSize = useCreateComponentStore((state) => state.setScreenSize);
  const setAutoWidth = useCreateComponentStore((state) => state.setAutoWidth);
  const inputDisabled = screenSize !== 'auto';
  const [draftInputValue, setDraftInputValue] = useState<string>(String(autoWidth));

  useEffect(() => {
    const nextValue = screenSize === 'auto' ? String(autoWidth) : String(Number(screenSize));
    setDraftInputValue((prev) => (prev === nextValue ? prev : nextValue));
  }, [screenSize, autoWidth]);

  const handleSelectChange = (value: string | number) => {
    setScreenSize(value);
    if (value === 'auto') {
      setAutoWidth(1800);
    }
  };

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
            <Tree/>
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
            <Select 
              style={{ width: '200px' }} 
              options={SCREEN_SIZES} 
              value={screenSize}
              onChange={(value) => handleSelectChange(value as string | number)}
            />
            <Input
              type='number'
              style={{width: '100px'}}
              value={draftInputValue}
              disabled={inputDisabled}
              onChange={(value) => setDraftInputValue(String(value ?? ''))}
            />
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
