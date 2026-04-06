import React, { useEffect, useState } from 'react';
import type { SimulatorChromeStyle } from '../constants/simulatorChromeStyle';

/** 状态栏时间（画布模拟器用，约 30s 刷新） */
const ChromeClock: React.FC<{ className?: string }> = ({ className }) => {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const id = window.setInterval(tick, 30000);
    return () => window.clearInterval(id);
  }, []);

  const text = now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  return <span className={className}>{text}</span>;
};

/** 蜂窝信号（四格，底对齐） */
const CellularIcon: React.FC<{ className?: string }> = ({ className }) => {
  const bars = [
    { x: 0.5, h: 3 },
    { x: 4.5, h: 4.5 },
    { x: 8.5, h: 6 },
    { x: 12.5, h: 7.5 },
  ];
  const baseY = 10.5;
  return (
    <svg
      className={className ?? 'simulator-device-chrome__cellular'}
      viewBox="-0.5 -0.5 17 12"
      fill="none"
      aria-hidden
      overflow="visible"
    >
      {bars.map((b, i) => (
        <rect key={i} x={b.x} y={baseY - b.h} width="2.75" height={b.h} rx="0.7" fill="currentColor" />
      ))}
    </svg>
  );
};

const WifiIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className ?? 'simulator-device-chrome__wifi'}
    viewBox="-1 -1 18 14"
    fill="none"
    aria-hidden
    overflow="visible"
  >
    <path d="M8 10.2a.9.9 0 1 0 0-1.8.9.9 0 0 0 0 1.8Z" fill="currentColor" />
    <path
      d="M5.1 7.35a3.35 3.35 0 0 1 5.8 0"
      stroke="currentColor"
      strokeWidth="1.35"
      strokeLinecap="round"
    />
    <path
      d="M2.65 4.9a6.8 6.8 0 0 1 10.7 0"
      stroke="currentColor"
      strokeWidth="1.35"
      strokeLinecap="round"
    />
    <path
      d="M.35 2.45a10.25 10.25 0 0 1 15.3 0"
      stroke="currentColor"
      strokeWidth="1.35"
      strokeLinecap="round"
    />
  </svg>
);

const BatteryIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className ?? 'simulator-device-chrome__battery'}
    viewBox="-0.5 -0.5 28 14"
    fill="none"
    aria-hidden
    overflow="visible"
  >
    <rect
      x="1"
      y="2.5"
      width="21"
      height="8"
      rx="2.25"
      stroke="currentColor"
      strokeOpacity="0.45"
      strokeWidth="1.1"
    />
    <path d="M23.5 4.9v3.2" stroke="currentColor" strokeOpacity="0.45" strokeWidth="1.35" strokeLinecap="round" />
    <rect x="3.2" y="4.35" width="15.5" height="4.3" rx="1.1" fill="currentColor" fillOpacity="0.92" />
  </svg>
);

const StatusIcons: React.FC<{ className?: string }> = ({ className }) => (
  <div className={className ?? 'simulator-device-chrome__icons-row'}>
    <CellularIcon />
    <WifiIcon />
    <BatteryIcon />
  </div>
);

const DynamicIslandChrome: React.FC = () => (
  <div className="simulator-device-chrome simulator-device-chrome--dynamic-island" aria-hidden>
    <div className="simulator-device-chrome__inner">
      <div className="simulator-device-chrome__safe">
        <div className="simulator-device-chrome__side simulator-device-chrome__side--left">
          <ChromeClock className="simulator-device-chrome__time" />
        </div>
        <div className="simulator-device-chrome__island-wrap">
          <div className="simulator-device-chrome__island">
            <span className="simulator-device-chrome__island-lens" />
            <span className="simulator-device-chrome__island-grille" />
          </div>
        </div>
        <div className="simulator-device-chrome__side simulator-device-chrome__side--right">
          <StatusIcons />
        </div>
      </div>
    </div>
  </div>
);

/**
 * 刘海屏：左右为浅色状态区（时间 / 图标），中间下垂为黑色刘海实体。
 */
const NotchChrome: React.FC = () => (
  <div className="simulator-device-chrome simulator-device-chrome--notch" aria-hidden>
    <div className="simulator-device-chrome__inner">
      <div className="simulator-device-chrome-notch__row">
        <div className="simulator-device-chrome-notch__segment simulator-device-chrome-notch__segment--left">
          <ChromeClock className="simulator-device-chrome__time simulator-device-chrome__time--on-notch-strip" />
        </div>
        <div className="simulator-device-chrome-notch__black" />
        <div className="simulator-device-chrome-notch__segment simulator-device-chrome-notch__segment--right">
          <StatusIcons className="simulator-device-chrome__icons-row simulator-device-chrome__icons-row--on-notch-strip" />
        </div>
      </div>
    </div>
    <div className="simulator-device-chrome__hairline simulator-device-chrome__hairline--on-notch-strip" />
  </div>
);

const StatusBarChrome: React.FC = () => (
  <div className="simulator-device-chrome simulator-device-chrome--status-bar" aria-hidden>
    <div className="simulator-device-chrome__inner">
      <div className="simulator-device-chrome-minimal__row">
        <ChromeClock className="simulator-device-chrome__time simulator-device-chrome__time--on-dark" />
        <StatusIcons />
      </div>
    </div>
    <div className="simulator-device-chrome__hairline simulator-device-chrome__hairline--on-dark" />
  </div>
);

export interface SimulatorDeviceChromeProps {
  variant: SimulatorChromeStyle;
}

const SimulatorDeviceChrome: React.FC<SimulatorDeviceChromeProps> = ({ variant }) => {
  if (variant === 'notch') {
    return <NotchChrome />;
  }
  if (variant === 'status-bar') {
    return <StatusBarChrome />;
  }
  return <DynamicIslandChrome />;
};

export default SimulatorDeviceChrome;
