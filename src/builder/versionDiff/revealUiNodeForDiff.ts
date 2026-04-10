import cloneDeep from 'lodash/cloneDeep';
import type { UiTreeNode } from '../store/types';
import { findNodePathByKey } from '../utils/tree';
import { updateNodeByKey } from '../../utils/createComponentTree';
import { getNodeSlotKey } from '../utils/slot';

function patchSchemaValue(prop: unknown, nextVal: string | number): Record<string, unknown> {
  if (prop && typeof prop === 'object' && !Array.isArray(prop) && 'value' in (prop as object)) {
    return { ...(prop as Record<string, unknown>), value: nextVal };
  }
  return { name: 'value', value: nextVal, editType: 'string' };
}

/**
 * 为对比跳转临时展开路径：Tabs 切到含目标的面板、visible=false 改为展示。
 * 不处理 Collapse/Drawer 的全部变体，后续可补。
 */
export function revealUiNodePath(tree: UiTreeNode, targetKey: string): UiTreeNode {
  const path = findNodePathByKey(tree, targetKey);
  if (!path?.length) {
    return tree;
  }

  let next = cloneDeep(tree);

  for (const node of path) {
    next = updateNodeByKey(next, node.key, (n) => {
      const vis = n.props?.visible as { value?: unknown } | undefined;
      if (vis && vis.value === false) {
        return {
          ...n,
          props: {
            ...n.props,
            visible: { ...vis, value: true },
          },
        };
      }
      return n;
    });
  }

  for (let i = 0; i < path.length - 1; i += 1) {
    const parent = path[i];
    const child = path[i + 1];
    const pt = String(parent.type ?? '');
    if (pt !== 'Tabs' && pt !== 'antd.Tabs') {
      continue;
    }
    const sk = getNodeSlotKey(child);
    if (!sk?.startsWith('panel:')) {
      continue;
    }
    const tabValRaw = sk.slice('panel:'.length);
    const tabVal = Number.isFinite(Number(tabValRaw)) && String(Number(tabValRaw)) === tabValRaw ? Number(tabValRaw) : tabValRaw;

    next = updateNodeByKey(next, parent.key, (n) => {
      const props = { ...(n.props ?? {}) } as Record<string, unknown>;
      if (props.value !== undefined) {
        props.value = patchSchemaValue(props.value, tabVal as string & number);
      }
      if (props.defaultValue !== undefined) {
        props.defaultValue = patchSchemaValue(props.defaultValue, tabVal as string & number);
      }
      if (props.value === undefined && props.defaultValue === undefined) {
        props.defaultValue = patchSchemaValue(undefined, tabVal as string & number);
      }
      return { ...n, props };
    });
  }

  return next;
}
