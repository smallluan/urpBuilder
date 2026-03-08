import React, { useEffect, useRef, useState } from 'react';
import type { NodeProps } from '@xyflow/react';

export interface AnnotationNodeData {
  text?: string;
  onChange?: (nodeId: string, text: string) => void;
}

const AnnotationNode: React.FC<NodeProps> = ({ id, data, selected }) => {
  const nodeData = (data ?? {}) as AnnotationNodeData;
  const [isExpanded, setIsExpanded] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!isExpanded) {
      return;
    }

    textareaRef.current?.focus();
  }, [isExpanded]);

  const text = nodeData.text ?? '';
  const collapsedText = text.trim() || '输入注释...';

  return (
    <div className={`flow-annotation-node${selected ? ' is-selected' : ''}${isExpanded ? '' : ' is-collapsed'}`}>
      {isExpanded ? (
        <textarea
          ref={textareaRef}
          className="flow-annotation-node__textarea nodrag"
          value={text}
          placeholder="输入注释..."
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
          onBlur={() => setIsExpanded(false)}
          onChange={(event) => nodeData.onChange?.(id, event.target.value)}
        />
      ) : (
        <div
          className="flow-annotation-node__collapsed nodrag"
          title={collapsedText}
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            setIsExpanded(true);
          }}
        >
          {collapsedText}
        </div>
      )}
    </div>
  );
};

export default React.memo(AnnotationNode);