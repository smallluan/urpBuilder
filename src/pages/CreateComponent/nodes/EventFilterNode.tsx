import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import NodeActionButtons from './NodeActionButtons';

export interface EventFilterNodeData {
  label?: string;
  upstreamNodeId?: string;
  upstreamLabel?: string;
  availableLifetimes?: string[];
  selectedLifetimes?: string[];
  flipX?: boolean;
  flipY?: boolean;
  onDeleteNode?: (nodeId: string) => void;
  onFlipHorizontal?: (nodeId: string) => void;
  onFlipVertical?: (nodeId: string) => void;
}

const EventFilterNode: React.FC<NodeProps> = ({ id, data, selected }) => {
  const nodeData = (data ?? {}) as EventFilterNodeData;
  const selectedLifetimes = Array.isArray(nodeData.selectedLifetimes) ? nodeData.selectedLifetimes : [];
  const targetPosition = nodeData.flipX ? Position.Right : Position.Left;
  const sourcePosition = nodeData.flipX ? Position.Left : Position.Right;

  return (
    <div className={`flow-event-filter-node${selected ? ' is-selected' : ''}`}>
      <Handle type="target" position={targetPosition} isConnectable />

      <div className="flow-event-filter-node__top">
        <span className="flow-event-filter-node__badge">事件过滤</span>
      </div>

      <div className="flow-event-filter-node__title">{nodeData.label || '事件过滤节点'}</div>

      <div className="flow-event-filter-node__lifetimes">
        {selectedLifetimes.length > 0 ? (
          selectedLifetimes.map((item) => (
            <span className="flow-event-filter-node__tag" key={item}>{item}</span>
          ))
        ) : (
          <span className="flow-event-filter-node__empty">未选择生命周期事件</span>
        )}
      </div>

      <div className="flow-node-actions-row flow-node-actions-row--end">
        <NodeActionButtons
          onDelete={() => nodeData.onDeleteNode?.(id)}
          onFlipHorizontal={() => nodeData.onFlipHorizontal?.(id)}
          onFlipVertical={() => nodeData.onFlipVertical?.(id)}
        />
      </div>

      <Handle type="source" position={sourcePosition} isConnectable />
    </div>
  );
};

export default React.memo(EventFilterNode);
