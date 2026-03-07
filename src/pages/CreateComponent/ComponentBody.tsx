import React, { useMemo } from 'react';
import { useCreateComponentStore } from './store';
import DropArea from '../../components/DropArea';

const ComponentBody: React.FC = () => {
  const screenSize = useCreateComponentStore((state) => state.screenSize);
  const autoWidth = useCreateComponentStore((state) => state.autoWidth);
  const uiPageData = useCreateComponentStore((state) => state.uiPageData);
  const insertToUiPageData = useCreateComponentStore((state) => state.insertToUiPageData);

  // 组件拖拽后接收结构化数据，并插入到对应父节点下
  const handleDropData = (data: any, parent: any) => {
    if (!parent?.key || !data || typeof data !== 'object') {
      return;
    }
    insertToUiPageData(parent.key, data as Record<string, unknown>);
    setTimeout(() => {
      console.log(useCreateComponentStore.getState().uiPageData);
    }, 0);
  };

  const simulatorStyle: React.CSSProperties = useMemo(() => {
    const width = screenSize === 'auto' ? `${autoWidth}px` : `${screenSize}px`;
    return {
      width,
      minHeight: '100%',
      backgroundColor: '#fff',
      margin: '0 auto',
      transition: 'width 0.3s ease',
      boxSizing: 'content-box', // Ensure border doesn't eat into width if strict specific
    };
  }, [screenSize, autoWidth]);

  return (
    <div className="component-body">
      <div className="simulator-container" style={simulatorStyle}>
        <DropArea data={uiPageData} onDropData={handleDropData} />
      </div>
    </div>
  );
};

export default ComponentBody;
