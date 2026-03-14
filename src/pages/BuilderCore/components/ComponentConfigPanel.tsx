import React, { useEffect, useState } from 'react';
import { Button, ColorPicker, Dialog, Empty, Input, InputNumber, Popup, Select, Slider, Space, Switch, Table, Tag, Typography } from 'tdesign-react';
import { HelpCircleIcon } from 'tdesign-icons-react';
import { useBuilderContext } from '../context/BuilderContext';
import type { UiTreeNode } from '../store/types';
import NodeStyleDrawer from './NodeStyleDrawer';
import { isSlotNode } from '../utils/slot';
import CodeEditorDialog, { type CodeEditorValue } from './CodeEditorDialog';
import { findNodePathByKey } from '../utils/tree';
import {
  GRID_BREAKPOINTS,
  getBreakpointByWidth,
  normalizeResponsiveConfig,
  resolveBuilderViewportWidth,
  type GridBreakpoint,
  type GridResponsiveConfig,
} from '../utils/gridResponsive';
import {
  getIconOptionsByFilters,
  ICON_INITIAL_FILTER_OPTIONS,
  ICON_QUICK_FILTER_OPTIONS,
  type IconInitialFilterKey,
  type IconQuickFilterKey,
} from '../../../constants/iconRegistry';
import { createDefaultTabsList, normalizeTabsList } from '../utils/tabs';

type EditType = 'switch' | 'input' | 'inputNumber' | 'select' | 'iconSelect' | 'swiperImages' | 'tabsConfig' | 'jsonCode';

interface SwiperImageRow {
  id: string;
  src: string;
  fallback: string;
  lazy: boolean;
  objectFit: string;
  objectPosition: string;
}

interface TabsRow {
  id: string;
  value: string;
  label: string;
  disabled: boolean;
  draggable: boolean;
  removable: boolean;
  lazy: boolean;
  destroyOnHide: boolean;
}

const SWIPER_FIT_OPTIONS = ['contain', 'cover', 'fill', 'none', 'scale-down'].map((item) => ({
  label: item,
  value: item,
}));

const SWIPER_POSITION_OPTIONS = ['left', 'center', 'right', 'top', 'bottom'].map((item) => ({
  label: item,
  value: item,
}));

const createSwiperImageRow = (seed?: Partial<SwiperImageRow>): SwiperImageRow => ({
  id: `swiper-image-${Date.now()}-${Math.round(Math.random() * 10000)}`,
  src: String(seed?.src ?? ''),
  fallback: String(seed?.fallback ?? ''),
  lazy: typeof seed?.lazy === 'boolean' ? seed.lazy : true,
  objectFit: String(seed?.objectFit ?? 'cover'),
  objectPosition: String(seed?.objectPosition ?? 'center'),
});

const normalizeSwiperImageRows = (value: unknown): SwiperImageRow[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item) => !!item && typeof item === 'object')
    .map((item) => createSwiperImageRow(item as Partial<SwiperImageRow>));
};

const createTabsRow = (seed?: Partial<TabsRow>): TabsRow => ({
  id: `tabs-row-${Date.now()}-${Math.round(Math.random() * 10000)}`,
  value: String(seed?.value ?? ''),
  label: String(seed?.label ?? ''),
  disabled: Boolean(seed?.disabled),
  draggable: typeof seed?.draggable === 'boolean' ? seed.draggable : true,
  removable: Boolean(seed?.removable),
  lazy: Boolean(seed?.lazy),
  destroyOnHide: typeof seed?.destroyOnHide === 'boolean' ? seed.destroyOnHide : true,
});

const normalizeTabsRows = (value: unknown): TabsRow[] => {
  const list = normalizeTabsList(value);
  return list.map((item) => createTabsRow({
    value: String(item.value),
    label: item.label,
    disabled: item.disabled,
    draggable: item.draggable,
    removable: item.removable,
    lazy: item.lazy,
    destroyOnHide: item.destroyOnHide,
  }));
};

interface ComponentPropSchema {
  name?: string;
  value?: unknown;
  editType?: EditType | string;
  editInput?: EditType | string;
  payload?: {
    options?: Array<string | number | { label: string; value: string | number }>;
    min?: number;
    max?: number;
  };
}

const PROGRESS_COLOR_PROP_KEYS = new Set(['color', 'trackColor']);

const GRID_PRESET_OPTIONS = [
  { label: '1/4', value: 3 },
  { label: '1/3', value: 4 },
  { label: '1/2', value: 6 },
  { label: '2/3', value: 8 },
  { label: '全宽', value: 12 },
];

const BREAKPOINT_LABEL_MAP: Record<GridBreakpoint, string> = {
  xs: 'xs (<768)',
  sm: 'sm (≥768)',
  md: 'md (≥992)',
  lg: 'lg (≥1200)',
  xl: 'xl (≥1400)',
  xxl: 'xxl (≥1880)',
};

const BREAKPOINT_DEVICE_MAP: Record<GridBreakpoint, string> = {
  xs: '移动端',
  sm: '大屏手机',
  md: '平板',
  lg: '笔记本',
  xl: '桌面端',
  xxl: '超宽屏',
};

const clampSpan = (value: number) => Math.max(0, Math.min(12, Math.round(value)));
const clampOffset = (value: number) => Math.max(0, Math.min(11, Math.round(value)));

