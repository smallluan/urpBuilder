import { createContext, useContext } from 'react';

export interface FlowNodeActionsValue {
  deleteNode: (nodeId: string) => void;
  flipHorizontal: (nodeId: string) => void;
  flipVertical: (nodeId: string) => void;
  setAnnotationText: (nodeId: string, text: string) => void;
}

const FlowNodeActionsContext = createContext<FlowNodeActionsValue | null>(null);

export function useFlowNodeActions(): FlowNodeActionsValue | null {
  return useContext(FlowNodeActionsContext);
}

export const FlowNodeActionsProvider = FlowNodeActionsContext.Provider;
