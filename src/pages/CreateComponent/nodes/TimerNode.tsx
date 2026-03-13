import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import NodeActionButtons from './NodeActionButtons';
import type { TimerNodeData } from '../../../types/flow';

const TimerNode: React.FC<NodeProps> = ({ id, data, selected }) => {
  const nodeData = (data ?? {}) as TimerNodeData;
  const targetPosition = nodeData.flipX ? Position.Right : Position.Left;
  const sourcePosition = nodeData.flipX ? Position.Left : Position.Right;
  const intervalMs = typeof nodeData.intervalMs === 'number' && Number.isFinite(nodeData.intervalMs)
    ? Math.max(100, Math.round(nodeData.intervalMs))
    : 1000;

  return (
    <div className={`flow-timer-node${selected ? ' is-selected' : ''}`}>
      <Handle type="target" position={targetPosition} isConnectable />

      <div className="flow-timer-node__top">
        <span className="flow-timer-node__badge">定时器</span>
        <span className="flow-timer-node__interval">{intervalMs} ms</span>
      </div>

      <div className="flow-timer-node__title">{nodeData.label || '定时器节点'}</div>
      <div className="flow-timer-node__meta">周期触发下游链路</div>

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

export default React.memo(TimerNode);
