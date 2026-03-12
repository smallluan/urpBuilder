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
  SlidersHorizontal,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import componentCatalog from '../../../config/componentCatalog';
import DragableWrapper from '../../../components/DragableWrapper';

interface ComponentLibraryPanelProps {
  selectedName: string | null;
  onSelect: (name: string) => void;
}

type ComponentCategory = 'layout' | 'text' | 'display' | 'action';

interface CategoryMeta {
  label: string;
  Icon: LucideIcon;
}

const CATEGORY_META_MAP: Record<ComponentCategory, CategoryMeta> = {
  action: {
    label: '基础组件',
    Icon: Boxes,
  },
  layout: {
    label: '布局组件',
    Icon: LayoutGrid,
  },
  display: {
    label: '输入组件',
    Icon: Hash,
  },
  text: {
    label: '展示组件',
    Icon: ImageIcon,
  },
};

const CATEGORY_ORDER: ComponentCategory[] = ['action', 'layout', 'display', 'text'];

const getCategoryByType = (type: string): ComponentCategory => {
  if (type.startsWith('Typography.')) {
    return 'text';
  }

  if (
    type === 'Switch'
    || type === 'InputNumber'
    || type === 'Slider'
    || type === 'ColorPicker'
    || type === 'TimePicker'
    || type === 'TimeRangePicker'
  ) {
    return 'display';
  }

  if (
    type === 'Image'
    || type === 'Avatar'
    || type === 'Calendar'
    || type === 'Swiper'
  ) {
    return 'text';
  }

  if (
    type === 'Space'
    || type.startsWith('Grid.')
    || type.startsWith('Layout.')
    || type === 'Layout'
  ) {
    return 'layout';
  }

  return 'action';
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
    Slider: SlidersHorizontal,
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

  const groupedCatalog = useMemo(() => {
    return filteredCatalog.reduce<Record<ComponentCategory, typeof filteredCatalog>>((acc, component) => {
      const category = getCategoryByType(String(component.type ?? ''));
      acc[category].push(component);
      return acc;
    }, {
      action: [],
      layout: [],
      display: [],
      text: [],
    });
  }, [filteredCatalog]);

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
        {CATEGORY_ORDER.map((category) => {
          const categoryComponents = groupedCatalog[category] ?? [];
          if (categoryComponents.length === 0) {
            return null;
          }

          const categoryMeta = CATEGORY_META_MAP[category];

          return (
            <div key={category} className="library-section">
              <div className="library-section-head">
                <div className="library-section-title">
                  <categoryMeta.Icon size={14} strokeWidth={2} />
                  <span>{categoryMeta.label}</span>
                </div>
                <span className="library-section-count">{categoryComponents.length}</span>
              </div>

              <div className="library-section-grid">
                {categoryComponents.map((component) => {
                  const itemCategory = getCategoryByType(String(component.type ?? ''));
                  const IconComponent = getIconByType(String(component.type ?? ''));

                  return (
                    <DragableWrapper onDragStart={handleOnDrapStart} key={component.type} data={component}>
                      <div
                        className={`library-item ${selectedName === component.name ? 'is-active' : ''}`}
                        title={String(component.name)}
                        onClick={() => onSelect(component.name)}
                      >
                        <div className={`library-item-icon library-item-icon--${itemCategory}`}>
                          <IconComponent size={16} strokeWidth={2} />
                        </div>
                        <div className="library-item-name">{component.name}</div>
                        <div className="library-item-type">{component.type}</div>
                      </div>
                    </DragableWrapper>
                  );
                })}
              </div>
            </div>
          );
        })}

        {filteredCatalog.length === 0 ? (
          <div className="library-empty">未找到匹配组件</div>
        ) : null}
      </div>
    </div>
  );
};

export default React.memo(ComponentLibraryPanel);
