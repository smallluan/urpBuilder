import { parse, stringify } from 'flatted';
import type { Edge, Node } from '@xyflow/react';
import type { UiTreeNode } from '../../CreateComponent/store/type';

export interface PreviewSnapshot {
  uiTreeData: UiTreeNode;
  flowNodes: Node[];
  flowEdges: Edge[];
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
