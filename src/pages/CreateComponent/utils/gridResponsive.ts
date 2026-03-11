export type GridBreakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

export interface GridBreakpointValue {
  span?: number;
  offset?: number;
}

export type GridResponsiveConfig = Partial<Record<GridBreakpoint, GridBreakpointValue>>;

export const GRID_BREAKPOINTS: GridBreakpoint[] = ['xs', 'sm', 'md', 'lg', 'xl', 'xxl'];

const BREAKPOINT_MIN_WIDTH: Record<GridBreakpoint, number> = {
  xs: 0,
  sm: 768,
  md: 992,
  lg: 1200,
  xl: 1400,
  xxl: 1880,
};

const clampGridSpan = (value: number) => Math.max(0, Math.min(12, Math.round(value)));

const clampGridOffset = (value: number) => Math.max(0, Math.min(11, Math.round(value)));

const toNumberOrUndefined = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
};

export const normalizeResponsiveConfig = (value: unknown): GridResponsiveConfig => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  const source = value as Record<string, unknown>;
  const nextConfig: GridResponsiveConfig = {};

  GRID_BREAKPOINTS.forEach((breakpoint) => {
    const rawBreakpointValue = source[breakpoint];
    const normalizedValue: GridBreakpointValue = {};

    const directNumber = toNumberOrUndefined(rawBreakpointValue);
    if (typeof directNumber === 'number') {
      normalizedValue.span = clampGridSpan(directNumber);
      nextConfig[breakpoint] = normalizedValue;
      return;
    }

    if (!rawBreakpointValue || typeof rawBreakpointValue !== 'object' || Array.isArray(rawBreakpointValue)) {
      return;
    }

    const breakpointRecord = rawBreakpointValue as Record<string, unknown>;
    const spanValue = toNumberOrUndefined(breakpointRecord.span);
    const offsetValue = toNumberOrUndefined(breakpointRecord.offset);

    if (typeof spanValue === 'number') {
      normalizedValue.span = clampGridSpan(spanValue);
    }

    if (typeof offsetValue === 'number') {
      normalizedValue.offset = clampGridOffset(offsetValue);
    }

    if (typeof normalizedValue.span === 'number' || typeof normalizedValue.offset === 'number') {
      nextConfig[breakpoint] = normalizedValue;
    }
  });

  return nextConfig;
};

export const getBreakpointByWidth = (width: number): GridBreakpoint => {
  const safeWidth = Number.isFinite(width) ? width : 0;

  if (safeWidth >= BREAKPOINT_MIN_WIDTH.xxl) {
    return 'xxl';
  }

  if (safeWidth >= BREAKPOINT_MIN_WIDTH.xl) {
    return 'xl';
  }

  if (safeWidth >= BREAKPOINT_MIN_WIDTH.lg) {
    return 'lg';
  }

  if (safeWidth >= BREAKPOINT_MIN_WIDTH.md) {
    return 'md';
  }

  if (safeWidth >= BREAKPOINT_MIN_WIDTH.sm) {
    return 'sm';
  }

  return 'xs';
};

export const resolveResponsiveColLayout = (
  baseSpan: number,
  baseOffset: number,
  responsiveConfig: GridResponsiveConfig,
  width: number,
) => {
  const activeBreakpoint = getBreakpointByWidth(width);
  const matchedConfig = responsiveConfig[activeBreakpoint];

  const resolvedSpan = typeof matchedConfig?.span === 'number' ? matchedConfig.span : clampGridSpan(baseSpan);
  const resolvedOffset = typeof matchedConfig?.offset === 'number' ? matchedConfig.offset : clampGridOffset(baseOffset);

  return {
    activeBreakpoint,
    span: clampGridSpan(resolvedSpan),
    offset: clampGridOffset(resolvedOffset),
  };
};

export const convertResponsiveConfigToTDesignProps = (
  baseSpan: number,
  baseOffset: number,
  responsiveConfig: GridResponsiveConfig,
) => {
  const normalizedBaseSpan = clampGridSpan(baseSpan);
  const normalizedBaseOffset = clampGridOffset(baseOffset);

  return GRID_BREAKPOINTS.reduce<Record<string, GridBreakpointValue>>((acc, breakpoint) => {
    const matchedConfig = responsiveConfig[breakpoint];
    const resolvedSpan = typeof matchedConfig?.span === 'number' ? clampGridSpan(matchedConfig.span) : normalizedBaseSpan;
    const resolvedOffset = typeof matchedConfig?.offset === 'number' ? clampGridOffset(matchedConfig.offset) : normalizedBaseOffset;

    acc[breakpoint] = {
      span: resolvedSpan,
      offset: resolvedOffset,
    };

    return acc;
  }, {});
};

export const resolveBuilderViewportWidth = (screenSize: string | number, autoWidth: number) => {
  if (screenSize === 'auto') {
    return autoWidth;
  }

  const parsed = Number(screenSize);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return autoWidth;
  }

  return parsed;
};
