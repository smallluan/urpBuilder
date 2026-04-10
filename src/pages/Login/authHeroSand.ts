/** 登录页左侧故事区：沙尘风场动效（与样式中的 keyframes 时长对齐） */
export const GRAIN_DURATION_IN_MS = 780;
export const GRAIN_DURATION_OUT_MS = 720;
export const GRAIN_STAGGER_IN_MS = 14;
export const GRAIN_STAGGER_OUT_MS = 11;
export const GRAIN_HOLD_MS = 3200;

function blockTime(charCount: number, staggerMs: number, durationMs: number) {
  if (charCount <= 1) {
    return durationMs;
  }
  return (charCount - 1) * staggerMs + durationMs;
}

export function sandTimelineForStory(textLens: { title: number; desc: number; metaA: number; metaB: number }) {
  const maxChars = Math.max(textLens.title, textLens.desc, textLens.metaA, textLens.metaB, 1);
  const enterMs = Math.min(
    2400,
    Math.max(760, blockTime(maxChars, GRAIN_STAGGER_IN_MS, GRAIN_DURATION_IN_MS) + 90)
  );
  const exitMs = Math.min(
    2200,
    Math.max(700, blockTime(maxChars, GRAIN_STAGGER_OUT_MS, GRAIN_DURATION_OUT_MS) + 90)
  );
  return { enterMs, holdMs: GRAIN_HOLD_MS, exitMs };
}

export function sandJitter(index: number) {
  return ((index * 17) % 9) - 4;
}
