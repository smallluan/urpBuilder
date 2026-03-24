import type React from 'react';

const VH_UNIT_PATTERN = /(-?\d*\.?\d+)vh\b/gi;
const VW_UNIT_PATTERN = /(-?\d*\.?\d+)vw\b/gi;

const normalizeStyleText = (value: string): string => {
  if (!value.trim()) {
    return value;
  }

  const vhNormalized = value.replace(VH_UNIT_PATTERN, (_fullMatch, amount) => `calc(${amount} * var(--builder-vh, 1vh))`);
  return vhNormalized.replace(VW_UNIT_PATTERN, (_fullMatch, amount) => `calc(${amount} * var(--builder-vw, 1vw))`);
};

export const resolveSimulatorStyle = (
  style?: React.CSSProperties,
  options?: { mapFixedToAbsolute?: boolean },
): React.CSSProperties | undefined => {
  if (!style) {
    return undefined;
  }

  const resolvedEntries = Object.entries(style).map(([key, value]) => {
    if (typeof value === 'string') {
      return [key, normalizeStyleText(value)] as const;
    }
    return [key, value] as const;
  });
  const resolved = Object.fromEntries(resolvedEntries) as React.CSSProperties;

  if (options?.mapFixedToAbsolute && resolved.position === 'fixed') {
    resolved.position = 'absolute';
  }

  return resolved;
};

