import React from 'react';
import { useBuilderThemeStore } from '../../builder/theme/builderThemeStore';
import './ThemeModeAnimatedToggle.less';

export interface ThemeModeAnimatedToggleProps {
  className?: string;
  disabled?: boolean;
}

const StarShape: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden
  >
    <path d="M12 1.2l2.45 7.55h7.95l-6.43 4.67 2.46 7.58L12 16.9l-6.43 4.67 2.46-7.58-6.43-4.67h7.95L12 1.2z" />
  </svg>
);

const CloudPuff: React.FC<{ variant: 'day' | 'night' }> = ({ variant }) => (
  <span className={`theme-mode-animated-toggle__puff-group theme-mode-animated-toggle__puff-group--${variant}`} aria-hidden>
    <span className="theme-mode-animated-toggle__puff-bubble theme-mode-animated-toggle__puff-bubble--a" />
    <span className="theme-mode-animated-toggle__puff-bubble theme-mode-animated-toggle__puff-bubble--b" />
    <span className="theme-mode-animated-toggle__puff-bubble theme-mode-animated-toggle__puff-bubble--c" />
  </span>
);

/**
 * 浅色：太阳在左、右侧一朵白云居中；深色：月亮在右、月亮左侧一朵夜云居中；星在左半区。
 */
const ThemeModeAnimatedToggle: React.FC<ThemeModeAnimatedToggleProps> = ({ className = '', disabled }) => {
  const colorMode = useBuilderThemeStore((s) => s.colorMode);
  const beginThemeDiagonalToggle = useBuilderThemeStore((s) => s.beginThemeDiagonalToggle);
  const isDark = colorMode === 'dark';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? '切换为浅色模式' : '切换为深色模式'}
      title="快捷键：Ctrl+Shift+D 或 Cmd+Shift+D"
      disabled={disabled}
      className={`theme-mode-animated-toggle${isDark ? ' theme-mode-animated-toggle--dark' : ''}${className ? ` ${className}` : ''}`}
      onClick={() => {
        if (!disabled) {
          beginThemeDiagonalToggle();
        }
      }}
    >
      <span className="theme-mode-animated-toggle__viewport">
        <span className="theme-mode-animated-toggle__sky" aria-hidden />

        <span className="theme-mode-animated-toggle__stars" aria-hidden>
          {Array.from({ length: 8 }, (_, i) => (
            <span key={i} className={`theme-mode-animated-toggle__star theme-mode-animated-toggle__star--${(i % 3) + 1}`}>
              <StarShape className="theme-mode-animated-toggle__star-shape" />
            </span>
          ))}
        </span>

        {/* 右侧：一朵白云居中（与太阳分列两侧） */}
        <span className="theme-mode-animated-toggle__day-clouds" aria-hidden>
          <CloudPuff variant="day" />
        </span>

        <span className="theme-mode-animated-toggle__sun-rays" aria-hidden>
          <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.82">
              <line x1="20" y1="2" x2="20" y2="7" />
              <line x1="20" y1="33" x2="20" y2="38" />
              <line x1="2" y1="20" x2="7" y2="20" />
              <line x1="33" y1="20" x2="38" y2="20" />
              <line x1="6.5" y1="6.5" x2="10" y2="10" />
              <line x1="30" y1="30" x2="33.5" y2="33.5" />
              <line x1="33.5" y1="6.5" x2="30" y2="10" />
              <line x1="10" y1="30" x2="6.5" y2="33.5" />
            </g>
          </svg>
        </span>
        <span className="theme-mode-animated-toggle__sun" aria-hidden />

        {/* 月亮左侧：一朵夜云居中 */}
        <span className="theme-mode-animated-toggle__night-clouds" aria-hidden>
          <CloudPuff variant="night" />
        </span>

        <span className="theme-mode-animated-toggle__lunar" aria-hidden>
          <span className="theme-mode-animated-toggle__moon" />
          <span className="theme-mode-animated-toggle__crater theme-mode-animated-toggle__crater--1" />
          <span className="theme-mode-animated-toggle__crater theme-mode-animated-toggle__crater--2" />
        </span>
      </span>
    </button>
  );
};

export default React.memo(ThemeModeAnimatedToggle);
