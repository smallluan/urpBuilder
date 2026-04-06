import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useFlowNodeChromeActions } from '../hooks/useFlowNodeChromeActions';
import NodeActionButtons from './NodeActionButtons';
import type { LifecycleExposeNodeData } from '../../../types/flow';

const LifecycleExposeNode: React.FC<NodeProps> = ({ id, data, selected }) => {
  const nodeData = (data ?? {}) as LifecycleExposeNodeData;
  const chrome = useFlowNodeChromeActions(id, nodeData);
  const selectedLifetimes = Array.isArray(nodeData.selectedLifetimes) ? nodeData.selectedLifetimes : [];
  const maxVisibleTags = 3;
  const visibleLifetimes = selectedLifetimes.slice(0, maxVisibleTags);
  const remainingCount = Math.max(0, selectedLifetimes.length - visibleLifetimes.length);
  const targetPosition = nodeData.flipX ? Position.Right : Position.Left;
  const sourcePosition = nodeData.flipX ? Position.Left : Position.Right;

  return (
    <div className={`flow-lifecycle-expose-node${selected ? ' is-selected' : ''}`}>
      <Handle type="target" position={targetPosition} isConnectable />

      <div className="flow-lifecycle-expose-node__top">
        <span className="flow-lifecycle-expose-node__badge">生命周期暴露</span>
      </div>

      <div className="flow-lifecycle-expose-node__title">{nodeData.label || '生命周期暴露节点'}</div>
      <div className="flow-lifecycle-expose-node__meta" title={nodeData.upstreamLabel || ''}>
        上游：{nodeData.upstreamLabel || '未连接事件过滤节点'}
      </div>

      <div className="flow-lifecycle-expose-node__tags">
        {selectedLifetimes.length > 0 ? (
          <>
            {visibleLifetimes.map((item) => (
              <span className="flow-lifecycle-expose-node__tag" key={item}>{item}</span>
            ))}
            {remainingCount > 0 ? (
              <span className="flow-lifecycle-expose-node__tag flow-lifecycle-expose-node__tag--more">+{remainingCount}</span>
            ) : null}
          </>
        ) : (
          <span className="flow-lifecycle-expose-node__empty">未选择输出生命周期</span>
        )}
      </div>

      <div className="flow-node-actions-row flow-node-actions-row--end">
        <NodeActionButtons
          suppress={Boolean(nodeData.__suppressFlowActions)}
          onDelete={chrome.onDelete}
          onFlipHorizontal={chrome.onFlipHorizontal}
          onFlipVertical={chrome.onFlipVertical}
        />
      </div>

      <Handle type="source" position={sourcePosition} isConnectable={false} />
    </div>
  );
};

export default React.memo(LifecycleExposeNode);
