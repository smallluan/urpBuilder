import type { UiTreeNode } from '../store/types';
import { createSlotNode, getNodeSlotKey, isSlotNode } from './slot';

export type CollapseValue = string | number;

export interface CollapsePanelItem {
  value: CollapseValue;
  label: string;
  disabled?: boolean;
  destroyOnCollapse?: boolean;
}

export const createDefaultCollapseList = (): CollapsePanelItem[] => ([
  {
    value: 'collapse-1',
    label: '面板 1',
    disabled: false,
    destroyOnCollapse: true,
  },
  {
    value: 'collapse-2',
    label: '面板 2',
    disabled: false,
    destroyOnCollapse: true,
  },
]);

export const normalizeCollapseValue = (value: unknown): CollapseValue | CollapseValue[] | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
  }

  if (Array.isArray(value)) {
    const normalized = value
      .map((item) => {
        if (typeof item === 'number' && Number.isFinite(item)) {
          return item;
        }
        if (typeof item === 'string') {
          const trimmed = item.trim();
          return trimmed ? trimmed : undefined;
        }
        return undefined;
      })
      .filter((item): item is CollapseValue => typeof item !== 'undefined');

    if (normalized.length > 0) {
      return normalized;
    }
  }

  return undefined;
};

export const normalizeCollapseList = (value: unknown): CollapsePanelItem[] => {
  const source = Array.isArray(value) ? value : [];
  const usedValues = new Set<string>();
  const normalized = source
    .filter((item) => item && typeof item === 'object')
    .map((item, index) => {
      const record = item as Record<string, unknown>;
      const rawValue = normalizeCollapseValue(record.value);
      const fallbackValue = `collapse-${index + 1}`;
      let nextValue = String(Array.isArray(rawValue) ? rawValue[0] : (rawValue ?? fallbackValue));
      if (usedValues.has(nextValue)) {
        nextValue = `${nextValue}-${index + 1}`;
      }
      usedValues.add(nextValue);

      const rawLabel = typeof record.label === 'string' ? record.label.trim() : '';
      return {
        value: nextValue,
        label: rawLabel || `面板 ${index + 1}`,
        disabled: Boolean(record.disabled),
        destroyOnCollapse: typeof record.destroyOnCollapse === 'boolean' ? record.destroyOnCollapse : true,
      } as CollapsePanelItem;
    })
    .filter((item) => String(item.value).trim());

  return normalized.length > 0 ? normalized : createDefaultCollapseList();
};

export const getCollapseHeaderSlotKey = (value: CollapseValue): string => `collapse:header:${String(value)}`;
export const getCollapsePanelSlotKey = (value: CollapseValue): string => `collapse:panel:${String(value)}`;

export const getCollapseHeaderSlotNodeByValue = (node: UiTreeNode | undefined, value: CollapseValue) => {
  const slotKey = getCollapseHeaderSlotKey(value);
  return (node?.children ?? []).find((child) => isSlotNode(child) && getNodeSlotKey(child) === slotKey);
};

export const getCollapsePanelSlotNodeByValue = (node: UiTreeNode | undefined, value: CollapseValue) => {
  const slotKey = getCollapsePanelSlotKey(value);
  return (node?.children ?? []).find((child) => isSlotNode(child) && getNodeSlotKey(child) === slotKey);
};

export const syncCollapseSlotNodes = (node: UiTreeNode, list: CollapsePanelItem[]) => {
  const currentChildren = node.children ?? [];
  const slotNodeMap = new Map<string, UiTreeNode>();
  const nonSlotChildren: UiTreeNode[] = [];

  currentChildren.forEach((child) => {
    if (isSlotNode(child)) {
      const slotKey = getNodeSlotKey(child);
      if (slotKey) {
        slotNodeMap.set(slotKey, child);
      }
      return;
    }
    nonSlotChildren.push(child);
  });

  const nextChildren: UiTreeNode[] = [];

  list.forEach((item, index) => {
    const headerSlotKey = getCollapseHeaderSlotKey(item.value);
    const panelSlotKey = getCollapsePanelSlotKey(item.value);

    const existedHeader = slotNodeMap.get(headerSlotKey);
    const existedPanel = slotNodeMap.get(panelSlotKey);

    const headerSlot = existedHeader
      ? { ...existedHeader, label: `${item.label} 头部` }
      : createSlotNode(headerSlotKey, `${item.label} 头部`);

    const panelSlot = existedPanel
      ? { ...existedPanel, label: `${item.label} 内容` }
      : createSlotNode(panelSlotKey, `${item.label} 内容`);

    // 兼容旧数据：若存在非 slot children，迁移到首面板内容插槽。
    if (index === 0 && nonSlotChildren.length > 0) {
      panelSlot.children = [...(panelSlot.children ?? []), ...nonSlotChildren];
    }

    nextChildren.push(headerSlot, panelSlot);
  });

  return {
    ...node,
    children: nextChildren,
  };
};
