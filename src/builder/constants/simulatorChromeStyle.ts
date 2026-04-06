export const SIMULATOR_CHROME_STYLES = ['dynamic-island', 'notch', 'status-bar'] as const;

export type SimulatorChromeStyle = (typeof SIMULATOR_CHROME_STYLES)[number];

export const DEFAULT_SIMULATOR_CHROME_STYLE: SimulatorChromeStyle = 'dynamic-island';

/** 三种顶栏统一高度（px），与 CSS --simulator-chrome-total 一致 */
export const SIMULATOR_CHROME_TOTAL_PX = 38;

/** 灵动岛：滚动区顶部内边距 */
export const SIMULATOR_CHROME_FLOATING_PAD_PX = SIMULATOR_CHROME_TOTAL_PX;

export interface SimulatorChromeStyleOption {
  id: SimulatorChromeStyle;
  title: string;
}

export const SIMULATOR_CHROME_STYLE_OPTIONS: SimulatorChromeStyleOption[] = [
  { id: 'dynamic-island', title: '灵动岛' },
  { id: 'notch', title: '刘海屏' },
  { id: 'status-bar', title: '经典状态栏' },
];
