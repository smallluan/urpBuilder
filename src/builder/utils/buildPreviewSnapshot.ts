import cloneDeep from 'lodash/cloneDeep';
import type { Edge, Node } from '@xyflow/react';
import { findNodeByKey, updateNodeByKey } from '../../utils/createComponentTree';
import type { BuilderStore, UiTreeNode } from '../store/types';
import type { PreviewSnapshot } from '../../pages/PreviewEngine/utils/snapshot';

export const normalizeRoutePath = (value: string) => {
  const text = String(value ?? '').trim();
  if (!text) {
    return '/';
  }
  return text.startsWith('/') ? text : `/${text}`;
};

const composeRouteUiTree = (
  privateTree: UiTreeNode,
  sharedTree: UiTreeNode | null | undefined,
  outletKey: string | null,
): UiTreeNode => {
  if (!sharedTree || !outletKey) {
    return cloneDeep(privateTree) as UiTreeNode;
  }

  const sharedOutlet = findNodeByKey(sharedTree, outletKey);
  if (!sharedOutlet) {
    return cloneDeep(privateTree) as UiTreeNode;
  }

  const privateOutlet = findNodeByKey(privateTree, outletKey);
  const outletChildren = privateOutlet?.type === 'RouteOutlet'
    ? (cloneDeep(privateOutlet.children ?? []) as UiTreeNode[])
    : [];

  return updateNodeByKey(cloneDeep(sharedTree) as UiTreeNode, outletKey, (target) => ({
    ...target,
    children: outletChildren,
  })) as UiTreeNode;
};

const composeRouteFlow = (
  privateNodes: Node[],
  privateEdges: Edge[],
  sharedNodes: Node[],
  sharedEdges: Edge[],
) => {
  const mergedNodes = new Map<string, Node>();
  sharedNodes.forEach((node) => mergedNodes.set(node.id, cloneDeep(node)));
  privateNodes.forEach((node) => mergedNodes.set(node.id, cloneDeep(node)));
  const flowNodes = Array.from(mergedNodes.values());
  const flowNodeIds = new Set(flowNodes.map((node) => node.id));

  const mergedEdges = new Map<string, Edge>();
  sharedEdges.forEach((edge) => {
    if (flowNodeIds.has(edge.source) && flowNodeIds.has(edge.target)) {
      mergedEdges.set(edge.id, cloneDeep(edge));
    }
  });
  privateEdges.forEach((edge) => {
    if (flowNodeIds.has(edge.source) && flowNodeIds.has(edge.target)) {
      mergedEdges.set(edge.id, cloneDeep(edge));
    }
  });

  return {
    flowNodes,
    flowEdges: Array.from(mergedEdges.values()),
  };
};

/**
 * 与 HeaderControls / 预览窗口使用同一套快照语义（当前编辑路由、共享布局合并等）。
 */
export function buildPreviewSnapshot(state: BuilderStore, enablePageRouteConfig: boolean): PreviewSnapshot {
  const {
    uiPageData: uiTreeData,
    flowNodes,
    flowEdges,
    pageRoutes,
    sharedUiTree,
    activeRouteOutletKey,
    sharedFlowNodes,
    sharedFlowEdges,
    pageRouteConfig,
    currentPageId,
    currentPageName,
  } = state;

  const routeSnapshots = enablePageRouteConfig
    ? pageRoutes.map((route) => {
        const composedUiTree = composeRouteUiTree(route.uiTree, sharedUiTree, activeRouteOutletKey);
        const composedFlow = composeRouteFlow(
          route.flowNodes,
          route.flowEdges,
          sharedFlowNodes,
          sharedFlowEdges,
        );

        return {
          routeId: route.routeId,
          routePath: normalizeRoutePath(route.routeConfig.routePath),
          uiTreeData: composedUiTree as UiTreeNode,
          flowNodes: composedFlow.flowNodes,
          flowEdges: composedFlow.flowEdges,
        };
      })
    : [];

  const activeRoutePath = enablePageRouteConfig
    ? normalizeRoutePath(pageRouteConfig?.routePath?.trim() ?? '/')
    : '';
  const activeRouteSnapshot = routeSnapshots.find((item) => item.routePath === activeRoutePath) ?? routeSnapshots[0];

  return {
    uiTreeData: (activeRouteSnapshot?.uiTreeData ?? uiTreeData) as UiTreeNode,
    flowNodes: activeRouteSnapshot?.flowNodes ?? flowNodes,
    flowEdges: activeRouteSnapshot?.flowEdges ?? flowEdges,
    pageConfig: enablePageRouteConfig
      ? {
          routeConfig: pageRouteConfig,
          pageId: currentPageId,
          pageName: currentPageName,
          defaultRoutePath: activeRouteSnapshot?.routePath ?? activeRoutePath,
          routeSnapshots,
        }
      : undefined,
  };
}

/** 用于打开 /site-preview{path} 或 /preview-engine 的路径段（无多路由时为空） */
export function getPreviewOpenSitePath(state: BuilderStore, enablePageRouteConfig: boolean): string {
  if (!enablePageRouteConfig) {
    return '';
  }
  const routeSnapshots = buildPreviewSnapshot(state, true).pageConfig?.routeSnapshots ?? [];
  const activeRoutePath = normalizeRoutePath(state.pageRouteConfig?.routePath?.trim() ?? '/');
  const activeRouteSnapshot = routeSnapshots.find((item) => item.routePath === activeRoutePath) ?? routeSnapshots[0];
  return activeRouteSnapshot?.routePath ?? activeRoutePath;
}
