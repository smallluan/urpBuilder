import React, { useMemo, useState } from 'react';
import { Input } from 'tdesign-react';
import { SearchIcon } from 'tdesign-icons-react';
import {
  LayoutGrid,
  Type,
  Image as ImageIcon,
  Boxes,
  MousePointerClick,
  GripHorizontal,
  Rows3,
  Columns3,
  RectangleHorizontal,
  UserRound,
  Minus,
  Heading,
  AlignLeft,
  CalendarDays,
  Pipette,
  Clock3,
  Timer,
  Hash,
  List,
} from 'lucide-react';
import componentCatalog from '../../../config/componentCatalog';
import DragableWrapper from '../../../components/DragableWrapper';

interface ComponentLibraryPanelProps {
  selectedName: string | null;
  onSelect: (name: string) => void;
}

type ComponentCategory = 'layout' | 'text' | 'display' | 'action';

const getCategoryByType = (type: string): ComponentCategory => {
  if (type.startsWith('Typography.')) {
    return 'text';
  }

  if (
    type === 'Image'
    || type === 'Avatar'
    || type === 'Calendar'
    || type === 'ColorPicker'
    || type === 'TimePicker'
    || type === 'TimeRangePicker'
    || type === 'InputNumber'
  ) {
    return 'display';
  }

  if (type === 'Button') {
    return 'action';
  }

  return 'layout';
};

const getCategoryIcon = (category: ComponentCategory) => {
  if (category === 'layout') {
    return LayoutGrid;
  }

  if (category === 'text') {
    return Type;
  }

  if (category === 'display') {
    return ImageIcon;
  }

  if (category === 'action') {
    return MousePointerClick;
  }

  return Boxes;
};

const getIconByType = (type: string) => {
  const iconMap: Record<string, any> = {
    Button: MousePointerClick,
    Space: GripHorizontal,
    'Grid.Row': Rows3,
    'Grid.Col': Columns3,
    Card: RectangleHorizontal,
    Image: ImageIcon,
    Avatar: UserRound,
    Calendar: CalendarDays,
    ColorPicker: Pipette,
    TimePicker: Clock3,
    TimeRangePicker: Timer,
    InputNumber: Hash,
    List,
    Divider: Minus,
    'Typography.Title': Heading,
    'Typography.Paragraph': AlignLeft,
    'Typography.Text': Type,
  };

  return iconMap[type] ?? getCategoryIcon(getCategoryByType(type));
};

const ComponentLibraryPanel: React.FC<ComponentLibraryPanelProps> = ({ selectedName, onSelect }) => {
  const [keyword, setKeyword] = useState('');

  // 拖拽组件开始时，将组件的结构化数据携带
  const handleOnDrapStart = (e: React.DragEvent<HTMLDivElement>, data: any) => {
    e.dataTransfer?.setData('drag-component-data', JSON.stringify(data));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const filteredCatalog = useMemo(() => {
    const text = keyword.trim();
    const catalogWithoutAbstractNodes = componentCatalog.filter((component) => component.type !== 'List.Item');

    if (!text) {
      return catalogWithoutAbstractNodes;
    }

    return catalogWithoutAbstractNodes.filter((component) => String(component.name ?? '').includes(text));
  }, [keyword]);

  return (
    <div className="right-panel-body">
      <div className="library-search-row">
        <Input
          clearable
          value={keyword}
          placeholder="搜索组件（中文名）"
          suffixIcon={<SearchIcon />}
          onChange={(value) => setKeyword(String(value ?? ''))}
        />
      </div>

      <div className="library-list">
        {filteredCatalog.map((component) => (
          <DragableWrapper onDragStart={handleOnDrapStart} key={component.type} data={component}>
            {(() => {
              const category = getCategoryByType(String(component.type ?? ''));
              const IconComponent = getIconByType(String(component.type ?? ''));

              return (
            <div
              className={`library-item ${selectedName === component.name ? 'is-active' : ''}`}
              title={String(component.name)}
              onClick={() => onSelect(component.name)}
            >
              <div className={`library-item-icon library-item-icon--${category}`}>
                <IconComponent size={18} strokeWidth={2} />
              </div>
              <div className="library-item-name">{component.name}</div>
            </div>
              );
            })()}
          </DragableWrapper>
        ))}

        {filteredCatalog.length === 0 ? (
          <div className="library-empty">未找到匹配组件</div>
        ) : null}
      </div>
    </div>
  );
};

export default React.memo(ComponentLibraryPanel);
