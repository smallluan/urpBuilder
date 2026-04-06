import React, { useCallback } from 'react';
import { Check } from 'lucide-react';
import type { SimulatorChromeStyle } from '../constants/simulatorChromeStyle';
import { SIMULATOR_CHROME_STYLE_OPTIONS } from '../constants/simulatorChromeStyle';
import './SimulatorAppearancePopup.less';

export interface SimulatorAppearancePopupContentProps {
  value: SimulatorChromeStyle;
  onChange: (next: SimulatorChromeStyle) => void;
  readOnly?: boolean;
  /** 嵌入画布 Popup：标题与选项纵向排列 */
  embedded?: boolean;
}

/** 灵动岛：左空 · 岛 · 右示意信号 */
const ThumbDynamicIsland: React.FC = () => (
  <div className="builder-sim-appearance__mock builder-sim-appearance__mock--island" aria-hidden>
    <div className="builder-sim-appearance__mock-bg" />
    <div className="builder-sim-appearance__mock-island-row">
      <span className="builder-sim-appearance__mock-cell" />
      <span className="builder-sim-appearance__mock-pill" />
      <span className="builder-sim-appearance__mock-sig" />
    </div>
  </div>
);

/** 刘海：两侧浅色状态区 · 中间黑色刘海（示意图无时间） */
const ThumbNotch: React.FC = () => (
  <div className="builder-sim-appearance__mock builder-sim-appearance__mock--notch" aria-hidden>
    <div className="builder-sim-appearance__mock-bg" />
    <div className="builder-sim-appearance__mock-notch-strip">
      <span className="builder-sim-appearance__mock-notch-side" />
      <span className="builder-sim-appearance__mock-notch-tab" />
      <span className="builder-sim-appearance__mock-notch-side builder-sim-appearance__mock-notch-side--right">
        <span className="builder-sim-appearance__mock-sig-on-light" />
      </span>
    </div>
  </div>
);

const ThumbStatusBar: React.FC = () => (
  <div className="builder-sim-appearance__mock builder-sim-appearance__mock--bar" aria-hidden>
    <div className="builder-sim-appearance__mock-bg" />
    <div className="builder-sim-appearance__mock-bar">
      <span className="builder-sim-appearance__mock-bar-icons" />
    </div>
  </div>
);

const THUMB: Record<SimulatorChromeStyle, React.ReactNode> = {
  'dynamic-island': <ThumbDynamicIsland />,
  notch: <ThumbNotch />,
  'status-bar': <ThumbStatusBar />,
};

export const SimulatorAppearancePopupContent: React.FC<SimulatorAppearancePopupContentProps> = ({
  value,
  onChange,
  readOnly,
  embedded,
}) => {
  const handlePick = useCallback(
    (id: SimulatorChromeStyle) => {
      if (readOnly) {
        return;
      }
      onChange(id);
    },
    [onChange, readOnly],
  );

  const options = (
    <div
      className={`builder-sim-appearance__options${embedded ? ' builder-sim-appearance__options--embedded' : ''}`}
      role="listbox"
      aria-label="顶栏样式"
    >
      {SIMULATOR_CHROME_STYLE_OPTIONS.map((opt) => {
        const active = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            role="option"
            aria-selected={active}
            disabled={readOnly}
            className={`builder-sim-appearance__opt${active ? ' is-active' : ''}`}
            onClick={() => handlePick(opt.id)}
          >
            <span className="builder-sim-appearance__opt-check" aria-hidden>
              {active ? <Check size={12} strokeWidth={2.75} /> : null}
            </span>
            <div className="builder-sim-appearance__opt-thumb">{THUMB[opt.id]}</div>
            <span className="builder-sim-appearance__opt-name">{opt.title}</span>
          </button>
        );
      })}
    </div>
  );

  if (embedded) {
    return <div className="builder-sim-appearance builder-sim-appearance--embedded">{options}</div>;
  }

  return (
    <div className="builder-sim-appearance">
      <div className="builder-sim-appearance__row">
        <span className="builder-sim-appearance__label">顶栏样式</span>
        {options}
      </div>
    </div>
  );
};
