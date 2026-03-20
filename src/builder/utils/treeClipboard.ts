import type { Edge, Node as FlowNode } from '@xyflow/react';
import type { UiTreeNode } from '../store/types';

export interface TreeClipboardPayload {
  mode: 'copy' | 'cut';
  node: UiTreeNode;
  flowNodes: FlowNode[];
  flowEdges: Edge[];
  createdAt: number;
}

let treeClipboard: TreeClipboardPayload | null = null;
const listeners = new Set<(value: TreeClipboardPayload | null) => void>();

const emit = () => {
  listeners.forEach((listener) => listener(treeClipboard));
};

export const getTreeClipboard = (): TreeClipboardPayload | null => treeClipboard;

export const setTreeClipboard = (value: TreeClipboardPayload | null) => {
  treeClipboard = value;
  emit();
};

export const clearTreeClipboard = () => {
  treeClipboard = null;
  emit();
};

export const subscribeTreeClipboard = (listener: (value: TreeClipboardPayload | null) => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
