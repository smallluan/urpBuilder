import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { CreateComponentStore, UiTreeNode } from './type';

const toUiTreeNode = (componentData: Record<string, unknown>): UiTreeNode => {
  const name = typeof componentData.name === 'string' ? componentData.name : '';
  const type = typeof componentData.type === 'string' ? componentData.type : '';
  const props =
    componentData.props && typeof componentData.props === 'object'
      ? (componentData.props as Record<string, unknown>)
      : {};
  const lifetimes = Array.isArray(componentData.lifetimes)
    ? componentData.lifetimes.filter((item): item is string => typeof item === 'string')
    : [];

  const nodeKey = uuidv4();
  return {
    key: nodeKey,
    label: name || type || '未命名组件',
    type,
    props,
    lifetimes,
    children: [],
  };
};

const appendNodeByParentKey = (node: UiTreeNode, parentKey: string, newNode: UiTreeNode): UiTreeNode => {
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
  treeInstance: null,
  setScreenSize: (screenSize) => set({ screenSize }),
  setAutoWidth: (width) => set({ autoWidth: width }),
  setTreeInstance: (instance) => set({ treeInstance: instance }),
  insertToUiPageData: (parentKey, componentData) =>
    set((state) => {
      const newNode = toUiTreeNode(componentData);
      return {
        uiPageData: appendNodeByParentKey(state.uiPageData, parentKey, newNode),
      };
    }),
}));
