import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import cloneDeep from 'lodash/cloneDeep';
import isEqual from 'lodash/isEqual';
import type { Edge, Node } from '@xyflow/react';
import type { CreateComponentStore, UiHistoryAction, UiTreeNode } from './type';
import {
  appendNodeByParentKey,
  findNodeByKey,
  insertNodeAtParentIndex,
  removeNodeByKey,
  toUiTreeNode,
  updateNodeByKey,
} from '../../../utils/createComponentTree';

const HISTORY_MAX_ACTIONS = 200;

const nodePool = new Map<string, UiTreeNode>();

const saveNodeToPool = (node: UiTreeNode) => {
  nodePool.set(node.key, cloneDeep(node));
  return node.key;
};

const getNodeFromPool = (nodeRef: string) => {
  const node = nodePool.get(nodeRef);
  return node ? cloneDeep(node) : null;
};

const collectActionNodeRefs = (actions: UiHistoryAction[]) => {
  const refs = new Set<string>();
  actions.forEach((action) => {
    if (action.type === 'add' || action.type === 'remove') {
      refs.add(action.nodeRef);
    }
  });
  return refs;
};

const cleanupNodePool = (actions: UiHistoryAction[]) => {
  const usedRefs = collectActionNodeRefs(actions);
  for (const key of nodePool.keys()) {
    if (!usedRefs.has(key)) {
      nodePool.delete(key);
    }
  }
};

const containsNodeKey = (node: { key: string; children?: { key: string; children?: any[] }[] }, targetKey: string): boolean => {
  if (node.key === targetKey) {
    return true;
  }

  if (!node.children?.length) {
    return false;
  }

  return node.children.some((child) => containsNodeKey(child, targetKey));
};

const collectTreeKeys = (node: UiTreeNode, collector = new Set<string>()) => {
  collector.add(node.key);
  node.children?.forEach((child) => collectTreeKeys(child, collector));
  return collector;
};

const buildEntityPatch = <T extends { id: string }>(previous: T[], next: T[]) => {
  const previousMap = new Map(previous.map((item) => [item.id, item]));
  const nextMap = new Map(next.map((item) => [item.id, item]));

  const added = next.filter((item) => !previousMap.has(item.id)).map((item) => cloneDeep(item));
  const removed = previous
    .filter((item) => !nextMap.has(item.id))
    .map((item) => cloneDeep(item));

  const updated = previous
    .filter((item) => {
      const nextItem = nextMap.get(item.id);
      return !!nextItem && !isEqual(item, nextItem);
    })
    .map((item) => ({
      before: cloneDeep(item),
      after: cloneDeep(nextMap.get(item.id) as T),
    }));

  return {
    added,
    removed,
    updated,
  };
};

const applyEntityPatch = <T extends { id: string }>(
  current: T[],
  patch: {
    added: T[];
    removed: T[];
    updated: Array<{ before: T; after: T }>;
  },
  direction: 'undo' | 'redo',
) => {
  const nextMap = new Map(current.map((item) => [item.id, item]));

  if (direction === 'redo') {
    patch.removed.forEach((item) => {
      nextMap.delete(item.id);
    });

    patch.updated.forEach(({ after }) => {
      nextMap.set(after.id, cloneDeep(after));
    });

    patch.added.forEach((item) => {
      nextMap.set(item.id, cloneDeep(item));
    });
  } else {
    patch.added.forEach((item) => {
      nextMap.delete(item.id);
    });

    patch.updated.forEach(({ before }) => {
      nextMap.set(before.id, cloneDeep(before));
    });

    patch.removed.forEach((item) => {
      nextMap.set(item.id, cloneDeep(item));
    });
  }

  return Array.from(nextMap.values());
};

