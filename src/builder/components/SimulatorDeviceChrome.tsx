import React, { useEffect, useState } from 'react';

function formatHm(d: Date): string {
  const h = d.getHours();
  const m = d.getMinutes();
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * 搭建器模拟器顶部「系统状态栏」占位：纯装饰，pointer-events: none。
 */
const SimulatorDeviceChrome: React.FC = () => {
  const [time, setTime] = useState(() => formatHm(new Date()));

  useEffect(() => {
    const tick = () => setTime(formatHm(new Date()));
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="simulator-device-chrome" aria-hidden>
      <span className="simulator-device-chrome__time">{time}</span>
      <div className="simulator-device-chrome__icons">
        <svg className="simulator-device-chrome__wifi" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M5 12.55a11 11 0 0 1 14.08 0"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
          <path
            d="M8.53 16.11a6.5 6.5 0 0 1 6.94 0"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
          <path
            d="M12 20h.01"
            stroke="currentColor"
            strokeWidth="2.25"
            strokeLinecap="round"
          />
        </svg>
        <svg className="simulator-device-chrome__battery" viewBox="0 0 28 14" fill="none" aria-hidden>
          <rect x="1" y="2.5" width="22" height="9" rx="2" stroke="currentColor" strokeWidth="1.25" />
          <path d="M24.5 5v4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
          <rect x="3" y="4.5" width="16" height="5" rx="1" fill="currentColor" opacity="0.85" />
        </svg>
      </div>
    </div>
  );
};

export default SimulatorDeviceChrome;
