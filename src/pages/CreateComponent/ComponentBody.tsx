import React, { useMemo } from 'react';
import { useCreateComponentStore } from './store';
import DropArea from '../../components/DropArea';

const ComponentBody: React.FC = () => {
  const screenSize = useCreateComponentStore((state) => state.screenSize);
  const autoWidth = useCreateComponentStore((state) => state.autoWidth);

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
        <DropArea/>
      </div>
    </div>
  );
};

export default ComponentBody;
