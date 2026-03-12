import type { UiTreeNode } from '../store/type';
import { createSlotNode, getNodeSlotKey, isSlotNode } from './slot';

export type TabsValue = string | number;

export interface TabsPanelItem {
  value: TabsValue;
  label: string;
  disabled?: boolean;
  draggable?: boolean;
  removable?: boolean;
  lazy?: boolean;
  destroyOnHide?: boolean;
}

export const createDefaultTabsList = (): TabsPanelItem[] => ([
  {
    value: 'tab-1',
    label: '选项卡1',
    disabled: false,
    draggable: true,
    removable: false,
    lazy: false,
    destroyOnHide: true,
  },
  {
    value: 'tab-2',
    label: '选项卡2',
    disabled: false,
    draggable: true,
    removable: false,
    lazy: false,
    destroyOnHide: true,
  },
]);

export const normalizeTabsValue = (value: unknown): TabsValue | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
  }

  return undefined;
};

export const normalizeTabsList = (value: unknown): TabsPanelItem[] => {
  const source = Array.isArray(value) ? value : [];
  const usedValues = new Set<string>();

  const normalized = source
    .filter((item) => item && typeof item === 'object')
    .map((item, index) => {
      const record = item as Record<string, unknown>;
      const rawValue = normalizeTabsValue(record.value);
      const fallbackValue = `tab-${index + 1}`;
      let nextValue = String(rawValue ?? fallbackValue);

      if (usedValues.has(nextValue)) {
        nextValue = `${nextValue}-${index + 1}`;
      }
      usedValues.add(nextValue);

      const rawLabel = typeof record.label === 'string' ? record.label.trim() : '';
      return {
        value: nextValue,
        label: rawLabel || `选项卡${index + 1}`,
        disabled: Boolean(record.disabled),
        draggable: typeof record.draggable === 'boolean' ? record.draggable : true,
        removable: Boolean(record.removable),
        lazy: Boolean(record.lazy),
        destroyOnHide: typeof record.destroyOnHide === 'boolean' ? record.destroyOnHide : true,
      } as TabsPanelItem;
    })
    .filter((item) => !!item.value);

  return normalized.length ? normalized : createDefaultTabsList();
};

export const getTabsPanelSlotKey = (value: TabsValue): string => `panel:${String(value)}`;

export const getTabsSlotNodeByValue = (node: UiTreeNode | undefined, value: TabsValue) => {
  const slotKey = getTabsPanelSlotKey(value);
  return (node?.children ?? []).find((child) => isSlotNode(child) && getNodeSlotKey(child) === slotKey);
};

export const syncTabsSlotNodes = (node: UiTreeNode, list: TabsPanelItem[]) => {
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

  const nextChildren = list.map((item, index) => {
    const slotKey = getTabsPanelSlotKey(item.value);
    const existed = slotNodeMap.get(slotKey);
    if (existed) {
      return {
        ...existed,
        label: `${item.label} 面板`,
      };
    }

    const slotNode = createSlotNode(slotKey, `${item.label} 面板`);
    if (index === 0 && nonSlotChildren.length) {
      return {
        ...slotNode,
        children: [...nonSlotChildren],
      };
    }

    return slotNode;
  });

  return {
    ...node,
    children: nextChildren,
  };
};
