import React from 'react';
import { Button, Tooltip } from 'tdesign-react';
import { Activity, Focus, ScanSearch, Sparkles, Wand2, Workflow, ArrowRightLeft, Lock, Unlock } from 'lucide-react';

export type FlowLayoutDirection = 'LR' | 'TB';

interface FlowTopbarProps {
  readOnly: boolean;
  hasActiveNode: boolean;
  diagnosticsCount: number;
  layoutDirection: FlowLayoutDirection;
  focusDepth: 1 | 2 | 99;
  lockSelected: boolean;
  onRunCycleDetect: () => void;
  onRunValidate: () => void;
  onRunAutoLayout: (direction: FlowLayoutDirection) => void;
  onRunEdgeCleanup: () => void;
  onRunQuickFix: () => void;
  onFocusActivePath: () => void;
  onClearFocus: () => void;
  onSwitchLayoutDirection: () => void;
  onToggleLockSelected: () => void;
  onChangeFocusDepth: (depth: 1 | 2 | 99) => void;
  onToggleDiagnosticsPanel: () => void;
}

const ToolBtn: React.FC<{
  tip: string;
  icon: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
}> = ({ tip, icon, disabled, onClick }) => (
  <Tooltip content={tip} placement="bottom">
    <Button
      size="small"
      variant="text"
      className="flow-topbar__icon-btn"
      disabled={disabled}
      onClick={onClick}
    >
      {icon}
    </Button>
  </Tooltip>
);

const FlowTopbar: React.FC<FlowTopbarProps> = ({
  readOnly,
  hasActiveNode,
  diagnosticsCount,
  layoutDirection,
  focusDepth,
  lockSelected,
  onRunCycleDetect,
  onRunValidate,
  onRunAutoLayout,
  onRunEdgeCleanup,
  onRunQuickFix,
  onFocusActivePath,
  onClearFocus,
  onSwitchLayoutDirection,
  onToggleLockSelected,
  onChangeFocusDepth,
  onToggleDiagnosticsPanel,
}) => {
  return (
    <div className="flow-topbar">
      <div className="flow-topbar__group">
        <ToolBtn tip="循环依赖检测 (Ctrl/Cmd+Shift+K)" icon={<ScanSearch size={16} />} onClick={onRunCycleDetect} />
        <ToolBtn tip="流程健康检查 (Ctrl/Cmd+Shift+V)" icon={<Activity size={16} />} onClick={onRunValidate} />
        <ToolBtn
          tip={`自动整理布局 ${layoutDirection === 'LR' ? '（横向）' : '（纵向）'} (Ctrl/Cmd+Shift+L)`}
          icon={<Sparkles size={16} />}
          disabled={readOnly}
          onClick={() => onRunAutoLayout(layoutDirection)}
        />
        <ToolBtn
          tip={`切换布局方向（当前：${layoutDirection === 'LR' ? '横向' : '纵向'}）`}
          icon={<ArrowRightLeft size={16} />}
          onClick={onSwitchLayoutDirection}
        />
        <ToolBtn
          tip={lockSelected ? '已锁定选中节点：自动整理时不会移动它' : '锁定选中节点位置'}
          icon={lockSelected ? <Lock size={16} /> : <Unlock size={16} />}
          onClick={onToggleLockSelected}
        />
        <ToolBtn tip="连线清理与规范化" icon={<Wand2 size={16} />} disabled={readOnly} onClick={onRunEdgeCleanup} />
        <ToolBtn tip="一键修复可自动处理项" icon={<Activity size={16} />} disabled={readOnly} onClick={onRunQuickFix} />
      </div>

      <div className="flow-topbar__group flow-topbar__group--right">
        <ToolBtn tip="聚焦选中节点链路" icon={<Focus size={16} />} disabled={!hasActiveNode} onClick={onFocusActivePath} />
        <ToolBtn tip="清除链路聚焦 (Esc)" icon={<Workflow size={16} />} onClick={onClearFocus} />
        <div className="flow-topbar__focus-depth">
          <button
            type="button"
            className={`flow-topbar__depth-btn${focusDepth === 1 ? ' is-active' : ''}`}
            onClick={() => onChangeFocusDepth(1)}
          >
            1跳
          </button>
          <button
            type="button"
            className={`flow-topbar__depth-btn${focusDepth === 2 ? ' is-active' : ''}`}
            onClick={() => onChangeFocusDepth(2)}
          >
            2跳
          </button>
          <button
            type="button"
            className={`flow-topbar__depth-btn${focusDepth === 99 ? ' is-active' : ''}`}
            onClick={() => onChangeFocusDepth(99)}
          >
            全链路
          </button>
        </div>
        <button type="button" className="flow-topbar__diagnostics" onClick={onToggleDiagnosticsPanel}>
          诊断
          <span className={`flow-topbar__dot${diagnosticsCount > 0 ? ' is-warning' : ''}`} />
          <span className="flow-topbar__count">{diagnosticsCount}</span>
        </button>
      </div>
    </div>
  );
};

export default FlowTopbar;
