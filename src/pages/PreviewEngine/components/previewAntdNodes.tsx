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
import dayjs, { type Dayjs } from 'dayjs';
import type { UiTreeNode } from '../../../builder/store/types';
import type { ComponentLifecycleHandler } from '../../../types/component';

const { Title, Paragraph, Text, Link } = Typography;
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

export interface AntdPreviewContext {
  type: string;
  node: UiTreeNode;
  mergeStyle: (baseStyle?: React.CSSProperties) => React.CSSProperties | undefined;
  renderChildren: (node: UiTreeNode, onLifecycle?: ComponentLifecycleHandler) => React.ReactNode;
  emitInteractionLifecycle: (lifetime: string, payload?: unknown) => void;
  syncNodeValue: (nextValue: unknown) => void;
  navigatePreviewByHref: (href: string) => void;
  onLifecycle?: ComponentLifecycleHandler;
  drawerInnerVisible: boolean;
  syncDrawerVisible: (next: boolean) => void;
  modalOpen: boolean;
  syncModalVisible: (next: boolean) => void;
}

export function tryRenderAntdPreview(ctx: AntdPreviewContext): React.ReactElement | null {
  const {
    type,
    node,
    mergeStyle,
    renderChildren,
    emitInteractionLifecycle,
    syncNodeValue,
    navigatePreviewByHref,
    onLifecycle,
    drawerInnerVisible,
    syncDrawerVisible,
    modalOpen,
    syncModalVisible,
  } = ctx;

  if (!type.startsWith('antd.')) {
    return null;
  }

  switch (type) {
    case 'antd.Divider': {
      const text = getStringProp(node, 'content')?.trim();
      return (
        <Divider
          dashed={getBooleanProp(node, 'dashed') === true}
          orientation={getStringProp(node, 'orientation') as 'left' | 'center' | 'right' | undefined}
          style={mergeStyle()}
        >
          {text || undefined}
        </Divider>
      );
    }
    case 'antd.Typography.Title': {
      const level = Number(getStringProp(node, 'level')) || 4;
      const lv = (level >= 1 && level <= 5 ? level : 4) as 1 | 2 | 3 | 4 | 5;
      return <Title level={lv} style={mergeStyle()}>{getStringProp(node, 'content') || '标题'}</Title>;
    }
    case 'antd.Typography.Paragraph':
      return <Paragraph style={mergeStyle()}>{getStringProp(node, 'content') || ''}</Paragraph>;
    case 'antd.Typography.Text':
      return (
        <Text strong={getBooleanProp(node, 'strong') === true} style={mergeStyle()}>
          {getStringProp(node, 'content') || ''}
        </Text>
      );
    case 'antd.Typography.Link': {
      const href = getStringProp(node, 'href') || undefined;
      return (
        <Link
          href={href}
          target={getStringProp(node, 'target') as '_self' | '_blank' | undefined}
          style={mergeStyle()}
          onClick={(e) => {
            e.preventDefault();
            emitInteractionLifecycle('onClick');
            if (href) {
              navigatePreviewByHref(href);
            }
          }}
        >
          {getStringProp(node, 'content') || '链接'}
        </Link>
      );
    }
    case 'antd.Tag':
      return (
        <Tag color={getStringProp(node, 'color')?.trim() || undefined} style={mergeStyle()}>
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
    case 'antd.Button':
      return (
        <Button
          type={getStringProp(node, 'type') as 'primary' | 'default' | 'dashed' | 'link' | 'text' | undefined}
          size={getStringProp(node, 'size') as 'large' | 'middle' | 'small' | undefined}
          danger={getBooleanProp(node, 'danger') === true}
          block={getBooleanProp(node, 'block') === true}
          style={mergeStyle()}
          onClick={() => emitInteractionLifecycle('onClick')}
        >
          {getStringProp(node, 'content') || '按钮'}
        </Button>
      );
    case 'antd.Dropdown': {
      const items = parseJsonRecordArray(getStringProp(node, 'menuItems')).map((it, i) => ({
        key: String(it.key ?? i),
        label: String(it.label ?? it.key ?? i),
      })) as MenuProps['items'];
      const trigger = (getStringProp(node, 'trigger') as 'click' | 'hover') || 'hover';
      return (
        <span style={mergeStyle()}>
          <Dropdown menu={{ items }} trigger={[trigger]}>
            <Button>{getStringProp(node, 'content') || '菜单'}</Button>
          </Dropdown>
        </span>
      );
    }
    case 'antd.Input': {
      const controlled = getBooleanProp(node, 'controlled') !== false;
      const val = getStringProp(node, 'value') ?? '';
      return (
        <Input
          value={controlled ? val : undefined}
          defaultValue={controlled ? undefined : val}
          placeholder={getStringProp(node, 'placeholder') || undefined}
          style={mergeStyle()}
          onChange={(e) => {
            syncNodeValue(e.target.value);
            emitInteractionLifecycle('onChange', { value: e.target.value });
          }}
          onPressEnter={(e) => emitInteractionLifecycle('onPressEnter', { value: (e.target as HTMLInputElement).value })}
        />
      );
    }
    case 'antd.Textarea': {
      const controlled = getBooleanProp(node, 'controlled') !== false;
      const val = getStringProp(node, 'value') ?? '';
      return (
        <Input.TextArea
          rows={getFiniteNumberProp(node, 'rows') ?? 4}
          value={controlled ? val : undefined}
          defaultValue={controlled ? undefined : val}
          placeholder={getStringProp(node, 'placeholder') || undefined}
          style={mergeStyle()}
          onChange={(e) => {
            syncNodeValue(e.target.value);
            emitInteractionLifecycle('onChange', { value: e.target.value });
          }}
        />
      );
    }
    case 'antd.InputNumber': {
      const controlled = getBooleanProp(node, 'controlled') !== false;
      const v = getFiniteNumberProp(node, 'value');
      return (
        <InputNumber
          min={getFiniteNumberProp(node, 'min')}
          max={getFiniteNumberProp(node, 'max')}
          value={controlled ? v : undefined}
          defaultValue={controlled ? undefined : v}
          style={mergeStyle()}
          onChange={(next) => {
            syncNodeValue(next);
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
      const checked = getBooleanProp(node, 'checked') === true;
      return (
        <Switch
          checked={controlled ? checked : undefined}
          defaultChecked={controlled ? undefined : checked}
          style={mergeStyle()}
          onChange={(c) => {
            syncNodeValue(c);
            emitInteractionLifecycle('onChange', { value: c });
          }}
        />
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
          title={getStringProp(node, 'title') || undefined}
          open={modalOpen}
          okText={getStringProp(node, 'okText') || '确定'}
          cancelText={getStringProp(node, 'cancelText') || '取消'}
          onOk={() => {
            emitInteractionLifecycle('onOk');
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
    case 'antd.Drawer':
      return (
        <Drawer
          title={getStringProp(node, 'title') || undefined}
          open={drawerInnerVisible}
          placement={getStringProp(node, 'placement') as 'top' | 'right' | 'bottom' | 'left' | undefined}
          onClose={() => {
            syncDrawerVisible(false);
            emitInteractionLifecycle('onClose');
          }}
          style={mergeStyle()}
        >
          {renderChildren(node, onLifecycle)}
        </Drawer>
      );
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
      const sizeMap: Record<string, 'small' | 'middle' | 'large'> = { small: 'small', middle: 'middle', large: 'large' };
      const sz = getStringProp(node, 'size') || 'small';
      return (
        <Space
          direction={getStringProp(node, 'direction') === 'vertical' ? 'vertical' : 'horizontal'}
          size={sizeMap[sz] ?? 'small'}
          style={mergeStyle()}
        >
          {renderChildren(node, onLifecycle)}
        </Space>
      );
    }
    case 'antd.Table': {
      const columns = parseJsonRecordArray(getStringProp(node, 'columns'));
      const dataSource = parseJsonRecordArray(getStringProp(node, 'dataSource'));
      return (
        <Table
          size="small"
          columns={columns as never}
          dataSource={dataSource as never}
          pagination={false}
          style={mergeStyle()}
        />
      );
    }
    case 'antd.List':
      return (
        <List bordered={getBooleanProp(node, 'bordered') === true} style={mergeStyle()}>
          {renderChildren(node, onLifecycle)}
        </List>
      );
    case 'antd.Menu':
      return (
        <Menu mode={getStringProp(node, 'mode') as 'vertical' | 'horizontal' | 'inline' | undefined} style={mergeStyle()}>
          {renderAntdPreviewMenu(node.children, onLifecycle, emitInteractionLifecycle, navigatePreviewByHref)}
        </Menu>
      );
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
    if (childType === 'antd.Menu.SubMenu') {
      return (
        <Menu.SubMenu key={child.key} title={getChildString('title') || '子菜单'}>
          {renderAntdPreviewMenu(child.children, onLifecycle, emitInteractionLifecycle, navigatePreviewByHref)}
        </Menu.SubMenu>
      );
    }
    if (childType === 'antd.Menu.Item') {
      const href = getChildString('href') || undefined;
      return (
        <Menu.Item
          key={child.key}
          onClick={() => {
            emitInteractionLifecycle('onClick', { nodeType: child.type });
            if (href) {
              navigatePreviewByHref(href);
            }
          }}
        >
          {getChildString('title') || '菜单项'}
        </Menu.Item>
      );
    }
    return null;
  });
}
