import React from 'react';
import {
  Alert,
  Badge,
  Breadcrumb,
  Button,
  Card as AntCard,
  Checkbox,
  Col,
  DatePicker,
  Divider,
  Drawer,
  Dropdown,
  Empty,
  Form,
  Input,
  InputNumber,
  Layout,
  List,
  Menu,
  Modal,
  Pagination,
  Radio,
  Row,
  Select,
  Space,
  Spin,
  Statistic as AntStatistic,
  Switch,
  Table,
  Tag,
  Typography,
} from 'antd';
import { ArrowDownOutlined, ArrowUpOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';
import type { UiDropDataHandler, UiTreeNode } from '../../store/types';
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
  tdesignTableColumnsToAntd,
} from '../../../utils/antdTdesignPropBridge';

const { Title, Paragraph, Text, Link } = Typography;
const { Header, Content, Footer, Sider } = Layout;

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
    if (childType === 'antd.Menu.SubMenu') {
      const subKids = child.children ?? [];
      return (
        <Menu.SubMenu key={child.key} title={getChildString('title') || '子菜单'}>
          {subKids.length === 0 ? (
            <DropArea data={child} onDropData={onDropData} emptyText="拖入子菜单项" />
          ) : (
            renderAntdMenuChildren(subKids, setActiveKey, onDropData)
          )}
        </Menu.SubMenu>
      );
    }
    if (childType === 'antd.Menu.Item') {
      return (
        <Menu.Item
          key={child.key}
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
      <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf} nodeKey={data?.key} active={isNodeActive}>
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
    const { getStringProp, onDropData, data, mergeStyle, getBuilderDrawerAttach } = ctx;
    const getContainer = () => getBuilderDrawerAttach()();
    return (
      <Drawer
        title={getStringProp('header') || undefined}
        open={true}
        placement={getStringProp('placement') as 'top' | 'right' | 'bottom' | 'left' | undefined}
        getContainer={getContainer}
      >
        <div style={mergeStyle({ minHeight: 80 })}>
          <DropArea data={data} onDropData={onDropData} />
        </div>
      </Drawer>
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
    const { getStringProp, data, mergeStyle, setActiveNode, onDropData } = ctx;
    const kids = data?.children ?? [];
    const theme = getStringProp('theme') === 'dark' ? 'dark' : 'light';
    if (kids.length === 0) {
      return (
        <div style={mergeStyle()}>
          <DropArea data={data} onDropData={onDropData} emptyText="拖入 antd.Menu.Item / SubMenu" />
        </div>
      );
    }
    return (
      <div style={mergeStyle()}>
        <Menu mode="vertical" theme={theme} selectable={false} style={{ width: getStringProp('width') || undefined }}>
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

  registry.set('antd.List', (ctx) => {
    const { getBooleanProp, getStringProp, onDropData, data, mergeStyle } = ctx;
    const header = getStringProp('header')?.trim();
    const footer = getStringProp('footer')?.trim();
    return (
      <List
        bordered={getBooleanProp('split') === true}
        header={header ? <span>{header}</span> : undefined}
        footer={footer ? <span>{footer}</span> : undefined}
        dataSource={[]}
        style={mergeStyle()}
        locale={{
          emptyText: <DropArea data={data} onDropData={onDropData} emptyText="拖拽列表项" style={{ minHeight: 100 }} />,
        }}
      />
    );
  });
}
