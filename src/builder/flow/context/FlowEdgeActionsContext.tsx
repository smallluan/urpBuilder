import { createContext, useContext } from 'react';

export interface FlowEdgeActionsValue {
  startEdit: (edgeId: string) => void;
  changeEditingValue: (value: string) => void;
  commitEdit: () => void;
  cancelEdit: () => void;
}

const FlowEdgeActionsContext = createContext<FlowEdgeActionsValue | null>(null);

export function useFlowEdgeActions(): FlowEdgeActionsValue | null {
  return useContext(FlowEdgeActionsContext);
}

export const FlowEdgeActionsProvider = FlowEdgeActionsContext.Provider;
