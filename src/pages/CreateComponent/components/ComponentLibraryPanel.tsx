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
  return (
    <div className="right-panel-body">
      <div className="library-list">
        {componentCatalog.map((component) => (
          <DragableWrapper key={component.type} data={component}>
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
