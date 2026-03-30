import type { UiTreeNode } from '../builder/store/types';
import { findNodeByKey, updateNodeByKey } from './createComponentTree';

/** 与 CreatePage / createBuilderStore 中合成逻辑一致：把路由私有树挂到共享布局的出口下 */
export const composeRouteUiTreeForEditor = (
  privateTree: UiTreeNode,
  sharedUiTree: UiTreeNode | null,
  outletKey: string | null,
): UiTreeNode => {
  if (!sharedUiTree || !outletKey) {
    return privateTree;
  }

  const sharedOutlet = findNodeByKey(sharedUiTree, outletKey);
  if (!sharedOutlet) {
    return privateTree;
  }

  const privateOutlet = findNodeByKey(privateTree, outletKey);
  const outletChildren = privateOutlet?.type === 'RouteOutlet'
    ? (privateOutlet.children ?? [])
    : [];

  return updateNodeByKey(sharedUiTree, outletKey, (target) => ({
    ...target,
    children: outletChildren,
  }));
};
