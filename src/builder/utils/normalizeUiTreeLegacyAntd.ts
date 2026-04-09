import cloneDeep from 'lodash/cloneDeep';
import type { PageRouteRecord, UiTreeNode } from '../store/types';
import { ANTD_TD_MIRROR_PAIRS } from '../../config/antdCatalogMirror';

const ANTD_TO_PAIR = new Map(ANTD_TD_MIRROR_PAIRS.map((p) => [p.antdType, p]));

function migrateAntdOnlyNode(node: UiTreeNode): UiTreeNode {
  return {
    ...node,
    type: 'Typography.Paragraph',
    label: node.label || '段落',
    props: {
      content: {
        name: '文本内容',
        value: '（已移除不兼容的 Ant Design 独占组件，请从组件库选用 TDesign 物料替换）',
        editType: 'input',
      },
    },
    children: [],
  };
}

function migrateOne(node: UiTreeNode): UiTreeNode {
  const t = String(node.type ?? '').trim();
  if (!t.startsWith('antd.')) {
    return {
      ...node,
      children: (node.children ?? []).map(migrateOne),
    };
  }

  const pair = ANTD_TO_PAIR.get(t);
  if (pair) {
    const next: UiTreeNode = {
      ...cloneDeep(node),
      type: pair.tdesignType,
    };
    const props = { ...(next.props ?? {}) };
    if (t === 'antd.Modal') {
      props.shellPresentation = {
        name: '壳形态',
        value: 'dialog',
        editType: 'select',
        payload: {
          options: [
            { label: '抽屉', value: 'drawer' },
            { label: '对话框', value: 'dialog' },
          ],
        },
      };
    } else if (t === 'antd.Drawer') {
      props.shellPresentation = {
        name: '壳形态',
        value: 'drawer',
        editType: 'select',
        payload: {
          options: [
            { label: '抽屉', value: 'drawer' },
            { label: '对话框', value: 'dialog' },
          ],
        },
      };
    }
    next.props = props;
    next.children = (next.children ?? []).map(migrateOne);
    return next;
  }

  const fallback = migrateAntdOnlyNode(node);
  return {
    ...fallback,
    children: (node.children ?? []).map(migrateOne),
  };
}

/**
 * 将历史数据中的 antd.* 节点类型收敛为 TDesign 物料 type（单一 DSL）。
 */
export function normalizeUiTreeLegacyAntdTypes(root: UiTreeNode): UiTreeNode {
  return migrateOne(cloneDeep(root));
}

export function normalizePageRoutesUiTrees(
  routes: PageRouteRecord[],
): PageRouteRecord[] {
  return routes.map((route) => ({
    ...route,
    uiTree: normalizeUiTreeLegacyAntdTypes(route.uiTree),
  }));
}
