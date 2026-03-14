/**
 * builder store 纯辅助函数集。
 * 不依赖 React/Zustand，全部为无副作用的纯函数或模块级缓存工具，
 * 便于测试和在多个 store 实例间复用。
 */

import cloneDeep from 'lodash/cloneDeep';
import isEqual from 'lodash/isEqual';
import type { Edge, Node } from '@xyflow/react';
import type {
  BuiltInLayoutTemplateId,
  UiHistoryAction,
  UiHistoryState,
  UiTreeNode,
} from './types';
import {
  findNodeByKey,
  insertNodeAtParentIndex,
  removeNodeByKey,
  updateNodeByKey,
} from '../../utils/createComponentTree';
import { findNodePathByKey } from '../utils/tree';

export const HISTORY_MAX_ACTIONS = 200;
export const COMPONENT_KEY_PATTERN = /^[A-Za-z0-9_-]+$/;

// 历史记录中 add/remove 只保存 nodeRef（key），实际节点快照放内存池，
// 避免 history 里反复存大对象导致体积膨胀。
const nodePool = new Map<string, UiTreeNode>();

export const saveNodeToPool = (node: UiTreeNode): string => {
  nodePool.set(node.key, cloneDeep(node));
  return node.key;
};

export const getNodeFromPool = (nodeRef: string): UiTreeNode | null => {
  const node = nodePool.get(nodeRef);
  return node ? cloneDeep(node) : null;
};

const collectActionNodeRefs = (actions: UiHistoryAction[]): Set<string> => {
  const refs = new Set<string>();
  actions.forEach((action) => {
    if (action.type === 'add' || action.type === 'remove') {
      refs.add(action.nodeRef);
    }
  });
  return refs;
};

export const cleanupNodePool = (actions: UiHistoryAction[]): void => {
  const usedRefs = collectActionNodeRefs(actions);
  for (const key of nodePool.keys()) {
    if (!usedRefs.has(key)) {
      nodePool.delete(key);
    }
  }
};

// ===========================
// 树节点工具
// ===========================

export const containsNodeKey = (
  node: { key: string; children?: unknown[] },
  targetKey: string,
): boolean => {
  if (node.key === targetKey) return true;
  if (!node.children?.length) return false;
  return (node.children as { key: string; children?: unknown[] }[]).some((child) =>
    containsNodeKey(child, targetKey),
  );
};

/** 收集子树全部 key，用于删除组件时级联清理对应流程节点。 */
export const collectTreeKeys = (node: UiTreeNode, collector = new Set<string>()): Set<string> => {
  collector.add(node.key);
  node.children?.forEach((child) => collectTreeKeys(child, collector));
  return collector;
};

/** key 全局唯一校验（支持排除自身，用于重命名场景）。 */
export const hasDuplicateKey = (
  node: UiTreeNode,
  targetKey: string,
  excludeKey?: string,
): boolean => {
  if (node.key === targetKey && node.key !== excludeKey) return true;
  if (!node.children?.length) return false;
  return node.children.some((child) => hasDuplicateKey(child, targetKey, excludeKey));
};

// ===========================
// 流程图实体 Patch
// ===========================

export const buildEntityPatch = <T extends { id: string }>(
  previous: T[],
  next: T[],
): { added: T[]; removed: T[]; updated: Array<{ before: T; after: T }> } => {
  const previousMap = new Map(previous.map((item) => [item.id, item]));
  const nextMap = new Map(next.map((item) => [item.id, item]));

  const added = next.filter((item) => !previousMap.has(item.id)).map((item) => cloneDeep(item));
  const removed = previous.filter((item) => !nextMap.has(item.id)).map((item) => cloneDeep(item));
  const updated = previous
    .filter((item) => {
      const nextItem = nextMap.get(item.id);
      return !!nextItem && !isEqual(item, nextItem);
    })
    .map((item) => ({
      before: cloneDeep(item),
      after: cloneDeep(nextMap.get(item.id) as T),
    }));

  return { added, removed, updated };
};