const LIST_BINDABLE_PROP_OPTIONS: Record<string, Array<{ label: string; value: string }>> = {
  Image: [
    { label: 'src', value: 'src' },
    { label: 'alt', value: 'alt' },
  ],
  Avatar: [
    { label: 'image', value: 'image' },
    { label: 'content', value: 'content' },
    { label: 'alt', value: 'alt' },
  ],
  Button: [
    { label: 'content', value: 'content' },
  ],
  Link: [
    { label: 'content', value: 'content' },
    { label: 'href', value: 'href' },
  ],
  'Typography.Title': [
    { label: 'content', value: 'content' },
  ],
  'Typography.Paragraph': [
    { label: 'content', value: 'content' },
  ],
  'Typography.Text': [
    { label: 'content', value: 'content' },
  ],
};

const LIST_META_PROP_KEYS = new Set([
  'titleField',
  'descriptionField',
  'imageField',
  'actionField',
]);

const LIST_ITEM_META_PROP_KEYS = new Set([
  'showImage',
  'showDescription',
  'showAction',
  'actionTheme',
  'actionVariant',
  'actionSize',
]);

const COMMON_PROP_PRIORITY_MAP = new Map<string, number>([
  ['visible', 9],
  ['className', 10],
  ['name', 11],
  ['type', 12],
  ['placeholder', 13],
  ['size', 14],
  ['status', 15],
  ['disabled', 16],
  ['readonly', 17],
  ['readOnly', 17],
  ['clearable', 18],
  ['borderless', 19],
]);

const getCommonPropPriority = (propKey: string): number | undefined => {
  if (propKey === 'controlled') {
    return 0;
  }

  if (propKey === 'value') {
    return 1;
  }

  if (propKey === 'defaultValue') {
    return 2;
  }

  return COMMON_PROP_PRIORITY_MAP.get(propKey);
};

const getEditTypeSortRank = (editType: EditType) => {
  if (editType === 'input') {
    return 1;
  }

  if (editType === 'select') {
    return 2;
  }

  if (editType === 'inputNumber') {
    return 3;
  }

  if (editType === 'switch') {
    return 9;
  }

  return 4;
};

const resolveEditType = (schema: ComponentPropSchema): EditType => {
  const type = (schema.editType ?? schema.editInput) as EditType | string | undefined;
  if (type === 'switch' || type === 'input' || type === 'inputNumber' || type === 'select' || type === 'iconSelect' || type === 'swiperImages' || type === 'tabsConfig' || type === 'jsonCode') {
    return type;
  }

  return typeof schema.value === 'number' ? 'inputNumber' : 'input';
};

