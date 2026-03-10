import React, { useEffect, useState } from 'react';
import { Input, Space, Select, Typography } from 'tdesign-react';
import ComponentBody from '../ComponentBody';
import SCREEN_SIZES from '../screenSizes';
import { useCreateComponentStore } from '../store';

const { Text } = Typography;

const ComponentMainBody: React.FC = () => {
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

  const handleInputBlur = (value: string) => {
    if (screenSize !== 'auto') {
      return;
    }

    const nextWidth = Number(value);
    if (!Number.isNaN(nextWidth) && nextWidth > 0 && nextWidth !== autoWidth) {
      setAutoWidth(nextWidth);
      return;
    }

    setDraftInputValue(String(autoWidth));
  };

  return (
    <main className="main-body">
      <div
        style={{
          backgroundColor: 'white',
          padding: '8px',
          boxSizing: 'border-box',
          borderRadius: '4px',
        }}
      >
        <Space size={8} align="center">
          <Space size={8} align="center">
          <Text style={{ fontSize: '12px' }}>开发尺寸：</Text>
          <Select
            style={{ width: '200px' }}
            options={SCREEN_SIZES}
            value={screenSize}
            onChange={(value) => handleSelectChange(value as string | number)}
          />
          <Input
            type="number"
            style={{ width: '100px' }}
            value={draftInputValue}
            disabled={inputDisabled}
            onChange={(value) => setDraftInputValue(String(value ?? ''))}
            onBlur={(value) => handleInputBlur(String(value ?? ''))}
          />
          </Space>
        </Space>
      </div>

      <div className="main-inner">
        <ComponentBody />
      </div>
    </main>
  );
};

export default React.memo(ComponentMainBody);
