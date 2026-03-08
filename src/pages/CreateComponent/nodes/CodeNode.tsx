import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';

export interface CodeNodeData {
  label?: string;
  language?: string;
  code?: string;
}

const CodeNode: React.FC<NodeProps> = ({ data, selected }) => {
  const nodeData = (data ?? {}) as CodeNodeData;
  const language = nodeData.language || 'javascript';
  const code = nodeData.code || '// 在这里编写代码';

  return (
    <div className={`flow-code-node${selected ? ' is-selected' : ''}`}>
      <Handle type="target" position={Position.Left} isConnectable />

      <div className="flow-code-node__top">
        <span className="flow-code-node__badge">代码节点</span>
        <span className="flow-code-node__lang">{language}</span>
      </div>

      <div className="flow-code-node__title">{nodeData.label || '代码节点'}</div>
      <pre className="flow-code-node__code">{code}</pre>

      <Handle type="source" position={Position.Right} isConnectable />
    </div>
  );
};

export default React.memo(CodeNode);