import type { UiTreeNode } from '../store/type';

export const findNodePathByKey = (
  node: UiTreeNode,
  targetKey: string,
  path: UiTreeNode[] = [],
): UiTreeNode[] | null => {
  const nextPath = [...path, node];
  if (node.key === targetKey) {
    return nextPath;
  }

  if (!node.children?.length) {
    return null;
  }

  for (const child of node.children) {
    const found = findNodePathByKey(child, targetKey, nextPath);
    if (found) {
      return found;
    }
  }

  return null;
};