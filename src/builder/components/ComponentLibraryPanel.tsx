import React, { useEffect, useMemo, useState } from 'react';
import { Input, Popup } from 'tdesign-react';
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
  Link2,
  SlidersHorizontal,
  ListOrdered,
  Star,
  ArrowUpToLine,
  BarChart3,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import componentCatalog from '../../config/componentCatalog';
import { componentLibraryEntries, groupedComponentTypes, type ComponentLibraryCategory, type ComponentLibraryEntry, type ComponentLibraryGroupEntry } from '../../config/componentLibrary';
import { ECHART_COMPONENT_TYPES as ECHART_COMPONENT_TYPE_LIST } from '../../constants/echart';
import DragableWrapper from '../../components/DragableWrapper';
import { getComponentBaseList, getComponentTemplateDetail } from '../../api/componentTemplate';
import { useTeam } from '../../team/context';
import { resolveComponentSlots, resolveExposedLifecycles, resolveExposedPropSchemas } from '../../utils/customComponentRuntime';
import { useBuilderContext } from '../context/BuilderContext';

interface CustomComponentSchema {
  name: string;
  type: 'CustomComponent';
  props: Record<string, unknown>;
  lifetimes: string[];
}

interface ComponentLibraryPanelProps {
  selectedName: string | null;
  onSelect: (name: string) => void;
  hideSavedComponents?: boolean;
}

type ComponentSchema = (typeof componentCatalog)[number];
type ComponentSourceType = 'tdesign' | 'echarts';

interface CategoryMeta {
  label: string;
  Icon: LucideIcon;
}

const CATEGORY_META_MAP: Record<ComponentLibraryCategory, CategoryMeta> = {
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
    label: '展示类',
    Icon: ImageIcon,
  },
  navigation: {
    label: '导航类',
    Icon: ArrowUpToLine,
  },
};

const CATEGORY_ORDER: ComponentLibraryCategory[] = ['action', 'layout', 'display', 'text', 'navigation'];

const HIDDEN_COMPONENT_TYPES = new Set(['List.Item']);
const ECHART_COMPONENT_TYPES = new Set(ECHART_COMPONENT_TYPE_LIST);

const getCategoryByType = (type: string): ComponentLibraryCategory => {
  if (type.startsWith('Typography.')) {
    return 'text';
  }

  if (
    type === 'Switch'
    || type === 'Input'
    || type === 'Textarea'
    || type === 'InputNumber'
    || type === 'Slider'
    || type === 'Upload'
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
    || type === 'Progress'
    || type === 'List'
    || ECHART_COMPONENT_TYPES.has(type)
    || type === 'Tabs'
    || type === 'Steps'
    || type === 'Steps.Item'
    || type === 'Swiper'
  ) {
    return 'text';
  }

  if (
    type === 'Space'
    || type.startsWith('Grid.')
    || type.startsWith('Layout.')
    || type === 'Layout'
    || type === 'RouteOutlet'
    || type === 'ComponentSlotOutlet'
  ) {
    return 'layout';
  }

  if (type === 'BackTop') {
    return 'navigation';
  }

  if (
    type === 'Menu'
    || type === 'HeadMenu'
    || type === 'Menu.Submenu'
    || type === 'Menu.Item'
    || type === 'Menu.Group'
  ) {
    return 'navigation';
  }

  return 'action';
};

const getCategoryIcon = (category: ComponentLibraryCategory) => {
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

  if (category === 'navigation') {
    return ArrowUpToLine;
  }

  return Boxes;
};