export const applyEntityPatch = <T extends { id: string }>(
  current: T[],
  patch: { added: T[]; removed: T[]; updated: Array<{ before: T; after: T }> },
  direction: 'undo' | 'redo',
): T[] => {
  const nextMap = new Map(current.map((item) => [item.id, item]));

  if (direction === 'redo') {
    patch.removed.forEach((item) => nextMap.delete(item.id));
    patch.updated.forEach(({ after }) => nextMap.set(after.id, cloneDeep(after)));
    patch.added.forEach((item) => nextMap.set(item.id, cloneDeep(item)));
  } else {
    patch.added.forEach((item) => nextMap.delete(item.id));
    patch.updated.forEach(({ before }) => nextMap.set(before.id, cloneDeep(before)));
    patch.removed.forEach((item) => nextMap.set(item.id, cloneDeep(item)));
  }

  return Array.from(nextMap.values());
};

export const applyFlowHistoryAction = (
  flowNodes: Node[],
  flowEdges: Edge[],
  action: UiHistoryAction,
  direction: 'undo' | 'redo',
): { flowNodes: Node[]; flowEdges: Edge[] } => {
  if (action.type === 'flow-edit') {
    const nextFlowNodes = applyEntityPatch(flowNodes, action.nodePatch, direction);
    const nextFlowNodeIds = new Set(nextFlowNodes.map((node) => node.id));
    const nextFlowEdges = applyEntityPatch(flowEdges, action.edgePatch, direction).filter(
      (edge) => nextFlowNodeIds.has(edge.source) && nextFlowNodeIds.has(edge.target),
    );
    return { flowNodes: nextFlowNodes, flowEdges: nextFlowEdges };
  }

  if (action.type !== 'remove' || !action.flowSnapshot) {
    return { flowNodes, flowEdges };
  }

  const snapshotNodeIds = new Set(action.flowSnapshot.nodes.map((node) => node.id));
  const snapshotEdgeIds = new Set(action.flowSnapshot.edges.map((edge) => edge.id));

  if (direction === 'undo') {
    const existingNodeIds = new Set(flowNodes.map((node) => node.id));
    const mergedNodes = [
      ...flowNodes,
      ...action.flowSnapshot.nodes.filter((node) => !existingNodeIds.has(node.id)),
    ];
    const mergedNodeIds = new Set(mergedNodes.map((node) => node.id));
    const existingEdgeIds = new Set(flowEdges.map((edge) => edge.id));
    const mergedEdges = [
      ...flowEdges,
      ...action.flowSnapshot.edges.filter(
        (edge) =>
          !existingEdgeIds.has(edge.id) &&
          mergedNodeIds.has(edge.source) &&
          mergedNodeIds.has(edge.target),
      ),
    ];
    return { flowNodes: mergedNodes, flowEdges: mergedEdges };
  }

  const nextFlowNodes = flowNodes.filter((node) => !snapshotNodeIds.has(node.id));
  const nextFlowNodeIds = new Set(nextFlowNodes.map((node) => node.id));
  const nextFlowEdges = flowEdges.filter(
    (edge) =>
      !snapshotEdgeIds.has(edge.id) &&
      !snapshotNodeIds.has(edge.source) &&
      !snapshotNodeIds.has(edge.target) &&
      nextFlowNodeIds.has(edge.source) &&
      nextFlowNodeIds.has(edge.target),
  );
  return { flowNodes: nextFlowNodes, flowEdges: nextFlowEdges };
};

// ===========================
// 历史分支管理
// ===========================

/** 历史分支策略：写入新动作时截断"未来分支"，并强制上限。 */
export const pushHistoryAction = (
  actions: UiHistoryAction[],
  pointer: number,
  action: UiHistoryAction,
): UiHistoryState => {
  const branchActions = pointer < actions.length - 1 ? actions.slice(0, pointer + 1) : actions;
  const mergedActions = [...branchActions, action];
  const overflow = Math.max(0, mergedActions.length - HISTORY_MAX_ACTIONS);
  const nextActions = overflow > 0 ? mergedActions.slice(overflow) : mergedActions;
  cleanupNodePool(nextActions);
  return { actions: nextActions, pointer: nextActions.length - 1 };
};

