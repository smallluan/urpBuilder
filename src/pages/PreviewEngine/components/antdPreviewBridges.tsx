import React from 'react';
import { Collapse as AntCollapse, Tabs as AntTabs } from 'antd';
import type { UiTreeNode } from '../../../builder/store/types';
import {
  getCollapseHeaderSlotNodeByValue,
  getCollapsePanelSlotNodeByValue,
  normalizeCollapseList,
  normalizeCollapseValue,
} from '../../../builder/utils/collapse';
import { getTabsSlotNodeByValue, normalizeTabsList } from '../../../builder/utils/tabs';

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

type MergeStyle = (base?: React.CSSProperties) => React.CSSProperties | undefined;

/** Tabs：与 TDesign DSL（list + panel: 插槽）对齐 */
export function AntdTabsPreviewBridge(props: {
  node: UiTreeNode;
  mergeStyle: MergeStyle;
  renderChildList: (children: UiTreeNode[]) => React.ReactNode;
  emitInteractionLifecycle: (lifetime: string, payload?: unknown) => void;
}): React.ReactElement {
  const { node, mergeStyle, renderChildList, emitInteractionLifecycle } = props;
  const tabsList = normalizeTabsList(getProp(node, 'list'));
  const controlled = getStringProp(node, 'value');
  const defaultVal = getStringProp(node, 'defaultValue');
  const first = tabsList[0]?.value;
  const [inner, setInner] = React.useState<string | number | undefined>(
    controlled ?? defaultVal ?? first,
  );

  React.useEffect(() => {
    if (controlled !== undefined) {
      setInner(controlled);
    }
  }, [controlled]);

  const activeKey = String(controlled ?? inner ?? first ?? '');

  const items = tabsList.map((item) => {
    const slotNode = getTabsSlotNodeByValue(node, item.value);
    return {
      key: String(item.value),
      label: item.label,
      disabled: item.disabled,
      children: slotNode ? renderChildList(slotNode.children ?? []) : null,
    };
  });

  const placement = getStringProp(node, 'placement');
  const tabPosition =
    placement === 'bottom' ? 'bottom' : placement === 'left' ? 'left' : placement === 'right' ? 'right' : 'top';

  return (
    <AntTabs
      activeKey={activeKey}
      items={items}
      size={getStringProp(node, 'size') === 'large' ? 'large' : getStringProp(node, 'size') === 'small' ? 'small' : 'middle'}
      tabPosition={tabPosition as 'top' | 'left' | 'right' | 'bottom'}
      style={mergeStyle()}
      onChange={(key) => {
        setInner(key);
        emitInteractionLifecycle('onChange', { value: key });
      }}
    />
  );
}

const { Panel } = AntCollapse;

/** Collapse：与 TDesign DSL（list + header/panel 插槽）对齐 */
export function AntdCollapsePreviewBridge(props: {
  node: UiTreeNode;
  mergeStyle: MergeStyle;
  renderChildList: (children: UiTreeNode[]) => React.ReactNode;
  emitInteractionLifecycle: (lifetime: string, payload?: unknown) => void;
}): React.ReactElement {
  const { node, mergeStyle, renderChildList, emitInteractionLifecycle } = props;
  const collapseList = normalizeCollapseList(getProp(node, 'list'));
  const accordion = getBooleanProp(node, 'expandMutex') === true;
  const controlled = normalizeCollapseValue(getProp(node, 'value'));
  const defaultVal = normalizeCollapseValue(getProp(node, 'defaultValue'));

  const toArr = (v: typeof controlled) => {
    if (v === undefined) {
      return undefined;
    }
    return Array.isArray(v) ? v.map(String) : [String(v)];
  };

  const [innerKeys, setInnerKeys] = React.useState<string[] | undefined>(() => toArr(controlled ?? defaultVal));

  React.useEffect(() => {
    if (controlled !== undefined) {
      setInnerKeys(toArr(controlled));
    }
  }, [controlled]);

  const activeKey = controlled !== undefined ? toArr(controlled) : innerKeys;

  const handleChange = (keys: string | string[]) => {
    const next = Array.isArray(keys) ? keys : [keys];
    setInnerKeys(next);
    emitInteractionLifecycle('onChange', { value: keys });
  };

  const panels = collapseList.map((item) => {
    const headerSlot = getCollapseHeaderSlotNodeByValue(node, item.value);
    const panelSlot = getCollapsePanelSlotNodeByValue(node, item.value);
    const headerChildren = headerSlot ? renderChildList(headerSlot.children ?? []) : null;
    const panelChildren = panelSlot ? renderChildList(panelSlot.children ?? []) : null;
    return (
      <Panel
        key={String(item.value)}
        header={headerChildren ?? item.label}
        collapsible={item.disabled ? 'disabled' : undefined}
      >
        {panelChildren}
      </Panel>
    );
  });

  return (
    <AntCollapse
      accordion={accordion}
      bordered={getBooleanProp(node, 'bordered') !== false}
      style={mergeStyle()}
      activeKey={accordion ? activeKey?.[0] : activeKey}
      defaultActiveKey={
        activeKey === undefined && defaultVal !== undefined
          ? (Array.isArray(defaultVal) ? defaultVal.map(String) : [String(defaultVal)])
          : undefined
      }
      onChange={handleChange}
    >
      {panels}
    </AntCollapse>
  );
}