const applyFlowHistoryAction = (
  flowNodes: Node[],
  flowEdges: Edge[],
  action: UiHistoryAction,
  direction: 'undo' | 'redo',
) => {
  if (action.type === 'flow-edit') {
    const nextFlowNodes = applyEntityPatch(flowNodes, action.nodePatch, direction);
    const nextFlowNodeIds = new Set(nextFlowNodes.map((node) => node.id));
    const nextFlowEdges = applyEntityPatch(flowEdges, action.edgePatch, direction).filter(
      (edge) => nextFlowNodeIds.has(edge.source) && nextFlowNodeIds.has(edge.target),
    );

    return {
      flowNodes: nextFlowNodes,
      flowEdges: nextFlowEdges,
    };
  }

  if (action.type !== 'remove' || !action.flowSnapshot) {
    return { flowNodes, flowEdges };
  }

  const snapshotNodeIds = new Set(action.flowSnapshot.nodes.map((node) => node.id));
  const snapshotEdgeIds = new Set(action.flowSnapshot.edges.map((edge) => edge.id));

  if (direction === 'undo') {
    const existingNodeIds = new Set(flowNodes.map((node) => node.id));
    const mergedNodes = [...flowNodes, ...action.flowSnapshot.nodes.filter((node) => !existingNodeIds.has(node.id))];

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

    return {
      flowNodes: mergedNodes,
      flowEdges: mergedEdges,
    };
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

  return {
    flowNodes: nextFlowNodes,
    flowEdges: nextFlowEdges,
  };
};

const pushHistoryAction = (actions: UiHistoryAction[], pointer: number, action: UiHistoryAction) => {
  const branchActions = pointer < actions.length - 1 ? actions.slice(0, pointer + 1) : actions;
  const mergedActions = [...branchActions, action];
  const overflow = Math.max(0, mergedActions.length - HISTORY_MAX_ACTIONS);
  const nextActions = overflow > 0 ? mergedActions.slice(overflow) : mergedActions;
  cleanupNodePool(nextActions);

  return {
    actions: nextActions,
    pointer: nextActions.length - 1,
  };
};

const resolveActiveNode = (uiPageData: UiTreeNode, activeNodeKey: string | null) => {
  if (!activeNodeKey) {
    return null;
  }

  return findNodeByKey(uiPageData, activeNodeKey);
};

const applyHistoryAction = (
  tree: UiTreeNode,
  action: UiHistoryAction,
  direction: 'undo' | 'redo',
): UiTreeNode => {
  if (action.type === 'flow-edit') {
    return tree;
  }

  if (action.type === 'add') {
    const node = getNodeFromPool(action.nodeRef);
    if (!node) {
      return tree;
    }

    return direction === 'undo'
      ? removeNodeByKey(tree, action.nodeKey).tree
      : insertNodeAtParentIndex(tree, action.parentKey, action.index, node);
  }

  if (action.type === 'remove') {
    const node = getNodeFromPool(action.nodeRef);
    if (!node) {
      return tree;
    }

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

export const useCreateComponentStore = create<CreateComponentStore>((set) => ({
  screenSize: 'auto',
  autoWidth: 1800,
  flowNodes: [],
  flowEdges: [],
  flowActiveNodeId: null,
  // 不同于之前的实现，这里 ui 和流程共享一个树
  // 可以避免涉及到添加/回滚等操作时，要同时维护两个树
  // label 部分两个组件内部自己维护
  uiPageData: {
    key: uuidv4(),
    label: '该组件',
    children: [],
    props: {},
    lifetimes: [
      'onInit',
      'onBeforeMount',
      'onMounted',
      'onBeforeUpdate',
      'onUpdated',
      'onBeforeUnmount',
      'onUnmounted',
    ]
  },
  activeNodeKey: null,
  activeNode: null,
  treeInstance: null,
  history: {
    pointer: -1,
    actions: [],
  },
  // 更新当前开发尺寸选项
  setScreenSize: (screenSize) => set({ screenSize }),
  // 更新自适应模式下的自定义宽度
  setAutoWidth: (width) => set({ autoWidth: width }),
  setFlowNodes: (flowNodes) =>
    set((state) => {
      const nextFlowNodes =
        typeof flowNodes === 'function'
          ? (flowNodes as (previous: Node[]) => Node[])(state.flowNodes)
          : flowNodes;

      return {
        flowNodes: nextFlowNodes,
        flowActiveNodeId: state.flowActiveNodeId
          ? (nextFlowNodes.some((item) => item.id === state.flowActiveNodeId)
              ? state.flowActiveNodeId
              : null)
          : null,
      };
    }),
  setFlowEdges: (flowEdges) =>
    set((state) => ({
      flowEdges:
        typeof flowEdges === 'function'
          ? (flowEdges as (previous: Edge[]) => Edge[])(state.flowEdges)
          : flowEdges,
    })),
  setFlowActiveNodeId: (flowActiveNodeId) => set({ flowActiveNodeId }),
  // 设置当前激活节点：重复点击同一节点不会取消激活
  setActiveNode: (nodeKey) =>
    set((state) => {
      const nextActiveNodeKey = nodeKey ?? null;
      return {
        activeNodeKey: nextActiveNodeKey,
        activeNode: resolveActiveNode(state.uiPageData, nextActiveNodeKey),
      };
    }),
  // 切换当前激活节点：重复点击同一节点则取消激活
  toggleActiveNode: (nodeKey) =>
    set((state) => {
      const nextActiveNodeKey = state.activeNodeKey === nodeKey ? null : nodeKey ?? null;
      return {
        activeNodeKey: nextActiveNodeKey,
        activeNode: resolveActiveNode(state.uiPageData, nextActiveNodeKey),
      };
    }),
  updateActiveNodeLabel: (label) =>
    set((state) => {
      if (!state.activeNodeKey) {
        return state;
      }

      const currentNode = resolveActiveNode(state.uiPageData, state.activeNodeKey);
      if (!currentNode || currentNode.label === label) {
        return state;
      }

      const nextTree = updateNodeByKey(state.uiPageData, state.activeNodeKey, (target) => ({
        ...target,
        label,
      }));

      const action: UiHistoryAction = {
        type: 'update-label',
        nodeKey: state.activeNodeKey,
        nodeType: currentNode.type,
        prevLabel: currentNode.label,
        nextLabel: label,
        timestamp: Date.now(),
      };
      const nextHistory = pushHistoryAction(state.history.actions, state.history.pointer, action);

      return {
        uiPageData: nextTree,
        activeNode: resolveActiveNode(nextTree, state.activeNodeKey),
        history: nextHistory,
      };
    }),
  updateActiveNodeProp: (propKey, value) =>
    set((state) => {
      if (!state.activeNodeKey) {
        return state;
      }

      const currentNode = resolveActiveNode(state.uiPageData, state.activeNodeKey);
      if (!currentNode) {
        return state;
      }

      const currentProps = (currentNode.props ?? {}) as Record<string, unknown>;
      const currentProp = (currentProps[propKey] ?? {}) as Record<string, unknown>;
      const prevValue = currentProp.value;
      if (Object.is(prevValue, value)) {
        return state;
      }

      const nextTree = updateNodeByKey(state.uiPageData, state.activeNodeKey, (target) => {
        const currentProps = (target.props ?? {}) as Record<string, unknown>;
        const currentProp = (currentProps[propKey] ?? {}) as Record<string, unknown>;

        return {
          ...target,
          props: {
            ...currentProps,
            [propKey]: {
              ...currentProp,
              value,
            },
          },
        };
      });

      const action: UiHistoryAction = {
        type: 'update-prop',
        nodeKey: state.activeNodeKey,
        nodeLabel: currentNode.label,
        nodeType: currentNode.type,
        propKey,
        prevValue,
        nextValue: value,
        timestamp: Date.now(),
      };
      const nextHistory = pushHistoryAction(state.history.actions, state.history.pointer, action);

      return {
        uiPageData: nextTree,
        activeNode: resolveActiveNode(nextTree, state.activeNodeKey),
        history: nextHistory,
      };
    }),
  // 挂载/卸载左侧树组件实例
  setTreeInstance: (instance) => set({ treeInstance: instance }),
  // 将拖拽得到的组件结构插入到指定父节点下
  insertToUiPageData: (parentKey, componentData) =>
    set((state) => {
      const parentNode = findNodeByKey(state.uiPageData, parentKey);
      if (!parentNode) {
        return state;
      }

      const newNode = toUiTreeNode(componentData);
      const nodeRef = saveNodeToPool(newNode);
      const index = parentNode.children?.length ?? 0;
      const action: UiHistoryAction = {
        type: 'add',
        parentKey,
        index,
        nodeRef,
        nodeKey: newNode.key,
        nodeLabel: newNode.label,
        nodeType: newNode.type,
        timestamp: Date.now(),
      };

      const nextHistory = pushHistoryAction(state.history.actions, state.history.pointer, action);
      const nextTree = appendNodeByParentKey(state.uiPageData, parentKey, newNode);
      const activeNode = resolveActiveNode(nextTree, state.activeNodeKey);
      return {
        uiPageData: nextTree,
        activeNode,
        history: nextHistory,
      };
    }),
  // 删除指定节点并记录 remove 历史
  removeFromUiPageData: (nodeKey) =>
    set((state) => {
      if (nodeKey === state.uiPageData.key) {
        return state;
      }

      const result = removeNodeByKey(state.uiPageData, nodeKey);
      if (!result.removedNode || !result.parentKey || result.index < 0) {
        return state;
      }

      const removedTreeKeys = collectTreeKeys(result.removedNode);
      const flowNodesToRemove = state.flowNodes.filter((node) => {
        if (node.type !== 'componentNode') {
          return false;
        }

        const sourceKey = (node.data as { sourceKey?: string } | undefined)?.sourceKey;
        return typeof sourceKey === 'string' && removedTreeKeys.has(sourceKey);
      });

      const removedFlowNodeIds = new Set(flowNodesToRemove.map((node) => node.id));
      const flowEdgesToRemove = state.flowEdges.filter(
        (edge) => removedFlowNodeIds.has(edge.source) || removedFlowNodeIds.has(edge.target),
      );
      const removedFlowEdgeIds = new Set(flowEdgesToRemove.map((edge) => edge.id));

      const nextFlowNodes = state.flowNodes
        .filter((node) => !removedFlowNodeIds.has(node.id))
        .map((node) => {
          if (node.type !== 'eventFilterNode') {
            return node;
          }

          const nodeData = (node.data ?? {}) as {
            upstreamNodeId?: string;
            upstreamLabel?: string;
            availableLifetimes?: string[];
            selectedLifetimes?: string[];
          };

          if (!nodeData.upstreamNodeId || !removedFlowNodeIds.has(nodeData.upstreamNodeId)) {
            return node;
          }

          return {
            ...node,
            data: {
              ...nodeData,
              upstreamNodeId: undefined,
              upstreamLabel: undefined,
              availableLifetimes: [],
              selectedLifetimes: [],
            },
          };
        });

      const nextFlowNodeIds = new Set(nextFlowNodes.map((node) => node.id));
      const nextFlowEdges = state.flowEdges.filter(
        (edge) =>
          !removedFlowEdgeIds.has(edge.id) &&
          !removedFlowNodeIds.has(edge.source) &&
          !removedFlowNodeIds.has(edge.target) &&
          nextFlowNodeIds.has(edge.source) &&
          nextFlowNodeIds.has(edge.target),
      );

      const flowSnapshot =
        flowNodesToRemove.length > 0 || flowEdgesToRemove.length > 0
          ? {
              nodes: cloneDeep(flowNodesToRemove),
              edges: cloneDeep(flowEdgesToRemove),
            }
          : undefined;

      const nodeRef = saveNodeToPool(result.removedNode);

      const action: UiHistoryAction = {
        type: 'remove',
        parentKey: result.parentKey,
        index: result.index,
        nodeRef,
        nodeKey: result.removedNode.key,
        nodeLabel: result.removedNode.label,
        nodeType: result.removedNode.type,
        flowSnapshot,
        timestamp: Date.now(),
      };

      const nextHistory = pushHistoryAction(state.history.actions, state.history.pointer, action);
      const shouldClearActive =
        !!state.activeNodeKey && containsNodeKey(result.removedNode, state.activeNodeKey);
      const nextActiveNodeKey = shouldClearActive ? null : state.activeNodeKey;
      const activeNode = resolveActiveNode(result.tree, nextActiveNodeKey);
      return {
        uiPageData: result.tree,
        flowNodes: nextFlowNodes,
        flowEdges: nextFlowEdges,
        activeNodeKey: nextActiveNodeKey,
        activeNode,
        history: nextHistory,
      };
    }),
  recordFlowEditHistory: (actionLabel, prevFlowNodes, prevFlowEdges, nextFlowNodes, nextFlowEdges) =>
    set((state) => {
      const nodePatch = buildEntityPatch(prevFlowNodes, nextFlowNodes);
      const edgePatch = buildEntityPatch(prevFlowEdges, nextFlowEdges);
      const hasNodeChange =
        nodePatch.added.length > 0 || nodePatch.removed.length > 0 || nodePatch.updated.length > 0;
      const hasEdgeChange =
        edgePatch.added.length > 0 || edgePatch.removed.length > 0 || edgePatch.updated.length > 0;

      if (!hasNodeChange && !hasEdgeChange) {
        return state;
      }

      const action: UiHistoryAction = {
        type: 'flow-edit',
        actionLabel,
        nodePatch,
        edgePatch,
        timestamp: Date.now(),
      };
      const nextHistory = pushHistoryAction(state.history.actions, state.history.pointer, action);

      return {
        flowNodes: nextFlowNodes,
        flowEdges: nextFlowEdges,
        history: nextHistory,
      };
    }),
  updateFlowNodeData: (nodeId, updater, actionLabel = '更新流程节点配置') =>
    set((state) => {
      const targetNode = state.flowNodes.find((item) => item.id === nodeId);
      if (!targetNode) {
        return state;
      }

      const currentData = (targetNode.data ?? {}) as Record<string, unknown>;
      const nextData = updater(currentData);

      if (isEqual(currentData, nextData)) {
        return state;
      }

      const nextFlowNodes = state.flowNodes.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              data: nextData,
            }
          : node,
      );

      const nodePatch = buildEntityPatch(state.flowNodes, nextFlowNodes);
      const edgePatch = buildEntityPatch(state.flowEdges, state.flowEdges);
      const action: UiHistoryAction = {
        type: 'flow-edit',
        actionLabel,
        nodePatch,
        edgePatch,
        timestamp: Date.now(),
      };
      const nextHistory = pushHistoryAction(state.history.actions, state.history.pointer, action);

      return {
        flowNodes: nextFlowNodes,
        history: nextHistory,
      };
    }),
  // 回退一步：对当前 action 执行逆操作
  undo: () =>
    set((state) => {
      const { pointer, actions } = state.history;
      if (pointer < 0) {
        return state;
      }

      const action = actions[pointer];
      const nextTree = applyHistoryAction(state.uiPageData, action, 'undo');
      const nextFlow = applyFlowHistoryAction(state.flowNodes, state.flowEdges, action, 'undo');

      const activeNode = resolveActiveNode(nextTree, state.activeNodeKey);

      return {
        uiPageData: nextTree,
        flowNodes: nextFlow.flowNodes,
        flowEdges: nextFlow.flowEdges,
        activeNode,
        history: {
          pointer: pointer - 1,
          actions,
        },
      };
    }),
  // 重做一步：对下一条 action 执行正向操作
  redo: () =>
    set((state) => {
      const { pointer, actions } = state.history;
      const nextPointer = pointer + 1;
      if (nextPointer >= actions.length) {
        return state;
      }

      const action = actions[nextPointer];
      const nextTree = applyHistoryAction(state.uiPageData, action, 'redo');
      const nextFlow = applyFlowHistoryAction(state.flowNodes, state.flowEdges, action, 'redo');

      const activeNode = resolveActiveNode(nextTree, state.activeNodeKey);

      return {
        uiPageData: nextTree,
        flowNodes: nextFlow.flowNodes,
        flowEdges: nextFlow.flowEdges,
        activeNode,
        history: {
          pointer: nextPointer,
          actions,
        },
      };
    }),
  jumpToHistory: (targetPointer) =>
    set((state) => {
      const { pointer, actions } = state.history;
      const clampedTarget = Math.max(-1, Math.min(targetPointer, actions.length - 1));
      if (clampedTarget === pointer) {
        return state;
      }

      let nextTree = state.uiPageData;
      let nextFlowNodes = state.flowNodes;
      let nextFlowEdges = state.flowEdges;

      if (clampedTarget < pointer) {
        for (let index = pointer; index > clampedTarget; index -= 1) {
          nextTree = applyHistoryAction(nextTree, actions[index], 'undo');
          const nextFlow = applyFlowHistoryAction(nextFlowNodes, nextFlowEdges, actions[index], 'undo');
          nextFlowNodes = nextFlow.flowNodes;
          nextFlowEdges = nextFlow.flowEdges;
        }
      } else {
        for (let index = pointer + 1; index <= clampedTarget; index += 1) {
          nextTree = applyHistoryAction(nextTree, actions[index], 'redo');
          const nextFlow = applyFlowHistoryAction(nextFlowNodes, nextFlowEdges, actions[index], 'redo');
          nextFlowNodes = nextFlow.flowNodes;
          nextFlowEdges = nextFlow.flowEdges;
        }
      }

      return {
        uiPageData: nextTree,
        flowNodes: nextFlowNodes,
        flowEdges: nextFlowEdges,
        activeNode: resolveActiveNode(nextTree, state.activeNodeKey),
        history: {
          pointer: clampedTarget,
          actions,
        },
      };
    }),
}));
