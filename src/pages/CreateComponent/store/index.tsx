import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { CreateComponentStore, UiHistoryAction } from './type';
import {
  appendNodeByParentKey,
  findNodeByKey,
  insertNodeAtParentIndex,
  removeNodeByKey,
  toUiTreeNode,
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
    set((state) => ({
      activeNodeKey: state.activeNodeKey === nodeKey ? null : nodeKey ?? null,
    })),
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
      return {
        uiPageData: appendNodeByParentKey(state.uiPageData, parentKey, newNode),
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
      return {
        uiPageData: result.tree,
        activeNodeKey: shouldClearActive ? null : state.activeNodeKey,
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
      let nextTree = state.uiPageData;

      if (action.type === 'add') {
        nextTree = removeNodeByKey(nextTree, action.node.key).tree;
      } else if (action.type === 'remove') {
        nextTree = insertNodeAtParentIndex(nextTree, action.parentKey, action.index, action.node);
      }

      return {
        uiPageData: nextTree,
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
      let nextTree = state.uiPageData;

      if (action.type === 'add') {
        nextTree = insertNodeAtParentIndex(nextTree, action.parentKey, action.index, action.node);
      } else if (action.type === 'remove') {
        nextTree = removeNodeByKey(nextTree, action.node.key).tree;
      }

      return {
        uiPageData: nextTree,
        history: {
          pointer: nextPointer,
          actions,
        },
      };
    }),
}));
