/** 识别 style 值中的 var()，对非 td/builder 命名空间给出提示（仅建议，不阻止保存） */

const VAR_RE = /var\s*\(\s*([^)]+?)\s*\)/gi;

const isKnownCssVar = (inner: string): boolean => {
  const t = inner.trim();
  if (t.startsWith('--td-') || t.startsWith('--builder-')) {
    return true;
  }
  return false;
};

export const collectUnknownVarUsages = (style: Record<string, unknown>): string[] => {
  const found: string[] = [];
  const seen = new Set<string>();

  Object.entries(style).forEach(([key, raw]) => {
    const text = String(raw ?? '');
    for (const m of text.matchAll(VAR_RE)) {
      const inner = m[1];
      if (!isKnownCssVar(inner)) {
        const sig = `${key}:${m[0]}`;
        if (!seen.has(sig)) {
          seen.add(sig);
          found.push(`${key}: ${m[0].trim()}`);
        }
      }
    }
  });

  return found;
};