/** 对单条历史动作执行正向/逆向变换，返回新 UI 树。 */
export const applyHistoryAction = (
  tree: UiTreeNode,
  action: UiHistoryAction,
  direction: 'undo' | 'redo',
): UiTreeNode => {
  if (action.type === 'flow-edit') return tree;

  if (action.type === 'add') {
    const node = getNodeFromPool(action.nodeRef);
    if (!node) return tree;
    return direction === 'undo'
      ? removeNodeByKey(tree, action.nodeKey).tree
      : insertNodeAtParentIndex(tree, action.parentKey, action.index, node);
  }

  if (action.type === 'remove') {
    const node = getNodeFromPool(action.nodeRef);
    if (!node) return tree;
    return direction === 'undo'
      ? insertNodeAtParentIndex(tree, action.parentKey, action.index, node)
      : removeNodeByKey(tree, action.nodeKey).tree;
  }

  if (action.type === 'update-label') {
    return updateNodeByKey(tree, action.nodeKey, (target) => ({
      ...target,
      label: direction === 'undo' ? action.prevLabel : action.nextLabel,
    }));
  }

  if (action.type === 'replace-layout') {
    const layoutTemplateId =
      direction === 'undo' ? action.prevLayoutTemplateId : action.nextLayoutTemplateId;
    const children = direction === 'undo' ? action.prevChildren : action.nextChildren;
    return {
      ...tree,
      props: {
        ...(tree.props ?? {}),
        __layoutTemplate: { name: '布局模板', value: layoutTemplateId },
      },
      children: cloneDeep(children),
    };
  }

  // update-prop
  return updateNodeByKey(tree, action.nodeKey, (target) => {
    const currentProps = (target.props ?? {}) as Record<string, unknown>;
    const currentProp = (currentProps[action.propKey] ?? {}) as Record<string, unknown>;
    return {
      ...target,
      props: {
        ...currentProps,
        [action.propKey]: {
          ...currentProp,
          value: direction === 'undo' ? action.prevValue : action.nextValue,
        },
      },
    };
  });
};

// ===========================
// 辅助解析
// ===========================

const DEBUG_VISIBLE_NODE_TYPES = new Set(['Drawer']);

export const resolveActiveNode = (
  uiPageData: UiTreeNode,
  activeNodeKey: string | null,
): UiTreeNode | null => {
  if (!activeNodeKey) return null;
  return findNodeByKey(uiPageData, activeNodeKey);
};

export const resolveLayoutTemplateId = (uiPageData: UiTreeNode): BuiltInLayoutTemplateId | null => {
  const layoutMeta = (uiPageData.props?.__layoutTemplate as { value?: unknown } | undefined)?.value;
  if (
    layoutMeta === 'header-body' ||
    layoutMeta === 'header-aside-body' ||
    layoutMeta === 'header-body-footer' ||
    layoutMeta === 'header-aside-body-footer'
  ) {
    return layoutMeta as BuiltInLayoutTemplateId;
  }
  return null;
};

export const syncDebugVisibleByActiveNode = (
  uiPageData: UiTreeNode,
  prevActiveNodeKey: string | null,
  nextActiveNodeKey: string | null,
): UiTreeNode => {
  let nextTree = uiPageData;

  const collectDebugVisibleKeys = (targetKey: string | null): Set<string> => {
    if (!targetKey) return new Set<string>();
    const path = findNodePathByKey(nextTree, targetKey) ?? [];
    return new Set(
      path
        .filter((item) => !!item.type && DEBUG_VISIBLE_NODE_TYPES.has(item.type))
        .map((item) => item.key),
    );
  };

  const applyVisible = (targetKey: string | null, expectedVisible: boolean): void => {
    if (!targetKey) return;
    const targetNode = findNodeByKey(nextTree, targetKey);
    if (!targetNode || !targetNode.type || !DEBUG_VISIBLE_NODE_TYPES.has(targetNode.type)) return;

    const currentVisible = (targetNode.props?.visible as { value?: unknown } | undefined)?.value;
    if (currentVisible === expectedVisible) return;

    nextTree = updateNodeByKey(nextTree, targetKey, (target) => {
      const currentProps = (target.props ?? {}) as Record<string, unknown>;
      const currentVisibleProp = (currentProps.visible ?? {}) as Record<string, unknown>;
      return {
        ...target,
        props: {
          ...currentProps,
          visible: { ...currentVisibleProp, value: expectedVisible },
        },
      };
    });
  };

  const previousVisibleKeys = collectDebugVisibleKeys(prevActiveNodeKey);
  const nextVisibleKeys = collectDebugVisibleKeys(nextActiveNodeKey);

  previousVisibleKeys.forEach((key) => {
    if (!nextVisibleKeys.has(key)) applyVisible(key, false);
  });
  nextVisibleKeys.forEach((key) => applyVisible(key, true));

  return nextTree;
};