const ComponentConfigPanel: React.FC = () => {
  const { useStore } = useBuilderContext();
  const activeNode = useStore((state) => state.activeNode);
  const uiPageData = useStore((state) => state.uiPageData);
  const updateActiveNodeLabel = useStore((state) => state.updateActiveNodeLabel);
  const updateActiveNodeKey = useStore((state) => state.updateActiveNodeKey);
  const updateActiveNodeProp = useStore((state) => state.updateActiveNodeProp);
  const screenSize = useStore((state) => state.screenSize);
  const autoWidth = useStore((state) => state.autoWidth);
  const [labelDraft, setLabelDraft] = useState('');
  const [keyDraft, setKeyDraft] = useState('');
  const [keyError, setKeyError] = useState('');
  const [swiperDialogVisible, setSwiperDialogVisible] = useState(false);
  const [swiperImageDraft, setSwiperImageDraft] = useState<SwiperImageRow[]>([]);
  const [tabsDialogVisible, setTabsDialogVisible] = useState(false);
  const [tabsDraft, setTabsDraft] = useState<TabsRow[]>([]);
  const [tabsTargetPropKey, setTabsTargetPropKey] = useState<string | null>(null);
  const [inputDrafts, setInputDrafts] = useState<Record<string, string>>({});
  const [numberDrafts, setNumberDrafts] = useState<Record<string, number | undefined>>({});
  const [jsonCodeDialogVisible, setJsonCodeDialogVisible] = useState(false);
  const [jsonCodeTargetPropKey, setJsonCodeTargetPropKey] = useState<string | null>(null);
  const [gridResponsiveDialogVisible, setGridResponsiveDialogVisible] = useState(false);
  const [gridResponsiveDraft, setGridResponsiveDraft] = useState<GridResponsiveConfig>({});
  const [activeBreakpoint, setActiveBreakpoint] = useState<GridBreakpoint>('xs');
  const [iconQuickFilters, setIconQuickFilters] = useState<Record<string, IconQuickFilterKey>>({});
  const [iconInitialFilters, setIconInitialFilters] = useState<Record<string, IconInitialFilterKey>>({});
  const [jsonCodeValue, setJsonCodeValue] = useState<CodeEditorValue>({
    label: 'JSON示例数据',
    language: 'json',
    editorTheme: 'vscode-dark',
    note: '',
    code: '[]',
  });

  const propsMap = (activeNode?.props ?? {}) as Record<string, ComponentPropSchema>;
  const styleValue = (propsMap.__style?.value ?? {}) as Record<string, unknown>;
  const switchControlled = (activeNode?.type === 'Switch' || activeNode?.type === 'Slider' || activeNode?.type === 'Steps')
    ? Boolean((propsMap.controlled?.value ?? true))
    : undefined;

  const activePath = activeNode?.key ? findNodePathByKey(uiPageData, activeNode.key) : null;
  const listItemAncestor = activePath?.slice().reverse().find((node: UiTreeNode) => node.type === 'List.Item');
  const listAncestor = activePath?.slice().reverse().find((node: UiTreeNode) => node.type === 'List');
  const isListCustomTemplateEnabled = Boolean(
    (listAncestor?.props?.customTemplateEnabled as { value?: unknown } | undefined)?.value,
  );

  const editableProps = Object.entries(propsMap).filter(([propKey]) => {
    if (propKey.startsWith('__')) {
      return false;
    }

    if (activeNode?.type === 'Progress' && PROGRESS_COLOR_PROP_KEYS.has(propKey)) {
      return false;
    }

    if (activeNode?.type === 'Switch' || activeNode?.type === 'Slider' || activeNode?.type === 'Steps') {
      if (propKey === 'value' && switchControlled === false) {
        return false;
      }
      if (propKey === 'defaultValue' && switchControlled === true) {
        return false;
      }
    }

    if (
      activeNode?.type === 'List'
      && Boolean((propsMap.customTemplateEnabled?.value as boolean | undefined) ?? false)
      && LIST_META_PROP_KEYS.has(propKey)
    ) {
      return false;
    }

    if (activeNode?.type === 'List.Item' && isListCustomTemplateEnabled && LIST_ITEM_META_PROP_KEYS.has(propKey)) {
      return false;
    }

    return true;
  });

  const sortedEditableProps = React.useMemo(() => {
    return editableProps
      .map(([propKey, schema], originalIndex) => ({
        propKey,
        schema,
        originalIndex,
        editType: resolveEditType(schema),
      }))
      .sort((a, b) => {
        const aCommonPriority = getCommonPropPriority(a.propKey);
        const bCommonPriority = getCommonPropPriority(b.propKey);
        const aIsCommon = typeof aCommonPriority === 'number';
        const bIsCommon = typeof bCommonPriority === 'number';

        if (aIsCommon !== bIsCommon) {
          return aIsCommon ? -1 : 1;
        }

        if (aIsCommon && bIsCommon) {
          return (aCommonPriority as number) - (bCommonPriority as number);
        }

        const rankDiff = getEditTypeSortRank(a.editType) - getEditTypeSortRank(b.editType);
        if (rankDiff !== 0) {
          return rankDiff;
        }

        return a.originalIndex - b.originalIndex;
      })
      .map((item) => [item.propKey, item.schema] as const);
  }, [editableProps]);

  const isNodeInsideListTemplate = Boolean(listItemAncestor && activeNode && activeNode.type !== 'List.Item');
  const bindableProps = activeNode?.type ? (LIST_BINDABLE_PROP_OPTIONS[activeNode.type] ?? []) : [];
  const listBindingSchema = propsMap.__listBinding;
  const listBindingValue = (listBindingSchema?.value ?? {}) as { prop?: string; field?: string };
  const bindingPropValue = typeof listBindingValue.prop === 'string' ? listBindingValue.prop : '';
  const bindingFieldValue = typeof listBindingValue.field === 'string' ? listBindingValue.field : '';
  const responsiveColSchema = propsMap.__responsiveCol;
  const simulatorWidth = resolveBuilderViewportWidth(screenSize, autoWidth);
  const simulatorBreakpoint = getBreakpointByWidth(simulatorWidth);

  useEffect(() => {
    if (!activeNode) {
      setLabelDraft('');
      setInputDrafts({});
      setNumberDrafts({});
      return;
    }

    setLabelDraft(String(activeNode.label ?? ''));
    setKeyDraft(String(activeNode.key ?? ''));
    setKeyError('');

    const nextInputDrafts: Record<string, string> = {};
    const nextNumberDrafts: Record<string, number | undefined> = {};

    sortedEditableProps.forEach(([propKey, schema]) => {
      const editType = resolveEditType(schema);
      if (editType === 'input') {
        nextInputDrafts[propKey] = typeof schema.value === 'string' ? schema.value : String(schema.value ?? '');
      }
      if (editType === 'inputNumber') {
        nextNumberDrafts[propKey] = typeof schema.value === 'number' ? schema.value : undefined;
      }
    });

    setInputDrafts(nextInputDrafts);
    setNumberDrafts(nextNumberDrafts);
  }, [activeNode?.key, activeNode?.label, activeNode?.props]);

  if (!activeNode) {
    return (
      <div className="right-panel-body right-panel-empty">
        <Empty description="请先在画布或组件树中选择一个组件" />
      </div>
    );
  }

  if (isSlotNode(activeNode)) {
    return (
      <div className="right-panel-body right-panel-empty">
        <Empty description="插槽节点仅用于承载拖拽，不支持单独配置" />
      </div>
    );
  }

  const renderEditor = (propKey: string, schema: ComponentPropSchema) => {
    const editType = resolveEditType(schema);
    const currentValue = schema.value;

    if (editType === 'switch') {
      return (
        <Switch
          value={Boolean(currentValue)}
          onChange={(value) => updateActiveNodeProp(propKey, Boolean(value))}
        />
      );
    }

    if (editType === 'inputNumber') {
      const draftValue = numberDrafts[propKey];
      const min = typeof schema.payload?.min === 'number' ? schema.payload.min : undefined;
      const max = typeof schema.payload?.max === 'number' ? schema.payload.max : undefined;
      return (
        <InputNumber
          size='small'
          min={min}
          max={max}
          value={typeof draftValue === 'number' ? draftValue : undefined}
          onChange={(value) => {
            const nextNumber = typeof value === 'number' && !Number.isNaN(value) ? value : undefined;
            const normalizedNumber = typeof nextNumber === 'number'
              ? (
                typeof min === 'number' && typeof max === 'number'
                  ? Math.min(max, Math.max(min, nextNumber))
                  : typeof min === 'number'
                    ? Math.max(min, nextNumber)
                    : typeof max === 'number'
                      ? Math.min(max, nextNumber)
                      : nextNumber
              )
              : undefined;
            setNumberDrafts((previous) => ({
              ...previous,
              [propKey]: normalizedNumber,
            }));
            if (typeof normalizedNumber === 'number') {
              updateActiveNodeProp(propKey, normalizedNumber);
            }
          }}
        />
      );
    }

    if (editType === 'select') {
      const options = (schema.payload?.options ?? []).map((item) => {
        if (item && typeof item === 'object' && 'label' in item && 'value' in item) {
          const option = item as { label: string; value: string | number };
          return {
            label: String(option.label),
            value: option.value,
          };
        }

        return {
          label: String(item),
          value: item,
        };
      });

      return (
        <Select
          options={options}
          value={currentValue as string | number | undefined}
          onChange={(value) => updateActiveNodeProp(propKey, value)}
        />
      );
    }

    if (editType === 'iconSelect') {
      const currentQuickFilter = iconQuickFilters[propKey] ?? 'all';
      const currentInitialFilter = iconInitialFilters[propKey] ?? 'all';
      const options = getIconOptionsByFilters(currentQuickFilter, currentInitialFilter);

      return (
        <Select
          clearable
          filterable
          options={options}
          value={typeof currentValue === 'string' && currentValue.trim() ? currentValue : undefined}
          placeholder="先筛选，再搜索图标"
          panelTopContent={(
            <div style={{ display: 'grid', gap: 8, padding: '8px 8px 4px' }}>
              <Select
                size="small"
                options={ICON_QUICK_FILTER_OPTIONS}
                value={currentQuickFilter}
                onChange={(value) => {
                  const nextFilter = String(value ?? 'all') as IconQuickFilterKey;
                  setIconQuickFilters((previous) => ({
                    ...previous,
                    [propKey]: nextFilter,
                  }));
                }}
              />
              <Select
                size="small"
                options={ICON_INITIAL_FILTER_OPTIONS}
                value={currentInitialFilter}
                onChange={(value) => {
                  const nextFilter = String(value ?? 'all') as IconInitialFilterKey;
                  setIconInitialFilters((previous) => ({
                    ...previous,
                    [propKey]: nextFilter,
                  }));
                }}
              />
            </div>
          )}
          onChange={(value) => updateActiveNodeProp(propKey, String(value ?? ''))}
        />
      );
    }

    if (editType === 'swiperImages') {
      return (
        <Button
          size="small"
          variant="outline"
          onClick={() => {
            const rows = normalizeSwiperImageRows(currentValue);
            setSwiperImageDraft(rows.length > 0 ? rows : [createSwiperImageRow(), createSwiperImageRow()]);
            setSwiperDialogVisible(true);
          }}
        >
          配置图片
        </Button>
      );
    }

    if (editType === 'tabsConfig') {
      return (
        <Button
          size="small"
          variant="outline"
          onClick={() => {
            const rows = normalizeTabsRows(currentValue);
            setTabsDraft(rows.length ? rows : normalizeTabsRows(createDefaultTabsList()));
            setTabsTargetPropKey(propKey);
            setTabsDialogVisible(true);
          }}
        >
          配置选项卡
        </Button>
      );
    }

    if (editType === 'jsonCode') {
      const toJsonCode = (value: unknown) => {
        if (typeof value === 'string') {
          if (!value.trim()) {
            return '[]';
          }

          try {
            return JSON.stringify(JSON.parse(value), null, 2);
          } catch {
            return value;
          }
        }

        if (Array.isArray(value) || (value && typeof value === 'object')) {
          try {
            return JSON.stringify(value, null, 2);
          } catch {
            return '[]';
          }
        }

        return '[]';
      };

      return (
        <Button
          size="small"
          variant="outline"
          onClick={() => {
            setJsonCodeTargetPropKey(propKey);
            setJsonCodeValue((previous) => ({
              ...previous,
              label: schema.name ?? propKey,
              code: toJsonCode(currentValue),
            }));
            setJsonCodeDialogVisible(true);
          }}
        >
          编辑示例数据
        </Button>
      );
    }

    const draftValue = inputDrafts[propKey] ?? (typeof currentValue === 'string' ? currentValue : String(currentValue ?? ''));

    return (
      <Input
        clearable
        value={draftValue}
        onChange={(value) => {
          setInputDrafts((previous) => ({
            ...previous,
            [propKey]: String(value ?? ''),
          }));
        }}
        onBlur={(value, context) => {
          const fallbackValue = context?.e?.target && 'value' in context.e.target
            ? String((context.e.target as { value?: unknown }).value ?? '')
            : draftValue;
          const nextValue = typeof value === 'string' ? value : fallbackValue;
          setInputDrafts((previous) => ({
            ...previous,
            [propKey]: String(nextValue ?? ''),
          }));
          updateActiveNodeProp(propKey, String(nextValue ?? ''));
        }}
      />
    );
  };

  const handleApplyNodeKey = () => {
    const result = updateActiveNodeKey(keyDraft);
    setKeyError(result.success ? '' : String(result.message ?? '组件标识重复'));
    if (result.success && activeNode) {
      setKeyDraft(String(keyDraft.trim()));
    }
  };

  const keyHintText = keyError || '仅支持字母、数字、下划线(_)和中划线(-)';

  const applySwiperImageDraft = () => {
    updateActiveNodeProp(
      'images',
      swiperImageDraft.map((item) => ({
        src: item.src,
        fallback: item.fallback,
        lazy: item.lazy,
        objectFit: item.objectFit,
        objectPosition: item.objectPosition,
      })),
    );
    setSwiperDialogVisible(false);
  };

  const applyJsonCodeDraft = (nextValue: Pick<CodeEditorValue, 'code' | 'editorTheme'>) => {
    setJsonCodeValue((previous) => ({
      ...previous,
      code: nextValue.code,
      editorTheme: nextValue.editorTheme,
    }));

    if (jsonCodeTargetPropKey) {
      updateActiveNodeProp(jsonCodeTargetPropKey, nextValue.code);
    }

    setJsonCodeDialogVisible(false);
    setJsonCodeTargetPropKey(null);
  };

  const applyTabsDraft = () => {
    const normalizedRows = tabsDraft
      .map((item, index) => {
        const value = item.value.trim();
        const label = item.label.trim();
        if (!value) {
          return null;
        }

        return {
          value,
          label: label || `选项卡${index + 1}`,
          disabled: item.disabled,
          draggable: item.draggable,
          removable: item.removable,
          lazy: item.lazy,
          destroyOnHide: item.destroyOnHide,
        };
      })
      .filter((item): item is {
        value: string;
        label: string;
        disabled: boolean;
        draggable: boolean;
        removable: boolean;
        lazy: boolean;
        destroyOnHide: boolean;
      } => !!item);

    const dedupedRows = normalizedRows.reduce<typeof normalizedRows>((acc, item) => {
      if (!acc.some((existing) => existing.value === item.value)) {
        acc.push(item);
      }
      return acc;
    }, []);

    const nextList = dedupedRows.length
      ? dedupedRows
      : createDefaultTabsList().map((item) => ({
          value: String(item.value),
          label: item.label,
          disabled: Boolean(item.disabled),
          draggable: typeof item.draggable === 'boolean' ? item.draggable : true,
          removable: Boolean(item.removable),
          lazy: Boolean(item.lazy),
          destroyOnHide: typeof item.destroyOnHide === 'boolean' ? item.destroyOnHide : true,
        }));

    if (tabsTargetPropKey) {
      updateActiveNodeProp(tabsTargetPropKey, nextList);
    }

    setTabsDialogVisible(false);
    setTabsTargetPropKey(null);
  };

  const openGridResponsiveDialog = () => {
    setGridResponsiveDraft(normalizeResponsiveConfig(responsiveColSchema?.value));
    setActiveBreakpoint('xs');
    setGridResponsiveDialogVisible(true);
  };

  const updateBreakpointDraft = (breakpoint: GridBreakpoint, patch: { span?: number; offset?: number }) => {
    setGridResponsiveDraft((previous) => {
      const current = previous[breakpoint] ?? {};
      const next = {
        ...current,
        ...patch,
      };

      const normalized: { span?: number; offset?: number } = {};
      if (typeof next.span === 'number') {
        normalized.span = clampSpan(next.span);
      }
      if (typeof next.offset === 'number') {
        normalized.offset = clampOffset(next.offset);
      }

      return {
        ...previous,
        [breakpoint]: normalized,
      };
    });
  };

  const clearBreakpointDraft = (breakpoint: GridBreakpoint) => {
    setGridResponsiveDraft((previous) => {
      const next = { ...previous };
      delete next[breakpoint];
      return next;
    });
  };

  const applyGridResponsiveDraft = () => {
    updateActiveNodeProp('__responsiveCol', gridResponsiveDraft);
    setGridResponsiveDialogVisible(false);
  };

  const resetGridResponsiveDraft = () => {
    setGridResponsiveDraft({});
  };

  const activeBreakpointValue = gridResponsiveDraft[activeBreakpoint] ?? {};
  const activeSpan = typeof activeBreakpointValue.span === 'number' ? activeBreakpointValue.span : 6;
  const activeOffset = typeof activeBreakpointValue.offset === 'number' ? activeBreakpointValue.offset : 0;

  return (
    <div className="right-panel-body">
      <div className="config-form">
        <Typography.Title level="h6" className="config-title">组件配置</Typography.Title>

        <div className="config-row">
          <span className="config-label">组件名称</span>
          <Input
            className="config-editor"
            clearable
            value={labelDraft}
            placeholder="请输入组件名称"
            onChange={(value) => setLabelDraft(String(value ?? ''))}
            onBlur={() => updateActiveNodeLabel(labelDraft)}
          />
        </div>

        <div className="config-row">
          <span className="config-label">组件标识</span>
          <Input
            className="config-editor"
            clearable
            value={keyDraft}
            status={keyError ? 'error' : 'default'}
            onChange={(value) => {
              setKeyDraft(String(value ?? ''));
              if (keyError) {
                setKeyError('');
              }
            }}
            onBlur={handleApplyNodeKey}
            onEnter={handleApplyNodeKey}
          />
        </div>
        <div className="config-row">
          <span className="config-label" style={{ color: keyError ? '#d54941' : '#8b92a1' }}>{keyHintText}</span>
        </div>

        <div className="config-row">
          <span className="config-label">通用样式</span>
          <div className="config-editor">
            <NodeStyleDrawer
              targetKey={activeNode.key}
              value={styleValue}
              onChange={(nextStyle: Record<string, unknown>) => updateActiveNodeProp('__style', nextStyle)}
            />
          </div>
        </div>

        {sortedEditableProps.map(([propKey, schema]) => (
          <div key={propKey} className="config-row">
            <span className="config-label">{schema.name ?? propKey}</span>
            <div className="config-editor">{renderEditor(propKey, schema)}</div>
          </div>
        ))}

        {activeNode.type === 'Progress' ? (
          <>
            <div className="config-row">
              <span className="config-label">颜色</span>
              <div className="config-editor">
                <ColorPicker
                  value={String(propsMap.color?.value ?? '')}
                  onChange={(value) => updateActiveNodeProp('color', String(value ?? ''))}
                />
              </div>
            </div>
            <div className="config-row">
              <span className="config-label">轨道颜色</span>
              <div className="config-editor">
                <ColorPicker
                  value={String(propsMap.trackColor?.value ?? '')}
                  onChange={(value) => updateActiveNodeProp('trackColor', String(value ?? ''))}
                />
              </div>
            </div>
          </>
        ) : null}

        {activeNode.type === 'Grid.Col' ? (
          <div className="config-row">
            <span className="config-label">响应式占格</span>
            <div className="config-editor" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Button size="small" variant="outline" onClick={openGridResponsiveDialog}>配置断点</Button>
            </div>
          </div>
        ) : null}

        {isListCustomTemplateEnabled && isNodeInsideListTemplate && bindableProps.length > 0 ? (
          <>
            <div className="config-row">
              <span className="config-label">绑定属性</span>
              <div className="config-editor">
                <Select
                  options={bindableProps}
                  value={bindingPropValue || undefined}
                  placeholder="选择组件属性"
                  onChange={(value) => {
                    const nextProp = String(value ?? '');
                    updateActiveNodeProp('__listBinding', {
                      prop: nextProp,
                      field: bindingFieldValue,
                    });
                  }}
                />
              </div>
            </div>
            <div className="config-row">
              <span className="config-label">数据字段</span>
              <div className="config-editor">
                <Input
                  clearable
                  placeholder="例如：title 或 cover.url"
                  value={bindingFieldValue}
                  onChange={(value) => {
                    const nextField = String(value ?? '');
                    updateActiveNodeProp('__listBinding', {
                      prop: bindingPropValue,
                      field: nextField,
                    });
                  }}
                />
              </div>
            </div>
          </>
        ) : null}
      </div>

      <Dialog
        visible={swiperDialogVisible}
        width="980px"
        header="配置轮播图片"
        closeOnOverlayClick={false}
        confirmBtn="应用"
        cancelBtn="取消"
        onConfirm={applySwiperImageDraft}
        onClose={() => setSwiperDialogVisible(false)}
      >
        <div style={{ marginBottom: 12 }}>
          <Button
            size="small"
            variant="outline"
            onClick={() => setSwiperImageDraft((previous) => [...previous, createSwiperImageRow()])}
          >
            增加一行
          </Button>
        </div>

        <Table
          rowKey="id"
          data={swiperImageDraft}
          columns={[
            {
              colKey: 'src',
              title: 'src',
              cell: ({ row }: { row: SwiperImageRow }) => (
                <Input
                  clearable
                  value={row.src}
                  onChange={(value) =>
                    setSwiperImageDraft((previous) =>
                      previous.map((item) => (item.id === row.id ? { ...item, src: String(value ?? '') } : item)),
                    )
                  }
                />
              ),
            },
            {
              colKey: 'fallback',
              title: 'fallback',
              cell: ({ row }: { row: SwiperImageRow }) => (
                <Input
                  clearable
                  value={row.fallback}
                  onChange={(value) =>
                    setSwiperImageDraft((previous) =>
                      previous.map((item) => (item.id === row.id ? { ...item, fallback: String(value ?? '') } : item)),
                    )
                  }
                />
              ),
            },
            {
              colKey: 'lazy',
              title: 'lazy',
              width: 88,
              cell: ({ row }: { row: SwiperImageRow }) => (
                <Switch
                  size="small"
                  value={row.lazy}
                  onChange={(value) =>
                    setSwiperImageDraft((previous) =>
                      previous.map((item) => (item.id === row.id ? { ...item, lazy: Boolean(value) } : item)),
                    )
                  }
                />
              ),
            },
            {
              colKey: 'objectFit',
              title: 'objectFit',
              width: 140,
              cell: ({ row }: { row: SwiperImageRow }) => (
                <Select
                  size="small"
                  options={SWIPER_FIT_OPTIONS}
                  value={row.objectFit}
                  onChange={(value) =>
                    setSwiperImageDraft((previous) =>
                      previous.map((item) => (item.id === row.id ? { ...item, objectFit: String(value ?? 'cover') } : item)),
                    )
                  }
                />
              ),
            },
            {
              colKey: 'objectPosition',
              title: 'objectPosition',
              width: 140,
              cell: ({ row }: { row: SwiperImageRow }) => (
                <Select
                  size="small"
                  options={SWIPER_POSITION_OPTIONS}
                  value={row.objectPosition}
                  onChange={(value) =>
                    setSwiperImageDraft((previous) =>
                      previous.map((item) => (item.id === row.id ? { ...item, objectPosition: String(value ?? 'center') } : item)),
                    )
                  }
                />
              ),
            },
            {
              colKey: 'action',
              title: '操作',
              width: 90,
              cell: ({ row }: { row: SwiperImageRow }) => (
                <Space>
                  <Button
                    size="small"
                    variant="text"
                    theme="danger"
                    onClick={() =>
                      setSwiperImageDraft((previous) => previous.filter((item) => item.id !== row.id))
                    }
                  >
                    删除
                  </Button>
                </Space>
              ),
            },
          ]}
        />
      </Dialog>

      <Dialog
        visible={tabsDialogVisible}
        width="980px"
        header="配置选项卡"
        closeOnOverlayClick={false}
        confirmBtn="应用"
        cancelBtn="取消"
        onConfirm={applyTabsDraft}
        onClose={() => {
          setTabsDialogVisible(false);
          setTabsTargetPropKey(null);
        }}
      >
        <div style={{ marginBottom: 12 }}>
          <Button
            size="small"
            variant="outline"
            onClick={() => {
              const nextIndex = tabsDraft.length + 1;
              setTabsDraft((previous) => ([
                ...previous,
                createTabsRow({
                  value: `tab-${nextIndex}`,
                  label: `选项卡${nextIndex}`,
                }),
              ]));
            }}
          >
            增加一行
          </Button>
        </div>

        <Table
          rowKey="id"
          data={tabsDraft}
          columns={[
            {
              colKey: 'value',
              title: 'value(唯一标识)',
              width: 180,
              cell: ({ row }: { row: TabsRow }) => (
                <Input
                  clearable
                  value={row.value}
                  onChange={(value) =>
                    setTabsDraft((previous) =>
                      previous.map((item) => (item.id === row.id ? { ...item, value: String(value ?? '') } : item)),
                    )
                  }
                />
              ),
            },
            {
              colKey: 'label',
              title: 'label(标题)',
              width: 180,
              cell: ({ row }: { row: TabsRow }) => (
                <Input
                  clearable
                  value={row.label}
                  onChange={(value) =>
                    setTabsDraft((previous) =>
                      previous.map((item) => (item.id === row.id ? { ...item, label: String(value ?? '') } : item)),
                    )
                  }
                />
              ),
            },
            {
              colKey: 'disabled',
              title: '禁用',
              width: 78,
              cell: ({ row }: { row: TabsRow }) => (
                <Switch
                  size="small"
                  value={row.disabled}
                  onChange={(value) =>
                    setTabsDraft((previous) =>
                      previous.map((item) => (item.id === row.id ? { ...item, disabled: Boolean(value) } : item)),
                    )
                  }
                />
              ),
            },
            {
              colKey: 'draggable',
              title: '可拖拽',
              width: 88,
              cell: ({ row }: { row: TabsRow }) => (
                <Switch
                  size="small"
                  value={row.draggable}
                  onChange={(value) =>
                    setTabsDraft((previous) =>
                      previous.map((item) => (item.id === row.id ? { ...item, draggable: Boolean(value) } : item)),
                    )
                  }
                />
              ),
            },
            {
              colKey: 'removable',
              title: '可移除',
              width: 88,
              cell: ({ row }: { row: TabsRow }) => (
                <Switch
                  size="small"
                  value={row.removable}
                  onChange={(value) =>
                    setTabsDraft((previous) =>
                      previous.map((item) => (item.id === row.id ? { ...item, removable: Boolean(value) } : item)),
                    )
                  }
                />
              ),
            },
            {
              colKey: 'lazy',
              title: '懒加载',
              width: 78,
              cell: ({ row }: { row: TabsRow }) => (
                <Switch
                  size="small"
                  value={row.lazy}
                  onChange={(value) =>
                    setTabsDraft((previous) =>
                      previous.map((item) => (item.id === row.id ? { ...item, lazy: Boolean(value) } : item)),
                    )
                  }
                />
              ),
            },
            {
              colKey: 'destroyOnHide',
              title: '隐藏销毁',
              width: 94,
              cell: ({ row }: { row: TabsRow }) => (
                <Switch
                  size="small"
                  value={row.destroyOnHide}
                  onChange={(value) =>
                    setTabsDraft((previous) =>
                      previous.map((item) => (item.id === row.id ? { ...item, destroyOnHide: Boolean(value) } : item)),
                    )
                  }
                />
              ),
            },
            {
              colKey: 'action',
              title: '操作',
              width: 78,
              cell: ({ row }: { row: TabsRow }) => (
                <Button
                  size="small"
                  variant="text"
                  theme="danger"
                  onClick={() => setTabsDraft((previous) => previous.filter((item) => item.id !== row.id))}
                >
                  删除
                </Button>
              ),
            },
          ]}
        />
      </Dialog>

      <CodeEditorDialog
        visible={jsonCodeDialogVisible}
        value={jsonCodeValue}
        onClose={() => {
          setJsonCodeDialogVisible(false);
          setJsonCodeTargetPropKey(null);
        }}
        onApply={applyJsonCodeDraft}
      />

      <Dialog
        visible={gridResponsiveDialogVisible}
        width="760px"
        header={(
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span>Grid.Col 响应式配置</span>
            <Popup
              trigger="hover"
              placement="right"
              showArrow
              content={(
                <div style={{ maxWidth: 360, lineHeight: '20px' }}>
                  编辑器中采用“断点独立命中”语义：每个断点未配置时，回退到基础 span/offset。<br />
                  预览渲染时会自动转换为 TDesign 级联断点参数，保证渲染层兼容而不改变编辑体验。
                </div>
              )}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  color: '#8b92a1',
                  cursor: 'help',
                }}
              >
                <HelpCircleIcon size="16px" />
              </span>
            </Popup>
          </div>
        )}
        className="grid-responsive-config-dialog"
        closeOnOverlayClick={false}
        confirmBtn="应用配置"
        cancelBtn="取消"
        onConfirm={applyGridResponsiveDraft}
        onClose={() => setGridResponsiveDialogVisible(false)}
      >
        <div className="grid-responsive-config">
          <div className="grid-responsive-config__top">
            <div className="grid-responsive-config__meta">
              <Tag variant="light">模拟器宽度：{simulatorWidth}px</Tag>
              <Tag theme="primary" variant="light">当前命中：{simulatorBreakpoint}</Tag>
            </div>

            <div className="grid-responsive-config__breakpoint-wrap">
              <span className="grid-responsive-config__breakpoint-label">断点</span>
              <Select
                className="grid-responsive-config__breakpoint-select"
                value={activeBreakpoint}
                options={GRID_BREAKPOINTS.map((breakpoint) => ({
                  label: `${BREAKPOINT_LABEL_MAP[breakpoint]} · ${BREAKPOINT_DEVICE_MAP[breakpoint]}`,
                  value: breakpoint,
                }))}
                onChange={(value) => setActiveBreakpoint(String(value ?? 'xs') as GridBreakpoint)}
              />
            </div>
          </div>

          <div className="grid-responsive-config__head">
            <Typography.Text>{BREAKPOINT_LABEL_MAP[activeBreakpoint]}</Typography.Text>
            <Space size={8}>
              <Button size="small" variant="outline" onClick={() => clearBreakpointDraft(activeBreakpoint)}>清空当前断点</Button>
              <Button size="small" variant="outline" onClick={resetGridResponsiveDraft}>重置全部</Button>
            </Space>
          </div>

          <div className="grid-responsive-config__section">
            <div className="grid-responsive-config__row">
              <Typography.Text>占格数（span）</Typography.Text>
              <Typography.Text>{activeSpan}</Typography.Text>
            </div>
            <div className="grid-responsive-config__sub-label">可选范围 0 - 12，0 表示不占据列宽</div>
            <Slider
              className="grid-responsive-config__slider"
              min={0}
              max={12}
              step={1}
              value={activeSpan}
              onChange={(value) => updateBreakpointDraft(activeBreakpoint, { span: Number(value) })}
            />
            <Space size={8} style={{ marginTop: 8, flexWrap: 'wrap' }}>
              {GRID_PRESET_OPTIONS.map((option) => (
                <Button
                  key={option.label}
                  size="small"
                  variant="outline"
                  onClick={() => updateBreakpointDraft(activeBreakpoint, { span: option.value })}
                >
                  {option.label}
                </Button>
              ))}
            </Space>
          </div>

          <div className="grid-responsive-config__section">
            <div className="grid-responsive-config__row">
              <Typography.Text>左侧偏移（offset）</Typography.Text>
              <Typography.Text>{activeOffset}</Typography.Text>
            </div>
            <div className="grid-responsive-config__sub-label">可选范围 0 - 11，表示左侧空出格数</div>
            <Slider
              className="grid-responsive-config__slider"
              min={0}
              max={11}
              step={1}
              value={activeOffset}
              onChange={(value) => updateBreakpointDraft(activeBreakpoint, { offset: Number(value) })}
            />
          </div>

          <div className="grid-responsive-config__preview">
            {Array.from({ length: 12 }).map((_, index) => {
              const inOffset = index < activeOffset;
              const inSpan = index >= activeOffset && index < activeOffset + activeSpan;
              return (
                <div
                  key={`grid-cell-${index}`}
                  className={`grid-responsive-config__cell${inSpan ? ' is-span' : ''}${inOffset ? ' is-offset' : ''}`}
                >
                  {index + 1}
                </div>
              );
            })}
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default React.memo(ComponentConfigPanel);
