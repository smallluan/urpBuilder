import { findNodeByKey } from '../../utils/createComponentTree';
import type { UiTreeNode } from '../store/types';

/** 结构树「以某节点为根展示」时的展示根；virtualKey 无效时回退整棵树。 */
export function resolveStructureDisplayRoot(fullRoot: UiTreeNode, virtualKey: string | null): UiTreeNode {
  const k = String(virtualKey ?? '').trim();
  if (!k || k === fullRoot.key) {
    return fullRoot;
  }
  return findNodeByKey(fullRoot, k) ?? fullRoot;
}

/** virtualKey 已设但在当前树中找不到对应节点时应清除虚拟根。 */
export function isVirtualStructureRootKeyValid(fullRoot: UiTreeNode, virtualKey: string | null): boolean {
  const k = String(virtualKey ?? '').trim();
  if (!k || k === fullRoot.key) {
    return true;
  }
  return findNodeByKey(fullRoot, k) != null;
}
