/** 固定宽度预设下，宽度 ≤ 1024 视为手机/平板模拟，显示顶部状态栏占位 */
export function isHandheldSimulatorScreenSize(screenSize: string | number): boolean {
  if (screenSize === 'auto') {
    return false;
  }
  const w = Number(screenSize);
  return Number.isFinite(w) && w > 0 && w <= 1024;
}
