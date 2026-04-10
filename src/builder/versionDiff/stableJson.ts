/**
 * 稳定 JSON 字符串（对象键排序），便于跨版本对比时减少无关顺序噪声。
 */
export function stableStringify(value: unknown, space = 2): string {
  return `${JSON.stringify(sortValue(value), replacer, space)}\n`;
}

function replacer(_key: string, val: unknown): unknown {
  return val;
}

function sortValue(value: unknown): unknown {
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => sortValue(item));
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  const next: Record<string, unknown> = {};
  for (const k of keys) {
    next[k] = sortValue(obj[k]);
  }
  return next;
}
