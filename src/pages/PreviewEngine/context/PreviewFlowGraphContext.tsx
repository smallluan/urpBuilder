import React from 'react';
import type { Edge, Node } from '@xyflow/react';

export const PreviewFlowGraphContext = React.createContext<{
  flowNodes: Node[];
  flowEdges: Edge[];
} | null>(null);
