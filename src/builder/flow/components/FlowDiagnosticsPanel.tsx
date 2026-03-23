import React from 'react';
import { Button, Tag } from 'tdesign-react';
import type { FlowDiagnosticItem } from '../utils/flowValidate';

interface FlowDiagnosticsPanelProps {
  visible: boolean;
  diagnostics: FlowDiagnosticItem[];
  onLocate: (nodeId: string) => void;
  onQuickFix: () => void;
  onClose: () => void;
}

const FlowDiagnosticsPanel: React.FC<FlowDiagnosticsPanelProps> = ({
  visible,
  diagnostics,
  onLocate,
  onQuickFix,
  onClose,
}) => {
  if (!visible) {
    return null;
  }

  return (
    <div className="flow-diagnostics-panel">
      <div className="flow-diagnostics-panel__head">
        <div className="flow-diagnostics-panel__title">流程诊断</div>
        <div className="flow-diagnostics-panel__head-actions">
          <Button size="small" variant="outline" onClick={onQuickFix}>一键修复</Button>
          <Button size="small" variant="text" onClick={onClose}>关闭</Button>
        </div>
      </div>
      <div className="flow-diagnostics-panel__body">
        {diagnostics.length === 0 ? (
          <div className="flow-diagnostics-panel__empty">未发现问题。</div>
        ) : diagnostics.map((item) => (
          <div key={item.id} className="flow-diagnostics-panel__item">
            <div className="flow-diagnostics-panel__item-head">
              <Tag size="small" theme={item.level === 'error' ? 'danger' : item.level === 'warning' ? 'warning' : 'primary'} variant="light">
                {item.kind}
              </Tag>
              <span className="flow-diagnostics-panel__item-text">{item.message}</span>
            </div>
            {item.nodeIds[0] ? (
              <div className="flow-diagnostics-panel__actions">
                <Button size="small" theme="primary" variant="outline" onClick={() => onLocate(item.nodeIds[0])}>
                  定位节点
                </Button>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
};

export default FlowDiagnosticsPanel;