const getIconByType = (type: string) => {
  const iconMap: Record<string, any> = {
    Button: MousePointerClick,
    Link: Link2,
    BackTop: ArrowUpToLine,
    Drawer: RectangleHorizontal,
    Progress: SlidersHorizontal,
    Upload: ArrowUpToLine,
    Menu: ListOrdered,
    HeadMenu: ListOrdered,
    'Menu.Submenu': ListOrdered,
    'Menu.Item': ListOrdered,
    'Menu.Group': ListOrdered,
    Icon: Star,
    Space: GripHorizontal,
    'Grid.Row': Rows3,
    'Grid.Col': Columns3,
    RouteOutlet: RectangleHorizontal,
    ComponentSlotOutlet: RectangleHorizontal,
    Card: RectangleHorizontal,
    Image: ImageIcon,
    Avatar: UserRound,
    Calendar: CalendarDays,
    EChart: BarChart3,
    LineChart: BarChart3,
    BarChart: BarChart3,
    PieChart: BarChart3,
    RadarChart: BarChart3,
    ScatterChart: BarChart3,
    AreaChart: BarChart3,
    DonutChart: BarChart3,
    GaugeChart: BarChart3,
    FunnelChart: BarChart3,
    CandlestickChart: BarChart3,
    TreemapChart: BarChart3,
    HeatmapChart: BarChart3,
    SunburstChart: BarChart3,
    MapChart: BarChart3,
    SankeyChart: BarChart3,
    GraphChart: BarChart3,
    BoxplotChart: BarChart3,
    WaterfallChart: BarChart3,
    ColorPicker: Pipette,
    TimePicker: Clock3,
    TimeRangePicker: Timer,
    Input: Type,
    Textarea: AlignLeft,
    InputNumber: Hash,
    Slider: SlidersHorizontal,
    Tabs: ListOrdered,
    Steps: ListOrdered,
    'Steps.Item': ListOrdered,
    List,
    Divider: Minus,
    'Typography.Title': Heading,
    'Typography.Paragraph': AlignLeft,
    'Typography.Text': Type,
  };

  return iconMap[type] ?? getCategoryIcon(getCategoryByType(type));
};

const matchText = (segments: Array<string | undefined>, keyword: string) => {
  const normalizedKeyword = keyword.trim().toLowerCase();
  if (!normalizedKeyword) {
    return true;
  }

  return segments.some((segment) => String(segment ?? '').toLowerCase().includes(normalizedKeyword));
};

const getSchemaSearchTexts = (schema?: ComponentSchema) => {
  if (!schema) {
    return [];
  }

  return [String(schema.name ?? ''), String(schema.type ?? '')];
};

const isGroupEntrySelected = (
  entry: ComponentLibraryGroupEntry,
  selectedName: string | null,
  schemaMap: Map<string, ComponentSchema>,
) => {
  if (!selectedName) {
    return false;
  }

  return entry.children.some((child) => schemaMap.get(child.type)?.name === selectedName);
};

const getPopupNodeKindLabel = (type: string): string => {
  const normalizedType = type.trim();

  if (
    normalizedType === 'Menu.Submenu'
    || normalizedType === 'Menu.Item'
    || normalizedType === 'Menu.Group'
    || normalizedType === 'Steps.Item'
    || normalizedType.startsWith('Layout.')
    || normalizedType === 'Grid.Col'
  ) {
    return '结构';
  }

  return '容器';
};

