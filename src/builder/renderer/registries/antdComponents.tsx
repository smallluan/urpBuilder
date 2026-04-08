import React from 'react';
import {
  Alert,
  Badge,
  Breadcrumb,
  Button,
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
  Switch,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { MenuProps } from 'antd';
import type { UiDropDataHandler, UiTreeNode } from '../../store/types';
import type { ComponentRegistry } from '../componentContext';
import { ActivateWrapper } from '../componentHelpers';
import DropArea from '../../../components/DropArea';

const { Title, Paragraph, Text, Link } = Typography;
const { Header, Content, Footer, Sider } = Layout;

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
          {getChildString('title') || '菜单项'}
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
          orientation={getStringProp('orientation') as 'left' | 'center' | 'right' | undefined}
        >
          {text || undefined}
        </Divider>
      </ActivateWrapper>
    );
  });

  registry.set('antd.Typography.Title', (ctx) => {
    const { getStringProp, mergeStyle, handleActivateSelf, data, isNodeActive } = ctx;
    const level = Number(getStringProp('level')) || 4;
    const lv = (level >= 1 && level <= 5 ? level : 4) as 1 | 2 | 3 | 4 | 5;
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
    const { getStringProp, mergeStyle, handleActivateSelf, data, isNodeActive } = ctx;
    return (
      <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf} nodeKey={data?.key} active={isNodeActive}>
        <Link href={getStringProp('href') || undefined} target={getStringProp('target') as '_self' | '_blank' | undefined}>
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
    const block = getBooleanProp('block') === true;
    return (
      <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf} nodeKey={data?.key} active={isNodeActive}>
        <Button
          type={getStringProp('type') as 'primary' | 'default' | 'dashed' | 'link' | 'text' | undefined}
          size={getStringProp('size') as 'large' | 'middle' | 'small' | undefined}
          danger={getBooleanProp('danger') === true}
          block={block}
          onClick={() => {}}
        >
          {getStringProp('content') || '按钮'}
        </Button>
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
        <Switch checked={getBooleanProp('checked') === true} />
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
    const { getStringProp, onDropData, data, mergeStyle } = ctx;
    return (
      <Modal title={getStringProp('title') || undefined} open={true} footer={null} styles={{ body: { padding: 12 } }}>
        <div style={mergeStyle({ minHeight: 80 })}>
          <DropArea data={data} onDropData={onDropData} />
        </div>
      </Modal>
    );
  });

  registry.set('antd.Drawer', (ctx) => {
    const { getStringProp, onDropData, data, mergeStyle } = ctx;
    return (
      <Drawer title={getStringProp('title') || undefined} open={true} placement={getStringProp('placement') as 'top' | 'right' | 'bottom' | 'left' | undefined}>
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
    if (kids.length === 0) {
      return (
        <div style={mergeStyle()}>
          <DropArea data={data} onDropData={onDropData} emptyText="拖入 antd.Menu.Item / SubMenu" />
        </div>
      );
    }
    return (
      <div style={mergeStyle()}>
        <Menu mode={getStringProp('mode') as 'vertical' | 'horizontal' | 'inline' | undefined} selectable={false}>
          {renderAntdMenuChildren(kids, setActiveNode, onDropData)}
        </Menu>
      </div>
    );
  });

  registry.set('antd.Menu.Item', (ctx) => {
    const { getStringProp, mergeStyle, handleActivateSelf, data, isNodeActive } = ctx;
    return (
      <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf} nodeKey={data?.key} active={isNodeActive}>
        <Menu.Item>{getStringProp('title') || '菜单项'}</Menu.Item>
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
    return (
      <Sider width={getFiniteNumberProp('width') ?? 200} style={mergeStyle()}>
        <DropArea data={data} onDropData={onDropData} />
      </Sider>
    );
  });

  registry.set('antd.Space', (ctx) => {
    const { data, onDropData, getStringProp, mergeStyle } = ctx;
    const sizeMap: Record<string, 'small' | 'middle' | 'large'> = { small: 'small', middle: 'middle', large: 'large' };
    const sz = getStringProp('size') || 'small';
    return (
      <DropArea data={data} onDropData={onDropData}>
        <Space
          direction={getStringProp('direction') === 'vertical' ? 'vertical' : 'horizontal'}
          size={sizeMap[sz] ?? 'small'}
          style={mergeStyle()}
        />
      </DropArea>
    );
  });

  registry.set('antd.Table', (ctx) => {
    const { getStringProp, mergeStyle, handleActivateSelf, data, isNodeActive } = ctx;
    const columns = parseJsonRecordArray(getStringProp('columns'));
    const dataSource = parseJsonRecordArray(getStringProp('dataSource'));
    return (
      <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf} nodeKey={data?.key} active={isNodeActive}>
        <Table size="small" columns={columns as never} dataSource={dataSource as never} pagination={false} />
      </ActivateWrapper>
    );
  });

  registry.set('antd.List', (ctx) => {
    const { getBooleanProp, onDropData, data, mergeStyle } = ctx;
    return (
      <List
        bordered={getBooleanProp('bordered') === true}
        dataSource={[]}
        style={mergeStyle()}
        locale={{
          emptyText: <DropArea data={data} onDropData={onDropData} emptyText="拖拽列表项" style={{ minHeight: 100 }} />,
        }}
      />
    );
  });
}
