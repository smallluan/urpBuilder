/**
 * createBuilderStore —— Builder store 工厂函数。
 *
 * 设计目标：
 * 1. 零副作用：调用方独立控制 store 实例生命周期。
 * 2. 可插拔：通过 options 注入页面级差异能力（布局节点生成、初始根节点等），
 *    方便 CreateComponent / CreatePage 复用同一套 store 骨架。
 * 3. 向后兼容：CreateComponent 直接调用此工厂，对外导出名保持 useCreateComponentStore 不变。
 */

import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import cloneDeep from 'lodash/cloneDeep';
import type { Edge, Node } from '@xyflow/react';
import type { BuilderStore, BuiltInLayoutTemplateId, UiHistoryAction, UiTreeNode } from './types';
import {
  appendNodeByParentKey,
  findNodeByKey,
  removeNodeByKey,
  toUiTreeNode,
  updateNodeByKey,
} from '../../../utils/createComponentTree';
import { normalizeTabsList, syncTabsSlotNodes } from '../utils/tabs';
import {
  buildEntityPatch,
  cleanupNodePool,   // re-used via pushHistoryAction
  collectTreeKeys,
  containsNodeKey,
  hasDuplicateKey,
  pushHistoryAction,
  resolveActiveNode,
  resolveLayoutTemplateId,
  saveNodeToPool,
  syncDebugVisibleByActiveNode,
  applyHistoryAction,
  applyFlowHistoryAction,
  COMPONENT_KEY_PATTERN,
} from './helpers';

// 在不需要直接使用 cleanupNodePool 的场景下，其封装已由 pushHistoryAction 内部调用
void cleanupNodePool;

export interface CreateBuilderStoreOptions {
  /**
   * 根据内置布局模板 ID 生成初始子节点列表。
   * 由使用方（如 CreateComponent）注入具体实现，避免 BuilderCore 直接依赖
   * CreateComponent 的布局模板数据（循环依赖隔离）。
   */
  buildLayoutNodes?: (templateId: BuiltInLayoutTemplateId) => UiTreeNode[];

  /**
   * Store 初始化时根节点的覆盖配置。
   * 不传时使用通用默认值（空 label，通用 lifetimes）。
   */
  initialRootNode?: Partial<Omit<UiTreeNode, 'children'>>;
}

const DEFAULT_ROOT_NODE: UiTreeNode = {
  key: uuidv4(),
  label: '根节点',
  children: [],
  props: {},
  lifetimes: [],
};

