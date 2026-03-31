import React from 'react';
import { Button, Tooltip } from 'tdesign-react';
import "../style.less"

interface UnifiedBuilderTopbarProps {
  /** 省略时不渲染左侧槽位（右侧条可独占一行并靠右对齐，见 .component-topbar--header-actions） */
  left?: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}

interface TopbarIconButtonProps {
  tip: string;
  icon: React.ReactNode;
  /** 图标下方说明（搭建页工具栏等）；小字号淡灰居中 */
  label?: string;
  disabled?: boolean;
  active?: boolean;
  onClick?: () => void;
}

export const TopbarIconButton: React.FC<TopbarIconButtonProps> = ({
  tip,
  icon,
  label,
  disabled,
  active,
  onClick,
}) => {
  const labeled = Boolean(label);
  return (
    <Tooltip content={tip} placement="bottom">
      <Button
        size="small"
        variant="text"
        disabled={disabled}
        onClick={onClick}
        className={`builder-topbar__icon-btn${active ? ' is-active' : ''}${labeled ? ' builder-topbar__icon-btn--labeled' : ''}`}
      >
        {labeled ? (
          <span className="builder-topbar__icon-btn-stack">
            <span className="builder-topbar__icon-btn-icon">{icon}</span>
            <span className="builder-topbar__icon-btn-caption">{label}</span>
          </span>
        ) : (
          icon
        )}
      </Button>
    </Tooltip>
  );
};

export const TopbarGroup: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <div className={`builder-topbar__group${className ? ` ${className}` : ''}`}>
    {children}
  </div>
);

const UnifiedBuilderTopbar: React.FC<UnifiedBuilderTopbarProps> = ({ left, right, className }) => {
  return (
    <div className={`builder-topbar${className ? ` ${className}` : ''}`}>
      {left != null ? <div className="builder-topbar__left">{left}</div> : null}
      <div className="builder-topbar__right">{right}</div>
    </div>
  );
};

export default UnifiedBuilderTopbar;
