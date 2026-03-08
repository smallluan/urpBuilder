import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { CreateComponentStore, UiHistoryAction, UiTreeNode } from './type';
import {
  appendNodeByParentKey,
  findNodeByKey,
  insertNodeAtParentIndex,
  removeNodeByKey,
  toUiTreeNode,
  updateNodeByKey,
} from '../../../utils/createComponentTree';

const containsNodeKey = (node: { key: string; children?: { key: string; children?: any[] }[] }, targetKey: string): boolean => {
  if (node.key === targetKey) {
    return true;
  }

  if (!node.children?.length) {
    return false;
  }

  return node.children.some((child) => containsNodeKey(child, targetKey));
};

const pushHistoryAction = (actions: UiHistoryAction[], pointer: number, action: UiHistoryAction) => {
  const nextActions = pointer < actions.length - 1 ? actions.slice(0, pointer + 1) : actions;
  return [...nextActions, action];
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
  if (action.type === 'add') {
    return direction === 'undo'
      ? removeNodeByKey(tree, action.node.key).tree
      : insertNodeAtParentIndex(tree, action.parentKey, action.index, action.node);
  }

  if (action.type === 'remove') {
    return direction === 'undo'
      ? insertNodeAtParentIndex(tree, action.parentKey, action.index, action.node)
      : removeNodeByKey(tree, action.node.key).tree;
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
  // 不同于之前的实现，这里 ui 和流程共享一个树
  // 可以避免涉及到添加/回滚等操作时，要同时维护两个树
  // label 部分两个组件内部自己维护
  uiPageData: {
    key: uuidv4(),
    label: '该组件',
    children: [],
    props: {},
    lifetimes: []
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
        prevLabel: currentNode.label,
        nextLabel: label,
        timestamp: Date.now(),
      };
      const nextActions = pushHistoryAction(state.history.actions, state.history.pointer, action);

      return {
        uiPageData: nextTree,
        activeNode: resolveActiveNode(nextTree, state.activeNodeKey),
        history: {
          pointer: nextActions.length - 1,
          actions: nextActions,
        },
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
        propKey,
        prevValue,
        nextValue: value,
        timestamp: Date.now(),
      };
      const nextActions = pushHistoryAction(state.history.actions, state.history.pointer, action);

      return {
        uiPageData: nextTree,
        activeNode: resolveActiveNode(nextTree, state.activeNodeKey),
        history: {
          pointer: nextActions.length - 1,
          actions: nextActions,
        },
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
      const index = parentNode.children?.length ?? 0;
      const action: UiHistoryAction = {
        type: 'add',
        parentKey,
        index,
        node: newNode,
        timestamp: Date.now(),
      };

      const nextActions = pushHistoryAction(state.history.actions, state.history.pointer, action);
      const nextTree = appendNodeByParentKey(state.uiPageData, parentKey, newNode);
      const activeNode = resolveActiveNode(nextTree, state.activeNodeKey);
      return {
        uiPageData: nextTree,
        activeNode,
        history: {
          pointer: nextActions.length - 1,
          actions: nextActions,
        },
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

      const action: UiHistoryAction = {
        type: 'remove',
        parentKey: result.parentKey,
        index: result.index,
        node: result.removedNode,
        timestamp: Date.now(),
      };

      const nextActions = pushHistoryAction(state.history.actions, state.history.pointer, action);
      const shouldClearActive =
        !!state.activeNodeKey && containsNodeKey(result.removedNode, state.activeNodeKey);
      const nextActiveNodeKey = shouldClearActive ? null : state.activeNodeKey;
      const activeNode = resolveActiveNode(result.tree, nextActiveNodeKey);
      return {
        uiPageData: result.tree,
        activeNodeKey: nextActiveNodeKey,
        activeNode,
        history: {
          pointer: nextActions.length - 1,
          actions: nextActions,
        },
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

      const activeNode = resolveActiveNode(nextTree, state.activeNodeKey);

      return {
        uiPageData: nextTree,
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

      const activeNode = resolveActiveNode(nextTree, state.activeNodeKey);

      return {
        uiPageData: nextTree,
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

      if (clampedTarget < pointer) {
        for (let index = pointer; index > clampedTarget; index -= 1) {
          nextTree = applyHistoryAction(nextTree, actions[index], 'undo');
        }
      } else {
        for (let index = pointer + 1; index <= clampedTarget; index += 1) {
          nextTree = applyHistoryAction(nextTree, actions[index], 'redo');
        }
      }

      return {
        uiPageData: nextTree,
        activeNode: resolveActiveNode(nextTree, state.activeNodeKey),
        history: {
          pointer: clampedTarget,
          actions,
        },
      };
    }),
}));