export const createBuilderStore = (options: CreateBuilderStoreOptions = {}) => {
  const { buildLayoutNodes, initialRootNode } = options;
  const rootNode: UiTreeNode = {
    ...DEFAULT_ROOT_NODE,
    ...initialRootNode,
    key: initialRootNode?.key ?? uuidv4(),
  };

  return create<BuilderStore>((set) => ({
    // ===== 视图环境 =====
    screenSize: 'auto',
    autoWidth: 1800,
    currentPageId: '',
    currentPageName: '',

    // ===== 流程图状态 =====
    flowNodes: [],
    flowEdges: [],
    flowActiveNodeId: null,

    // ===== UI 树状态 =====
    uiPageData: rootNode,
    activeNodeKey: null,
    activeNode: null,
    selectedLayoutTemplateId: null,
    treeInstance: null,

    // ===== 历史系统 =====
    history: { pointer: -1, actions: [] },

    // ===== Actions — 视图环境 =====

    setScreenSize: (screenSize) => set({ screenSize }),

    setAutoWidth: (width) => set({ autoWidth: width }),

    setCurrentPageMeta: ({ pageId, pageName }) =>
      set((state) => ({
        currentPageId: pageId ?? state.currentPageId,
        currentPageName: pageName ?? state.currentPageName,
      })),

    // ===== Actions — 流程图 =====

    setFlowNodes: (flowNodes) =>
      set((state) => {
        const nextFlowNodes =
          typeof flowNodes === 'function'
            ? (flowNodes as (previous: Node[]) => Node[])(state.flowNodes)
            : flowNodes;
        return {
          flowNodes: nextFlowNodes,
          flowActiveNodeId: state.flowActiveNodeId
            ? nextFlowNodes.some((item) => item.id === state.flowActiveNodeId)
              ? state.flowActiveNodeId
              : null
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

    // ===== Actions — UI 树 =====

    setActiveNode: (nodeKey) =>
      set((state) => {
        const nextActiveNodeKey = nodeKey ?? null;
        const nextTree = syncDebugVisibleByActiveNode(
          state.uiPageData,
          state.activeNodeKey,
          nextActiveNodeKey,
        );
        return {
          uiPageData: nextTree,
          activeNodeKey: nextActiveNodeKey,
          activeNode: resolveActiveNode(nextTree, nextActiveNodeKey),
        };
      }),

    toggleActiveNode: (nodeKey) =>
      set((state) => {
        const nextActiveNodeKey = state.activeNodeKey === nodeKey ? null : nodeKey ?? null;
        const nextTree = syncDebugVisibleByActiveNode(
          state.uiPageData,
          state.activeNodeKey,
          nextActiveNodeKey,
        );
        return {
          uiPageData: nextTree,
          activeNodeKey: nextActiveNodeKey,
          activeNode: resolveActiveNode(nextTree, nextActiveNodeKey),
        };
      }),

    updateActiveNodeLabel: (label) =>
      set((state) => {
        if (!state.activeNodeKey) return state;
        const currentNode = resolveActiveNode(state.uiPageData, state.activeNodeKey);
        if (!currentNode || currentNode.label === label) return state;

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

    updateActiveNodeKey: (nextKey) => {
      const trimmedKey = String(nextKey ?? '').trim();
      if (!trimmedKey) {
        return { success: false, message: '组件标识不能为空' };
      }
      if (!COMPONENT_KEY_PATTERN.test(trimmedKey)) {
        return {
          success: false,
          message: '组件标识仅支持字母、数字、下划线(_)和中划线(-)',
        };
      }

      let result: { success: boolean; message?: string } = { success: true };

      set((state) => {
        if (!state.activeNodeKey) {
          result = { success: false, message: '请先选择组件' };
          return state;
        }
        const currentNode = resolveActiveNode(state.uiPageData, state.activeNodeKey);
        if (!currentNode) {
          result = { success: false, message: '当前组件不存在' };
          return state;
        }
        if (currentNode.key === trimmedKey) {
          result = { success: true };
          return state;
        }
        if (hasDuplicateKey(state.uiPageData, trimmedKey, currentNode.key)) {
          result = { success: false, message: `组件标识"${trimmedKey}"已存在，请更换` };
          return state;
        }

        const prevKey = currentNode.key;
        const nextTree = updateNodeByKey(state.uiPageData, prevKey, (target) => ({
          ...target,
          key: trimmedKey,
        }));

        const nextFlowNodes = state.flowNodes.map((node) => {
          if (node.type !== 'componentNode') return node;
          const nodeData = (node.data ?? {}) as { sourceKey?: string };
          if (nodeData.sourceKey !== prevKey) return node;
          return { ...node, data: { ...nodeData, sourceKey: trimmedKey } };
        });

        result = { success: true };
        return {
          uiPageData: nextTree,
          flowNodes: nextFlowNodes,
          activeNodeKey: trimmedKey,
          activeNode: resolveActiveNode(nextTree, trimmedKey),
        };
      });

      return result;
    },

    updateActiveNodeProp: (propKey, value) =>
      set((state) => {
        if (!state.activeNodeKey) return state;
        const currentNode = resolveActiveNode(state.uiPageData, state.activeNodeKey);
        if (!currentNode) return state;

        const currentProps = (currentNode.props ?? {}) as Record<string, unknown>;
        const currentProp = (currentProps[propKey] ?? {}) as Record<string, unknown>;
        const prevValue = currentProp.value;
        if (Object.is(prevValue, value)) return state;

        let nextTree = updateNodeByKey(state.uiPageData, state.activeNodeKey, (target) => {
          const tProps = (target.props ?? {}) as Record<string, unknown>;
          const tProp = (tProps[propKey] ?? {}) as Record<string, unknown>;
          return {
            ...target,
            props: { ...tProps, [propKey]: { ...tProp, value } },
          };
        });

        // List：关闭自定义模板时清空 List.Item 子节点
        if (currentNode.type === 'List' && propKey === 'customTemplateEnabled' && value === false) {
          nextTree = updateNodeByKey(nextTree, state.activeNodeKey, (target) => ({
            ...target,
            children: (target.children ?? []).map((child) =>
              child.type === 'List.Item' ? { ...child, children: [] } : child,
            ),
          }));
        }

        // Tabs：同步插槽节点
        if (currentNode.type === 'Tabs' && propKey === 'list') {
          const tabsList = normalizeTabsList(value);
          nextTree = updateNodeByKey(nextTree, state.activeNodeKey, (target) =>
            syncTabsSlotNodes(target, tabsList),
          );
        }

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

    setTreeInstance: (instance) => set({ treeInstance: instance }),

    insertToUiPageData: (parentKey, componentData, slotKey) =>
      set((state) => {
        const parentNode = findNodeByKey(state.uiPageData, parentKey);
        if (!parentNode) return state;

        const newNode = toUiTreeNode(componentData);
        if (slotKey) {
          const currentProps = (newNode.props ?? {}) as Record<string, unknown>;
          newNode.props = {
            ...currentProps,
            __slot: {
              ...((currentProps.__slot ?? {}) as Record<string, unknown>),
              value: slotKey,
            },
          };
        }

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
        return {
          uiPageData: nextTree,
          activeNode: resolveActiveNode(nextTree, state.activeNodeKey),
          history: nextHistory,
        };
      }),

    removeFromUiPageData: (nodeKey) =>
      set((state) => {
        if (nodeKey === state.uiPageData.key) return state;

        const result = removeNodeByKey(state.uiPageData, nodeKey);
        if (!result.removedNode || !result.parentKey || result.index < 0) return state;

        const removedTreeKeys = collectTreeKeys(result.removedNode);
        const flowNodesToRemove = state.flowNodes.filter((node) => {
          if (node.type !== 'componentNode') return false;
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
            if (node.type !== 'eventFilterNode') return node;
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
            ? { nodes: cloneDeep(flowNodesToRemove), edges: cloneDeep(flowEdgesToRemove) }
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

        return {
          uiPageData: result.tree,
          flowNodes: nextFlowNodes,
          flowEdges: nextFlowEdges,
          activeNodeKey: nextActiveNodeKey,
          activeNode: resolveActiveNode(result.tree, nextActiveNodeKey),
          history: nextHistory,
        };
      }),

    // ===== Actions — 流程历史 =====

    recordFlowEditHistory: (actionLabel, prevFlowNodes, prevFlowEdges, nextFlowNodes, nextFlowEdges) =>
      set((state) => {
        const nodePatch = buildEntityPatch(prevFlowNodes, nextFlowNodes);
        const edgePatch = buildEntityPatch(prevFlowEdges, nextFlowEdges);
        const hasChange =
          nodePatch.added.length > 0 ||
          nodePatch.removed.length > 0 ||
          nodePatch.updated.length > 0 ||
          edgePatch.added.length > 0 ||
          edgePatch.removed.length > 0 ||
          edgePatch.updated.length > 0;

        if (!hasChange) return state;

        const action: UiHistoryAction = {
          type: 'flow-edit',
          actionLabel,
          nodePatch,
          edgePatch,
          timestamp: Date.now(),
        };
        const nextHistory = pushHistoryAction(state.history.actions, state.history.pointer, action);
        return { flowNodes: nextFlowNodes, flowEdges: nextFlowEdges, history: nextHistory };
      }),

    updateFlowNodeData: (nodeId, updater, actionLabel = '更新流程节点配置') =>
      set((state) => {
        const targetNode = state.flowNodes.find((item) => item.id === nodeId);
        if (!targetNode) return state;

        const currentData = (targetNode.data ?? {}) as Record<string, unknown>;
        const nextData = updater(currentData);
        if (Object.is(currentData, nextData)) return state;

        const nextFlowNodes = state.flowNodes.map((node) =>
          node.id === nodeId ? { ...node, data: nextData } : node,
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
        return { flowNodes: nextFlowNodes, history: nextHistory };
      }),

    // ===== Actions — 布局模板 =====

    applyBuiltInLayoutTemplate: (templateId) =>
      set((state) => {
        if (!buildLayoutNodes) return state;

        const nextChildren = buildLayoutNodes(templateId);
        const prevChildren = cloneDeep(state.uiPageData.children ?? []);
        const prevLayoutTemplateId = state.selectedLayoutTemplateId;

        const nextTree: UiTreeNode = {
          ...state.uiPageData,
          props: {
            ...(state.uiPageData.props ?? {}),
            __layoutTemplate: { name: '布局模板', value: templateId },
          },
          children: nextChildren,
        };

        const action: UiHistoryAction = {
          type: 'replace-layout',
          prevChildren,
          nextChildren: cloneDeep(nextChildren),
          prevLayoutTemplateId,
          nextLayoutTemplateId: templateId,
          timestamp: Date.now(),
        };
        const nextHistory = pushHistoryAction(state.history.actions, state.history.pointer, action);

        return {
          uiPageData: nextTree,
          activeNodeKey: null,
          activeNode: null,
          selectedLayoutTemplateId: templateId,
          history: nextHistory,
        };
      }),

    // ===== Actions — 历史记录 =====

    undo: () =>
      set((state) => {
        const { pointer, actions } = state.history;
        if (pointer < 0) return state;

        const action = actions[pointer];
        const nextTree = applyHistoryAction(state.uiPageData, action, 'undo');
        const nextFlow = applyFlowHistoryAction(state.flowNodes, state.flowEdges, action, 'undo');

        return {
          uiPageData: nextTree,
          flowNodes: nextFlow.flowNodes,
          flowEdges: nextFlow.flowEdges,
          activeNode: resolveActiveNode(nextTree, state.activeNodeKey),
          selectedLayoutTemplateId: resolveLayoutTemplateId(nextTree),
          history: { pointer: pointer - 1, actions },
        };
      }),

    redo: () =>
      set((state) => {
        const { pointer, actions } = state.history;
        const nextPointer = pointer + 1;
        if (nextPointer >= actions.length) return state;

        const action = actions[nextPointer];
        const nextTree = applyHistoryAction(state.uiPageData, action, 'redo');
        const nextFlow = applyFlowHistoryAction(state.flowNodes, state.flowEdges, action, 'redo');

        return {
          uiPageData: nextTree,
          flowNodes: nextFlow.flowNodes,
          flowEdges: nextFlow.flowEdges,
          activeNode: resolveActiveNode(nextTree, state.activeNodeKey),
          selectedLayoutTemplateId: resolveLayoutTemplateId(nextTree),
          history: { pointer: nextPointer, actions },
        };
      }),

    jumpToHistory: (targetPointer) =>
      set((state) => {
        const { pointer, actions } = state.history;
        const clampedTarget = Math.max(-1, Math.min(targetPointer, actions.length - 1));
        if (clampedTarget === pointer) return state;

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
          selectedLayoutTemplateId: resolveLayoutTemplateId(nextTree),
          history: { pointer: clampedTarget, actions },
        };
      }),
  }));
};
