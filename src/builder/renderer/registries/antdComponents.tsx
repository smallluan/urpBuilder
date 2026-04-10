import React from 'react';
import { antdProgressPropsFromDsl } from '../../utils/progressAntdBridge';
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
  Tabs as AntTabs,
  Typography,
  TimePicker as AntTimePicker,
  Upload,
  Collapse as AntCollapse,
} from 'antd';
import { ArrowDownOutlined, ArrowUpOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  getCollapseHeaderSlotKey,
  getCollapseHeaderSlotNodeByValue,
  getCollapsePanelSlotKey,
  getCollapsePanelSlotNodeByValue,
  normalizeCollapseList,
  normalizeCollapseValue,
} from '../../utils/collapse';
import { getTabsPanelSlotKey, getTabsSlotNodeByValue } from '../../utils/tabs';
import type { MenuProps } from 'antd';
import { collectDslStepRows, dslStepStatusToAntd } from '../../utils/stepsDsl';
import type { UiDropDataHandler, UiTreeNode } from '../../store/types';
import {
  isMenuItemNodeType,
  isMenuSubmenuNodeType,
  resolveMenuItemDslValue,
  resolveMenuSubmenuDslValue,
  stringifyMenuDslKey,
} from '../../utils/menuDslKeys';
import { getNodeSlotKey, isSlotNode } from '../../utils/slot';
import type { ComponentRegistry } from '../componentContext';
import { ActivateWrapper } from '../componentHelpers';
import DropArea from '../../../components/DropArea';
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
} from '../../../utils/antdTdesignPropBridge';

const { Title, Paragraph, Text, Link } = Typography;
const { Header, Content, Footer, Sider } = Layout;
const { RangePicker } = AntTimePicker;
const { Panel: AntCollapsePanel } = AntCollapse;

type AntdCardDropShellProps = {
  children?: React.ReactNode;
  title: React.ReactNode;
  bordered: boolean;
  size: 'default' | 'small';
  styles?: React.ComponentProps<typeof AntCard>['styles'];
  cardStyle?: React.CSSProperties;
  onActivate: (e: React.MouseEvent<HTMLElement>) => void;
  nodeKey?: string;
  active: boolean;
};

function AntdCardDropShell(props: AntdCardDropShellProps) {
  const { children, title, bordered, size, styles, cardStyle, onActivate, nodeKey, active } = props;
  return (
    <ActivateWrapper style={cardStyle} onActivate={onActivate} nodeKey={nodeKey} active={active}>
      <AntCard bordered={bordered} size={size} title={title} styles={styles}>
        {children}
      </AntCard>
    </ActivateWrapper>
  );
}

function parseJsonArray<T>(raw: string | undefined, fallback: T[]): T[] {
  if (!raw || !String(raw).trim()) {
    return fallback;
  }
  try {
    const v = JSON.parse(String(raw)) as unknown;
    return Array.isArray(v) ? (v as T[]) : fallback;
  } catch {
    return fallback;
  }
}

function parseJsonRecordArray(raw: string | undefined): Array<Record<string, unknown>> {
  const parsed = parseJsonArray<Record<string, unknown>>(raw, []);
  return parsed.filter((x) => x && typeof x === 'object');
}

/**
 * TDesign：同时传 value 与 defaultValue；未配置「激活项」时由 defaultValue 走非受控，可在画布点击切换。
 * antd：必须二选一 —— 配置了「激活项」(value) 时用受控 selectedKeys；仅「默认激活」时用 defaultSelectedKeys（非受控），否则点击无法切换。
 */
function resolveAntdMenuSelectionProps(getMenuValueProp: (name: string) => string | number | undefined): {
  kind: 'controlled' | 'default';
  selectedKeys?: string[];
  defaultSelectedKeys?: string[];
} {
  const value = getMenuValueProp('value');
  const defaultValue = getMenuValueProp('defaultValue');
  if (value !== undefined && value !== null) {
    return { kind: 'controlled', selectedKeys: [String(value)] };
  }
  if (defaultValue !== undefined && defaultValue !== null) {
    return { kind: 'default', defaultSelectedKeys: [String(defaultValue)] };
  }
  return { kind: 'default', defaultSelectedKeys: undefined };
}

/** expanded 优先，否则 defaultExpanded；与 getMenuValueArrayProp 语义一致 */
function buildAntdMenuOpenKeys(getMenuValueArrayProp: (name: string) => Array<string | number> | undefined): string[] {
  return (getMenuValueArrayProp('expanded') ?? getMenuValueArrayProp('defaultExpanded') ?? []).map(String);
}

/** 按 DSL 标识找到菜单项节点 key（用于搭建态选中树节点），与 props.value / 节点 key 规则一致 */
function findMenuItemNodeKeyByDslKey(nodes: UiTreeNode[] | undefined, dslKey: string): string | undefined {
  for (const n of nodes ?? []) {
    if (isMenuItemNodeType(n.type)) {
      if (stringifyMenuDslKey(resolveMenuItemDslValue(n)) === dslKey) {
        return n.key;
      }
    }
    if (isMenuSubmenuNodeType(n.type)) {
      const inner = findMenuItemNodeKeyByDslKey(n.children, dslKey);
      if (inner) {
        return inner;
      }
    }
  }
  return undefined;
}

function renderAntdMenuChildren(
  nodes: UiTreeNode[] | undefined,
  setActiveKey: (key: string) => void,
  onDropData: UiDropDataHandler | undefined,
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
    if (childType === 'antd.Menu.SubMenu' || childType === 'Menu.Submenu') {
      const subKids = child.children ?? [];
      const subKey = stringifyMenuDslKey(resolveMenuSubmenuDslValue(child));
      return (
        <Menu.SubMenu
          key={subKey}
          title={getChildString('title') || '子菜单'}
          disabled={getChildBool('disabled') === true}
        >
          {subKids.length === 0 ? (
            <DropArea data={child} onDropData={onDropData} emptyText="拖入子菜单项" />
          ) : (
            renderAntdMenuChildren(subKids, setActiveKey, onDropData)
          )}
        </Menu.SubMenu>
      );
    }
    if (childType === 'antd.Menu.Item' || childType === 'Menu.Item') {
      const itemKey = stringifyMenuDslKey(resolveMenuItemDslValue(child));
      return (
        <Menu.Item
          key={itemKey}
          disabled={getChildBool('disabled') === true}
          onClick={({ domEvent }) => {
            domEvent.stopPropagation();
            setActiveKey(child.key);
          }}
        >
          {getChildString('content') || getChildString('title') || '菜单项'}
        </Menu.Item>
      );
    }
    return null;
  });
}

