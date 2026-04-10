import type { Edge, Node } from '@xyflow/react';
import type { ComponentTemplateContent, PageTemplateContent } from '../../api/types';
import type { UiTreeNode } from '../store/types';
import { findNodeByKey, updateNodeByKey } from '../../utils/createComponentTree';

const findFirstRouteOutletKey = (root: UiTreeNode): string | null => {
  if (root.type === 'RouteOutlet') {
    return root.key;
  }
  for (const child of root.children ?? []) {
    const found = findFirstRouteOutletKey(child);
    if (found) {
      return found;
    }
  }
  return null;
};

const resolveEffectiveOutletKey = (tree: UiTreeNode, preferredKey: string | null): string | null => {
  if (preferredKey) {
    const target = findNodeByKey(tree, preferredKey);
    if (target?.type === 'RouteOutlet') {
      return preferredKey;
    }
  }
  return findFirstRouteOutletKey(tree);
};

const composeRouteUiTree = (privateTree: UiTreeNode, sharedUiTree: UiTreeNode | null, outletKey: string | null): UiTreeNode => {
  if (!sharedUiTree || !outletKey) {
    return privateTree;
  }
  const sharedOutlet = findNodeByKey(sharedUiTree, outletKey);
  if (!sharedOutlet) {
    return privateTree;
  }
  const privateOutlet = findNodeByKey(privateTree, outletKey);
  const outletChildren = privateOutlet?.type === 'RouteOutlet' ? (privateOutlet.children ?? []) : [];
  return updateNodeByKey(sharedUiTree, outletKey, (target) => ({
    ...target,
    children: outletChildren,
  }));
};

const composeRouteFlow = (
  privateNodes: Node[],
  privateEdges: Edge[],
  sharedNodes: Node[],
  sharedEdges: Edge[],
): { flowNodes: Node[]; flowEdges: Edge[] } => {
  const mergedNodes = new Map<string, Node>();
  sharedNodes.forEach((node) => mergedNodes.set(node.id, node));
  privateNodes.forEach((node) => mergedNodes.set(node.id, node));
  const flowNodes = Array.from(mergedNodes.values());
  const flowNodeIds = new Set(flowNodes.map((node) => node.id));

  const mergedEdges = new Map<string, Edge>();
  sharedEdges.forEach((edge) => {
    if (flowNodeIds.has(edge.source) && flowNodeIds.has(edge.target)) {
      mergedEdges.set(edge.id, edge);
    }
  });
  privateEdges.forEach((edge) => {
    if (flowNodeIds.has(edge.source) && flowNodeIds.has(edge.target)) {
      mergedEdges.set(edge.id, edge);
    }
  });
  return { flowNodes, flowEdges: Array.from(mergedEdges.values()) };
};

/**
 * 多路由模板：选取一条路由，与 CreatePage 的合成规则一致（sharedUiTree + RouteOutlet）。
 */
export function buildTemplateSliceForCompare(
  template: ComponentTemplateContent | PageTemplateContent,
  routeId: string | null,
): { template: ComponentTemplateContent; activeRouteId: string | null; routeLabel: string } {
  const routes = template.routes;
  if (!routes?.length) {
    return { template: template as ComponentTemplateContent, activeRouteId: null, routeLabel: '' };
  }

  const route = routes.find((r) => r.routeId === routeId) ?? routes[0];
  const pc = template.pageConfig as Record<string, unknown>;
  const sharedUi = pc.sharedUiTree as UiTreeNode | undefined;
  const sharedFlowNodes = (pc.sharedFlowNodes as Node[] | undefined) ?? [];
  const sharedFlowEdges = (pc.sharedFlowEdges as Edge[] | undefined) ?? [];
  const activeOutlet =
    typeof pc.activeRouteOutletKey === 'string' ? pc.activeRouteOutletKey : null;

  const privateTree = route.uiTree as unknown as UiTreeNode;
  let uiTree: UiTreeNode;
  if (sharedUi) {
    const outletKey = resolveEffectiveOutletKey(sharedUi, activeOutlet) ?? findFirstRouteOutletKey(sharedUi);
    uiTree = composeRouteUiTree(privateTree, sharedUi, outletKey);
  } else {
    uiTree = privateTree;
  }

  const flow = composeRouteFlow(
    (route.flowNodes ?? []) as Node[],
    (route.flowEdges ?? []) as Edge[],
    sharedFlowNodes,
    sharedFlowEdges,
  );

  const merged: ComponentTemplateContent = {
    ...(template as ComponentTemplateContent),
    uiTree: uiTree as unknown as Record<string, unknown>,
    flowNodes: flow.flowNodes as unknown as Array<Record<string, unknown>>,
    flowEdges: flow.flowEdges as unknown as Array<Record<string, unknown>>,
    routes: undefined,
  };

  const rc = route.routeConfig as { routeName?: string; routePath?: string } | undefined;
  const routeLabel = rc?.routeName || rc?.routePath || route.routeId;

  return {
    template: merged,
    activeRouteId: route.routeId,
    routeLabel: String(routeLabel),
  };
}
