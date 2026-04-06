import { useMemo } from 'react';
import { useFlowNodeActions } from '../context/FlowNodeActionsContext';

type FlowNodeDataWithActions = {
  onDeleteNode?: (nodeId: string) => void;
  onFlipHorizontal?: (nodeId: string) => void;
  onFlipVertical?: (nodeId: string) => void;
};

/** 优先使用 FlowNodeActionsProvider；无 Provider 时回退到 node.data 上的回调（如调试画布）。 */
export function useFlowNodeChromeActions(id: string, nodeData: FlowNodeDataWithActions) {
  const actions = useFlowNodeActions();

  const fromContext = useMemo(
    () => ({
      onDelete: () => actions?.deleteNode(id),
      onFlipHorizontal: () => actions?.flipHorizontal(id),
      onFlipVertical: () => actions?.flipVertical(id),
    }),
    [actions, id],
  );

  const fromFallback = useMemo(
    () => ({
      onDelete: () => nodeData.onDeleteNode?.(id),
      onFlipHorizontal: () => nodeData.onFlipHorizontal?.(id),
      onFlipVertical: () => nodeData.onFlipVertical?.(id),
    }),
    [id, nodeData],
  );

  return actions ? fromContext : fromFallback;
}
