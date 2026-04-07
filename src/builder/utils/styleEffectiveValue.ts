import { normalizeStyleValue } from './nodeStyleCodec';

/**
 * 侧栏展示用：__style 显式值优先，否则用画布 getComputedStyle 采集值。
 * @param blockHints 为 true 时仅用显式键（简写与四向并存等场景避免与 hints 混读）
 */
export function getEffectiveStyleString(
  style: Record<string, unknown> | undefined,
  key: string,
  hints?: Record<string, string>,
  blockHints?: boolean,
): string {
  const map = normalizeStyleValue(style ?? {});
  const ex = String(map[key] ?? '').trim();
  if (blockHints) {
    return ex;
  }
  if (ex) {
    return ex;
  }
  return String(hints?.[key] ?? '').trim();
}
