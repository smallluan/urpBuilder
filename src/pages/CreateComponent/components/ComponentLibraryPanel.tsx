import React from 'react';
import { Typography } from 'tdesign-react';
import componentCatalog from '../../../config/componentCatalog';
import DragableWrapper from '../../../components/DragableWrapper';

const { Text } = Typography;

interface ComponentLibraryPanelProps {
  selectedName: string | null;
  onSelect: (name: string) => void;
}

const ComponentLibraryPanel: React.FC<ComponentLibraryPanelProps> = ({ selectedName, onSelect }) => {

  // 拖拽组件开始时，将组件的结构化数据携带
  const handleOnDrapStart = (e: React.DragEvent<HTMLDivElement>, data: any) => {
    e.dataTransfer?.setData('drag-component-data', JSON.stringify(data));
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="right-panel-body">
      <div className="library-list">
        {componentCatalog.map((component) => (
          <DragableWrapper onDragStart={handleOnDrapStart} key={component.type} data={component}>
            <div
              className={`library-item ${selectedName === component.name ? 'is-active' : ''}`}
              onClick={() => onSelect(component.name)}
            >
              <Text>{component.name}</Text>
              <Text>{component.type}</Text>
            </div>
          </DragableWrapper>
        ))}
      </div>
    </div>
  );
};

export default React.memo(ComponentLibraryPanel);
