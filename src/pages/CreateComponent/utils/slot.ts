import { v4 as uuidv4 } from 'uuid';
import type { UiTreeNode } from '../store/type';

export const SLOT_NODE_TYPE = 'slotNode';
export const SLOT_PROP_KEY = '__slot';

export const createSlotNode = (slotKey: string, slotLabel: string, children: UiTreeNode[] = []): UiTreeNode => ({
  key: uuidv4(),
  label: slotLabel,
  type: SLOT_NODE_TYPE,
  props: {
    [SLOT_PROP_KEY]: {
      value: slotKey,
    },
  },
  children,
  lifetimes: [],
});

export const getNodeSlotKey = (node?: UiTreeNode): string | undefined => {
  if (!node) {
    return undefined;
  }

  const slotSchema = (node.props?.[SLOT_PROP_KEY] ?? null) as { value?: unknown } | null;
  const slotValue = slotSchema?.value;
  return typeof slotValue === 'string' ? slotValue : undefined;
};

export const isSlotNode = (node?: UiTreeNode | null): boolean => {
  return node?.type === SLOT_NODE_TYPE;
};
