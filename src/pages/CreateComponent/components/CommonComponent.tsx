import React from 'react';
import { Button, Space, Row, Col, Card, Divider, Typography, Image, Avatar, Switch, Swiper, Layout, Calendar, ColorPicker, TimePicker, TimeRangePicker, InputNumber, Slider, Steps, List, Link, Tabs, BackTop, Menu, Drawer, Progress, Upload, Input, Textarea } from 'tdesign-react';
import DropArea from '../../../components/DropArea';
import type { UiDropDataHandler, UiTreeNode } from '../store/type';
import { useCreateComponentStore } from '../store';
import { getNodeSlotKey, isSlotNode } from '../utils/slot';
import { getTabsPanelSlotKey, getTabsSlotNodeByValue, normalizeTabsList, normalizeTabsValue } from '../utils/tabs';
import {
  normalizeResponsiveConfig,
  resolveBuilderViewportWidth,
  resolveResponsiveColLayout,
} from '../utils/gridResponsive';
import type { ListRecord, SwiperImageItem } from '../../../types/component';
import { LIST_PREVIEW_DATA } from '../../../constants/componentBuilder';
import { renderNamedIcon } from '../../../constants/iconRegistry';

interface CommonComponentProps {
  type?: string;
  data?: UiTreeNode;
  onDropData?: UiDropDataHandler;
}

interface ActivateWrapperProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
  onActivate: (event: React.MouseEvent<HTMLElement>) => void;
}

const ActivateWrapper: React.FC<ActivateWrapperProps> = ({ children, style, onActivate }) => (
  <div style={style} onClick={onActivate}>
    {children}
  </div>
);

interface SpaceContentProps {
  children?: React.ReactNode;
  align?: string;
  direction?: 'horizontal' | 'vertical';
  size?: number;
  breakLine?: boolean;
  isSpaceSplitEnabled: boolean;
  spaceSplitLayout: 'horizontal' | 'vertical';
  spaceSplitDashed?: boolean;
  spaceSplitAlign?: string;
  spaceSplitContent?: string;
  style?: React.CSSProperties;
  onActivate: (event: React.MouseEvent<HTMLElement>) => void;
}

const SpaceContent: React.FC<SpaceContentProps> = ({
  children,
  align,
  direction,
  size,
  breakLine,
  isSpaceSplitEnabled,
  spaceSplitLayout,
  spaceSplitDashed,
  spaceSplitAlign,
  spaceSplitContent,
  style,
  onActivate,
}) => {
  const childrenList = React.Children.toArray(children);

  if (!isSpaceSplitEnabled || childrenList.length <= 1) {
    return (
      <ActivateWrapper style={style} onActivate={onActivate}>
        <Space
          align={align as any}
          direction={direction as any}
          size={size}
          breakLine={breakLine}
        >
          {children}
        </Space>
      </ActivateWrapper>
    );
  }

  const mergedChildren: React.ReactNode[] = [];
  childrenList.forEach((child, index) => {
    mergedChildren.push(child);

    if (index < childrenList.length - 1) {
      mergedChildren.push(
        <Divider
          key={`space-split-${index}`}
          layout={spaceSplitLayout}
          dashed={spaceSplitDashed}
          align={spaceSplitAlign as any}
          content={spaceSplitLayout === 'horizontal' ? spaceSplitContent : undefined}
        />,
      );
    }
  });

  return (
    <ActivateWrapper style={style} onActivate={onActivate}>
      <Space
        align={align as any}
        direction={direction as any}
        size={size}
        breakLine={breakLine}
      >
        {mergedChildren}
      </Space>
    </ActivateWrapper>
  );
};

interface RowContentProps {
  children?: React.ReactNode;
  align?: string;
  justify?: string;
  gutter?: number;
  style?: React.CSSProperties;
}

const RowContent: React.FC<RowContentProps> = ({ children, align, justify, gutter, style }) => (
  <Row
    align={align as any}
    justify={justify as any}
    gutter={gutter}
    style={style}
  >
    {children}
  </Row>
);

interface CardContentProps {
  children?: React.ReactNode;
  header?: React.ReactNode;
  title?: string;
  subtitle?: string;
  size?: string;
  bordered?: boolean;
  headerBordered?: boolean;
  shadow?: boolean;
  hoverShadow?: boolean;
  style?: React.CSSProperties;
  onActivate: (event: React.MouseEvent<HTMLElement>) => void;
}

const CardContent: React.FC<CardContentProps> = ({
  children,
  header,
  title,
  subtitle,
  size,
  bordered,
  headerBordered,
  shadow,
  hoverShadow,
  style,
  onActivate,
}) => (
  <ActivateWrapper style={style} onActivate={onActivate}>
    <Card
      header={header}
      title={title}
      subtitle={subtitle}
      size={size as any}
      bordered={bordered}
      headerBordered={headerBordered}
      shadow={shadow}
      hoverShadow={hoverShadow}
    >
      {children}
    </Card>
  </ActivateWrapper>
);

