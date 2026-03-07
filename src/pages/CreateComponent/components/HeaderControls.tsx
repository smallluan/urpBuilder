import React from 'react';
import { Radio, Button, Space } from 'tdesign-react';
import { ArrowLeftIcon, ArrowRightIcon, AnticlockwiseIcon, UploadIcon, ViewImageIcon } from 'tdesign-icons-react';

type Props = {
  mode: 'component' | 'flow';
  onChange: (v: 'component' | 'flow') => void;
};

const HeaderControls: React.FC<Props> = ({ mode, onChange }) => {
  const handleChange = (value: any) => {
    onChange(String(value) === '1' ? 'component' : 'flow');
  };

  return (
    <div className="header-controls">
      <div className="header-left-control">
        <Radio.Group variant="default-filled" value={mode === 'component' ? '1' : '2'} onChange={handleChange}>
          <Radio.Button value="1">搭建组件</Radio.Button>
          <Radio.Button value="2">搭建流程</Radio.Button>
        </Radio.Group>
      </div>

      <div className="header-right-control">
        <Space>
            <div className="nav-group">
              <Button theme="default" variant="text" size="small" icon={<ArrowLeftIcon />}>上一步</Button>
              <span className="divider" />
              <Button theme="default" variant="text" size="small" icon={<AnticlockwiseIcon />}>重做</Button>
              <span className="divider" />
              <Button theme="default" variant="text" size="small" icon={<ArrowRightIcon />}>下一步</Button>
            </div>

            <div className="action-group">
              <Button theme="primary" size="small" icon={<UploadIcon />}>保存</Button>
              <Button theme="default" size="small" icon={<ViewImageIcon />}>预览</Button>
            </div>
        </Space>
      </div>
    </div>
  );
};

export default HeaderControls;
