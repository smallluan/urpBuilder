import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useFlowNodeChromeActions } from '../hooks/useFlowNodeChromeActions';
import NodeActionButtons from './NodeActionButtons';
import type { PropExposeNodeData } from '../../../types/flow';

const PropExposeNode: React.FC<NodeProps> = ({ id, data, selected }) => {
  const nodeData = (data ?? {}) as PropExposeNodeData;
  const chrome = useFlowNodeChromeActions(id, nodeData);
  const selectedPropKeys = Array.isArray(nodeData.selectedPropKeys) ? nodeData.selectedPropKeys : [];
  const selectedMappings = Array.isArray(nodeData.selectedMappings) ? nodeData.selectedMappings : [];
  const maxVisibleTags = 3;
  const visibleItems = (selectedMappings.length > 0
    ? selectedMappings.map((m) => ({ name: String(m.sourcePropKey ?? ''), alias: (m as any).alias }))
    : selectedPropKeys.map((k) => ({ name: k, alias: undefined })))
    .slice(0, maxVisibleTags);
  const remainingCount = Math.max(0, (selectedMappings.length > 0 ? selectedMappings.length : selectedPropKeys.length) - visibleItems.length);
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
        {(selectedMappings.length > 0 || selectedPropKeys.length > 0) ? (
          <>
            {visibleItems.map((item) => (
              <span className="flow-prop-expose-node__tag" key={item.name}>
                {item.alias ? (
                  <>
                    <span className="flow-prop-expose-node__tag-alias">{item.alias}</span>
                    <span className="flow-prop-expose-node__tag-arrow">←</span>
                    <span className="flow-prop-expose-node__tag-source">{item.name}</span>
                  </>
                ) : (
                  <span className="flow-prop-expose-node__tag-source">{item.name}</span>
                )}
              </span>
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
          suppress={Boolean(nodeData.__suppressFlowActions)}
          onDelete={chrome.onDelete}
          onFlipHorizontal={chrome.onFlipHorizontal}
          onFlipVertical={chrome.onFlipVertical}
        />
      </div>

      <Handle type="source" position={sourcePosition} isConnectable />
    </div>
  );
};

export default React.memo(PropExposeNode);