export default function CommonComponent(properties: CommonComponentProps) {
  const { type, data, onDropData } = properties;
  const normalizedType = typeof type === 'string' ? type.trim() : type;
  const [tabsInnerValue, setTabsInnerValue] = React.useState<string | number | undefined>(undefined);
  const setActiveNode = useCreateComponentStore((state) => state.setActiveNode);
  const screenSize = useCreateComponentStore((state) => state.screenSize);
  const autoWidth = useCreateComponentStore((state) => state.autoWidth);
  const { Header, Content, Aside, Footer } = Layout;
  const { ListItem, ListItemMeta } = List;

  const getProp = (propName: string) => {
    const prop = data?.props?.[propName] as { value?: unknown } | undefined;
    return prop?.value;
  };

  const getNumberProp = (propName: string) => {
    const value = getProp(propName);
    return typeof value === 'number' ? value : undefined;
  };

  const getStringProp = (propName: string) => {
    const value = getProp(propName);
    return typeof value === 'string' ? value : undefined;
  };

  const getBooleanProp = (propName: string) => {
    const value = getProp(propName);
    return typeof value === 'boolean' ? value : undefined;
  };

  const getCalendarValueProp = (propName: string) => {
    const value = getProp(propName);
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed ? trimmed : undefined;
    }

    if (value instanceof Date) {
      return value;
    }

    return undefined;
  };

  const getStyleProp = () => {
    const value = getProp('__style');
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return undefined;
    }

    return value as React.CSSProperties;
  };

  const getStringArrayProp = (propName: string) => {
    const value = getProp(propName);
    if (Array.isArray(value)) {
      return value.map((item) => String(item).trim()).filter(Boolean);
    }

    if (typeof value === 'string') {
      return value
        .split(/\r?\n|,|，/)
        .map((item) => item.trim())
        .filter(Boolean);
    }

    return [];
  };

  const getListFieldValue = (record: ListRecord, fieldPath?: string): string | undefined => {
    if (!fieldPath) {
      return undefined;
    }

    const path = fieldPath.trim();
    if (!path) {
      return undefined;
    }

    const value = path.split('.').reduce<unknown>((current, segment) => {
      if (!segment) {
        return current;
      }

      if (!current || typeof current !== 'object') {
        return undefined;
      }

      return (current as Record<string, unknown>)[segment];
    }, record);

    if (typeof value === 'string') {
      return value;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }

    return undefined;
  };

  const getListFieldRawValue = (record: ListRecord, fieldPath?: string): unknown => {
    if (!fieldPath) {
      return undefined;
    }

    const path = fieldPath.trim();
    if (!path) {
      return undefined;
    }

    return path.split('.').reduce<unknown>((current, segment) => {
      if (!segment) {
        return current;
      }

      if (!current || typeof current !== 'object') {
        return undefined;
      }

      return (current as Record<string, unknown>)[segment];
    }, record);
  };

  const applyListBindingToNode = (node: UiTreeNode, item: ListRecord): UiTreeNode => {
    const nextNode: UiTreeNode = {
      ...node,
      props: {
        ...(node.props ?? {}),
      },
      children: (node.children ?? []).map((child) => applyListBindingToNode(child, item)),
    };

    const binding = (node.props?.__listBinding as { value?: unknown } | undefined)?.value as
      | { prop?: string; field?: string }
      | undefined;

    const bindProp = typeof binding?.prop === 'string' ? binding.prop.trim() : '';
    const bindField = typeof binding?.field === 'string' ? binding.field.trim() : '';
    if (!bindProp || !bindField) {
      return nextNode;
    }

    const rawBoundValue = getListFieldRawValue(item, bindField);
    if (typeof rawBoundValue === 'undefined') {
      return nextNode;
    }

    const targetProp = (nextNode.props?.[bindProp] ?? {}) as Record<string, unknown>;
    nextNode.props = {
      ...(nextNode.props ?? {}),
      [bindProp]: {
        ...targetProp,
        value: rawBoundValue,
      },
    };

    return nextNode;
  };

  const getSwiperImages = (): SwiperImageItem[] => {
    const value = getProp('images');
    if (Array.isArray(value)) {
      return value
        .filter((item) => !!item && typeof item === 'object')
        .map((item) => {
          const record = item as Partial<SwiperImageItem>;
          return {
            src: String(record.src ?? '').trim(),
            fallback: String(record.fallback ?? '').trim(),
            lazy: typeof record.lazy === 'boolean' ? record.lazy : true,
            objectFit: String(record.objectFit ?? 'cover'),
            objectPosition: String(record.objectPosition ?? 'center'),
          };
        })
        .filter((item) => !!item.src);
    }

    return getStringArrayProp('images').map((src) => ({
      src,
      fallback: '',
      lazy: true,
      objectFit: 'cover',
      objectPosition: 'center',
    }));
  };

  const getTimeStepsProp = () => {
    const value = getProp('steps');
    const toValidStep = (input: unknown) => {
      const parsed = Number(input);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        return 1;
      }
      return Math.max(1, Math.round(parsed));
    };

    if (Array.isArray(value)) {
      const list = value.slice(0, 3).map((item) => toValidStep(item));
      if (list.length === 3) {
        return list;
      }
      return [1, 1, 1];
    }

    if (typeof value === 'string') {
      const list = value
        .split(/,|，|\s+/)
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 3)
        .map((item) => toValidStep(item));

      if (list.length === 3) {
        return list;
      }
    }

    return [1, 1, 1];
  };

  const getTimeRangeValueProp = (propName: string) => {
    const values = getStringArrayProp(propName).slice(0, 2);
    if (values.length === 2) {
      return values;
    }

    return undefined;
  };

  const getInputNumberValueProp = (propName: string) => {
    const value = getProp(propName);
    if (typeof value === 'number') {
      return Number.isNaN(value) ? undefined : value;
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed === '' ? undefined : trimmed;
    }

    return undefined;
  };

  const getFiniteNumberProp = (propName: string) => {
    const value = getProp(propName);
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : undefined;
    }

    return undefined;
  };

  const getSliderValueProp = (propName: string): number | [number, number] | undefined => {
    const value = getProp(propName);
    const parseNumber = (input: unknown) => {
      if (typeof input === 'number' && Number.isFinite(input)) {
        return input;
      }

      if (typeof input === 'string' && input.trim()) {
        const parsed = Number(input);
        return Number.isFinite(parsed) ? parsed : undefined;
      }

      return undefined;
    };

    const parseArrayValue = (list: unknown[]) => {
      const numbers = list.map((item) => parseNumber(item)).filter((item): item is number => typeof item === 'number');
      if (numbers.length >= 2) {
        return [numbers[0], numbers[1]] as [number, number];
      }

      if (numbers.length === 1) {
        return [numbers[0], numbers[0]] as [number, number];
      }

      return undefined;
    };

    if (Array.isArray(value)) {
      return parseArrayValue(value);
    }

    const numberValue = parseNumber(value);
    if (typeof numberValue === 'number') {
      return numberValue;
    }

    if (typeof value === 'string') {
      const text = value.trim();
      if (!text) {
        return undefined;
      }

      if (text.startsWith('[') && text.endsWith(']')) {
        try {
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed)) {
            return parseArrayValue(parsed);
          }
        } catch {
          return undefined;
        }
      }

      const chunks = text
        .split(/,|，|\s+/)
        .map((item) => item.trim())
        .filter(Boolean);

      if (chunks.length >= 2) {
        return parseArrayValue(chunks);
      }
    }

    return undefined;
  };

  const getStepsCurrentProp = (propName: string): string | number | undefined => {
    const value = getProp(propName);
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string') {
      const text = value.trim();
      if (!text) {
        return undefined;
      }

      const parsed = Number(text);
      return Number.isFinite(parsed) ? parsed : text;
    }

    return undefined;
  };

  const getTabsListProp = () => {
    return normalizeTabsList(getProp('list'));
  };

  const getTabsControlledValue = () => normalizeTabsValue(getProp('value'));
  const getTabsDefaultValue = () => normalizeTabsValue(getProp('defaultValue'));

  const getMenuValueProp = (propName: string): string | number | undefined => {
    const value = getProp(propName);
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string') {
      const text = value.trim();
      if (!text) {
        return undefined;
      }

      const parsed = Number(text);
      return Number.isFinite(parsed) ? parsed : text;
    }

    return undefined;
  };

  const getMenuValueArrayProp = (propName: string): Array<string | number> | undefined => {
    const value = getProp(propName);

    if (Array.isArray(value)) {
      const normalized = value
        .map((item) => {
          if (typeof item === 'number' && Number.isFinite(item)) {
            return item;
          }

          if (typeof item === 'string') {
            const text = item.trim();
            if (!text) {
              return undefined;
            }

            const parsed = Number(text);
            return Number.isFinite(parsed) ? parsed : text;
          }

          return undefined;
        })
        .filter((item): item is string | number => typeof item !== 'undefined');

      return normalized.length ? normalized : undefined;
    }

    if (typeof value === 'string') {
      const normalized = value
        .split(/\r?\n|,|，/)
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) => {
          const parsed = Number(item);
          return Number.isFinite(parsed) ? parsed : item;
        });

      return normalized.length ? normalized : undefined;
    }

    return undefined;
  };

  const getMenuWidthProp = (propName: string): string | number | Array<string | number> | undefined => {
    const value = getProp(propName);

    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (Array.isArray(value)) {
      const normalized = value
        .map((item) => {
          if (typeof item === 'number' && Number.isFinite(item)) {
            return item;
          }

          if (typeof item === 'string') {
            const text = item.trim();
            return text || undefined;
          }

          return undefined;
        })
        .filter((item): item is string | number => typeof item !== 'undefined');

      return normalized.length ? normalized : undefined;
    }

    if (typeof value === 'string') {
      const text = value.trim();
      if (!text) {
        return undefined;
      }

      const chunks = text
        .split(/,|，/)
        .map((item) => item.trim())
        .filter(Boolean);

      if (chunks.length >= 2) {
        return chunks.slice(0, 2);
      }

      const parsed = Number(text);
      return Number.isFinite(parsed) ? parsed : text;
    }

    return undefined;
  };

  const getBackTopOffsetProp = (propName: string): [string | number, string | number] | undefined => {
    const value = getProp(propName);

    if (Array.isArray(value) && value.length >= 2) {
      return [value[0] as string | number, value[1] as string | number];
    }

    if (typeof value === 'string') {
      const chunks = value
        .split(/,|，/)
        .map((item) => item.trim())
        .filter(Boolean);

      if (chunks.length >= 2) {
        return [chunks[0], chunks[1]];
      }
    }

    return undefined;
  };

  const getBackTopVisibleHeightProp = (propName: string): string | number | undefined => {
    const value = getProp(propName);

    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }

    return undefined;
  };

  const getBackTopTargetProp = (propName: string) => {
    const target = getStringProp(propName);
    return target || 'body';
  };

  const getBackTopContainerProp = () => {
    return () => (document.querySelector('[data-builder-scroll-container="true"]') as HTMLElement | null) ?? document.body;
  };

  const getBackTopContentNode = () => {
    const text = getStringProp('content');
    const iconNode = renderNamedIcon(getStringProp('iconName'), {
      size: getStringProp('size') === 'small' ? 16 : 20,
      strokeWidth: 2,
    });

    if (!iconNode) {
      return text || undefined;
    }

    return (
      <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{iconNode}</span>
        {text ? <span>{text}</span> : null}
      </span>
    );
  };

  const getBuilderDrawerAttach = () => {
    return () => (
      document.querySelector('[data-builder-scroll-container="true"]') as HTMLElement | null
    ) ?? document.body;
  };

  const getDrawerHeaderProp = (): string | boolean => {
    const showHeader = getBooleanProp('showHeader') !== false;
    if (!showHeader) {
      return false;
    }

    const headerText = getStringProp('header')?.trim();
    return headerText || true;
  };

  const getDrawerFooterProp = (): boolean => {
    return getBooleanProp('footer') !== false;
  };

  const getDrawerSizeDraggableProp = (): boolean | { min: number; max: number } | undefined => {
    const enabled = getBooleanProp('sizeDraggable') === true;
    if (!enabled) {
      return undefined;
    }

    const min = getNumberProp('sizeDragMin');
    const max = getNumberProp('sizeDragMax');
    if (typeof min === 'number' && typeof max === 'number' && min > 0 && max >= min) {
      return { min, max };
    }

    return true;
  };

  const getProgressColorProp = (propName: string): string | string[] | Record<string, string> | undefined => {
    const value = getProp(propName);

    if (typeof value === 'string') {
      const text = value.trim();
      if (!text) {
        return undefined;
      }

      if ((text.startsWith('{') && text.endsWith('}')) || (text.startsWith('[') && text.endsWith(']'))) {
        try {
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed)) {
            const list = parsed.map((item) => String(item).trim()).filter(Boolean);
            return list.length ? list : undefined;
          }

          if (parsed && typeof parsed === 'object') {
            const entries = Object.entries(parsed as Record<string, unknown>)
              .map(([key, item]) => [key, String(item).trim()] as const)
              .filter(([, item]) => !!item);
            return entries.length ? Object.fromEntries(entries) : undefined;
          }
        } catch {
          return text;
        }
      }

      const splitList = text.split(/,|，/).map((item) => item.trim()).filter(Boolean);
      if (splitList.length >= 2) {
        return splitList;
      }

      return text;
    }

    if (Array.isArray(value)) {
      const list = value.map((item) => String(item).trim()).filter(Boolean);
      return list.length ? list : undefined;
    }

    if (value && typeof value === 'object') {
      const entries = Object.entries(value as Record<string, unknown>)
        .map(([key, item]) => [key, String(item).trim()] as const)
        .filter(([, item]) => !!item);
      return entries.length ? Object.fromEntries(entries) : undefined;
    }

    return undefined;
  };

  const getProgressLabelProp = (): string | boolean => {
    if (getBooleanProp('showLabel') === false) {
      return false;
    }

    const text = getStringProp('labelText')?.trim();
    return text || true;
  };

  const getProgressSizeProp = (propName: string): string | number | undefined => {
    const value = getProp(propName);

    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string') {
      const text = value.trim();
      if (!text) {
        return undefined;
      }

      const parsed = Number(text);
      return Number.isFinite(parsed) ? parsed : text;
    }

    return undefined;
  };

  const getProgressStatusProp = (): string | undefined => {
    const status = getStringProp('status')?.trim();
    if (!status || status === 'default') {
      return undefined;
    }

    return status;
  };

  const getUploadAbridgeNameProp = (propName: string): [number, number] | undefined => {
    const value = getProp(propName);

    const normalize = (input: unknown[]) => {
      const numbers = input
        .map((item) => Number(item))
        .filter((item) => Number.isFinite(item) && item >= 0)
        .map((item) => Math.round(item));

      if (numbers.length >= 2) {
        return [numbers[0], numbers[1]] as [number, number];
      }

      return undefined;
    };

    if (Array.isArray(value)) {
      return normalize(value);
    }

    if (typeof value === 'string') {
      const text = value.trim();
      if (!text) {
        return undefined;
      }

      try {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
          return normalize(parsed);
        }
      } catch {
        const chunks = text.split(/,|，/).map((item) => item.trim()).filter(Boolean);
        return normalize(chunks);
      }
    }

    return undefined;
  };

  const getUploadFileListProp = (propName: string): Array<Record<string, unknown>> | undefined => {
    const value = getProp(propName);

    if (Array.isArray(value)) {
      return value.filter((item) => !!item && typeof item === 'object') as Array<Record<string, unknown>>;
    }

    if (typeof value === 'string' && value.trim()) {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          return parsed.filter((item) => !!item && typeof item === 'object') as Array<Record<string, unknown>>;
        }
      } catch {
        return undefined;
      }
    }

    return undefined;
  };

  const getUploadObjectProp = (propName: string): Record<string, unknown> | undefined => {
    const value = getProp(propName);

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }

    if (typeof value === 'string' && value.trim()) {
      try {
        const parsed = JSON.parse(value);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return parsed as Record<string, unknown>;
        }
      } catch {
        return undefined;
      }
    }

    return undefined;
  };

  const getUploadSizeLimitProp = (propName: string): number | Record<string, unknown> | undefined => {
    const value = getProp(propName);

    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }

    if (typeof value === 'string' && value.trim()) {
      const text = value.trim();
      const parsedNumber = Number(text);
      if (Number.isFinite(parsedNumber)) {
        return parsedNumber;
      }

      try {
        const parsed = JSON.parse(text);
        if (typeof parsed === 'number' && Number.isFinite(parsed)) {
          return parsed;
        }
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return parsed as Record<string, unknown>;
        }
      } catch {
        return undefined;
      }
    }

    return undefined;
  };

  const getUploadStatusProp = (propName: string): string | undefined => {
    const value = getStringProp(propName)?.trim();
    if (!value || value === 'default') {
      return undefined;
    }

    return value;
  };

  const handleActivateSelf = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    if (!data?.key) {
      return;
    }

    setActiveNode(data.key);
  };

  React.useEffect(() => {
    setTabsInnerValue(undefined);
  }, [data?.key]);

  const inlineStyle = getStyleProp();
  const mergeStyle = (baseStyle?: React.CSSProperties): React.CSSProperties | undefined => {
    if (!baseStyle && !inlineStyle) {
      return undefined;
    }

    return {
      ...(baseStyle ?? {}),
      ...(inlineStyle ?? {}),
    };
  };

  const isBlockButton = getBooleanProp('block') === true;
  const spaceDirection = getStringProp('direction') as 'horizontal' | 'vertical' | undefined;
  const isSpaceSplitEnabled = getBooleanProp('splitEnabled') === true;
  const spaceSplitLayout = spaceDirection === 'vertical' ? 'horizontal' : 'vertical';
  const spaceSplitContent = getStringProp('splitContent');
  const spaceSplitAlign = getStringProp('splitAlign') as any;
  const spaceSplitDashed = getBooleanProp('splitDashed');

  const toGridNumber = (value: unknown): number | undefined => {
    if (typeof value === 'number' && !Number.isNaN(value)) {
      return value;
    }

    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }

    return undefined;
  };

  const colSpan = (() => {
    const resolved = toGridNumber(getProp('span'));
    if (typeof resolved !== 'number') {
      return 6;
    }
    return Math.max(0, Math.min(12, Math.round(resolved)));
  })();

  const colOffset = (() => {
    const resolved = toGridNumber(getProp('offset'));
    if (typeof resolved !== 'number') {
      return 0;
    }
    return Math.max(0, Math.min(11, Math.round(resolved)));
  })();

  const responsiveConfig = normalizeResponsiveConfig(getProp('__responsiveCol'));
  const builderViewportWidth = resolveBuilderViewportWidth(screenSize, autoWidth);
  const responsiveColLayout = resolveResponsiveColLayout(colSpan, colOffset, responsiveConfig, builderViewportWidth);

  if (isSlotNode(data)) {
    return (
      <DropArea data={data} onDropData={onDropData} emptyText="拖拽组件到此插槽" />
    );
  }

  const getCardSlotNode = (slotKey: 'header' | 'body') => {
    const sourceChildren = data?.children ?? [];
    return sourceChildren.find((child) => getNodeSlotKey(child) === slotKey);
  };

  const cardHeaderSlotNode = getCardSlotNode('header');
  const cardBodySlotNode = getCardSlotNode('body');
  const hasCardSlotStructure = Boolean(cardHeaderSlotNode && cardBodySlotNode);

  const renderBuilderMenuNodes = (nodes?: UiTreeNode[]): React.ReactNode => {
    return (nodes ?? []).map((child) => {
      const childType = typeof child.type === 'string' ? child.type.trim() : child.type;
      const getChildProp = (propName: string) => {
        const prop = child.props?.[propName] as { value?: unknown } | undefined;
        return prop?.value;
      };
      const getChildStringProp = (propName: string) => {
        const value = getChildProp(propName);
        return typeof value === 'string' ? value : undefined;
      };
      const getChildTextProp = (propName: string) => {
        const value = getChildProp(propName);
        if (typeof value === 'string') {
          return value;
        }
        if (typeof value === 'number' || typeof value === 'boolean') {
          return String(value);
        }
        return undefined;
      };
      const getChildBooleanProp = (propName: string) => {
        const value = getChildProp(propName);
        return typeof value === 'boolean' ? value : undefined;
      };

      if (childType === 'Menu.Submenu') {
        const iconNode = renderNamedIcon(getChildStringProp('iconName'));
        const submenuValue = getChildStringProp('value')?.trim() || child.key;
        return (
          <Menu.SubMenu
            key={child.key}
            value={submenuValue}
            title={getChildTextProp('title') || undefined}
            content={getChildTextProp('content') || undefined}
            icon={iconNode as any}
            disabled={getChildBooleanProp('disabled')}
          >
            {renderBuilderMenuNodes(child.children)}
          </Menu.SubMenu>
        );
      }

      if (childType === 'Menu.Group') {
        return (
          <Menu.MenuGroup key={child.key} title={getChildTextProp('title') || undefined}>
            {renderBuilderMenuNodes(child.children)}
          </Menu.MenuGroup>
        );
      }

      if (childType === 'Menu.Item') {
        const iconNode = renderNamedIcon(getChildStringProp('iconName'));
        const itemValue = getChildStringProp('value')?.trim() || child.key;
        return (
          <Menu.MenuItem
            key={child.key}
            value={itemValue}
            content={getChildTextProp('content') || undefined}
            icon={iconNode as any}
            href={getChildStringProp('href') || undefined}
            target={getChildStringProp('target') as any}
            disabled={getChildBooleanProp('disabled')}
            onClick={(context) => {
              context.e.stopPropagation();
              setActiveNode(child.key);
            }}
          />
        );
      }

      return null;
    });
  };

  switch(normalizedType) {
    case 'Button':
      {
      const prefixIcon = renderNamedIcon(getStringProp('prefixIconName'));
      const suffixIcon = renderNamedIcon(getStringProp('suffixIconName'));
      return (
        <ActivateWrapper style={mergeStyle(isBlockButton ? { width: '100%' } : undefined)} onActivate={handleActivateSelf}>
          <Button
            theme={getStringProp('theme') as any}
            shape={getStringProp('shape') as any}
            size={getStringProp('size') as any}
            variant={getStringProp('variant') as any}
            icon={prefixIcon as any}
            suffix={suffixIcon as any}
            block={isBlockButton}
            style={mergeStyle(isBlockButton ? { width: '100%', display: 'flex' } : undefined)}
          >
            {getStringProp('content')}
          </Button>
        </ActivateWrapper>
      );
      }
    case 'Link':
      {
      const prefixIcon = renderNamedIcon(getStringProp('prefixIconName'));
      const suffixIcon = renderNamedIcon(getStringProp('suffixIconName'));
      return (
        <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf}>
          <Link
            content={getStringProp('content')}
            href={getStringProp('href') || undefined}
            target={getStringProp('target') || undefined}
            theme={getStringProp('theme') as any}
            size={getStringProp('size') as any}
            hover={getStringProp('hover') as any}
            prefixIcon={prefixIcon as any}
            suffixIcon={suffixIcon as any}
            underline={getBooleanProp('underline')}
            disabled={getBooleanProp('disabled')}
            onClick={(event) => {
              event.preventDefault();
            }}
          />
        </ActivateWrapper>
      );
      }
    case 'BackTop':
      return (
        <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf}>
          <BackTop
            className="builder-back-top"
            content={getBackTopContentNode()}
            duration={getFiniteNumberProp('duration')}
            offset={getBackTopOffsetProp('offset') as any}
            shape={getStringProp('shape') as any}
            size={getStringProp('size') as any}
            target={getBackTopTargetProp('target') as any}
            container={getBackTopContainerProp() as any}
            theme={getStringProp('theme') as any}
            visibleHeight={getBackTopVisibleHeightProp('visibleHeight') as any}
            style={mergeStyle()}
          />
        </ActivateWrapper>
      );
    case 'Progress':
      return (
        <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf}>
          <Progress
            className={getStringProp('className') || undefined}
            color={getProgressColorProp('color') as any}
            label={getProgressLabelProp() as any}
            percentage={getFiniteNumberProp('percentage') ?? 0}
            size={getProgressSizeProp('size') as any}
            status={getProgressStatusProp() as any}
            strokeWidth={getProgressSizeProp('strokeWidth') as any}
            theme={getStringProp('theme') as any}
            trackColor={getStringProp('trackColor') || undefined}
            style={mergeStyle()}
          />
        </ActivateWrapper>
      );
    case 'Upload': {
      const hasTriggerChildren = (data?.children?.length ?? 0) > 0;
      return (
        <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf}>
          <Upload
            className={getStringProp('className') || undefined}
            abridgeName={getUploadAbridgeNameProp('abridgeName') as any}
            accept={getStringProp('accept') || undefined}
            action={getStringProp('action') || undefined}
            allowUploadDuplicateFile={getBooleanProp('allowUploadDuplicateFile')}
            autoUpload={getBooleanProp('autoUpload') !== false}
            data={getUploadObjectProp('data') as any}
            disabled={getBooleanProp('disabled')}
            draggable={getBooleanProp('draggable')}
            files={getUploadFileListProp('files') as any}
            defaultFiles={getUploadFileListProp('defaultFiles') as any}
            headers={getUploadObjectProp('headers') as any}
            max={getFiniteNumberProp('max')}
            method={getStringProp('method') as any}
            mockProgressDuration={getFiniteNumberProp('mockProgressDuration')}
            multiple={getBooleanProp('multiple')}
            name={getStringProp('name') || undefined}
            placeholder={getStringProp('placeholder') || undefined}
            showImageFileName={getBooleanProp('showImageFileName')}
            showThumbnail={getBooleanProp('showThumbnail')}
            showUploadProgress={getBooleanProp('showUploadProgress')}
            sizeLimit={getUploadSizeLimitProp('sizeLimit') as any}
            status={getUploadStatusProp('status') as any}
            theme={getStringProp('theme') as any}
            tips={getStringProp('tips') || undefined}
            uploadAllFilesInOneRequest={getBooleanProp('uploadAllFilesInOneRequest')}
            uploadPastedFiles={getBooleanProp('uploadPastedFiles')}
            useMockProgress={getBooleanProp('useMockProgress')}
            withCredentials={getBooleanProp('withCredentials')}
            style={mergeStyle()}
          >
            <DropArea
              data={data}
              onDropData={onDropData}
              emptyText="拖拽组件到上传触发区"
              compactWhenFilled={hasTriggerChildren}
            />
          </Upload>
        </ActivateWrapper>
      );
    }
    case 'Drawer': {
      const hasDrawerChildren = (data?.children?.length ?? 0) > 0;
      const drawerBodyText = getStringProp('body')?.trim();
      const drawerVisible = getBooleanProp('visible') === true;
      return (
        <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf}>
          <div style={{ position: 'relative' }}>
            <Drawer
              className={getStringProp('className') || undefined}
              attach={getBuilderDrawerAttach() as any}
              body={!hasDrawerChildren ? (drawerBodyText || undefined) : undefined}
              cancelBtn={getStringProp('cancelBtn') || undefined}
              closeBtn={getBooleanProp('closeBtn') !== false}
              closeOnEscKeydown={getBooleanProp('closeOnEscKeydown') !== false}
              closeOnOverlayClick={getBooleanProp('closeOnOverlayClick') !== false}
              confirmBtn={getStringProp('confirmBtn') || undefined}
              destroyOnClose={getBooleanProp('destroyOnClose') === true}
              footer={getDrawerFooterProp()}
              header={getDrawerHeaderProp() as any}
              lazy={getBooleanProp('lazy') !== false}
              placement={getStringProp('placement') as any}
              preventScrollThrough={getBooleanProp('preventScrollThrough') !== false}
              showInAttachedElement
              showOverlay={getBooleanProp('showOverlay') !== false}
              size={getStringProp('size') || undefined}
              sizeDraggable={getDrawerSizeDraggableProp() as any}
              visible={drawerVisible}
              zIndex={getNumberProp('zIndex')}
              style={mergeStyle()}
              onClose={() => {
                // 搭建态仅展示，不在此处驱动运行时逻辑
              }}
              onConfirm={() => {
                // 搭建态仅展示，不在此处驱动运行时逻辑
              }}
              onCancel={() => {
                // 搭建态仅展示，不在此处驱动运行时逻辑
              }}
            >
              <DropArea
                data={data}
                onDropData={onDropData}
                emptyText="拖拽组件到抽屉内容"
                compactWhenFilled
              />
            </Drawer>
          </div>
        </ActivateWrapper>
      );
    }
    case 'HeadMenu':
      return (
        <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf}>
          <Menu.HeadMenu
            expandType={getStringProp('expandType') as any}
            expanded={getMenuValueArrayProp('expanded') as any}
            defaultExpanded={getMenuValueArrayProp('defaultExpanded') as any}
            theme={getStringProp('theme') as any}
            value={getMenuValueProp('value') as any}
            defaultValue={getMenuValueProp('defaultValue') as any}
            style={mergeStyle()}
            onChange={() => {
              // 搭建态仅展示，不在此处驱动运行时逻辑
            }}
            onExpand={() => {
              // 搭建态仅展示，不在此处驱动运行时逻辑
            }}
          >
            {renderBuilderMenuNodes(data?.children)}
          </Menu.HeadMenu>
        </ActivateWrapper>
      );
    case 'Menu.Submenu':
    case 'Menu.Item':
    case 'Menu.Group':
      return null;
    case 'Icon':
      {
      const iconNode = renderNamedIcon(getStringProp('iconName'), {
        size: getNumberProp('size') ?? 16,
        strokeWidth: getNumberProp('strokeWidth') ?? 2,
      });

      return (
        <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf}>
          {iconNode}
        </ActivateWrapper>
      );
      }
    case 'Space':
      return (
        <DropArea data={data} onDropData={onDropData}>
          <SpaceContent
            align={getStringProp('align')}
            direction={spaceDirection}
            size={getNumberProp('size')}
            breakLine={getBooleanProp('breakLine')}
            isSpaceSplitEnabled={isSpaceSplitEnabled}
            spaceSplitLayout={spaceSplitLayout}
            spaceSplitDashed={spaceSplitDashed}
            spaceSplitAlign={spaceSplitAlign}
            spaceSplitContent={spaceSplitContent}
            style={mergeStyle()}
            onActivate={handleActivateSelf}
          />
        </DropArea>
      );
      case 'Grid.Row':
        return (
          <DropArea style={{ width: '100%' }} data={data} onDropData={onDropData}>
            <RowContent
              align={getStringProp('align')}
              justify={getStringProp('justify')}
              gutter={getNumberProp('gutter')}
              style={mergeStyle()}
            />
          </DropArea>
        )
      case 'Menu':
        return (
          <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf}>
            <Menu
              collapsed={getBooleanProp('collapsed')}
              expandMutex={getBooleanProp('expandMutex')}
              expandType={getStringProp('expandType') as any}
              expanded={getMenuValueArrayProp('expanded') as any}
              defaultExpanded={getMenuValueArrayProp('defaultExpanded') as any}
              theme={getStringProp('theme') as any}
              value={getMenuValueProp('value') as any}
              defaultValue={getMenuValueProp('defaultValue') as any}
              width={getMenuWidthProp('width') as any}
              style={mergeStyle()}
              onChange={() => {
                // 搭建态仅展示，不在此处驱动运行时逻辑
              }}
              onExpand={() => {
                // 搭建态仅展示，不在此处驱动运行时逻辑
              }}
            >
              {renderBuilderMenuNodes(data?.children)}
            </Menu>
          </ActivateWrapper>
        );
      case 'Grid.Col':
        return (
          <Col
            span={responsiveColLayout.span}
            offset={responsiveColLayout.offset}
            style={mergeStyle()}
          >
            <DropArea data={data} onDropData={onDropData}>

            </DropArea>
          </Col>

        )
      case 'Layout':
        return (
          <Layout style={mergeStyle()}>
            <DropArea data={data} onDropData={onDropData} />
          </Layout>
        )
      case 'Layout.Header':
        return (
          <Header style={mergeStyle()}>
            <DropArea data={data} onDropData={onDropData} />
          </Header>
        )
      case 'Layout.Content':
        return (
          <Content style={mergeStyle()}>
            <DropArea data={data} onDropData={onDropData} />
          </Content>
        )
      case 'Layout.Aside':
        return (
          <Aside style={mergeStyle()}>
            <DropArea data={data} onDropData={onDropData} />
          </Aside>
        )
      case 'Layout.Footer':
        return (
          <Footer style={mergeStyle()}>
            <DropArea data={data} onDropData={onDropData} />
          </Footer>
        )
      case 'List':
        {
        const customTemplateEnabled = getBooleanProp('customTemplateEnabled') === true;
        const listItemTemplateNode = (data?.children ?? []).find((child) => child.type === 'List.Item');
        const getListItemTemplateProp = (propName: string) => {
          const prop = listItemTemplateNode?.props?.[propName] as { value?: unknown } | undefined;
          return prop?.value;
        };
        const titleField = getStringProp('titleField') || 'title';
        const descriptionField = getStringProp('descriptionField') || 'description';
        const imageField = getStringProp('imageField') || 'image';
        const actionField = getStringProp('actionField') || 'actionText';
        const showImage = getListItemTemplateProp('showImage') !== false;
        const showDescription = getListItemTemplateProp('showDescription') !== false;
        const showAction = getListItemTemplateProp('showAction') !== false;
        const actionTheme = String(getListItemTemplateProp('actionTheme') ?? 'default');
        const actionVariant = String(getListItemTemplateProp('actionVariant') ?? 'text');
        const actionSize = String(getListItemTemplateProp('actionSize') ?? 'small');

        if (customTemplateEnabled) {
          return (
            <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf}>
              <List
                layout={getStringProp('layout') as any}
                size={getStringProp('size') as any}
                split={getBooleanProp('split')}
                stripe={getBooleanProp('stripe')}
                header={getStringProp('header') || undefined}
                footer={getStringProp('footer') || undefined}
                asyncLoading={getStringProp('asyncLoading') || undefined}
                style={mergeStyle()}
              >
                {LIST_PREVIEW_DATA.map((item, index) => {
                  const boundTemplateNode = listItemTemplateNode
                    ? {
                        ...listItemTemplateNode,
                        children: (listItemTemplateNode.children ?? []).map((child) => applyListBindingToNode(child, item)),
                      }
                    : undefined;

                  return (
                    <ListItem key={`${data?.key ?? 'list'}-template-${index}`}>
                      <DropArea
                        data={boundTemplateNode}
                        onDropData={onDropData}
                        emptyText="拖拽组件到列表项模板"
                        compactWhenFilled
                      />
                    </ListItem>
                  );
                })}
              </List>
            </ActivateWrapper>
          );
        }

        return (
          <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf}>
            <List
              layout={getStringProp('layout') as any}
              size={getStringProp('size') as any}
              split={getBooleanProp('split')}
              stripe={getBooleanProp('stripe')}
              header={getStringProp('header') || undefined}
              footer={getStringProp('footer') || undefined}
              asyncLoading={getStringProp('asyncLoading') || undefined}
              style={mergeStyle()}
            >
              {LIST_PREVIEW_DATA.map((item, index) => {
                const metaTitle = getListFieldValue(item, titleField);
                const metaDescription = getListFieldValue(item, descriptionField);
                const metaImage = getListFieldValue(item, imageField);
                const actionText = getListFieldValue(item, actionField);
                const resolvedTitle = metaTitle || `列表项 ${index + 1}`;
                const resolvedDescription = showDescription ? metaDescription : undefined;
                const resolvedImage = showImage ? metaImage : undefined;
                return (
                  <ListItem
                    key={`${data?.key ?? 'list'}-preview-${index}`}
                    action={showAction && actionText ? (
                      <Button size={actionSize as any} variant={actionVariant as any} theme={actionTheme as any}>{actionText}</Button>
                    ) : undefined}
                  >
                    <ListItemMeta
                      title={resolvedTitle}
                      description={resolvedDescription}
                      image={resolvedImage ? <Image src={resolvedImage} style={{ width: 56, height: 56, borderRadius: 6 }} /> : undefined}
                    />
                  </ListItem>
                );
              })}
            </List>
          </ActivateWrapper>
        );
        }
      case 'Card':
        if (!hasCardSlotStructure) {
          return (
            <DropArea data={data} onDropData={onDropData}>
              <CardContent
                title={getStringProp('title')}
                subtitle={getStringProp('subtitle')}
                size={getStringProp('size')}
                bordered={getBooleanProp('bordered')}
                headerBordered={getBooleanProp('headerBordered')}
                shadow={getBooleanProp('shadow')}
                hoverShadow={getBooleanProp('hoverShadow')}
                style={mergeStyle()}
                onActivate={handleActivateSelf}
              />
            </DropArea>
          );
        }

        return (
          <CardContent
            title={!cardHeaderSlotNode?.children?.length ? getStringProp('title') : undefined}
            subtitle={!cardHeaderSlotNode?.children?.length ? getStringProp('subtitle') : undefined}
            size={getStringProp('size')}
            bordered={getBooleanProp('bordered')}
            headerBordered={getBooleanProp('headerBordered')}
            shadow={getBooleanProp('shadow')}
            hoverShadow={getBooleanProp('hoverShadow')}
            style={mergeStyle()}
            onActivate={handleActivateSelf}
            header={(
              <DropArea
                data={cardHeaderSlotNode}
                onDropData={onDropData}
                dropSlotKey="header"
                selectable={false}
                compactWhenFilled
                emptyText="拖拽组件到卡片头部"
              />
            )}
          >
            <DropArea
              data={cardBodySlotNode}
              onDropData={onDropData}
              dropSlotKey="body"
              selectable={false}
              compactWhenFilled
              emptyText="拖拽组件到卡片内容"
            />
          </CardContent>
        );
      case 'Image':
        return (
          <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf}>
            <Image
              src={getStringProp('src')}
              alt={getStringProp('alt')}
              fit={getStringProp('fit') as any}
              shape={getStringProp('shape') as any}
              style={mergeStyle()}
            />
          </ActivateWrapper>
        );
      case 'Avatar':
        return (
          <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf}>
            <Avatar
              image={getStringProp('image')}
              alt={getStringProp('alt')}
              content={getStringProp('content')}
              shape={getStringProp('shape') as any}
              size={getStringProp('size')}
              hideOnLoadFailed={getBooleanProp('hideOnLoadFailed')}
              style={mergeStyle()}
            />
          </ActivateWrapper>
        );
      case 'Switch':
        {
        const isControlled = getBooleanProp('controlled') !== false;
        const controlledValue = Boolean(getBooleanProp('value'));
        const defaultValue = Boolean(getBooleanProp('defaultValue'));
        return (
          <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf}>
            <Space align="center" size={8}>
              <Switch
                size={getStringProp('size') as any}
                value={isControlled ? controlledValue : undefined}
                defaultValue={isControlled ? undefined : defaultValue}
                onChange={() => {
                  // 搭建态仅展示，不在此处驱动运行时逻辑
                }}
              />
            </Space>
          </ActivateWrapper>
        );
        }
      case 'Calendar':
        return (
          <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf}>
            <Calendar
              theme={getStringProp('theme') as any}
              mode={getStringProp('mode') as any}
              firstDayOfWeek={getNumberProp('firstDayOfWeek')}
              format={getStringProp('format')}
              fillWithZero={getBooleanProp('fillWithZero')}
              isShowWeekendDefault={getBooleanProp('isShowWeekendDefault')}
              controllerConfig={getBooleanProp('controllerConfig')}
              preventCellContextmenu={getBooleanProp('preventCellContextmenu')}
              value={getCalendarValueProp('value') as any}
              style={mergeStyle()}
            />
          </ActivateWrapper>
        );
      case 'ColorPicker':
        {
        const isControlled = getBooleanProp('controlled') !== false;
        return (
          <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf}>
            <ColorPicker
              format={getStringProp('format') as any}
              value={isControlled ? (getStringProp('value') || undefined) : undefined}
              defaultValue={isControlled ? undefined : (getStringProp('defaultValue') || undefined)}
              clearable={getBooleanProp('clearable')}
              borderless={getBooleanProp('borderless')}
              disabled={getBooleanProp('disabled')}
              enableAlpha={getBooleanProp('enableAlpha')}
              showPrimaryColorPreview={getBooleanProp('showPrimaryColorPreview')}
              style={mergeStyle()}
            />
          </ActivateWrapper>
        );
        }
      case 'TimePicker':
        {
        const isControlled = getBooleanProp('controlled') !== false;
        return (
          <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf}>
            <TimePicker
              format={getStringProp('format') || 'HH:mm:ss'}
              value={isControlled ? (getStringProp('value') || undefined) : undefined}
              defaultValue={isControlled ? undefined : (getStringProp('defaultValue') || undefined)}
              placeholder={getStringProp('placeholder') || undefined}
              size={getStringProp('size') as any}
              status={getStringProp('status') as any}
              steps={getTimeStepsProp() as any}
              allowInput={getBooleanProp('allowInput')}
              borderless={getBooleanProp('borderless')}
              clearable={getBooleanProp('clearable')}
              disabled={getBooleanProp('disabled')}
              hideDisabledTime={getBooleanProp('hideDisabledTime')}
              style={mergeStyle()}
            />
          </ActivateWrapper>
        );
        }
      case 'TimeRangePicker':
        {
        const isControlled = getBooleanProp('controlled') !== false;
        const value = getTimeRangeValueProp('value');
        const defaultValue = getTimeRangeValueProp('defaultValue');
        const placeholderStart = getStringProp('placeholderStart');
        const placeholderEnd = getStringProp('placeholderEnd');
        const placeholder = placeholderStart || placeholderEnd
          ? [placeholderStart || '开始时间', placeholderEnd || '结束时间']
          : undefined;

        return (
          <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf}>
            <TimeRangePicker
              format={getStringProp('format') || 'HH:mm:ss'}
              value={isControlled ? (value as any) : undefined}
              defaultValue={isControlled ? undefined : (defaultValue as any)}
              placeholder={placeholder as any}
              size={getStringProp('size') as any}
              status={getStringProp('status') as any}
              steps={getTimeStepsProp() as any}
              allowInput={getBooleanProp('allowInput')}
              autoSwap={getBooleanProp('autoSwap')}
              borderless={getBooleanProp('borderless')}
              clearable={getBooleanProp('clearable')}
              disabled={getBooleanProp('disabled')}
              hideDisabledTime={getBooleanProp('hideDisabledTime')}
              style={mergeStyle()}
            />
          </ActivateWrapper>
        );
        }
      case 'Input':
        {
        const isControlled = getBooleanProp('controlled') !== false;
        const inputValueProps = isControlled
          ? { value: getStringProp('value') || undefined }
          : { defaultValue: getStringProp('defaultValue') || undefined };

        return (
          <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf}>
            <Input
              {...inputValueProps}
              className={getStringProp('className') || undefined}
              align={getStringProp('align') as any}
              allowInputOverMax={getBooleanProp('allowInputOverMax')}
              autoWidth={getBooleanProp('autoWidth')}
              autocomplete={getStringProp('autocomplete') || undefined}
              autofocus={getBooleanProp('autofocus')}
              borderless={getBooleanProp('borderless')}
              placeholder={getStringProp('placeholder') || undefined}
              size={getStringProp('size') as any}
              status={getStringProp('status') as any}
              clearable={getBooleanProp('clearable')}
              disabled={getBooleanProp('disabled')}
              readonly={getBooleanProp('readOnly') ?? getBooleanProp('readonly')}
              maxcharacter={getFiniteNumberProp('maxcharacter') as any}
              maxlength={getFiniteNumberProp('maxlength') as any}
              name={getStringProp('name') || undefined}
              showClearIconOnEmpty={getBooleanProp('showClearIconOnEmpty')}
              showLimitNumber={getBooleanProp('showLimitNumber')}
              spellCheck={getBooleanProp('spellCheck')}
              tips={getStringProp('tips') || undefined}
              type={getStringProp('type') as any}
              style={mergeStyle()}
            />
          </ActivateWrapper>
        );
        }
      case 'Textarea':
        {
        const isControlled = getBooleanProp('controlled') !== false;
        const getTextareaStyleProp = () => {
          const value = getProp('style');

          if (value && typeof value === 'object' && !Array.isArray(value)) {
            return value as React.CSSProperties;
          }

          if (typeof value === 'string') {
            const text = value.trim();
            if (!text) {
              return undefined;
            }

            try {
              const parsed = JSON.parse(text);
              if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                return parsed as React.CSSProperties;
              }
            } catch {
              return undefined;
            }
          }

          return undefined;
        };

        const getTextareaAutosizeProp = () => {
          const value = getProp('autosize');

          if (typeof value === 'boolean') {
            return value;
          }

          if (value && typeof value === 'object' && !Array.isArray(value)) {
            const record = value as Record<string, unknown>;
            const minRows = typeof record.minRows === 'number' && Number.isFinite(record.minRows)
              ? record.minRows
              : undefined;
            const maxRows = typeof record.maxRows === 'number' && Number.isFinite(record.maxRows)
              ? record.maxRows
              : undefined;

            if (typeof minRows === 'number' || typeof maxRows === 'number') {
              return { minRows, maxRows };
            }

            return undefined;
          }

          if (typeof value === 'string') {
            const text = value.trim();
            if (!text) {
              return undefined;
            }

            if (text === 'true') {
              return true;
            }

            if (text === 'false') {
              return false;
            }

            try {
              const parsed = JSON.parse(text);
              if (typeof parsed === 'boolean') {
                return parsed;
              }
              if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                const record = parsed as Record<string, unknown>;
                const minRows = typeof record.minRows === 'number' && Number.isFinite(record.minRows)
                  ? record.minRows
                  : undefined;
                const maxRows = typeof record.maxRows === 'number' && Number.isFinite(record.maxRows)
                  ? record.maxRows
                  : undefined;

                if (typeof minRows === 'number' || typeof maxRows === 'number') {
                  return { minRows, maxRows };
                }
              }
            } catch {
              return undefined;
            }
          }

          return undefined;
        };

        const textareaValueProps = isControlled
          ? { value: getStringProp('value') || undefined }
          : { defaultValue: getStringProp('defaultValue') || undefined };
        const textareaStyle = getTextareaStyleProp();
        const mergedTextareaStyle = textareaStyle ? { ...mergeStyle(), ...textareaStyle } : mergeStyle();

        return (
          <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf}>
            <Textarea
              {...textareaValueProps}
              className={getStringProp('className') || undefined}
              allowInputOverMax={getBooleanProp('allowInputOverMax')}
              autofocus={getBooleanProp('autofocus')}
              count={getBooleanProp('count')}
              placeholder={getStringProp('placeholder') || undefined}
              status={getStringProp('status') as any}
              disabled={getBooleanProp('disabled')}
              readonly={getBooleanProp('readOnly') ?? getBooleanProp('readonly')}
              maxcharacter={getFiniteNumberProp('maxcharacter') as any}
              maxlength={getFiniteNumberProp('maxlength') as any}
              name={getStringProp('name') || undefined}
              tips={getStringProp('tips') || undefined}
              autosize={getTextareaAutosizeProp()}
              style={mergedTextareaStyle}
            />
          </ActivateWrapper>
        );
        }
      case 'InputNumber':
        {
        const isControlled = getBooleanProp('controlled') !== false;
        return (
          <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf}>
            <InputNumber
              value={isControlled ? getInputNumberValueProp('value') as any : undefined}
              defaultValue={isControlled ? undefined : getInputNumberValueProp('defaultValue') as any}
              min={getInputNumberValueProp('min') as any}
              max={getInputNumberValueProp('max') as any}
              step={getInputNumberValueProp('step') as any}
              decimalPlaces={getFiniteNumberProp('decimalPlaces') as any}
              placeholder={getStringProp('placeholder') || undefined}
              size={getStringProp('size') as any}
              status={getStringProp('status') as any}
              align={getStringProp('align') as any}
              theme={getStringProp('theme') as any}
              allowInputOverLimit={getBooleanProp('allowInputOverLimit')}
              autoWidth={getBooleanProp('autoWidth')}
              disabled={getBooleanProp('disabled')}
              readOnly={getBooleanProp('readOnly')}
              largeNumber={getBooleanProp('largeNumber')}
              style={mergeStyle()}
            />
          </ActivateWrapper>
        );
        }
      case 'Slider':
        {
        const isControlled = getBooleanProp('controlled') !== false;
        const isRange = getBooleanProp('range') === true;
        const min = getFiniteNumberProp('min') ?? 0;
        const max = getFiniteNumberProp('max') ?? 100;
        const rawValue = getSliderValueProp('value');
        const rawDefaultValue = getSliderValueProp('defaultValue');

        const value = isRange
          ? (Array.isArray(rawValue) ? rawValue : (typeof rawValue === 'number' ? [rawValue, rawValue] : [min, min]))
          : (Array.isArray(rawValue) ? rawValue[0] : (typeof rawValue === 'number' ? rawValue : min));

        const defaultValue = isRange
          ? (Array.isArray(rawDefaultValue) ? rawDefaultValue : (typeof rawDefaultValue === 'number' ? [rawDefaultValue, rawDefaultValue] : [min, min]))
          : (Array.isArray(rawDefaultValue) ? rawDefaultValue[0] : (typeof rawDefaultValue === 'number' ? rawDefaultValue : min));

        const sliderValueProps = isControlled
          ? { value: value as any }
          : { defaultValue: defaultValue as any };

        return (
          <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf}>
            <Slider
              {...sliderValueProps}
              layout={getStringProp('layout') as any}
              min={min}
              max={max}
              step={getFiniteNumberProp('step')}
              range={isRange}
              disabled={getBooleanProp('disabled')}
              onChange={() => {
                // 搭建态仅展示，不在此处驱动运行时逻辑
              }}
              style={mergeStyle()}
            />
          </ActivateWrapper>
        );
        }
      case 'Steps':
        {
        const isControlled = getBooleanProp('controlled') !== false;
        const current = getStepsCurrentProp('current');
        const defaultCurrent = getStepsCurrentProp('defaultCurrent');
        const stepItems = (data?.children ?? [])
          .filter((child) => (typeof child.type === 'string' ? child.type.trim() : child.type) === 'Steps.Item')
          .map((child) => {
            const getStepProp = (propName: string) => {
              const prop = child.props?.[propName] as { value?: unknown } | undefined;
              return prop?.value;
            };

            const title = getStepProp('title');
            const content = getStepProp('content');
            const status = getStepProp('status');
            const value = getStepProp('value');
            const normalizedStatus =
              status === 'default' || status === 'process' || status === 'finish' || status === 'error'
                ? status
                : undefined;
            const normalizedValue =
              typeof value === 'number'
                ? value
                : (typeof value === 'string'
                  ? (value.trim() ? value.trim() : undefined)
                  : undefined);

            return {
              key: child.key,
              title: typeof title === 'string' ? title : '',
              content: typeof content === 'string' ? content : '',
              status: normalizedStatus,
              value: normalizedValue,
            };
          });

        const stepsValueProps = isControlled
          ? { current: current ?? 0 }
          : { defaultCurrent: defaultCurrent ?? 0 };

        const stepsLayout = getStringProp('layout') as 'horizontal' | 'vertical' | undefined;
        const fallbackMinHeight = stepsLayout === 'vertical' ? 160 : 88;

        return (
          <DropArea data={data} onDropData={onDropData} emptyText="拖拽步骤项到步骤条" compactWhenFilled isTreeNode>
            <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf}>
              <Steps
                {...stepsValueProps}
                layout={stepsLayout as any}
                readOnly={getBooleanProp('readOnly')}
                separator={getStringProp('separator') as any}
                sequence={getStringProp('sequence') as any}
                theme={getStringProp('theme') as any}
                onChange={() => {
                  // 搭建态仅展示，不在此处驱动运行时逻辑
                }}
                style={mergeStyle({ minHeight: fallbackMinHeight })}
              >
                {stepItems.map((item) => (
                  <Steps.StepItem
                    key={item.key}
                    title={item.title}
                    content={item.content}
                    status={item.status as any}
                    value={item.value as any}
                  />
                ))}
              </Steps>
            </ActivateWrapper>
          </DropArea>
        );
        }
      case 'Steps.Item':
        return null;
      case 'Tabs': {
        const tabsList = getTabsListProp();
        const controlledValue = getTabsControlledValue();
        const defaultValue = getTabsDefaultValue();
        const firstValue = tabsList[0]?.value;
        const activeTabValue =
          controlledValue
          ?? tabsInnerValue
          ?? defaultValue
          ?? firstValue;

        const tabsPanels = tabsList.map((item) => {
          const slotNode = getTabsSlotNodeByValue(data, item.value);
          const slotKey = getTabsPanelSlotKey(item.value);

          return {
            value: item.value,
            label: item.label,
            disabled: item.disabled,
            draggable: item.draggable,
            removable: item.removable,
            lazy: item.lazy,
            destroyOnHide: item.destroyOnHide,
            panel: (
              <DropArea
                data={slotNode}
                onDropData={onDropData}
                dropSlotKey={slotKey}
                selectable={false}
                compactWhenFilled
                emptyText={`拖拽组件到「${item.label}」面板`}
              />
            ),
          };
        });

        return (
          <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf}>
            <Tabs
              action={getStringProp('action') || undefined}
              addable={getBooleanProp('addable')}
              disabled={getBooleanProp('disabled')}
              dragSort={getBooleanProp('dragSort')}
              list={tabsPanels as any}
              placement={getStringProp('placement') as any}
              scrollPosition={getStringProp('scrollPosition') as any}
              size={getStringProp('size') as any}
              theme={getStringProp('theme') as any}
              value={activeTabValue as any}
              onChange={(value) => {
                setTabsInnerValue(value as string | number);
              }}
            />
          </ActivateWrapper>
        );
      }
      case 'Swiper': {
        const imageList = getSwiperImages();
        const height = getNumberProp('height') ?? 240;

        if (imageList.length === 0) {
          return null;
        }

        return (
          <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf}>
            <Swiper autoplay height={height} style={{ width: '100%' }}>
              {imageList.map((imageItem, index) => (
                <Swiper.SwiperItem key={`${data?.key ?? 'swiper'}-${index}`}>
                  <div style={{ width: '100%', height: '100%' }}>
                    <Image
                      src={imageItem.src}
                      fallback={imageItem.fallback || undefined}
                      lazy={imageItem.lazy}
                      fit={imageItem.objectFit as any}
                      style={{ width: '100%', height: '100%', objectPosition: imageItem.objectPosition }}
                    />
                  </div>
                </Swiper.SwiperItem>
              ))}
            </Swiper>
          </ActivateWrapper>
        );
      }
      case 'Divider':
        return (
          <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf}>
            <Divider
              align={getStringProp('align') as any}
              dashed={getBooleanProp('dashed')}
              size={getNumberProp('size')}
              content={getStringProp('content')}
              style={mergeStyle()}
            />
          </ActivateWrapper>
        );
      case 'Typography.Title':
        return (
          <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf}>
            <Typography.Title level={getStringProp('level') as any} style={mergeStyle()}>
              {getStringProp('content')}
            </Typography.Title>
          </ActivateWrapper>
        );
      case 'Typography.Paragraph':
        return (
          <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf}>
            <Typography.Paragraph style={mergeStyle()}>
              {getStringProp('content')}
            </Typography.Paragraph>
          </ActivateWrapper>
        );
      case 'Typography.Text':
        return (
          <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf}>
            <Typography.Text
              theme={getStringProp('theme') as any}
              strong={getBooleanProp('strong')}
              underline={getBooleanProp('underline')}
              delete={getBooleanProp('delete')}
              code={getBooleanProp('code')}
              mark={getBooleanProp('mark')}
              style={mergeStyle()}
            >
              {getStringProp('content')}
            </Typography.Text>
          </ActivateWrapper>
        );
    default:
      return null;
  }
}
