import { v4 as uuidv4 } from 'uuid';
import type { UiTreeNode } from '../pages/CreateComponent/store/type';

export const toUiTreeNode = (componentData: Record<string, unknown>): UiTreeNode => {
  const name = typeof componentData.name === 'string' ? componentData.name : '';
  const type = typeof componentData.type === 'string' ? componentData.type : '';
  const props =
    componentData.props && typeof componentData.props === 'object'
      ? (componentData.props as Record<string, unknown>)
      : {};
  const lifetimes = Array.isArray(componentData.lifetimes)
    ? componentData.lifetimes.filter((item): item is string => typeof item === 'string')
    : [];

  return {
    key: uuidv4(),
    label: name || type || '未命名组件',
    type,
    props,
    lifetimes,
    children: [],
  };
};

export const appendNodeByParentKey = (
  node: UiTreeNode,
  parentKey: string,
  newNode: UiTreeNode,
): UiTreeNode => {
  if (node.key === parentKey) {
    return {
      ...node,
      children: [...(node.children ?? []), newNode],
    };
  }

  if (!node.children?.length) {
    return node;
  }

  let changed = false;
  const nextChildren = node.children.map((child) => {
    const next = appendNodeByParentKey(child, parentKey, newNode);
    if (next !== child) {
      changed = true;
    }
    return next;
  });

  return changed ? { ...node, children: nextChildren } : node;
};

export const findNodeByKey = (node: UiTreeNode, targetKey: string): UiTreeNode | null => {
  if (node.key === targetKey) {
    return node;
  }

  if (!node.children?.length) {
    return null;
  }

  for (const child of node.children) {
    const found = findNodeByKey(child, targetKey);
    if (found) {
      return found;
    }
  }

  return null;
};

export interface RemoveNodeResult {
  tree: UiTreeNode;
  removedNode: UiTreeNode | null;
  parentKey: string | null;
  index: number;
}

export const removeNodeByKey = (root: UiTreeNode, targetKey: string): RemoveNodeResult => {
  if (root.key === targetKey) {
    return {
      tree: root,
      removedNode: null,
      parentKey: null,
      index: -1,
    };
  }

  const walk = (node: UiTreeNode): RemoveNodeResult => {
    if (!node.children?.length) {
      return {
        tree: node,
        removedNode: null,
        parentKey: null,
        index: -1,
      };
    }

    const hitIndex = node.children.findIndex((child) => child.key === targetKey);
    if (hitIndex > -1) {
      const removedNode = node.children[hitIndex];
      const nextChildren = [...node.children.slice(0, hitIndex), ...node.children.slice(hitIndex + 1)];
      return {
        tree: { ...node, children: nextChildren },
        removedNode,
        parentKey: node.key,
        index: hitIndex,
      };
    }

    let hasChanged = false;
    let removedNode: UiTreeNode | null = null;
    let parentKey: string | null = null;
    let index = -1;

    const nextChildren = node.children.map((child) => {
      const result = walk(child);
      if (result.tree !== child) {
        hasChanged = true;
      }
      if (result.removedNode && !removedNode) {
        removedNode = result.removedNode;
        parentKey = result.parentKey;
        index = result.index;
      }
      return result.tree;
    });

    return {
      tree: hasChanged ? { ...node, children: nextChildren } : node,
      removedNode,
      parentKey,
      index,
    };
  };

  return walk(root);
};

export const insertNodeAtParentIndex = (
  node: UiTreeNode,
  parentKey: string,
  index: number,
  insertedNode: UiTreeNode,
): UiTreeNode => {
  if (node.key === parentKey) {
    const children = node.children ?? [];
    const safeIndex = Math.max(0, Math.min(index, children.length));
    const nextChildren = [
      ...children.slice(0, safeIndex),
      insertedNode,
      ...children.slice(safeIndex),
    ];

    return {
      ...node,
      children: nextChildren,
    };
  }

  if (!node.children?.length) {
    return node;
  }

  let changed = false;
  const nextChildren = node.children.map((child) => {
    const next = insertNodeAtParentIndex(child, parentKey, index, insertedNode);
    if (next !== child) {
      changed = true;
    }
    return next;
  });

  return changed ? { ...node, children: nextChildren } : node;
};
