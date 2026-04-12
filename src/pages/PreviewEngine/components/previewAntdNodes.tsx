import React from 'react';
import {
  Alert,
  Avatar,
  BackTop,
  Badge,
  Breadcrumb,
  Button,
  Calendar as AntCalendar,
  Card as AntCard,
  Carousel,
  Checkbox,
  Col,
  ColorPicker as AntColorPicker,
  DatePicker,
  Divider,
  Drawer,
  Dropdown,
  Empty,
  Form,
  Image,
  Input,
  InputNumber,
  Layout,
  Menu,
  Modal,
  Pagination,
  Popover,
  Progress,
  Radio,
  Tooltip,
  Row,
  Select,
  Slider,
  Space,
  Spin,
  Steps as AntSteps,
  Statistic as AntStatistic,
  Switch,
  Table,
  Tag,
  TimePicker as AntTimePicker,
  Typography,
  Upload as AntUpload,
} from 'antd';
import { ArrowDownOutlined, ArrowUpOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import type { UiTreeNode } from '../../../builder/store/types';
import type { ComponentLifecycleHandler, SwiperImageItem } from '../../../types/component';
import { getNodeSlotKey, isSlotNode } from '../../../builder/utils/slot';
import { renderNamedIcon } from '../../../constants/iconRegistry';
import {
  antTitleLevelFromTdesign,
  antdSpaceSizeFromTdesign,
  dividerOrientationFromAlign,
  mapTdesignButtonToAntd,
  resolveAntdTableDataSource,
  statisticColorStyle,
  antStatisticRootStyleMerge,
  BUILDER_CARD_BODY_STYLE,
  tdesignTableColumnsToAntd,
  drawerWidthPxFromTdesignSize,
  antdImageStylesFromMergeStyle,
  mapTdesignInputPropsToAntd,
  mapTdesignTextareaPropsToAntd,
  mapTdesignInputNumberPropsToAntd,
  parseDslAutosizeValue,
  tdesignTextThemeToAntdTypographyType,
  tdesignLinkThemeToAntdTypographyType,
  tdesignSemanticTokenToAntdTagColor,
} from '../../../utils/antdTdesignPropBridge';
import { collectDslStepRows, dslStepStatusToAntd } from '../../../builder/utils/stepsDsl';
import {
  antdProgressPropsFromDsl,
  parseProgressColorValue,
  parseProgressLabelValue,
} from '../../../builder/utils/progressAntdBridge';
import {
  isMenuItemNodeType,
  isMenuSubmenuNodeType,
  resolveMenuItemDslValue,
  resolveMenuSubmenuDslValue,
  stringifyMenuDslKey,
} from '../../../builder/utils/menuDslKeys';
import { AntdCollapsePreviewBridge, AntdTabsPreviewBridge } from './antdPreviewBridges';

const { Title, Paragraph, Text, Link } = Typography;
const { RangePicker } = AntTimePicker;
const { Header, Content, Footer, Sider } = Layout;

function getProp(node: UiTreeNode, propName: string) {
  const prop = node?.props?.[propName] as { value?: unknown } | undefined;
  return prop?.value;
}

function getStringProp(node: UiTreeNode, propName: string) {
  const v = getProp(node, propName);
  return typeof v === 'string' ? v : undefined;
}

function getBooleanProp(node: UiTreeNode, propName: string) {
  const v = getProp(node, propName);
  return typeof v === 'boolean' ? v : undefined;
}

function getFiniteNumberProp(node: UiTreeNode, propName: string) {
  const v = getProp(node, propName);
  if (typeof v === 'number' && Number.isFinite(v)) {
    return v;
  }
  if (typeof v === 'string' && v.trim()) {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

function getInputNumberValueProp(node: UiTreeNode, propName: string) {
  const value = getProp(node, propName);
  if (typeof value === 'number') {
    return Number.isNaN(value) ? undefined : value;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
  }
  return undefined;
}

function getStepsCurrentProp(node: UiTreeNode, propName: string): string | number | undefined {
  const value = getProp(node, propName);
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
}

function getPropValue(node: UiTreeNode, propName: string): unknown {
  const p = node.props?.[propName] as { value?: unknown } | undefined;
  return p?.value;
}

function getSlotChildren(node: UiTreeNode, slotKey: string): UiTreeNode[] {
  const sourceChildren = node.children ?? [];
  const slotNode = sourceChildren.find((child) => getNodeSlotKey(child) === slotKey && isSlotNode(child));
  if (slotNode) {
    return slotNode.children ?? [];
  }
  if (slotKey === 'body') {
    return sourceChildren.filter((child) => !isSlotNode(child));
  }
  return [];
}

function parseJsonRecordArray(raw: string | undefined): Array<Record<string, unknown>> {
  if (!raw?.trim()) {
    return [];
  }
  try {
    const v = JSON.parse(raw) as unknown;
    return Array.isArray(v) ? v.filter((x) => x && typeof x === 'object') as Array<Record<string, unknown>> : [];
  } catch {
    return [];
  }
}

function getSwiperImages(node: UiTreeNode): SwiperImageItem[] {
  const value = getProp(node, 'images');
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
  return [];
}

function getMenuSingleValue(node: UiTreeNode, propName: string): string | number | undefined {
  const value = getProp(node, propName);
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
}

function getMenuArrayValue(node: UiTreeNode, propName: string): Array<string | number> | undefined {
  const value = getProp(node, propName);
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
    return normalized.length > 0 ? normalized : undefined;
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
    return normalized.length > 0 ? normalized : undefined;
  }
  return undefined;
}

function resolvePreviewAntdMenuSelectionProps(node: UiTreeNode): {
  kind: 'controlled' | 'default';
  selectedKeys?: string[];
  defaultSelectedKeys?: string[];
} {
  const value = getMenuSingleValue(node, 'value');
  const defaultValue = getMenuSingleValue(node, 'defaultValue');
  if (value !== undefined) {
    return { kind: 'controlled', selectedKeys: [String(value)] };
  }
  if (defaultValue !== undefined) {
    return { kind: 'default', defaultSelectedKeys: [String(defaultValue)] };
  }
  return { kind: 'default' };
}

function resolvePreviewAntdMenuOpenProps(node: UiTreeNode): {
  kind: 'controlled' | 'default';
  openKeys?: string[];
  defaultOpenKeys?: string[];
} {
  const expanded = getMenuArrayValue(node, 'expanded');
  const defaultExpanded = getMenuArrayValue(node, 'defaultExpanded');
  if (expanded !== undefined) {
    return { kind: 'controlled', openKeys: expanded.map(String) };
  }
  if (defaultExpanded !== undefined) {
    return { kind: 'default', defaultOpenKeys: defaultExpanded.map(String) };
  }
  return { kind: 'default' };
}

export interface AntdPreviewContext {
  type: string;
  node: UiTreeNode;
  mergeStyle: (baseStyle?: React.CSSProperties) => React.CSSProperties | undefined;
  renderChildren: (node: UiTreeNode, onLifecycle?: ComponentLifecycleHandler) => React.ReactNode;
  renderChildList: (children: UiTreeNode[]) => React.ReactNode;
  emitInteractionLifecycle: (lifetime: string, payload?: unknown) => void;
  syncNodeValue: (nextValue: unknown) => void;
  navigatePreviewByHref: (href: string) => void;
  onLifecycle?: ComponentLifecycleHandler;
  drawerInnerVisible: boolean;
  syncDrawerVisible: (next: boolean) => void;
  modalOpen: boolean;
  syncModalVisible: (next: boolean) => void;
  /** 与 TDesign 预览 attach 一致，避免挂到 document.body 铺满外层窗口 */
  getPortalContainer: () => HTMLElement;
}

export function tryRenderAntdPreview(ctx: AntdPreviewContext): React.ReactElement | null {
  const {
    type,
    node,
    mergeStyle,
    renderChildren,
    renderChildList,
    emitInteractionLifecycle,
    syncNodeValue,
    navigatePreviewByHref,
    onLifecycle,
    drawerInnerVisible,
    syncDrawerVisible,
    modalOpen,
    syncModalVisible,
    getPortalContainer,
  } = ctx;

  switch (type) {
    case 'antd.Divider': {
      const text = getStringProp(node, 'content')?.trim();
      return (
        <Divider
          dashed={getBooleanProp(node, 'dashed') === true}
          orientation={dividerOrientationFromAlign(getStringProp(node, 'align')) as React.ComponentProps<typeof Divider>['orientation']}
          style={mergeStyle()}
        >
          {text || undefined}
        </Divider>
      );
    }
    case 'antd.Typography.Title': {
      const lv = antTitleLevelFromTdesign(getStringProp(node, 'level'));
      return <Title level={lv} style={mergeStyle()}>{getStringProp(node, 'content') || '标题'}</Title>;
    }
    case 'antd.Typography.Paragraph':
      return <Paragraph style={mergeStyle()}>{getStringProp(node, 'content') || ''}</Paragraph>;
    case 'antd.Typography.Text':
      return (
        <Text
          strong={getBooleanProp(node, 'strong') === true}
          type={tdesignTextThemeToAntdTypographyType(getStringProp(node, 'theme'))}
          style={mergeStyle()}
        >
          {getStringProp(node, 'content') || ''}
        </Text>
      );
    case 'antd.Typography.Link': {
      const href = getStringProp(node, 'href') || undefined;
      const prefixIcon = renderNamedIcon(getStringProp(node, 'prefixIconName'));
      const suffixIcon = renderNamedIcon(getStringProp(node, 'suffixIconName'));
      const linkText = getStringProp(node, 'content') || '链接';
      return (
        <Link
          href={href}
          target={getStringProp(node, 'target') as '_self' | '_blank' | undefined}
          style={mergeStyle()}
          disabled={getBooleanProp(node, 'disabled') === true}
          type={tdesignLinkThemeToAntdTypographyType(getStringProp(node, 'theme'))}
          onClick={(e) => {
            e.preventDefault();
            emitInteractionLifecycle('onClick');
            if (href) {
              navigatePreviewByHref(href);
            }
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            {prefixIcon}
            <span>{linkText}</span>
            {suffixIcon}
          </span>
        </Link>
      );
    }
    case 'antd.Tag':
      return (
        <Tag color={tdesignSemanticTokenToAntdTagColor(getStringProp(node, 'color'))} style={mergeStyle()}>
          {getStringProp(node, 'content') || '标签'}
        </Tag>
      );
    case 'antd.Badge':
      return (
        <Badge count={getFiniteNumberProp(node, 'count') ?? 0} dot={getBooleanProp(node, 'dot') === true} style={mergeStyle()}>
          <span>{getStringProp(node, 'content') || 'Badge'}</span>
        </Badge>
      );
    case 'antd.Empty':
      return <Empty description={getStringProp(node, 'description') || '暂无数据'} style={mergeStyle()} />;
    case 'antd.Icon':
      return (
        <span style={mergeStyle()}>
          {renderNamedIcon(getStringProp(node, 'iconName'), {
            size: getFiniteNumberProp(node, 'size') ?? 16,
            strokeWidth: getFiniteNumberProp(node, 'strokeWidth') ?? 2,
          })}
        </span>
      );
    case 'antd.Card': {
      const headerChildren = getSlotChildren(node, 'header');
      const bodyChildren = getSlotChildren(node, 'body');
      const hasHeaderSlotContent = headerChildren.length > 0;
      const titleNode = getStringProp(node, 'subtitle') ? (
        <span>
          <span>{getStringProp(node, 'title')}</span>
          <div style={{ fontSize: 12, opacity: 0.65 }}>{getStringProp(node, 'subtitle')}</div>
        </span>
      ) : (
        getStringProp(node, 'title')
      );
      return (
        <AntCard
          title={hasHeaderSlotContent ? renderChildList(headerChildren) : titleNode}
          bordered={getBooleanProp(node, 'bordered') !== false}
          size={getStringProp(node, 'size') === 'small' ? 'small' : 'default'}
          style={{
            ...(mergeStyle() ?? {}),
            boxShadow: getBooleanProp(node, 'shadow')
              ? '0 1px 2px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04)'
              : undefined,
          }}
          styles={{
            header: { borderBottom: getBooleanProp(node, 'headerBordered') ? undefined : 'none' },
            body: BUILDER_CARD_BODY_STYLE,
          }}
        >
          {renderChildList(bodyChildren)}
        </AntCard>
      );
    }
    case 'antd.Statistic': {
      const raw = getFiniteNumberProp(node, 'value') ?? 0;
      const dp = Math.max(0, Math.min(8, Math.round(getFiniteNumberProp(node, 'decimalPlaces') ?? 0)));
      const sep = getStringProp(node, 'separator') ?? ',';
      const trend = getStringProp(node, 'trend');
      const trendPlacement = getStringProp(node, 'trendPlacement') || 'left';
      const trendIcon =
        trend === 'increase' ? (
          <ArrowUpOutlined style={{ color: '#52c41a' }} />
        ) : trend === 'decrease' ? (
          <ArrowDownOutlined style={{ color: '#ff4d4f' }} />
        ) : null;
      const unit = getStringProp(node, 'unit') || '';
      const prefix =
        trendIcon && trendPlacement === 'left' ? <span style={{ marginRight: 8 }}>{trendIcon}</span> : undefined;
      const suffix =
        unit || (trendIcon && trendPlacement === 'right') ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            {unit ? <span>{unit}</span> : null}
            {trendIcon && trendPlacement === 'right' ? trendIcon : null}
          </span>
        ) : undefined;
      return (
        <AntStatistic
          title={getStringProp(node, 'title')}
          value={raw}
          precision={dp}
          groupSeparator={sep}
          prefix={prefix}
          suffix={suffix}
          loading={getBooleanProp(node, 'loading') === true}
          valueStyle={statisticColorStyle(getStringProp(node, 'color'))}
          style={antStatisticRootStyleMerge(mergeStyle())}
        />
      );
    }
    case 'antd.Button': {
      const mapped = mapTdesignButtonToAntd({
        theme: getStringProp(node, 'theme'),
        variant: getStringProp(node, 'variant'),
        shape: getStringProp(node, 'shape'),
        size: getStringProp(node, 'size'),
        danger: getBooleanProp(node, 'danger'),
        block: getBooleanProp(node, 'block'),
      });
      const prefixIcon = renderNamedIcon(getStringProp(node, 'prefixIconName'));
      const suffixIcon = renderNamedIcon(getStringProp(node, 'suffixIconName'));
      const label = getStringProp(node, 'content') || '按钮';
      const buttonChildren = suffixIcon ? (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span>{label}</span>
          {suffixIcon}
        </span>
      ) : (
        label
      );
      return (
        <Button
          color={mapped.color}
          variant={mapped.variant}
          size={mapped.size}
          block={mapped.block}
          shape={mapped.shape}
          style={mergeStyle()}
          icon={prefixIcon ? (prefixIcon as React.ReactNode) : undefined}
          onClick={() => emitInteractionLifecycle('onClick')}
        >
          {buttonChildren}
        </Button>
      );
    }
    case 'antd.Dropdown': {
      const items = parseJsonRecordArray(getStringProp(node, 'menuItems')).map((it, i) => ({
        key: String(it.key ?? i),
        label: String(it.label ?? it.key ?? i),
      })) as MenuProps['items'];
      const trigger = (getStringProp(node, 'trigger') as 'click' | 'hover') || 'hover';
      const dm = mapTdesignButtonToAntd({
        theme: 'default',
        variant: 'base',
        size: 'medium',
        shape: 'rect',
      });
      return (
        <span style={mergeStyle()}>
          <Dropdown menu={{ items }} trigger={[trigger]}>
            <Button color={dm.color} variant={dm.variant} size={dm.size} shape={dm.shape}>
              {getStringProp(node, 'content') || '菜单'}
            </Button>
          </Dropdown>
        </span>
      );
    }
    case 'antd.Input': {
      const controlled = getBooleanProp(node, 'controlled') !== false;
      const valueControlled = getStringProp(node, 'value') ?? '';
      const defaultUncontrolled = getStringProp(node, 'defaultValue') || undefined;
      const mapped = mapTdesignInputPropsToAntd({
        align: getStringProp(node, 'align'),
        size: getStringProp(node, 'size'),
        status: getStringProp(node, 'status'),
        clearable: getBooleanProp(node, 'clearable'),
        borderless: getBooleanProp(node, 'borderless'),
        disabled: getBooleanProp(node, 'disabled'),
        readOnly: getBooleanProp(node, 'readOnly') ?? getBooleanProp(node, 'readonly'),
        maxlength: getFiniteNumberProp(node, 'maxlength'),
        maxcharacter: getFiniteNumberProp(node, 'maxcharacter'),
        showLimitNumber: getBooleanProp(node, 'showLimitNumber'),
        autoWidth: getBooleanProp(node, 'autoWidth'),
        autofocus: getBooleanProp(node, 'autofocus'),
        name: getStringProp(node, 'name'),
        type: getStringProp(node, 'type'),
        tips: getStringProp(node, 'tips'),
      });
      const mergedStyle = { ...mergeStyle(), ...mapped.style };
      const inputEl = (
        <Input
          {...mapped.inputProps}
          value={controlled ? valueControlled : undefined}
          defaultValue={controlled ? undefined : defaultUncontrolled}
          placeholder={getStringProp(node, 'placeholder') || undefined}
          style={mergedStyle}
          onChange={(e) => {
            const v = e.target.value;
            if (!controlled) {
              syncNodeValue(v);
            }
            emitInteractionLifecycle('onChange', { value: v });
          }}
          onBlur={(e) => emitInteractionLifecycle('onBlur', { value: e.target.value })}
          onClear={() => emitInteractionLifecycle('onClear')}
          onPressEnter={(e) => emitInteractionLifecycle('onEnter', { value: (e.target as HTMLInputElement).value })}
        />
      );
      return mapped.tips ? (
        <Tooltip title={mapped.tips}>{inputEl}</Tooltip>
      ) : (
        inputEl
      );
    }
    case 'antd.Textarea': {
      const controlled = getBooleanProp(node, 'controlled') !== false;
      const valueControlled = getStringProp(node, 'value') ?? '';
      const defaultUncontrolled = getStringProp(node, 'defaultValue') || undefined;
      const autosize = parseDslAutosizeValue(getPropValue(node, 'autosize'));
      const mapped = mapTdesignTextareaPropsToAntd({
        status: getStringProp(node, 'status'),
        disabled: getBooleanProp(node, 'disabled'),
        readOnly: getBooleanProp(node, 'readOnly') ?? getBooleanProp(node, 'readonly'),
        maxlength: getFiniteNumberProp(node, 'maxlength'),
        maxcharacter: getFiniteNumberProp(node, 'maxcharacter'),
        count: getBooleanProp(node, 'count'),
        allowInputOverMax: getBooleanProp(node, 'allowInputOverMax'),
        autofocus: getBooleanProp(node, 'autofocus'),
        name: getStringProp(node, 'name'),
        className: getStringProp(node, 'className'),
        tips: getStringProp(node, 'tips'),
        rows: getFiniteNumberProp(node, 'rows'),
        autosize,
      });
      const mergedStyle = { ...mergeStyle(), ...mapped.style };
      const taEl = (
        <Input.TextArea
          {...mapped.textareaProps}
          value={controlled ? valueControlled : undefined}
          defaultValue={controlled ? undefined : defaultUncontrolled}
          placeholder={getStringProp(node, 'placeholder') || undefined}
          style={mergedStyle}
          onChange={(e) => {
            const v = e.target.value;
            if (!controlled) {
              syncNodeValue(v);
            }
            emitInteractionLifecycle('onChange', { value: v });
          }}
          onBlur={(e) => emitInteractionLifecycle('onBlur', { value: e.target.value })}
        />
      );
      return mapped.tips ? (
        <Tooltip title={mapped.tips}>{taEl}</Tooltip>
      ) : (
        taEl
      );
    }
    case 'antd.InputNumber': {
      const controlled = getBooleanProp(node, 'controlled') !== false;
      const mapped = mapTdesignInputNumberPropsToAntd({
        size: getStringProp(node, 'size'),
        status: getStringProp(node, 'status'),
        align: getStringProp(node, 'align'),
        theme: getStringProp(node, 'theme'),
        decimalPlaces: getFiniteNumberProp(node, 'decimalPlaces'),
      });
      const { styles: semanticStylesRaw, ...antdMapped } = mapped;
      const semanticStyles = semanticStylesRaw as { root?: React.CSSProperties; input?: React.CSSProperties } | undefined;
      const stylesMerged = {
        root: { ...(mergeStyle() ?? {}), ...(semanticStyles?.root ?? {}) },
        ...(semanticStyles?.input ? { input: semanticStyles.input } : {}),
      } as React.ComponentProps<typeof InputNumber>['styles'];
      const val = getInputNumberValueProp(node, 'value');
      const defVal = getInputNumberValueProp(node, 'defaultValue');
      const defValNormalized = defVal === null ? undefined : defVal;
      return (
        <InputNumber
          {...antdMapped}
          value={controlled ? val : undefined}
          defaultValue={controlled ? undefined : defValNormalized}
          min={getFiniteNumberProp(node, 'min')}
          max={getFiniteNumberProp(node, 'max')}
          step={getFiniteNumberProp(node, 'step')}
          placeholder={getStringProp(node, 'placeholder') || undefined}
          disabled={getBooleanProp(node, 'disabled') === true}
          readOnly={getBooleanProp(node, 'readOnly') === true}
          styles={stylesMerged}
          onChange={(next) => {
            if (!controlled) {
              syncNodeValue(next);
            }
            emitInteractionLifecycle('onChange', { value: next });
          }}
        />
      );
    }
    case 'antd.Select': {
      const controlled = getBooleanProp(node, 'controlled') !== false;
      const opts = parseJsonRecordArray(getStringProp(node, 'options')).map((o) => ({
        value: o.value as string | number,
        label: String(o.label ?? o.value ?? ''),
      }));
      const val = getStringProp(node, 'value');
      return (
        <Select
          options={opts}
          placeholder={getStringProp(node, 'placeholder') || undefined}
          style={{ minWidth: 120, ...mergeStyle() }}
          value={controlled ? val : undefined}
          defaultValue={controlled ? undefined : val}
          onChange={(next) => {
            syncNodeValue(next);
            emitInteractionLifecycle('onChange', { value: next });
          }}
        />
      );
    }
    case 'antd.Checkbox': {
      const controlled = getBooleanProp(node, 'controlled') !== false;
      const checked = getBooleanProp(node, 'checked') === true;
      return (
        <Checkbox
          checked={controlled ? checked : undefined}
          defaultChecked={controlled ? undefined : checked}
          style={mergeStyle()}
          onChange={(e) => {
            syncNodeValue(e.target.checked);
            emitInteractionLifecycle('onChange', { value: e.target.checked });
          }}
        >
          {getStringProp(node, 'content') || ''}
        </Checkbox>
      );
    }
    case 'antd.Radio.Group': {
      const controlled = getBooleanProp(node, 'controlled') !== false;
      const opts = parseJsonRecordArray(getStringProp(node, 'options')).map((o) => ({
        value: o.value as string | number,
        label: String(o.label ?? o.value ?? ''),
      }));
      const val = getStringProp(node, 'value');
      return (
        <Radio.Group
          options={opts}
          optionType={getStringProp(node, 'optionType') === 'button' ? 'button' : 'default'}
          value={controlled ? val : undefined}
          defaultValue={controlled ? undefined : val}
          style={mergeStyle()}
          onChange={(e) => {
            syncNodeValue(e.target.value);
            emitInteractionLifecycle('onChange', { value: e.target.value });
          }}
        />
      );
    }
    case 'antd.Switch': {
      const controlled = getBooleanProp(node, 'controlled') !== false;
      const checked = getBooleanProp(node, 'value') === true;
      const switchSize = getStringProp(node, 'size') === 'small' ? 'small' as const : undefined;
      return (
        <span style={mergeStyle()}>
          <Switch
            size={switchSize}
            checked={controlled ? checked : undefined}
            defaultChecked={controlled ? undefined : checked}
            onChange={(c) => {
              syncNodeValue(c);
              emitInteractionLifecycle('onChange', { value: c });
            }}
          />
        </span>
      );
    }
    case 'antd.DatePicker': {
      const controlled = getBooleanProp(node, 'controlled') !== false;
      const raw = getStringProp(node, 'value');
      const parsed: Dayjs | null = raw ? dayjs(raw) : null;
      return (
        <DatePicker
          placeholder={getStringProp(node, 'placeholder') || undefined}
          style={mergeStyle()}
          value={controlled ? parsed ?? null : undefined}
          defaultValue={controlled ? undefined : parsed ?? undefined}
          onChange={(_, dateString) => {
            syncNodeValue(dateString);
            emitInteractionLifecycle('onChange', { value: dateString });
          }}
        />
      );
    }
    case 'antd.Form':
      return (
        <Form layout={getStringProp(node, 'layout') as 'horizontal' | 'vertical' | 'inline' | undefined} style={mergeStyle()}>
          {renderChildren(node, onLifecycle)}
        </Form>
      );
    case 'antd.Form.Item':
      return (
        <Form.Item label={getStringProp(node, 'label') || undefined} name={getStringProp(node, 'name') || undefined} style={mergeStyle()}>
          {renderChildren(node, onLifecycle)}
        </Form.Item>
      );
    case 'antd.Modal':
      return (
        <Modal
          title={getStringProp(node, 'header') || undefined}
          open={modalOpen}
          okText={getStringProp(node, 'confirmBtn') || '确定'}
          cancelText={getStringProp(node, 'cancelBtn') || '取消'}
          getContainer={getPortalContainer}
          onOk={() => {
            emitInteractionLifecycle('onConfirm');
            syncModalVisible(false);
          }}
          onCancel={() => {
            emitInteractionLifecycle('onCancel');
            syncModalVisible(false);
          }}
          style={mergeStyle()}
        >
          {renderChildren(node, onLifecycle)}
        </Modal>
      );
    case 'antd.Drawer': {
      const placement = (getStringProp(node, 'placement') as 'top' | 'right' | 'bottom' | 'left') || 'right';
      const drawerPx = drawerWidthPxFromTdesignSize({
        width: getFiniteNumberProp(node, 'width'),
        size: getStringProp(node, 'size'),
      });
      const showHeader = getBooleanProp(node, 'showHeader') !== false;
      const hasDrawerChildren = (node.children?.length ?? 0) > 0;
      const drawerBodyText = getStringProp(node, 'body')?.trim();
      const z = getFiniteNumberProp(node, 'zIndex');
      return (
        <Drawer
          title={showHeader ? (getStringProp(node, 'header') || undefined) : undefined}
          closable={getBooleanProp(node, 'closeBtn') !== false}
          open={drawerInnerVisible}
          placement={placement}
          getContainer={getPortalContainer}
          width={placement === 'left' || placement === 'right' ? drawerPx : undefined}
          height={placement === 'top' || placement === 'bottom' ? drawerPx : undefined}
          destroyOnHidden={getBooleanProp(node, 'destroyOnClose') === true}
          mask={getBooleanProp(node, 'showOverlay') !== false}
          maskClosable={getBooleanProp(node, 'closeOnOverlayClick') !== false}
          zIndex={typeof z === 'number' ? z : undefined}
          rootStyle={mergeStyle()}
          styles={{ body: { padding: 12 } }}
          footer={
            getBooleanProp(node, 'footer') === false ? null : (
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <Button
                  onClick={() => {
                    syncDrawerVisible(false);
                    emitInteractionLifecycle('onCancel');
                  }}
                >
                  {getStringProp(node, 'cancelBtn') || '取消'}
                </Button>
                <Button
                  type="primary"
                  onClick={() => {
                    emitInteractionLifecycle('onConfirm');
                    syncDrawerVisible(false);
                  }}
                >
                  {getStringProp(node, 'confirmBtn') || '确定'}
                </Button>
              </div>
            )
          }
          onClose={() => {
            syncDrawerVisible(false);
            emitInteractionLifecycle('onClose');
          }}
        >
          {!hasDrawerChildren && drawerBodyText ? <div style={{ marginBottom: 8 }}>{drawerBodyText}</div> : null}
          {renderChildren(node, onLifecycle)}
        </Drawer>
      );
    }
    case 'antd.Spin':
      return (
        <Spin spinning={getBooleanProp(node, 'spinning') !== false} tip={getStringProp(node, 'tip') || undefined} style={mergeStyle()}>
          <div style={{ minHeight: 32 }} />
        </Spin>
      );
    case 'antd.Alert':
      return (
        <Alert
          message={getStringProp(node, 'message') || ''}
          type={getStringProp(node, 'type') as 'success' | 'info' | 'warning' | 'error' | undefined}
          showIcon={getBooleanProp(node, 'showIcon') === true}
          style={mergeStyle()}
        />
      );
    case 'antd.Breadcrumb': {
      const items = parseJsonRecordArray(getStringProp(node, 'items')).map((it, i) => ({
        title: String(it.title ?? `项${i + 1}`),
        href: typeof it.href === 'string' ? it.href : undefined,
      }));
      return <Breadcrumb items={items} style={mergeStyle()} />;
    }
    case 'antd.Pagination':
      return (
        <Pagination
          total={getFiniteNumberProp(node, 'total') ?? 0}
          current={getFiniteNumberProp(node, 'current') ?? 1}
          pageSize={getFiniteNumberProp(node, 'pageSize') ?? 10}
          style={mergeStyle()}
          onChange={(page, pageSize) => emitInteractionLifecycle('onChange', { page, pageSize })}
        />
      );
    case 'antd.Row':
      return (
        <Row
          gutter={getFiniteNumberProp(node, 'gutter') ?? 0}
          justify={getStringProp(node, 'justify') as React.ComponentProps<typeof Row>['justify']}
          align={getStringProp(node, 'align') as React.ComponentProps<typeof Row>['align']}
          style={mergeStyle()}
        >
          {renderChildren(node, onLifecycle)}
        </Row>
      );
    case 'antd.Col':
      return (
        <Col span={getFiniteNumberProp(node, 'span') ?? 12} offset={getFiniteNumberProp(node, 'offset') ?? 0} style={mergeStyle()}>
          {renderChildren(node, onLifecycle)}
        </Col>
      );
    case 'antd.Layout':
      return <Layout style={mergeStyle()}>{renderChildren(node, onLifecycle)}</Layout>;
    case 'antd.Layout.Header':
      return <Header style={mergeStyle()}>{renderChildren(node, onLifecycle)}</Header>;
    case 'antd.Layout.Content':
      return <Content style={mergeStyle()}>{renderChildren(node, onLifecycle)}</Content>;
    case 'antd.Layout.Footer':
      return <Footer style={mergeStyle()}>{renderChildren(node, onLifecycle)}</Footer>;
    case 'antd.Layout.Sider':
      return (
        <Sider width={getFiniteNumberProp(node, 'width') ?? 200} style={mergeStyle()}>
          {renderChildren(node, onLifecycle)}
        </Sider>
      );
    case 'antd.Space': {
      const rawSize = getPropValue(node, 'size');
      return (
        <Space
          direction={getStringProp(node, 'direction') === 'vertical' ? 'vertical' : 'horizontal'}
          size={antdSpaceSizeFromTdesign(rawSize)}
          style={mergeStyle()}
        >
          {renderChildren(node, onLifecycle)}
        </Space>
      );
    }
    case 'antd.Table': {
      const columns = tdesignTableColumnsToAntd(getPropValue(node, 'columns'));
      const dataSource = resolveAntdTableDataSource(getPropValue(node, 'dataSource'));
      const rowKey = getStringProp(node, 'rowKey') || 'id';
      const sizeMap: Record<string, 'small' | 'middle' | 'large'> = {
        small: 'small',
        medium: 'middle',
        large: 'large',
      };
      const sz = sizeMap[String(getStringProp(node, 'size') ?? 'medium')] ?? 'middle';
      const pageSize = Math.max(1, getFiniteNumberProp(node, 'pageSize') ?? 5);
      const paginationEnabled = getBooleanProp(node, 'paginationEnabled') !== false;
      return (
        <Table
          rowKey={rowKey}
          size={sz}
          columns={columns as never}
          dataSource={dataSource as never}
          bordered={getBooleanProp(node, 'bordered') === true}
          pagination={
            paginationEnabled
              ? { defaultCurrent: 1, defaultPageSize: pageSize, total: dataSource.length }
              : false
          }
          style={mergeStyle()}
        />
      );
    }
    case 'antd.BackTop': {
      const vh = getFiniteNumberProp(node, 'visibleHeight');
      return (
        <BackTop
          className="preview-back-top"
          visibilityHeight={vh !== undefined && Number.isFinite(vh) ? vh : 400}
          style={mergeStyle()}
          onClick={() => emitInteractionLifecycle('onClick')}
        />
      );
    }
    case 'antd.Progress': {
      const pct = Math.max(0, Math.min(100, getFiniteNumberProp(node, 'percentage') ?? 0));
      const statusRaw = getStringProp(node, 'status')?.trim();
      const status = !statusRaw || statusRaw === 'default' ? undefined : statusRaw;
      const props = antdProgressPropsFromDsl({
        theme: getStringProp(node, 'theme') || 'line',
        percentage: pct,
        status,
        color: parseProgressColorValue(getPropValue(node, 'color')),
        trackColor: getStringProp(node, 'trackColor')?.trim() || undefined,
        strokeWidth: getFiniteNumberProp(node, 'strokeWidth'),
        size: getStringProp(node, 'size') ?? getFiniteNumberProp(node, 'size'),
        label: parseProgressLabelValue(getBooleanProp(node, 'showLabel'), getStringProp(node, 'labelText')),
      });
      return <Progress {...props} style={mergeStyle()} />;
    }
    case 'antd.Image': {
      const src = getStringProp(node, 'src') || '';
      const merged = mergeStyle();
      return (
        <Image
          src={src}
          alt={getStringProp(node, 'alt') || ''}
          width={getFiniteNumberProp(node, 'width')}
          height={getFiniteNumberProp(node, 'height')}
          styles={antdImageStylesFromMergeStyle(merged)}
          preview={getBooleanProp(node, 'gallery') === true ? {} : false}
        />
      );
    }
    case 'antd.Avatar': {
      const src = getStringProp(node, 'src') || undefined;
      const shape = getStringProp(node, 'shape') === 'round' ? 'circle' : 'square';
      const sz = getStringProp(node, 'size');
      const size = sz === 'large' ? 'large' : sz === 'small' ? 'small' : 'default';
      return (
        <Avatar src={src} shape={shape} size={size} style={mergeStyle()}>
          {!src ? getStringProp(node, 'alt') || 'A' : null}
        </Avatar>
      );
    }
    case 'antd.ColorPicker': {
      const controlled = getBooleanProp(node, 'controlled') !== false;
      const raw = getStringProp(node, 'value') || getStringProp(node, 'defaultValue') || '#1677ff';
      return (
        <AntColorPicker
          value={controlled ? raw : undefined}
          defaultValue={controlled ? undefined : raw}
          disabled={getBooleanProp(node, 'disabled') === true}
          showText
          style={mergeStyle()}
          onChange={(_, hex) => {
            syncNodeValue(hex);
            emitInteractionLifecycle('onChange', { value: hex });
          }}
        />
      );
    }
    case 'antd.TimePicker': {
      const controlled = getBooleanProp(node, 'controlled') !== false;
      const fmt = getStringProp(node, 'format') || 'HH:mm:ss';
      const raw = getStringProp(node, 'value');
      const def = getStringProp(node, 'defaultValue');
      const parsed = raw ? dayjs(raw, fmt) : undefined;
      const parsedDef = def ? dayjs(def, fmt) : undefined;
      return (
        <AntTimePicker
          format={fmt}
          value={controlled ? parsed : undefined}
          defaultValue={controlled ? undefined : parsedDef}
          disabled={getBooleanProp(node, 'disabled') === true}
          placeholder={getStringProp(node, 'placeholder') || undefined}
          style={mergeStyle()}
          onChange={(d) => {
            const s = d ? d.format(fmt) : '';
            syncNodeValue(s);
            emitInteractionLifecycle('onChange', { value: s });
          }}
        />
      );
    }
    case 'antd.TimeRangePicker': {
      const controlled = getBooleanProp(node, 'controlled') !== false;
      const fmt = getStringProp(node, 'format') || 'HH:mm:ss';
      const raw = getProp(node, 'value');
      const def = getProp(node, 'defaultValue');
      const parsePair = (v: unknown): [Dayjs, Dayjs] | undefined => {
        if (!Array.isArray(v) || v.length < 2) {
          return undefined;
        }
        const a = dayjs(String(v[0]), fmt);
        const b = dayjs(String(v[1]), fmt);
        return a.isValid() && b.isValid() ? [a, b] : undefined;
      };
      const valPair = parsePair(raw);
      const defPair = parsePair(def);
      return (
        <RangePicker
          format={fmt}
          value={controlled ? valPair : undefined}
          defaultValue={controlled ? undefined : defPair}
          disabled={getBooleanProp(node, 'disabled') === true}
          style={mergeStyle()}
          onChange={(range) => {
            const out =
              range && range[0] && range[1] ? [range[0].format(fmt), range[1].format(fmt)] : [];
            syncNodeValue(out);
            emitInteractionLifecycle('onChange', { value: out });
          }}
        />
      );
    }
    case 'antd.Slider': {
      const controlled = getBooleanProp(node, 'controlled') !== false;
      const min = getFiniteNumberProp(node, 'min') ?? 0;
      const max = getFiniteNumberProp(node, 'max') ?? 100;
      const val = getFiniteNumberProp(node, 'value') ?? min;
      const defVal = getFiniteNumberProp(node, 'defaultValue') ?? min;
      const merged = mergeStyle();
      return (
        <Slider
          min={min}
          max={max}
          value={controlled ? val : undefined}
          defaultValue={controlled ? undefined : defVal}
          disabled={getBooleanProp(node, 'disabled') === true}
          style={{
            width: '100%',
            minWidth: 200,
            maxWidth: '100%',
            boxSizing: 'border-box',
            ...(merged ?? {}),
          }}
          onChange={(v) => {
            syncNodeValue(v);
            emitInteractionLifecycle('onChange', { value: v });
          }}
        />
      );
    }
    case 'antd.Upload':
      return (
        <AntUpload
          style={mergeStyle()}
          beforeUpload={() => false}
          showUploadList={false}
          onChange={(info) => emitInteractionLifecycle('onChange', { fileList: info.fileList })}
        >
          {renderChildList(node.children ?? [])}
        </AntUpload>
      );
    case 'antd.Popover': {
      const triggerChildren = getSlotChildren(node, 'trigger');
      const contentChildren = getSlotChildren(node, 'content');
      const trig = triggerChildren.length > 0 ? renderChildList(triggerChildren) : <span />;
      const content = contentChildren.length > 0 ? renderChildList(contentChildren) : null;
      const tr = getStringProp(node, 'trigger') === 'click' ? 'click' : 'hover';
      return (
        <Popover
          trigger={tr}
          content={content}
          getPopupContainer={() => getPortalContainer()}
          onOpenChange={(open) => emitInteractionLifecycle('onVisibleChange', { visible: open })}
        >
          <span style={mergeStyle()}>{trig}</span>
        </Popover>
      );
    }
    case 'antd.Calendar': {
      const raw = getStringProp(node, 'value');
      const parsed = raw ? dayjs(raw) : dayjs();
      return (
        <AntCalendar
          fullscreen={false}
          value={parsed}
          style={mergeStyle()}
          onSelect={(d) => {
            const s = d.format('YYYY-MM-DD');
            syncNodeValue(s);
            emitInteractionLifecycle('onCellClick', { date: s });
          }}
        />
      );
    }
    case 'antd.Tabs':
      return (
        <AntdTabsPreviewBridge
          node={node}
          mergeStyle={mergeStyle}
          renderChildList={renderChildList}
          emitInteractionLifecycle={emitInteractionLifecycle}
        />
      );
    case 'antd.Collapse':
      return (
        <AntdCollapsePreviewBridge
          node={node}
          mergeStyle={mergeStyle}
          renderChildList={renderChildList}
          emitInteractionLifecycle={emitInteractionLifecycle}
        />
      );
    case 'antd.Carousel': {
      const imageList = getSwiperImages(node);
      const height = getFiniteNumberProp(node, 'height') ?? 240;
      if (imageList.length === 0) {
        return null;
      }
      return (
        <Carousel autoplay style={mergeStyle()} dots>
          {imageList.map((imageItem, index) => (
            <div key={`${node.key}-antd-carousel-${index}`}>
              <div style={{ width: '100%', height }}>
                <Image
                  src={imageItem.src}
                  fallback={imageItem.fallback || undefined}
                  preview={false}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: imageItem.objectFit as React.CSSProperties['objectFit'],
                    objectPosition: imageItem.objectPosition,
                  }}
                />
              </div>
            </div>
          ))}
        </Carousel>
      );
    }
    case 'antd.Menu': {
      const collapsed = getBooleanProp(node, 'collapsed') === true;
      const widthRaw = getStringProp(node, 'width')?.trim();
      const widthResolved = widthRaw || 232;
      const selection = resolvePreviewAntdMenuSelectionProps(node);
      const selectionProps =
        selection.kind === 'controlled'
          ? { selectedKeys: selection.selectedKeys as string[] }
          : { defaultSelectedKeys: selection.defaultSelectedKeys };
      const openState = resolvePreviewAntdMenuOpenProps(node);
      const openProps =
        openState.kind === 'controlled'
          ? {
              openKeys: openState.openKeys,
              onOpenChange: () => {
                /* 受控展开：由 DSL 驱动 */
              },
            }
          : { defaultOpenKeys: openState.defaultOpenKeys };
      const menuRenderKey = [
        node.key,
        'antd-inline-menu',
        selection.kind,
        selection.kind === 'controlled' ? selection.selectedKeys?.join('\u0001') : selection.defaultSelectedKeys?.join('\u0001'),
        openState.kind,
        openState.kind === 'controlled' ? openState.openKeys?.join('\u0001') : openState.defaultOpenKeys?.join('\u0001'),
      ].join('|');
      return (
        <Menu
          key={menuRenderKey}
          mode="inline"
          theme={getStringProp(node, 'theme') === 'dark' ? 'dark' : 'light'}
          inlineCollapsed={collapsed}
          selectable
          {...selectionProps}
          {...openProps}
          style={{
            ...mergeStyle(),
            width: collapsed ? undefined : widthResolved,
            minWidth: collapsed ? 48 : undefined,
          }}
        >
          {renderAntdPreviewMenu(node.children, onLifecycle, emitInteractionLifecycle, navigatePreviewByHref)}
        </Menu>
      );
    }
    case 'antd.HeadMenu':
      {
      const selection = resolvePreviewAntdMenuSelectionProps(node);
      const selectionProps =
        selection.kind === 'controlled'
          ? { selectedKeys: selection.selectedKeys as string[] }
          : { defaultSelectedKeys: selection.defaultSelectedKeys };
      const openState = resolvePreviewAntdMenuOpenProps(node);
      const openProps =
        openState.kind === 'controlled'
          ? {
              openKeys: openState.openKeys,
              onOpenChange: () => {
                /* 受控展开：由 DSL 驱动 */
              },
            }
          : { defaultOpenKeys: openState.defaultOpenKeys };
      const menuRenderKey = [
        node.key,
        'antd-head-menu',
        selection.kind,
        selection.kind === 'controlled' ? selection.selectedKeys?.join('\u0001') : selection.defaultSelectedKeys?.join('\u0001'),
        openState.kind,
        openState.kind === 'controlled' ? openState.openKeys?.join('\u0001') : openState.defaultOpenKeys?.join('\u0001'),
      ].join('|');
      return (
        <Menu
          key={menuRenderKey}
          mode="horizontal"
          theme={getStringProp(node, 'theme') === 'dark' ? 'dark' : 'light'}
          selectable
          {...selectionProps}
          {...openProps}
          style={{ width: '100%', maxWidth: '100%', minWidth: 0, ...mergeStyle() }}
        >
          {renderAntdPreviewMenu(node.children, onLifecycle, emitInteractionLifecycle, navigatePreviewByHref)}
        </Menu>
      );
      }
    case 'antd.Steps': {
      const isControlled = getBooleanProp(node, 'controlled') !== false;
      const current = getStepsCurrentProp(node, 'current');
      const defaultCurrent = getStepsCurrentProp(node, 'defaultCurrent');
      const rows = collectDslStepRows(node.children);
      const items = rows.map((row) => ({
        title: row.title,
        description: row.content,
        status: dslStepStatusToAntd(row.status),
      }));
      const rawIndex = isControlled ? (current ?? 0) : (defaultCurrent ?? 0);
      const currentNum = typeof rawIndex === 'number' ? rawIndex : Number(rawIndex);
      const safeCurrent = Number.isFinite(currentNum) ? Math.max(0, Math.floor(currentNum)) : 0;
      const layout = getStringProp(node, 'layout') as 'horizontal' | 'vertical' | undefined;
      const theme = getStringProp(node, 'theme');
      const fallbackMinHeight = layout === 'vertical' ? 160 : 88;
      return (
        <AntSteps
          current={safeCurrent}
          orientation={layout === 'vertical' ? 'vertical' : 'horizontal'}
          type={theme === 'dot' ? 'dot' : undefined}
          responsive={false}
          items={items}
          onChange={(next) => {
            emitInteractionLifecycle('onChange', {
              current: next,
              previous: safeCurrent,
            });
          }}
          style={mergeStyle({ minHeight: fallbackMinHeight })}
        />
      );
    }
    default:
      return <Empty description={`未实现的 Ant Design 节点：${type}`} style={mergeStyle()} />;
  }
}

function renderAntdPreviewMenu(
  nodes: UiTreeNode[] | undefined,
  onLifecycle: ComponentLifecycleHandler | undefined,
  emitInteractionLifecycle: (lifetime: string, payload?: unknown) => void,
  navigatePreviewByHref: (href: string) => void,
): React.ReactNode {
  return (nodes ?? []).map((child) => {
    const childType = typeof child.type === 'string' ? child.type.trim() : child.type;
    const getChildProp = (propName: string) => {
      const prop = child.props?.[propName] as { value?: unknown } | undefined;
      return prop?.value;
    };
    const getChildString = (propName: string) => {
      const v = getChildProp(propName);
      return typeof v === 'string' ? v : undefined;
    };
    const getChildBool = (propName: string) => {
      const v = getChildProp(propName);
      return typeof v === 'boolean' ? v : undefined;
    };
    if (getChildBool('visible') === false) {
      return null;
    }
    if (isMenuSubmenuNodeType(childType)) {
      const submenuKey = stringifyMenuDslKey(resolveMenuSubmenuDslValue(child));
      const submenuIcon = renderNamedIcon(getChildString('iconName'));
      const submenuTitleText = getChildString('title') || '子菜单';
      const submenuTitle =
        submenuIcon ? (
          <Space size={8}>
            {submenuIcon}
            <span>{submenuTitleText}</span>
          </Space>
        ) : (
          submenuTitleText
        );
      return (
        <Menu.SubMenu
          key={submenuKey}
          title={submenuTitle}
          disabled={getChildBool('disabled') === true}
        >
          {renderAntdPreviewMenu(child.children, onLifecycle, emitInteractionLifecycle, navigatePreviewByHref)}
        </Menu.SubMenu>
      );
    }
    if (isMenuItemNodeType(childType)) {
      const href = getChildString('href') || undefined;
      const itemKey = stringifyMenuDslKey(resolveMenuItemDslValue(child));
      const itemIcon = renderNamedIcon(getChildString('iconName'));
      return (
        <Menu.Item
          key={itemKey}
          icon={itemIcon ? (itemIcon as React.ReactNode) : undefined}
          disabled={getChildBool('disabled') === true}
          onClick={() => {
            emitInteractionLifecycle('onClick', { nodeType: child.type });
            if (href) {
              navigatePreviewByHref(href);
            }
          }}
        >
          {getChildString('content') || getChildString('title') || '菜单项'}
        </Menu.Item>
      );
    }
    return null;
  });
}
