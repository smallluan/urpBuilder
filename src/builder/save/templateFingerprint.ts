import type { Edge, Node } from '@xyflow/react';
import { buildComponentContract } from '../flow/componentContract';
import { dehydrateUiTree, PROPS_STORAGE_VERSION } from '../template/propsHydration';
import type { BuiltInLayoutTemplateId, PageRouteConfig, PageRouteRecord, UiTreeNode } from '../store/types';

export type PersistTemplateFingerprintMode = {
  enablePageRouteConfig: boolean;
  enableComponentContract: boolean;
};

export type PersistTemplateFingerprintState = {
  uiPageData: UiTreeNode;
  flowNodes: Node[];
  flowEdges: Edge[];
  screenSize: string | number;
  autoWidth: number;
  selectedLayoutTemplateId: BuiltInLayoutTemplateId | null;
  pageRouteConfig: PageRouteConfig | null;
  pageRoutes: PageRouteRecord[];
  activeRouteOutletKey: string | null;
  sharedUiTree: UiTreeNode | null;
  sharedFlowNodes: Node[];
  sharedFlowEdges: Edge[];
};

function sortKeysDeep(val: unknown): unknown {
  if (val === null || typeof val !== 'object') {
    return val;
  }
  if (Array.isArray(val)) {
    return val.map(sortKeysDeep);
  }
  const obj = val as Record<string, unknown>;
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(obj).sort()) {
    sorted[key] = sortKeysDeep(obj[key]);
  }
  return sorted;
}

export function stableStringifyForFingerprint(value: unknown): string {
  return JSON.stringify(sortKeysDeep(value));
}

/**
 * 与 HeaderControls 中 `templatePayload` 结构一致，用于判断「相对上次持久化」画布是否有可保存变更。
 */
export function computePersistedTemplateFingerprint(
  state: PersistTemplateFingerprintState,
  mode: PersistTemplateFingerprintMode,
): string {
  const uiTreeData = state.uiPageData;
  const { flowNodes, flowEdges, screenSize, autoWidth, selectedLayoutTemplateId } = state;
  const { pageRouteConfig, pageRoutes, activeRouteOutletKey, sharedUiTree, sharedFlowNodes, sharedFlowEdges } = state;

  const componentContract = mode.enableComponentContract
    ? buildComponentContract(uiTreeData, flowNodes, flowEdges)
    : null;

  const resolvedPageRoutes = mode.enablePageRouteConfig && pageRoutes.length > 0 ? pageRoutes : [];

  const templatePayload = {
    uiTree: dehydrateUiTree(uiTreeData) as unknown as Record<string, unknown>,
    flowNodes: flowNodes as unknown as Array<Record<string, unknown>>,
    flowEdges: flowEdges as unknown as Array<Record<string, unknown>>,
    ...(resolvedPageRoutes.length > 0
      ? {
          routes: resolvedPageRoutes.map((route) => ({
            routeId: route.routeId,
            routeConfig: route.routeConfig,
            uiTree: dehydrateUiTree(route.uiTree) as unknown as Record<string, unknown>,
            flowNodes: route.flowNodes as unknown as Array<Record<string, unknown>>,
            flowEdges: route.flowEdges as unknown as Array<Record<string, unknown>>,
            selectedLayoutTemplateId: route.selectedLayoutTemplateId,
          })),
        }
      : {}),
    pageConfig: {
      screenSize,
      autoWidth,
      selectedLayoutTemplateId,
      propsStorageVersion: PROPS_STORAGE_VERSION,
      ...(mode.enablePageRouteConfig && pageRouteConfig ? { routeConfig: pageRouteConfig } : {}),
      ...(mode.enablePageRouteConfig
        ? {
            ...(activeRouteOutletKey ? { activeRouteOutletKey } : {}),
            ...(sharedUiTree
              ? { sharedUiTree: dehydrateUiTree(sharedUiTree) as unknown as Record<string, unknown> }
              : {}),
            sharedFlowNodes: sharedFlowNodes as unknown as Array<Record<string, unknown>>,
            sharedFlowEdges: sharedFlowEdges as unknown as Array<Record<string, unknown>>,
          }
        : {}),
      ...(componentContract ? { componentContract } : {}),
    },
  };

  return stableStringifyForFingerprint(templatePayload);
}