const ComponentLibraryPanel: React.FC<ComponentLibraryPanelProps> = ({ selectedName, onSelect, hideSavedComponents = false }) => {
  const { entityType } = useBuilderContext();
  const { currentTeamId } = useTeam();
  const [keyword, setKeyword] = useState('');
  const [sourceType, setSourceType] = useState<ComponentSourceType>('tdesign');
  const [openedGroupKey, setOpenedGroupKey] = useState<string | null>(null);
  const [customComponentSchemas, setCustomComponentSchemas] = useState<CustomComponentSchema[]>([]);

  // 拖拽组件开始时，将组件的结构化数据携带
  const handleOnDrapStart = (e: React.DragEvent<HTMLDivElement>, data: any) => {
    e.dataTransfer?.setData('drag-component-data', JSON.stringify(data));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const schemaMap = useMemo(() => {
    return new Map<string, ComponentSchema>(
      componentCatalog.map((component) => [String(component.type ?? ''), component]),
    );
  }, []);

  const libraryEntries = useMemo(() => {
    const plainEntries: ComponentLibraryEntry[] = componentCatalog
      .filter((component) => {
        const type = String(component.type ?? '');
        if (type === 'ComponentSlotOutlet' && entityType !== 'component') {
          return false;
        }
        return !HIDDEN_COMPONENT_TYPES.has(type) && !groupedComponentTypes.has(type);
      })
      .map((component) => ({
        key: String(component.type ?? ''),
        kind: 'item' as const,
        name: String(component.name ?? component.type ?? ''),
        type: String(component.type ?? ''),
        category: getCategoryByType(String(component.type ?? '')),
      }));

    return [...componentLibraryEntries, ...plainEntries];
  }, [entityType]);

  const sourceFilteredEntries = useMemo(() => {
    return libraryEntries.filter((entry) => {
      if (entry.kind === 'group') {
        const children = entry.children.filter((child) => {
          const isChart = ECHART_COMPONENT_TYPES.has(String(child.type ?? ''));
          return sourceType === 'echarts' ? isChart : !isChart;
        });
        return children.length > 0;
      }

      const isChart = ECHART_COMPONENT_TYPES.has(String(entry.type ?? ''));
      return sourceType === 'echarts' ? isChart : !isChart;
    }).map((entry) => {
      if (entry.kind !== 'group') {
        return entry;
      }

      const children = entry.children.filter((child) => {
        const isChart = ECHART_COMPONENT_TYPES.has(String(child.type ?? ''));
        return sourceType === 'echarts' ? isChart : !isChart;
      });

      return {
        ...entry,
        children,
      };
    });
  }, [libraryEntries, sourceType]);

  const filteredEntries = useMemo(() => {
    const text = keyword.trim();
    if (!text) {
      return sourceFilteredEntries;
    }

    return sourceFilteredEntries.reduce<ComponentLibraryEntry[]>((acc, entry) => {
      if (entry.kind === 'item') {
        const schema = schemaMap.get(entry.type);
        const matched = matchText([
          entry.name,
          entry.type,
          ...getSchemaSearchTexts(schema),
          ...(entry.keywords ?? []),
        ], text);

        if (matched) {
          acc.push(entry);
        }

        return acc;
      }

      const groupMatched = matchText([
        entry.name,
        entry.helperText,
        entry.iconType,
        ...(entry.keywords ?? []),
      ], text);

      if (groupMatched) {
        acc.push(entry);
        return acc;
      }

      const matchedChildren = entry.children.filter((child) => {
        const schema = schemaMap.get(child.type);
        return matchText([
          child.type,
          child.helperText,
          ...getSchemaSearchTexts(schema),
          ...(child.keywords ?? []),
        ], text);
      });

      if (matchedChildren.length > 0) {
        acc.push({
          ...entry,
          children: matchedChildren,
        });
      }

      return acc;
    }, []);
  }, [keyword, sourceFilteredEntries, schemaMap]);

  const groupedCatalog = useMemo(() => {
    return filteredEntries.reduce<Record<ComponentLibraryCategory, ComponentLibraryEntry[]>>((acc, entry) => {
      acc[entry.category].push(entry);
      return acc;
    }, {
      action: [],
      layout: [],
      display: [],
      text: [],
      navigation: [],
    });
  }, [filteredEntries]);

  useEffect(() => {
    if (hideSavedComponents) {
      setCustomComponentSchemas([]);
      return undefined;
    }

    let cancelled = false;

    const buildCustomComponentSchemas = async () => {
      try {
        const queryTasks: Array<ReturnType<typeof getComponentBaseList>> = [
          getComponentBaseList({ page: 1, pageSize: 100, mine: true, status: 'published' }),
        ];

        if (currentTeamId) {
          queryTasks.push(
            getComponentBaseList({
              page: 1,
              pageSize: 100,
              status: 'published',
              ownerType: 'team',
              ownerTeamId: currentTeamId,
            }),
          );
        }

        const baseResults = await Promise.all(queryTasks);
        const listMap = new Map<string, any>();
        baseResults.forEach((result) => {
          const items = Array.isArray(result.data?.list) ? result.data.list : [];
          items.forEach((item) => {
            const key = String(item.pageId || '').trim();
            if (!key) {
              return;
            }
            listMap.set(key, item);
          });
        });
        const list = Array.from(listMap.values());

        const details = await Promise.all(
          list.map(async (item) => {
            try {
              const detail = await getComponentTemplateDetail(String(item.pageId));
              return {
                base: item,
                detail: detail.data,
              };
            } catch {
              return {
                base: item,
                detail: null,
              };
            }
          }),
        );

        const nextSchemas = details
          .map(({ base, detail }) => {
            const exposedPropSchemas = resolveExposedPropSchemas(detail);
            const exposedLifecycles = resolveExposedLifecycles(detail);
            const componentSlots = resolveComponentSlots(detail);

            const props = {
              __componentId: {
                name: '组件ID',
                value: String(base.pageId ?? ''),
                editType: 'input',
              },
              __componentName: {
                name: '组件名称',
                value: String(base.pageName ?? base.pageId ?? '自定义组件'),
                editType: 'input',
              },
              __slots: {
                name: '插槽定义',
                value: componentSlots,
                editType: 'jsonCode',
              },
              ...Object.fromEntries(
                exposedPropSchemas.map((item) => [
                  item.propKey,
                  {
                    ...item.schema,
                    name: String(item.schema.name ?? item.propKey),
                    value: item.schema.value ?? '',
                  },
                ]),
              ),
            };

            return {
              name: String(base.pageName ?? base.pageId ?? '自定义组件'),
              type: 'CustomComponent' as const,
              props,
              lifetimes: Array.from(new Set(exposedLifecycles)),
            };
          })
          .filter((item) => !!item.name);

        if (!cancelled) {
          setCustomComponentSchemas(nextSchemas);
        }
      } catch {
        if (!cancelled) {
          setCustomComponentSchemas([]);
        }
      }
    };

    void buildCustomComponentSchemas();

    return () => {
      cancelled = true;
    };
  }, [hideSavedComponents, currentTeamId]);

  const filteredCustomComponentSchemas = useMemo(() => {
    if (sourceType !== 'tdesign') {
      return [];
    }

    const text = keyword.trim().toLowerCase();
    if (!text) {
      return customComponentSchemas;
    }

    return customComponentSchemas.filter((item) => {
      return item.name.toLowerCase().includes(text)
        || String((item.props.__componentId as { value?: unknown } | undefined)?.value ?? '').toLowerCase().includes(text);
    });
  }, [customComponentSchemas, keyword, sourceType]);

  const renderLibraryItemCard = (schema: ComponentSchema, isActive: boolean, helperText?: string) => {
    const itemCategory = getCategoryByType(String(schema.type ?? ''));
    const IconComponent = getIconByType(String(schema.type ?? ''));

    return (
      <div
        className={`library-item ${isActive ? 'is-active' : ''}`}
        title={String(schema.name)}
        onClick={() => onSelect(String(schema.name))}
      >
        <div className={`library-item-icon library-item-icon--${itemCategory}`}>
          <IconComponent size={16} strokeWidth={2} />
        </div>
        <div className="library-item-name">{schema.name}</div>
        <div className="library-item-type">{helperText || schema.type}</div>
      </div>
    );
  };

  const renderGroupPopupContent = (entry: ComponentLibraryGroupEntry) => {
    return (
      <div className="library-group-popup">
        <div className="library-group-popup__header">
          <div className="library-group-popup__title">{entry.name}</div>
          <div className="library-group-popup__caption">拖拽下列子组件到画布</div>
        </div>
        <div className="library-group-popup__list">
          {entry.children.map((child) => {
            const schema = schemaMap.get(child.type);
            if (!schema) {
              return null;
            }

            const IconComponent = getIconByType(String(schema.type ?? ''));
            const itemCategory = getCategoryByType(String(schema.type ?? ''));

            return (
              <DragableWrapper onDragStart={handleOnDrapStart} key={child.type} data={schema}>
                <div
                  className={`library-popup-item ${selectedName === schema.name ? 'is-active' : ''}`}
                  title={String(schema.name)}
                  onClick={() => {
                    onSelect(String(schema.name));
                    setOpenedGroupKey(null);
                  }}
                >
                  <div className={`library-item-icon library-item-icon--${itemCategory}`}>
                    <IconComponent size={16} strokeWidth={2} />
                  </div>
                  <div className="library-popup-item__content">
                    <div className="library-popup-item__name">{schema.name}</div>
                    <div className="library-popup-item__desc">{child.helperText || schema.type}</div>
                  </div>
                  <div className="library-popup-item__meta">
                    <span className="library-popup-item__type">{schema.type}</span>
                    <span className="library-popup-item__kind">{getPopupNodeKindLabel(schema.type)}</span>
                  </div>
                </div>
              </DragableWrapper>
            );
          })}
        </div>
      </div>
    );
  };

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
      <div className="library-source-tabs library-source-tabs--horizontal">
        <button
          type="button"
          className={`library-source-tabs__item${sourceType === 'tdesign' ? ' is-active' : ''}`}
          onClick={() => setSourceType('tdesign')}
        >
          TDesign
        </button>
        <button
          type="button"
          className={`library-source-tabs__item${sourceType === 'echarts' ? ' is-active' : ''}`}
          onClick={() => setSourceType('echarts')}
        >
          ECharts
        </button>
      </div>

      <div className="library-content">
        <div className="library-list">
        {!hideSavedComponents && filteredCustomComponentSchemas.length > 0 ? (
          <div className="library-section">
            <div className="library-section-head">
              <div className="library-section-title">
                <Boxes size={14} strokeWidth={2} />
                <span>已保存组件</span>
              </div>
              <span className="library-section-count">{filteredCustomComponentSchemas.length}</span>
            </div>

            <div className="library-section-grid">
              {filteredCustomComponentSchemas.map((schema) => (
                <DragableWrapper onDragStart={handleOnDrapStart} key={`custom-${schema.name}-${(schema.props.__componentId as { value?: unknown } | undefined)?.value ?? ''}`} data={schema}>
                  <div
                    className={`library-item ${selectedName === schema.name ? 'is-active' : ''}`}
                    title={schema.name}
                    onClick={() => onSelect(schema.name)}
                  >
                    <div className="library-item-icon library-item-icon--action">
                      <Boxes size={16} strokeWidth={2} />
                    </div>
                    <div className="library-item-name">{schema.name}</div>
                    <div className="library-item-type">{String((schema.props.__componentId as { value?: unknown } | undefined)?.value ?? 'CustomComponent')}</div>
                  </div>
                </DragableWrapper>
              ))}
            </div>
          </div>
        ) : null}

        {CATEGORY_ORDER.map((category) => {
          const categoryEntries = groupedCatalog[category] ?? [];
          if (categoryEntries.length === 0) {
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
                <span className="library-section-count">{categoryEntries.length}</span>
              </div>

              <div className="library-section-grid">
                {categoryEntries.map((entry) => {
                  if (entry.kind === 'group') {
                    const IconComponent = getIconByType(entry.iconType || entry.key);
                    const isActive = isGroupEntrySelected(entry, selectedName, schemaMap);

                    return (
                      <div className="library-group-trigger" key={entry.key}>
                        <Popup
                          destroyOnClose={false}
                          placement="left-top"
                          showArrow={false}
                          trigger="click"
                          visible={openedGroupKey === entry.key}
                          onVisibleChange={(visible) => {
                            setOpenedGroupKey(visible ? entry.key : null);
                          }}
                          content={renderGroupPopupContent(entry)}
                        >
                          <div
                            className={`library-item library-item--group ${isActive ? 'is-active' : ''}${openedGroupKey === entry.key ? ' is-open' : ''}`}
                            title={`${entry.name}（点击后选择子组件）`}
                          >
                            <span className="library-item-group-marker" aria-hidden="true">
                              <MousePointerClick size={12} strokeWidth={2.2} />
                            </span>
                            <div className={`library-item-icon library-item-icon--${entry.category}`}>
                              <IconComponent size={16} strokeWidth={2} />
                            </div>
                            <div className="library-item-name">{entry.name}</div>
                            <div className="library-item-type">{entry.helperText || '点击后选择子组件'}</div>
                          </div>
                        </Popup>
                      </div>
                    );
                  }

                  const schema = schemaMap.get(entry.type);
                  if (!schema) {
                    return null;
                  }

                  return (
                    <DragableWrapper onDragStart={handleOnDrapStart} key={entry.key} data={schema}>
                      {renderLibraryItemCard(schema, selectedName === schema.name)}
                    </DragableWrapper>
                  );
                })}
              </div>
            </div>
          );
        })}

        {filteredEntries.length === 0 ? (
          <div className="library-empty">未找到匹配组件</div>
        ) : null}
        </div>
      </div>
    </div>
  );
};

export default React.memo(ComponentLibraryPanel);