export function registerAntdComponents(registry: ComponentRegistry): void {
  registry.set('antd.Divider', (ctx) => {
    const { getStringProp, getBooleanProp, mergeStyle, handleActivateSelf, data, isNodeActive } = ctx;
    const text = getStringProp('content')?.trim();
    return (
      <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf} nodeKey={data?.key} active={isNodeActive}>
        <Divider
          dashed={getBooleanProp('dashed') === true}
          orientation={dividerOrientationFromAlign(getStringProp('align')) as React.ComponentProps<typeof Divider>['orientation']}
        >
          {text || undefined}
        </Divider>
      </ActivateWrapper>
    );
  });

  registry.set('antd.Typography.Title', (ctx) => {
    const { getStringProp, mergeStyle, handleActivateSelf, data, isNodeActive } = ctx;
    const lv = antTitleLevelFromTdesign(getStringProp('level'));
    return (
      <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf} nodeKey={data?.key} active={isNodeActive}>
        <Title level={lv}>{getStringProp('content') || '标题'}</Title>
      </ActivateWrapper>
    );
  });

  registry.set('antd.Typography.Paragraph', (ctx) => {
    const { getStringProp, mergeStyle, handleActivateSelf, data, isNodeActive } = ctx;
    return (
      <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf} nodeKey={data?.key} active={isNodeActive}>
        <Paragraph>{getStringProp('content') || ''}</Paragraph>
      </ActivateWrapper>
    );
  });

  registry.set('antd.Typography.Text', (ctx) => {
    const { getStringProp, getBooleanProp, mergeStyle, handleActivateSelf, data, isNodeActive } = ctx;
    return (
      <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf} nodeKey={data?.key} active={isNodeActive}>
        <Text strong={getBooleanProp('strong') === true}>{getStringProp('content') || ''}</Text>
      </ActivateWrapper>
    );
  });

  registry.set('antd.Typography.Link', (ctx) => {
    const { getStringProp, getBooleanProp, mergeStyle, handleActivateSelf, data, isNodeActive } = ctx;
    return (
      <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf} nodeKey={data?.key} active={isNodeActive}>
        <Link
          href={getStringProp('href') || undefined}
          target={getStringProp('target') as '_self' | '_blank' | undefined}
          disabled={getBooleanProp('disabled') === true}
        >
          {getStringProp('content') || '链接'}
        </Link>
      </ActivateWrapper>
    );
  });

  registry.set('antd.Tag', (ctx) => {
    const { getStringProp, mergeStyle, handleActivateSelf, data, isNodeActive } = ctx;
    const color = getStringProp('color')?.trim();
    return (
      <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf} nodeKey={data?.key} active={isNodeActive}>
        <Tag color={color || undefined}>{getStringProp('content') || '标签'}</Tag>
      </ActivateWrapper>
    );
  });

  registry.set('antd.Badge', (ctx) => {
    const { getStringProp, getBooleanProp, getFiniteNumberProp, mergeStyle, handleActivateSelf, data, isNodeActive } = ctx;
    return (
      <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf} nodeKey={data?.key} active={isNodeActive}>
        <Badge count={getFiniteNumberProp('count') ?? 0} dot={getBooleanProp('dot') === true}>
          <span>{getStringProp('content') || 'Badge'}</span>
        </Badge>
      </ActivateWrapper>
    );
  });

  registry.set('antd.Empty', (ctx) => {
    const { getStringProp, mergeStyle, handleActivateSelf, data, isNodeActive } = ctx;
    return (
      <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf} nodeKey={data?.key} active={isNodeActive}>
        <Empty description={getStringProp('description') || '暂无数据'} />
      </ActivateWrapper>
    );
  });

  registry.set('antd.Button', (ctx) => {
    const { getStringProp, getBooleanProp, mergeStyle, handleActivateSelf, data, isNodeActive } = ctx;
    const mapped = mapTdesignButtonToAntd({
      theme: getStringProp('theme'),
      variant: getStringProp('variant'),
      shape: getStringProp('shape'),
      size: getStringProp('size'),
      danger: getBooleanProp('danger'),
      block: getBooleanProp('block'),
    });
    return (
      <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf} nodeKey={data?.key} active={isNodeActive}>
        <Button
          type={mapped.type}
          size={mapped.size}
          danger={mapped.danger}
          block={mapped.block}
          shape={mapped.shape}
          onClick={() => {}}
        >
          {getStringProp('content') || '按钮'}
        </Button>
      </ActivateWrapper>
    );
  });

  registry.set('antd.Icon', (ctx) => {
    const { getStringProp, getNumberProp, mergeStyle, handleActivateSelf, data, isNodeActive } = ctx;
    const iconNode = renderNamedIcon(getStringProp('iconName'), {
      size: getNumberProp('size') ?? 16,
      strokeWidth: getNumberProp('strokeWidth') ?? 2,
    });
    return (
      <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf} nodeKey={data?.key} active={isNodeActive}>
        {iconNode}
      </ActivateWrapper>
    );
  });

  registry.set('antd.Card', (ctx) => {
    const {
      data, onDropData, getStringProp, getBooleanProp, mergeStyle, handleActivateSelf, isNodeActive,
      cardHeaderSlotNode, cardBodySlotNode, hasCardSlotStructure,
    } = ctx;
    const bordered = getBooleanProp('bordered') !== false;
    const size = getStringProp('size') === 'small' ? 'small' : 'default';
    const shadow = getBooleanProp('shadow') === true;
    const headerBordered = getBooleanProp('headerBordered') === true;
    const title = getStringProp('title');
    const subtitle = getStringProp('subtitle');
    const titleNode = subtitle ? (
      <span>
        <span>{title}</span>
        <div style={{ fontSize: 12, opacity: 0.65, fontWeight: 'normal' }}>{subtitle}</div>
      </span>
    ) : (
      title
    );
    const cardShellStyle = mergeStyle({
      boxShadow: shadow ? '0 1px 2px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04)' : undefined,
    });
    const cardStyles: React.ComponentProps<typeof AntCard>['styles'] = {
      header: {
        borderBottom: headerBordered ? undefined : 'none',
      },
      body: BUILDER_CARD_BODY_STYLE,
    };

    if (!hasCardSlotStructure) {
      return (
        <DropArea data={data} onDropData={onDropData}>
          <AntdCardDropShell
            title={titleNode}
            bordered={bordered}
            size={size}
            styles={cardStyles}
            cardStyle={cardShellStyle}
            onActivate={handleActivateSelf}
            nodeKey={data?.key}
            active={isNodeActive}
          />
        </DropArea>
      );
    }

    const headerTitle = !cardHeaderSlotNode?.children?.length ? titleNode : null;
    const titleSlot = (
      <div>
        {headerTitle}
        <DropArea
          data={cardHeaderSlotNode!}
          onDropData={onDropData}
          dropSlotKey="header"
          selectable={false}
          compactWhenFilled
          emptyText="拖拽组件到卡片头部"
        />
      </div>
    );

    return (
      <AntdCardDropShell
        title={titleSlot}
        bordered={bordered}
        size={size}
        styles={cardStyles}
        cardStyle={cardShellStyle}
        onActivate={handleActivateSelf}
        nodeKey={data?.key}
        active={isNodeActive}
      >
        <DropArea
          data={cardBodySlotNode!}
          onDropData={onDropData}
          dropSlotKey="body"
          selectable={false}
          compactWhenFilled
          emptyText="拖拽组件到卡片内容"
        />
      </AntdCardDropShell>
    );
  });

  registry.set('antd.Statistic', (ctx) => {
    const { getStringProp, getBooleanProp, getFiniteNumberProp, mergeStyle, handleActivateSelf, data, isNodeActive } = ctx;
    const raw = getFiniteNumberProp('value') ?? 0;
    const dp = Math.max(0, Math.min(8, Math.round(getFiniteNumberProp('decimalPlaces') ?? 0)));
    const sep = getStringProp('separator') ?? ',';
    const trend = getStringProp('trend');
    const trendPlacement = getStringProp('trendPlacement') || 'left';
    const trendIcon =
      trend === 'increase' ? (
        <ArrowUpOutlined style={{ color: '#52c41a' }} />
      ) : trend === 'decrease' ? (
        <ArrowDownOutlined style={{ color: '#ff4d4f' }} />
      ) : null;
    const unit = getStringProp('unit') || '';
    const prefix =
      trendIcon && trendPlacement === 'left' ? <span style={{ marginRight: 8 }}>{trendIcon}</span> : undefined;
    const suffix = (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        {unit ? <span>{unit}</span> : null}
        {trendIcon && trendPlacement === 'right' ? trendIcon : null}
      </span>
    );

    return (
      <ActivateWrapper
        style={antStatisticRootStyleMerge(mergeStyle())}
        onActivate={handleActivateSelf}
        nodeKey={data?.key}
        active={isNodeActive}
      >
        <AntStatistic
          title={getStringProp('title')}
          value={raw}
          precision={dp}
          groupSeparator={sep}
          prefix={prefix}
          suffix={suffix}
          loading={getBooleanProp('loading') === true}
          valueStyle={statisticColorStyle(getStringProp('color'))}
        />
      </ActivateWrapper>
    );
  });

  registry.set('antd.Dropdown', (ctx) => {
    const { getStringProp, mergeStyle, handleActivateSelf, data, isNodeActive } = ctx;
    const items = parseJsonRecordArray(getStringProp('menuItems')).map((it, i) => ({
      key: String(it.key ?? i),
      label: String(it.label ?? it.key ?? i),
    })) as MenuProps['items'];
    return (
      <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf} nodeKey={data?.key} active={isNodeActive}>
        <Dropdown menu={{ items }} trigger={[(getStringProp('trigger') as 'click' | 'hover') || 'hover']}>
          <Button>{getStringProp('content') || '菜单'}</Button>
        </Dropdown>
      </ActivateWrapper>
    );
  });

  registry.set('antd.Input', (ctx) => {
    const { getStringProp, mergeStyle, handleActivateSelf, data, isNodeActive } = ctx;
    return (
      <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf} nodeKey={data?.key} active={isNodeActive}>
        <Input placeholder={getStringProp('placeholder') || undefined} defaultValue={getStringProp('value') || undefined} readOnly />
      </ActivateWrapper>
    );
  });

  registry.set('antd.Textarea', (ctx) => {
    const { getStringProp, getFiniteNumberProp, mergeStyle, handleActivateSelf, data, isNodeActive } = ctx;
    return (
      <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf} nodeKey={data?.key} active={isNodeActive}>
        <Input.TextArea rows={getFiniteNumberProp('rows') ?? 4} placeholder={getStringProp('placeholder') || undefined} defaultValue={getStringProp('value') || undefined} readOnly />
      </ActivateWrapper>
    );
  });

  registry.set('antd.InputNumber', (ctx) => {
    const { getFiniteNumberProp, mergeStyle, handleActivateSelf, data, isNodeActive } = ctx;
    return (
      <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf} nodeKey={data?.key} active={isNodeActive}>
        <InputNumber min={getFiniteNumberProp('min')} max={getFiniteNumberProp('max')} defaultValue={getFiniteNumberProp('value')} readOnly />
      </ActivateWrapper>
    );
  });

  registry.set('antd.Select', (ctx) => {
    const { getStringProp, mergeStyle, handleActivateSelf, data, isNodeActive } = ctx;
    const opts = parseJsonRecordArray(getStringProp('options')).map((o) => ({
      value: o.value as string | number,
      label: String(o.label ?? o.value ?? ''),
    }));
    return (
      <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf} nodeKey={data?.key} active={isNodeActive}>
        <Select options={opts} placeholder={getStringProp('placeholder') || undefined} style={{ minWidth: 120 }} defaultValue={getStringProp('value') || undefined} />
      </ActivateWrapper>
    );
  });

  registry.set('antd.Checkbox', (ctx) => {
    const { getStringProp, getBooleanProp, mergeStyle, handleActivateSelf, data, isNodeActive } = ctx;
    return (
      <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf} nodeKey={data?.key} active={isNodeActive}>
        <Checkbox checked={getBooleanProp('checked') === true}>{getStringProp('content') || ''}</Checkbox>
      </ActivateWrapper>
    );
  });

  registry.set('antd.Radio.Group', (ctx) => {
    const { getStringProp, mergeStyle, handleActivateSelf, data, isNodeActive } = ctx;
    const opts = parseJsonRecordArray(getStringProp('options')).map((o) => ({
      value: o.value as string | number,
      label: String(o.label ?? o.value ?? ''),
    }));
    return (
      <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf} nodeKey={data?.key} active={isNodeActive}>
        <Radio.Group
          options={opts}
          optionType={getStringProp('optionType') === 'button' ? 'button' : 'default'}
          defaultValue={getStringProp('value') || undefined}
        />
      </ActivateWrapper>
    );
  });

  registry.set('antd.Switch', (ctx) => {
    const { getBooleanProp, mergeStyle, handleActivateSelf, data, isNodeActive } = ctx;
    return (
      <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf} nodeKey={data?.key} active={isNodeActive}>
        <Switch checked={getBooleanProp('value') === true} />
      </ActivateWrapper>
    );
  });

  registry.set('antd.DatePicker', (ctx) => {
    const { getStringProp, mergeStyle, handleActivateSelf, data, isNodeActive } = ctx;
    return (
      <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf} nodeKey={data?.key} active={isNodeActive}>
        <DatePicker placeholder={getStringProp('placeholder') || undefined} />
      </ActivateWrapper>
    );
  });

  registry.set('antd.Form', (ctx) => {
    const { getStringProp, onDropData, data, mergeStyle } = ctx;
    return (
      <Form layout={getStringProp('layout') as 'horizontal' | 'vertical' | 'inline' | undefined} style={mergeStyle()}>
        <DropArea data={data} onDropData={onDropData} />
      </Form>
    );
  });

  registry.set('antd.Form.Item', (ctx) => {
    const { getStringProp, onDropData, data, mergeStyle } = ctx;
    return (
      <div style={mergeStyle()}>
        <div style={{ marginBottom: 4, fontSize: 14 }}>{getStringProp('label') || '表单项'}</div>
        <DropArea data={data} onDropData={onDropData} />
      </div>
    );
  });

  registry.set('antd.Modal', (ctx) => {
    const { getStringProp, onDropData, data, mergeStyle, getBuilderDrawerAttach } = ctx;
    const getContainer = () => getBuilderDrawerAttach()();
    return (
      <Modal
        title={getStringProp('header') || undefined}
        open={true}
        footer={null}
        styles={{ body: { padding: 12 } }}
        getContainer={getContainer}
      >
        <div style={mergeStyle({ minHeight: 80 })}>
          <DropArea data={data} onDropData={onDropData} />
        </div>
      </Modal>
    );
  });

  registry.set('antd.Drawer', (ctx) => {
    const {
      getStringProp,
      getBooleanProp,
      getFiniteNumberProp,
      getNumberProp,
      onDropData,
      data,
      mergeStyle,
      getBuilderDrawerAttach,
      handleActivateSelf,
      isSubtreeActive,
    } = ctx;
    const getContainer = () => getBuilderDrawerAttach()();
    const placement = (getStringProp('placement') as 'top' | 'right' | 'bottom' | 'left') || 'right';
    const drawerPx = drawerWidthPxFromTdesignSize({
      width: getFiniteNumberProp('width'),
      size: getStringProp('size'),
    });
    const shellOpen = getBooleanProp('visible') === true && isSubtreeActive;
    const showHeader = getBooleanProp('showHeader') !== false;
    const titleText = getStringProp('header')?.trim();
    const hasDrawerChildren = (data?.children?.length ?? 0) > 0;
    const drawerBodyText = getStringProp('body')?.trim();
    return (
      <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf} nodeKey={data?.key} active={isSubtreeActive}>
        <div style={{ position: 'relative' }}>
          <Drawer
            title={showHeader ? (titleText || undefined) : undefined}
            closable={getBooleanProp('closeBtn') !== false}
            open={shellOpen}
            placement={placement}
            getContainer={getContainer}
            width={placement === 'left' || placement === 'right' ? drawerPx : undefined}
            height={placement === 'top' || placement === 'bottom' ? drawerPx : undefined}
            destroyOnHidden={getBooleanProp('destroyOnClose') === true}
            mask={getBooleanProp('showOverlay') !== false}
            maskClosable={getBooleanProp('closeOnOverlayClick') !== false}
            footer={getBooleanProp('footer') === false ? null : undefined}
            zIndex={getNumberProp('zIndex')}
            styles={{ body: { padding: 12 } }}
            onClose={() => {
              /* 搭建态仅展示 */
            }}
          >
            {!hasDrawerChildren && drawerBodyText ? <div style={{ marginBottom: 8 }}>{drawerBodyText}</div> : null}
            <div style={mergeStyle({ minHeight: 80 })}>
              <DropArea data={data} onDropData={onDropData} emptyText="拖拽组件到抽屉内容" compactWhenFilled />
            </div>
          </Drawer>
        </div>
      </ActivateWrapper>
    );
  });

  registry.set('antd.Spin', (ctx) => {
    const { getStringProp, getBooleanProp, mergeStyle, handleActivateSelf, data, isNodeActive } = ctx;
    return (
      <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf} nodeKey={data?.key} active={isNodeActive}>
        <Spin spinning={getBooleanProp('spinning') !== false} tip={getStringProp('tip') || undefined}>
          <div style={{ minHeight: 32 }} />
        </Spin>
      </ActivateWrapper>
    );
  });

  registry.set('antd.Alert', (ctx) => {
    const { getStringProp, getBooleanProp, mergeStyle, handleActivateSelf, data, isNodeActive } = ctx;
    return (
      <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf} nodeKey={data?.key} active={isNodeActive}>
        <Alert
          message={getStringProp('message') || ''}
          type={getStringProp('type') as 'success' | 'info' | 'warning' | 'error' | undefined}
          showIcon={getBooleanProp('showIcon') === true}
        />
      </ActivateWrapper>
    );
  });

  registry.set('antd.Menu', (ctx) => {
    const {
      getStringProp,
      getBooleanProp,
      data,
      mergeStyle,
      setActiveNode,
      onDropData,
      getMenuWidthProp,
      getMenuValueProp,
      getMenuValueArrayProp,
    } = ctx;
    const kids = data?.children ?? [];
    const theme = getStringProp('theme') === 'dark' ? 'dark' : 'light';
    const collapsed = getBooleanProp('collapsed') === true;
    const w = getMenuWidthProp('width');
    const widthCss = Array.isArray(w) ? w[0] : w;
    const widthResolved = widthCss ?? 232;
    const openKeys = buildAntdMenuOpenKeys(getMenuValueArrayProp);
    const selection = resolveAntdMenuSelectionProps(getMenuValueProp);
    const selectionProps =
      selection.kind === 'controlled'
        ? { selectedKeys: selection.selectedKeys as string[] }
        : { defaultSelectedKeys: selection.defaultSelectedKeys };
    const menuSelectionKey = `${data?.key}-sel-${selection.kind}-${selection.kind === 'controlled' ? selection.selectedKeys?.join('\u0001') : selection.defaultSelectedKeys?.join('\u0001') ?? 'none'}`;
    if (kids.length === 0) {
      return (
        <div style={mergeStyle({ minWidth: collapsed ? 48 : widthResolved })}>
          <DropArea data={data} onDropData={onDropData} emptyText="拖入 antd.Menu.Item / SubMenu" />
        </div>
      );
    }
    return (
      <div style={mergeStyle()}>
        <Menu
          key={menuSelectionKey}
          mode="inline"
          theme={theme}
          inlineCollapsed={collapsed}
          selectable
          openKeys={openKeys}
          onOpenChange={() => {
            /* 搭建态仅展示，与 TDesign onExpand 空实现一致，不由点击改写展开 */
          }}
          {...selectionProps}
          onSelect={({ key }) => {
            const nk = findMenuItemNodeKeyByDslKey(kids, String(key));
            if (nk) {
              setActiveNode(nk);
            }
          }}
          style={{
            width: collapsed ? undefined : widthResolved,
            minWidth: collapsed ? 48 : undefined,
          }}
        >
          {renderAntdMenuChildren(kids, setActiveNode, onDropData)}
        </Menu>
      </div>
    );
  });

  registry.set('antd.HeadMenu', (ctx) => {
    const { getStringProp, data, mergeStyle, setActiveNode, onDropData, getMenuValueProp, getMenuValueArrayProp } = ctx;
    const kids = data?.children ?? [];
    const theme = getStringProp('theme') === 'dark' ? 'dark' : 'light';
    const openKeys = buildAntdMenuOpenKeys(getMenuValueArrayProp);
    const selection = resolveAntdMenuSelectionProps(getMenuValueProp);
    const selectionProps =
      selection.kind === 'controlled'
        ? { selectedKeys: selection.selectedKeys as string[] }
        : { defaultSelectedKeys: selection.defaultSelectedKeys };
    const menuSelectionKey = `${data?.key}-sel-${selection.kind}-${selection.kind === 'controlled' ? selection.selectedKeys?.join('\u0001') : selection.defaultSelectedKeys?.join('\u0001') ?? 'none'}`;
    if (kids.length === 0) {
      return (
        <div style={mergeStyle({ width: '100%' })}>
          <DropArea data={data} onDropData={onDropData} emptyText="拖入菜单项 / 子菜单" />
        </div>
      );
    }
    return (
      <div style={mergeStyle({ width: '100%', minWidth: 0 })}>
        <Menu
          key={menuSelectionKey}
          mode="horizontal"
          theme={theme}
          selectable
          openKeys={openKeys}
          onOpenChange={() => {
            /* 搭建态仅展示 */
          }}
          {...selectionProps}
          onSelect={({ key }) => {
            const nk = findMenuItemNodeKeyByDslKey(kids, String(key));
            if (nk) {
              setActiveNode(nk);
            }
          }}
          style={{ width: '100%', maxWidth: '100%', minWidth: 0, flex: '1 1 auto' }}
        >
          {renderAntdMenuChildren(kids, setActiveNode, onDropData)}
        </Menu>
      </div>
    );
  });

  registry.set('antd.Menu.Item', (ctx) => {
    const { getStringProp, mergeStyle, handleActivateSelf, data, isNodeActive } = ctx;
    return (
      <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf} nodeKey={data?.key} active={isNodeActive}>
        <Menu.Item>{getStringProp('content') || getStringProp('title') || '菜单项'}</Menu.Item>
      </ActivateWrapper>
    );
  });

  registry.set('antd.Menu.SubMenu', (ctx) => {
    const { getStringProp, onDropData, data, mergeStyle } = ctx;
    return (
      <Menu.SubMenu title={getStringProp('title') || '子菜单'} style={mergeStyle()}>
        <DropArea data={data} onDropData={onDropData} />
      </Menu.SubMenu>
    );
  });

  registry.set('antd.Steps', (ctx) => {
    const {
      data, onDropData, getStringProp, getBooleanProp, mergeStyle, handleActivateSelf, isNodeActive, getStepsCurrentProp,
    } = ctx;
    const isControlled = getBooleanProp('controlled') !== false;
    const current = getStepsCurrentProp('current');
    const defaultCurrent = getStepsCurrentProp('defaultCurrent');
    const rows = collectDslStepRows(data?.children);
    const items = rows.map((row) => ({
      title: row.title,
      description: row.content,
      status: dslStepStatusToAntd(row.status),
    }));
    const rawIndex = isControlled ? (current ?? 0) : (defaultCurrent ?? 0);
    const currentNum = typeof rawIndex === 'number' ? rawIndex : Number(rawIndex);
    const safeCurrent = Number.isFinite(currentNum) ? Math.max(0, Math.floor(currentNum)) : 0;
    const layout = getStringProp('layout') as 'horizontal' | 'vertical' | undefined;
    const theme = getStringProp('theme');
    const fallbackMinHeight = layout === 'vertical' ? 160 : 88;
    return (
      <DropArea data={data} onDropData={onDropData} emptyText="拖拽步骤项到步骤条" compactWhenFilled isTreeNode>
        <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf} nodeKey={data?.key} active={isNodeActive}>
          <AntSteps
            current={safeCurrent}
            orientation={layout === 'vertical' ? 'vertical' : 'horizontal'}
            type={theme === 'dot' ? 'dot' : undefined}
            responsive={false}
            items={items}
            onChange={() => {
              /* 搭建态仅展示 */
            }}
            style={mergeStyle({ minHeight: fallbackMinHeight })}
          />
        </ActivateWrapper>
      </DropArea>
    );
  });

  registry.set('antd.Steps.Item', () => null);

  registry.set('antd.Breadcrumb', (ctx) => {
    const { getStringProp, mergeStyle, handleActivateSelf, data, isNodeActive } = ctx;
    const items = parseJsonRecordArray(getStringProp('items')).map((it, i) => ({
      title: String(it.title ?? `项${i + 1}`),
      href: typeof it.href === 'string' ? it.href : undefined,
    }));
    return (
      <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf} nodeKey={data?.key} active={isNodeActive}>
        <Breadcrumb items={items} />
      </ActivateWrapper>
    );
  });

  registry.set('antd.Pagination', (ctx) => {
    const { getFiniteNumberProp, mergeStyle, handleActivateSelf, data, isNodeActive } = ctx;
    return (
      <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf} nodeKey={data?.key} active={isNodeActive}>
        <Pagination total={getFiniteNumberProp('total') ?? 0} current={getFiniteNumberProp('current') ?? 1} pageSize={getFiniteNumberProp('pageSize') ?? 10} />
      </ActivateWrapper>
    );
  });

  registry.set('antd.Row', (ctx) => {
    const { data, onDropData, getStringProp, getFiniteNumberProp, mergeStyle } = ctx;
    return (
      <DropArea style={mergeStyle({ width: '100%' })} data={data} onDropData={onDropData}>
        <Row
          gutter={getFiniteNumberProp('gutter') ?? 0}
          justify={getStringProp('justify') as React.ComponentProps<typeof Row>['justify']}
          align={getStringProp('align') as React.ComponentProps<typeof Row>['align']}
        />
      </DropArea>
    );
  });

  registry.set('antd.Col', (ctx) => {
    const { data, onDropData, getFiniteNumberProp, mergeStyle } = ctx;
    return (
      <Col span={getFiniteNumberProp('span') ?? 12} offset={getFiniteNumberProp('offset') ?? 0} style={mergeStyle()}>
        <DropArea data={data} onDropData={onDropData} />
      </Col>
    );
  });

  registry.set('antd.Layout', (ctx) => {
    const { data, onDropData, mergeStyle } = ctx;
    return (
      <DropArea data={data} onDropData={onDropData}>
        <Layout style={mergeStyle()} />
      </DropArea>
    );
  });

  registry.set('antd.Layout.Header', (ctx) => {
    const { data, onDropData, mergeStyle } = ctx;
    return (
      <DropArea data={data} onDropData={onDropData}>
        <Header style={mergeStyle()} />
      </DropArea>
    );
  });

  registry.set('antd.Layout.Content', (ctx) => {
    const { data, onDropData, mergeStyle } = ctx;
    return (
      <DropArea data={data} onDropData={onDropData}>
        <Content style={mergeStyle()} />
      </DropArea>
    );
  });

  registry.set('antd.Layout.Footer', (ctx) => {
    const { data, onDropData, mergeStyle } = ctx;
    return (
      <DropArea data={data} onDropData={onDropData}>
        <Footer style={mergeStyle()} />
      </DropArea>
    );
  });

  registry.set('antd.Layout.Sider', (ctx) => {
    const { data, onDropData, getFiniteNumberProp, mergeStyle } = ctx;
    const w = getFiniteNumberProp('width');
    return (
      <Sider width={w !== undefined && Number.isFinite(w) ? w : 200} style={mergeStyle()}>
        <DropArea data={data} onDropData={onDropData} />
      </Sider>
    );
  });

  registry.set('antd.Space', (ctx) => {
    const { data, onDropData, getProp, getStringProp, mergeStyle } = ctx;
    const rawSize = getProp('size');
    return (
      <DropArea data={data} onDropData={onDropData}>
        <Space
          direction={getStringProp('direction') === 'vertical' ? 'vertical' : 'horizontal'}
          size={antdSpaceSizeFromTdesign(rawSize)}
          style={mergeStyle()}
        />
      </DropArea>
    );
  });

  registry.set('antd.Table', (ctx) => {
    const { getProp, getStringProp, getBooleanProp, getFiniteNumberProp, mergeStyle, handleActivateSelf, data, isNodeActive } = ctx;
    const columns = tdesignTableColumnsToAntd(getProp('columns'));
    const dataSource = resolveAntdTableDataSource(getProp('dataSource'));
    const rowKey = getStringProp('rowKey') || 'id';
    const sizeMap: Record<string, 'small' | 'middle' | 'large'> = {
      small: 'small',
      medium: 'middle',
      large: 'large',
    };
    const sz = sizeMap[String(getStringProp('size') ?? 'medium')] ?? 'middle';
    const pageSize = Math.max(1, getFiniteNumberProp('pageSize') ?? 5);
    const paginationEnabled = getBooleanProp('paginationEnabled') !== false;
    return (
      <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf} nodeKey={data?.key} active={isNodeActive}>
        <Table
          size={sz}
          rowKey={rowKey}
          columns={columns as never}
          dataSource={dataSource as never}
          bordered={getBooleanProp('bordered') === true}
          pagination={
            paginationEnabled
              ? { defaultCurrent: 1, defaultPageSize: pageSize, total: dataSource.length }
              : false
          }
        />
      </ActivateWrapper>
    );
  });

  registry.set('antd.BackTop', (ctx) => {
    const {
      mergeStyle, handleActivateSelf, data, isNodeActive,
      getBackTopVisibleHeightProp, getBackTopContentNode,
    } = ctx;
    const vhRaw = getBackTopVisibleHeightProp('visibleHeight');
    const vh = typeof vhRaw === 'number' ? vhRaw : typeof vhRaw === 'string' ? Number(vhRaw) : 400;
    return (
      <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf} nodeKey={data?.key} active={isNodeActive}>
        <BackTop visibilityHeight={Number.isFinite(vh) ? vh : 400} style={mergeStyle()}>
          {getBackTopContentNode()}
        </BackTop>
      </ActivateWrapper>
    );
  });

  registry.set('antd.Progress', (ctx) => {
    const {
      getFiniteNumberProp, getStringProp, mergeStyle, handleActivateSelf, data, isNodeActive,
      getProgressStatusProp, getProgressColorProp, getProgressLabelProp, getProgressSizeProp,
    } = ctx;
    const pct = Math.max(0, Math.min(100, getFiniteNumberProp('percentage') ?? 0));
    const props = antdProgressPropsFromDsl({
      theme: getStringProp('theme') || 'line',
      percentage: pct,
      status: getProgressStatusProp(),
      color: getProgressColorProp('color'),
      trackColor: getStringProp('trackColor')?.trim() || undefined,
      strokeWidth: getFiniteNumberProp('strokeWidth'),
      size: getStringProp('size') ?? getProgressSizeProp('size'),
      label: getProgressLabelProp(),
    });
    return (
      <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf} nodeKey={data?.key} active={isNodeActive}>
        <Progress {...props} style={mergeStyle()} />
      </ActivateWrapper>
    );
  });

  registry.set('antd.Image', (ctx) => {
    const { getStringProp, getFiniteNumberProp, getBooleanProp, mergeStyle, handleActivateSelf, data, isNodeActive } = ctx;
    const merged = mergeStyle();
    return (
      <ActivateWrapper style={undefined} onActivate={handleActivateSelf} nodeKey={data?.key} active={isNodeActive}>
        <Image
          src={getStringProp('src') || ''}
          alt={getStringProp('alt') || ''}
          width={getFiniteNumberProp('width')}
          height={getFiniteNumberProp('height')}
          preview={getBooleanProp('gallery') === true ? {} : false}
          styles={antdImageStylesFromMergeStyle(merged)}
        />
      </ActivateWrapper>
    );
  });

  registry.set('antd.Avatar', (ctx) => {
    const { getStringProp, mergeStyle, handleActivateSelf, data, isNodeActive } = ctx;
    const src = getStringProp('src');
    const shape = getStringProp('shape') === 'round' ? 'circle' : 'square';
    const sz = getStringProp('size');
    const size = sz === 'large' ? 'large' : sz === 'small' ? 'small' : 'default';
    return (
      <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf} nodeKey={data?.key} active={isNodeActive}>
        <Avatar src={src || undefined} shape={shape} size={size}>
          {!src ? getStringProp('alt') || 'A' : null}
        </Avatar>
      </ActivateWrapper>
    );
  });

  registry.set('antd.ColorPicker', (ctx) => {
    const { getStringProp, getBooleanProp, mergeStyle, handleActivateSelf, data, isNodeActive } = ctx;
    const controlled = getBooleanProp('controlled') !== false;
    const v = getStringProp('value') || getStringProp('defaultValue') || '#1677ff';
    return (
      <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf} nodeKey={data?.key} active={isNodeActive}>
        <AntColorPicker
          value={controlled ? v : undefined}
          defaultValue={controlled ? undefined : v}
          disabled={getBooleanProp('disabled') === true}
          showText
        />
      </ActivateWrapper>
    );
  });

  registry.set('antd.TimePicker', (ctx) => {
    const { getStringProp, getBooleanProp, mergeStyle, handleActivateSelf, data, isNodeActive } = ctx;
    const fmt = getStringProp('format') || 'HH:mm:ss';
    const controlled = getBooleanProp('controlled') !== false;
    const raw = getStringProp('value');
    const def = getStringProp('defaultValue');
    return (
      <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf} nodeKey={data?.key} active={isNodeActive}>
        <AntTimePicker
          format={fmt}
          value={controlled && raw ? dayjs(raw, fmt) : undefined}
          defaultValue={!controlled && def ? dayjs(def, fmt) : undefined}
          disabled={getBooleanProp('disabled') === true}
          placeholder={getStringProp('placeholder') || undefined}
        />
      </ActivateWrapper>
    );
  });

  registry.set('antd.TimeRangePicker', (ctx) => {
    const { getStringProp, getBooleanProp, mergeStyle, handleActivateSelf, data, isNodeActive, getTimeRangeValueProp } = ctx;
    const fmt = getStringProp('format') || 'HH:mm:ss';
    const controlled = getBooleanProp('controlled') !== false;
    const toPair = (arr: string[] | undefined) => {
      if (!arr || arr.length < 2) {
        return undefined;
      }
      const a = dayjs(arr[0], fmt);
      const b = dayjs(arr[1], fmt);
      return a.isValid() && b.isValid() ? ([a, b] as [dayjs.Dayjs, dayjs.Dayjs]) : undefined;
    };
    const val = toPair(getTimeRangeValueProp('value'));
    const def = toPair(getTimeRangeValueProp('defaultValue'));
    return (
      <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf} nodeKey={data?.key} active={isNodeActive}>
        <RangePicker
          format={fmt}
          value={controlled ? val : undefined}
          defaultValue={!controlled ? def : undefined}
          disabled={getBooleanProp('disabled') === true}
        />
      </ActivateWrapper>
    );
  });

  registry.set('antd.Slider', (ctx) => {
    const { getFiniteNumberProp, getBooleanProp, mergeStyle, handleActivateSelf, data, isNodeActive, getSliderValueProp } = ctx;
    const controlled = getBooleanProp('controlled') !== false;
    const min = getFiniteNumberProp('min') ?? 0;
    const max = getFiniteNumberProp('max') ?? 100;
    const v = getSliderValueProp('value');
    const single = typeof v === 'number' ? v : Array.isArray(v) ? v[0] : min;
    const merged = mergeStyle();
    return (
      <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf} nodeKey={data?.key} active={isNodeActive}>
        <Slider
          min={min}
          max={max}
          value={controlled ? single : undefined}
          defaultValue={!controlled ? getFiniteNumberProp('defaultValue') ?? min : undefined}
          disabled={getBooleanProp('disabled') === true}
          style={{
            width: '100%',
            minWidth: 200,
            maxWidth: '100%',
            boxSizing: 'border-box',
            ...(merged ?? {}),
          }}
        />
      </ActivateWrapper>
    );
  });

  registry.set('antd.Upload', (ctx) => {
    const { onDropData, data, mergeStyle, handleActivateSelf, isNodeActive } = ctx;
    return (
      <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf} nodeKey={data?.key} active={isNodeActive}>
        <Upload beforeUpload={() => false} showUploadList={false}>
          <DropArea data={data} onDropData={onDropData} emptyText="拖拽或点击上传" />
        </Upload>
      </ActivateWrapper>
    );
  });

  registry.set('antd.Popover', (ctx) => {
    const { data, onDropData, getStringProp, mergeStyle, handleActivateSelf, isNodeActive } = ctx;
    const slotNodes = (data?.children ?? []).filter((child) => isSlotNode(child));
    const triggerSlotNode = slotNodes.find((child) => getNodeSlotKey(child) === 'trigger');
    const contentSlotNode = slotNodes.find((child) => getNodeSlotKey(child) === 'content');
    const tr = getStringProp('trigger') === 'click' ? 'click' : 'hover';
    return (
      <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf} nodeKey={data?.key} active={isNodeActive}>
        <Popover
          trigger={tr}
          content={
            contentSlotNode ? (
              <DropArea
                data={contentSlotNode}
                onDropData={onDropData}
                dropSlotKey="content"
                selectable={false}
                compactWhenFilled
                emptyText="拖拽组件到浮层内容"
              />
            ) : null
          }
        >
          <span>
            {triggerSlotNode ? (
              <DropArea
                data={triggerSlotNode}
                onDropData={onDropData}
                dropSlotKey="trigger"
                selectable={false}
                compactWhenFilled
                emptyText="拖拽组件到触发器"
              />
            ) : (
              <span />
            )}
          </span>
        </Popover>
      </ActivateWrapper>
    );
  });

  registry.set('antd.Calendar', (ctx) => {
    const { mergeStyle, handleActivateSelf, data, isNodeActive, getCalendarValueProp } = ctx;
    const raw = getCalendarValueProp('value');
    const v = raw ? dayjs(raw) : dayjs();
    return (
      <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf} nodeKey={data?.key} active={isNodeActive}>
        <AntCalendar fullscreen={false} value={v} />
      </ActivateWrapper>
    );
  });

  registry.set('antd.Tabs', (ctx) => {
    const {
      data, onDropData, getStringProp, mergeStyle, handleActivateSelf, isNodeActive,
      getTabsListProp, getTabsControlledValue, getTabsDefaultValue, tabsInnerValue, setTabsInnerValue,
    } = ctx;
    const tabsList = getTabsListProp();
    const controlledValue = getTabsControlledValue();
    const defaultValue = getTabsDefaultValue();
    const firstValue = tabsList[0]?.value;
    const activeTabValue = controlledValue ?? tabsInnerValue ?? defaultValue ?? firstValue;
    const items = tabsList.map((item) => {
      const slotNode = getTabsSlotNodeByValue(data, item.value);
      const slotKey = getTabsPanelSlotKey(item.value);
      return {
        key: String(item.value),
        label: item.label,
        disabled: item.disabled,
        children: (
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
    const placement = getStringProp('placement');
    const tabPosition =
      placement === 'bottom' ? 'bottom' : placement === 'left' ? 'left' : placement === 'right' ? 'right' : 'top';
    return (
      <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf} nodeKey={data?.key} active={isNodeActive}>
        <AntTabs
          activeKey={String(activeTabValue ?? '')}
          items={items}
          tabPosition={tabPosition as 'top' | 'left' | 'right' | 'bottom'}
          size={getStringProp('size') === 'large' ? 'large' : getStringProp('size') === 'small' ? 'small' : 'middle'}
          onChange={(k) => setTabsInnerValue(k)}
        />
      </ActivateWrapper>
    );
  });

  registry.set('antd.Collapse', (ctx) => {
    const {
      data, onDropData, getProp, getBooleanProp, mergeStyle, handleActivateSelf, isNodeActive,
    } = ctx;
    const collapseList = normalizeCollapseList(getProp('list'));
    const controlledValue = normalizeCollapseValue(getProp('value'));
    const defaultValue = normalizeCollapseValue(getProp('defaultValue'));
    const firstValue = collapseList[0]?.value;
    const toCollapseValueArray = (value: unknown) => {
      const normalized = normalizeCollapseValue(value);
      if (typeof normalized === 'undefined') {
        return undefined;
      }
      return Array.isArray(normalized) ? normalized : [normalized];
    };
    const controlledValueArray = toCollapseValueArray(controlledValue);
    const defaultValueArray = toCollapseValueArray(defaultValue);
    const accordion = getBooleanProp('expandMutex') === true;
    const controlledKey =
      typeof controlledValue !== 'undefined'
        ? accordion
          ? (controlledValueArray?.[0] !== undefined ? String(controlledValueArray[0]) : undefined)
          : (controlledValueArray?.map(String) as string[] | undefined)
        : undefined;
    const defaultKey =
      typeof controlledValue === 'undefined'
        ? (defaultValueArray ?? (typeof firstValue !== 'undefined' ? [String(firstValue)] : undefined))
        : undefined;

    const collapseControlledProps =
      typeof controlledValue !== 'undefined'
        ? { activeKey: controlledKey as string | string[] | undefined }
        : { defaultActiveKey: defaultKey as string | string[] | undefined };

    return (
      <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf} nodeKey={data?.key} active={isNodeActive}>
        <AntCollapse
          accordion={accordion}
          bordered={getBooleanProp('bordered') !== false}
          {...collapseControlledProps}
          onChange={() => { /* 搭建态 */ }}
        >
          {collapseList.map((item) => {
            const headerSlotNode = getCollapseHeaderSlotNodeByValue(data, item.value);
            const panelSlotNode = getCollapsePanelSlotNodeByValue(data, item.value);
            const headerSlotKey = getCollapseHeaderSlotKey(item.value);
            const panelSlotKey = getCollapsePanelSlotKey(item.value);
            return (
              <AntCollapsePanel
                key={`${data?.key ?? 'collapse'}-${String(item.value)}`}
                header={(
                  <DropArea
                    data={headerSlotNode}
                    onDropData={onDropData}
                    dropSlotKey={headerSlotKey}
                    selectable={false}
                    compactWhenFilled
                    emptyText={`拖拽到「${item.label}」头部`}
                  />
                )}
              >
                <DropArea
                  data={panelSlotNode}
                  onDropData={onDropData}
                  dropSlotKey={panelSlotKey}
                  selectable={false}
                  compactWhenFilled
                  emptyText={`拖拽到「${item.label}」内容`}
                />
              </AntCollapsePanel>
            );
          })}
        </AntCollapse>
      </ActivateWrapper>
    );
  });

  registry.set('antd.Carousel', (ctx) => {
    const { data, onDropData, mergeStyle, handleActivateSelf, isNodeActive } = ctx;
    return (
      <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf} nodeKey={data?.key} active={isNodeActive}>
        <Carousel dots>
          <DropArea data={data} onDropData={onDropData} emptyText="拖拽轮播项" />
        </Carousel>
      </ActivateWrapper>
    );
  });
}
