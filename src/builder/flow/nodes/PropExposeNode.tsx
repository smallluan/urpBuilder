import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import NodeActionButtons from './NodeActionButtons';
import type { PropExposeNodeData } from '../../../types/flow';

const PropExposeNode: React.FC<NodeProps> = ({ id, data, selected }) => {
  const nodeData = (data ?? {}) as PropExposeNodeData;
  const selectedPropKeys = Array.isArray(nodeData.selectedPropKeys) ? nodeData.selectedPropKeys : [];
  const maxVisibleTags = 3;
  const visiblePropKeys = selectedPropKeys.slice(0, maxVisibleTags);
  const remainingCount = Math.max(0, selectedPropKeys.length - visiblePropKeys.length);
  const targetPosition = nodeData.flipX ? Position.Right : Position.Left;
  const sourcePosition = nodeData.flipX ? Position.Left : Position.Right;

  return (
    <div className={`flow-prop-expose-node${selected ? ' is-selected' : ''}`}>
      <Handle type="target" position={targetPosition} isConnectable={false} />

      <div className="flow-prop-expose-node__top">
        <span className="flow-prop-expose-node__badge">属性暴露</span>
      </div>

      <div className="flow-prop-expose-node__title">{nodeData.label || '属性暴露节点'}</div>
      <div className="flow-prop-expose-node__meta" title={nodeData.sourceLabel || ''}>
        来源：{nodeData.sourceLabel || '未连接组件节点'}
      </div>

      <div className="flow-prop-expose-node__tags">
        {selectedPropKeys.length > 0 ? (
          <>
            {visiblePropKeys.map((item) => (
              <span className="flow-prop-expose-node__tag" key={item}>{item}</span>
            ))}
            {remainingCount > 0 ? (
              <span className="flow-prop-expose-node__tag flow-prop-expose-node__tag--more">+{remainingCount}</span>
            ) : null}
          </>
        ) : (
          <span className="flow-prop-expose-node__empty">未选择暴露属性</span>
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

export default React.memo(PropExposeNode);
