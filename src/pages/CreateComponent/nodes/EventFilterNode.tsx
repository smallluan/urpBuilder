import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';

export interface EventFilterNodeData {
  label?: string;
  upstreamNodeId?: string;
  upstreamLabel?: string;
  availableLifetimes?: string[];
}

const EventFilterNode: React.FC<NodeProps> = ({ data, selected }) => {
  const nodeData = (data ?? {}) as EventFilterNodeData;
  const lifetimes = Array.isArray(nodeData.availableLifetimes) ? nodeData.availableLifetimes : [];

  return (
    <div className={`flow-event-filter-node${selected ? ' is-selected' : ''}`}>
      <Handle type="target" position={Position.Left} isConnectable />

      <div className="flow-event-filter-node__top">
        <span className="flow-event-filter-node__badge">事件过滤</span>
      </div>

      <div className="flow-event-filter-node__title">{nodeData.label || '事件过滤节点'}</div>

      <div className="flow-event-filter-node__meta">
        上游：{nodeData.upstreamLabel || '未连接组件节点'}
      </div>

      <div className="flow-event-filter-node__lifetimes">
        {lifetimes.length > 0 ? (
          lifetimes.map((item) => (
            <span className="flow-event-filter-node__tag" key={item}>{item}</span>
          ))
        ) : (
          <span className="flow-event-filter-node__empty">连接组件后自动读取 lifetimes</span>
        )}
      </div>

      <Handle type="source" position={Position.Right} isConnectable />
    </div>
  );
};

export default React.memo(EventFilterNode);
