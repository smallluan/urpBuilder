import { parse, stringify } from 'flatted';
import type { Edge, Node } from '@xyflow/react';
import type { PageRouteConfig, UiTreeNode } from '../../../builder/store/types';

export interface PreviewPageConfig {
  routeConfig?: PageRouteConfig | null;
  pageId?: string;
  pageName?: string;
  defaultRoutePath?: string;
  routeSnapshots?: Array<{
    routeId?: string;
    routePath: string;
    uiTreeData: UiTreeNode;
    flowNodes: Node[];
    flowEdges: Edge[];
  }>;
}

export interface PreviewSnapshot {
  uiTreeData: UiTreeNode;
  flowNodes: Node[];
  flowEdges: Edge[];
  pageConfig?: PreviewPageConfig;
}

export const serializePreviewSnapshot = (snapshot: PreviewSnapshot): string => {
  return stringify(snapshot);
};

export const deserializePreviewSnapshot = (serialized: string): PreviewSnapshot | null => {
  if (!serialized) {
    return null;
  }

  try {
    return parse(serialized) as PreviewSnapshot;
  } catch {
    return null;
  }
};
