import React from 'react';
import { Button, Tooltip } from 'tdesign-react';
import "../style.less"

interface UnifiedBuilderTopbarProps {
  left: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}

interface TopbarIconButtonProps {
  tip: string;
  icon: React.ReactNode;
  disabled?: boolean;
  active?: boolean;
  onClick?: () => void;
}

export const TopbarIconButton: React.FC<TopbarIconButtonProps> = ({
  tip,
  icon,
  disabled,
  active,
  onClick,
}) => (
  <Tooltip content={tip} placement="bottom">
    <Button
      size="small"
      variant="text"
      disabled={disabled}
      onClick={onClick}
      className={`builder-topbar__icon-btn${active ? ' is-active' : ''}`}
    >
      {icon}
    </Button>
  </Tooltip>
);

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
      <div className="builder-topbar__left">
        {left}
      </div>
      <div className="builder-topbar__right">
        {right}
      </div>
    </div>
  );
};

export default UnifiedBuilderTopbar;
