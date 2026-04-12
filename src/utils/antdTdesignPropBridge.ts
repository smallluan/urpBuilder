/**
 * 双库（TDesign / Ant Design）DSL 桥接与样式约定。
 * 维护说明与 Image 等易回归点：见 `docs/tdesign-antd-dsl-alignment.md`。
 */
import type { CSSProperties } from 'react';
import type { ButtonProps } from 'antd/es/button';
import type { InputProps } from 'antd/es/input';
import type { TextAreaProps } from 'antd/es/input/TextArea';
import type { InputNumberProps } from 'antd/es/input-number';
import { normalizeBuilderTableColumns } from './tableColumnNormalize';
import { normalizeDslBoolean } from '../builder/utils/radioDsl';

/**
 * TDesign Card 默认 body 内边距往往比 antd Card 更「松」，同一 DSL 切换预览库时登录区等会显得更靠下、更「空」。
 * 搭建与预览里为两套 Card 统一内容区内边距，避免纯组件库 token 差异带来的纵向错位观感。
 */
export const BUILDER_CARD_BODY_STYLE: CSSProperties = {
  padding: '20px 24px',
};

/**
 * Ant Design Statistic 根节点默认偏块级、易独占一行；TDesign Statistic 更接近行内块。
 * 根节点下兄弟的纵向排列由 `.drop-area-root > .drop-area__body` / `.preview-page-root__body` 的纵向 flex（`align-items: flex-start`）与 `min-width:0` 约束统一，避免 antd inline-flex 根在 block 流里横向并排。
 */
export function antStatisticRootStyleMerge(user?: CSSProperties): CSSProperties {
  return {
    display: 'inline-block',
    maxWidth: '100%',
    boxSizing: 'border-box',
    ...(user ?? {}),
  };
}

/** TDesign Statistic.color -> Ant Statistic valueStyle */
export function statisticColorStyle(color: string | undefined): CSSProperties | undefined {
  const key = String(color ?? '').trim().toLowerCase();
  const map: Record<string, string> = {
    black: 'rgba(0,0,0,0.88)',
    blue: '#1677ff',
    red: '#ff4d4f',
    orange: '#fa8c16',
    green: '#52c41a',
    primary: '#1677ff',
    success: '#52c41a',
    warning: '#fa8c16',
    error: '#ff4d4f',
    danger: '#ff4d4f',
    default: 'rgba(0,0,0,0.88)',
  };
  const c = key && map[key];
  return c ? { color: c } : undefined;
}

/** TDesign Divider.align -> Ant Divider orientation */
export function dividerOrientationFromAlign(align: string | undefined): 'left' | 'center' | 'right' {
  const a = String(align ?? 'center').trim();
  if (a === 'left' || a === 'right' || a === 'center') {
    return a;
  }
  return 'center';
}

/** TDesign Typography.Title level h1..h6 -> Ant Title level 1..5 */
export function antTitleLevelFromTdesign(levelRaw: string | undefined): 1 | 2 | 3 | 4 | 5 {
  const s = String(levelRaw ?? 'h4').trim().toLowerCase();
  const n = Number(s.replace('h', ''));
  if (Number.isFinite(n) && n >= 1 && n <= 5) {
    return n as 1 | 2 | 3 | 4 | 5;
  }
  if (Number.isFinite(n) && n === 6) {
    return 5;
  }
  return 4;
}

/** Ant Design 6+：`color` + `variant` 为语义主路径（见 antd `Button` 内部 `ButtonTypeMap` 兼容逻辑）。 */
export type ButtonAntdMapping = {
  color: NonNullable<ButtonProps['color']>;
  variant: NonNullable<ButtonProps['variant']>;
  size: 'large' | 'middle' | 'small';
  block: boolean;
  shape: 'default' | 'round' | 'circle';
};

/**
 * TDesign DSL 语义主题（与 catalog 中 Button、Link、Text 等选项对齐）→ antd Button `color`。
 * 不开放任意色值，仅白名单语义键；未知键按 `default`。
 */
const SEMANTIC_THEME_TO_ANTD_BUTTON_COLOR: Record<string, NonNullable<ButtonProps['color']>> = {
  primary: 'primary',
  success: 'green',
  warning: 'orange',
  error: 'danger',
  danger: 'danger',
  default: 'default',
};

export function tdesignSemanticThemeToAntdButtonColor(
  theme: string | undefined,
  opts?: { danger?: boolean },
): NonNullable<ButtonProps['color']> {
  const t = String(theme ?? 'default').trim().toLowerCase();
  let color: NonNullable<ButtonProps['color']> = SEMANTIC_THEME_TO_ANTD_BUTTON_COLOR[t] ?? 'default';
  if (opts?.danger === true || t === 'error') {
    color = 'danger';
  }
  return color;
}

/** Typography.Text：`theme` → antd Text/Link `type`（无 primary 枚举，主色为默认字色）。 */
export function tdesignTextThemeToAntdTypographyType(
  theme: string | undefined,
): 'secondary' | 'success' | 'warning' | 'danger' | undefined {
  const t = String(theme ?? 'primary').trim().toLowerCase();
  if (t === 'primary') {
    return undefined;
  }
  if (t === 'secondary') {
    return 'secondary';
  }
  if (t === 'success') {
    return 'success';
  }
  if (t === 'warning') {
    return 'warning';
  }
  if (t === 'error' || t === 'danger') {
    return 'danger';
  }
  return undefined;
}

/** Link：`theme` default/primary 为默认链接色，其余走语义 type。 */
export function tdesignLinkThemeToAntdTypographyType(
  theme: string | undefined,
): 'secondary' | 'success' | 'warning' | 'danger' | undefined {
  const t = String(theme ?? 'default').trim().toLowerCase();
  if (t === 'default' || t === 'primary') {
    return undefined;
  }
  if (t === 'success') {
    return 'success';
  }
  if (t === 'warning') {
    return 'warning';
  }
  if (t === 'danger' || t === 'error') {
    return 'danger';
  }
  return undefined;
}

/**
 * Tag `color`：仅允许语义名映射到 antd 预设色，或保留 `#` 十六进制（旧数据）；其它字符串忽略。
 */
export function tdesignSemanticTokenToAntdTagColor(raw: string | undefined): string | undefined {
  const t = String(raw ?? '').trim().toLowerCase();
  if (!t) {
    return undefined;
  }
  const preset: Record<string, string> = {
    primary: 'processing',
    success: 'success',
    warning: 'warning',
    error: 'error',
    danger: 'error',
    default: 'default',
  };
  if (preset[t]) {
    return preset[t];
  }
  if (/^#[0-9a-f]{3,8}$/i.test(t)) {
    return t;
  }
  return undefined;
}

/** TDesign `Radio.Group` DSL → antd `Radio.Group`（`optionType` + `buttonStyle`；尺寸物料已移除，由主题控制）。 */
export type RadioGroupAntdMapping = {
  optionType: 'default' | 'button';
  buttonStyle: 'outline' | 'solid';
  disabled: boolean;
};

/**
 * - `theme`：`radio` → `optionType: default`；`button` → `optionType: button`。
 * - `variant`（仅按钮式）：`outline` → `buttonStyle: outline`；`primary-filled` / `default-filled` → `solid`（antd 仅两档，两种填充在 antd 侧不区分）。
 * - 旧物料若仅存 `optionType`（default|button）而无 `theme`，仍参与推断。
 */
export function mapTdesignRadioGroupToAntd(dsl: {
  theme?: string;
  variant?: string;
  disabled?: unknown;
  /** 旧 antd-only 物料字段，兼容迁移 */
  optionType?: string;
}): RadioGroupAntdMapping {
  const legacy = String(dsl.optionType ?? '').trim().toLowerCase();
  let theme = String(dsl.theme ?? '').trim().toLowerCase();
  if (!theme && legacy === 'button') {
    theme = 'button';
  }
  if (!theme && legacy === 'default') {
    theme = 'radio';
  }
  if (!theme) {
    theme = 'radio';
  }

  const variantRaw = String(dsl.variant ?? 'outline').trim().toLowerCase();

  const optionType: 'default' | 'button' = theme === 'button' ? 'button' : 'default';

  let buttonStyle: 'outline' | 'solid' = 'outline';
  if (optionType === 'button') {
    buttonStyle = variantRaw === 'primary-filled' || variantRaw === 'default-filled' ? 'solid' : 'outline';
  }

  return {
    optionType,
    buttonStyle,
    disabled: normalizeDslBoolean(dsl.disabled),
  };
}

/**
 * TDesign Input / Textarea DSL（与 `componentCatalog` 中 Input、Textarea 一致）→ antd Input / Input.TextArea 可识别 props。
 * TDesign 专有项（如 align、autoWidth）通过 style 或近似行为对齐。
 */
export type TdesignInputDslForAntd = {
  align?: string;
  size?: string;
  status?: string;
  clearable?: boolean;
  borderless?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  maxlength?: number;
  maxcharacter?: number;
  showLimitNumber?: boolean;
  autoWidth?: boolean;
  autofocus?: boolean;
  name?: string;
  type?: string;
  tips?: string;
};

export function mapTdesignInputPropsToAntd(dsl: TdesignInputDslForAntd): {
  inputProps: Omit<Partial<InputProps>, 'value' | 'defaultValue' | 'onChange' | 'style'>;
  style: CSSProperties;
  tips?: string;
} {
  const sizeRaw = String(dsl.size ?? 'medium').trim();
  const sizeMap: Record<string, NonNullable<InputProps['size']>> = {
    large: 'large',
    small: 'small',
    medium: 'middle',
    middle: 'middle',
    normal: 'middle',
  };
  const size = sizeMap[sizeRaw] ?? 'middle';

  const statusRaw = String(dsl.status ?? 'default').trim();
  const status: InputProps['status'] =
    statusRaw === 'error' ? 'error' : statusRaw === 'warning' ? 'warning' : undefined;

  const variant: InputProps['variant'] = dsl.borderless === true ? 'borderless' : undefined;

  const rawMax =
    typeof dsl.maxlength === 'number' && dsl.maxlength > 0
      ? dsl.maxlength
      : typeof dsl.maxcharacter === 'number' && dsl.maxcharacter > 0
        ? dsl.maxcharacter
        : undefined;
  const maxLength = rawMax;

  let showCount: InputProps['showCount'];
  if (dsl.showLimitNumber === true) {
    if (rawMax != null && rawMax > 0) {
      showCount = true;
    } else {
      showCount = { formatter: ({ value }: { value: string }) => `${value?.length ?? 0}` };
    }
  }

  const textAlign =
    dsl.align === 'center' || dsl.align === 'right' ? dsl.align : dsl.align === 'left' ? 'left' : undefined;
  const style: CSSProperties = {
    ...(dsl.autoWidth === true ? { width: 'fit-content', maxWidth: '100%', display: 'inline-flex' } : {}),
  };

  const tips = dsl.tips?.trim() || undefined;
  const semanticStyles: InputProps['styles'] = {
    root: {
      ...(dsl.autoWidth === true ? { width: 'fit-content', maxWidth: '100%', display: 'inline-flex' } : {}),
      ...(statusRaw === 'success'
        ? {
          borderColor: '#52c41a',
          boxShadow: '0 0 0 2px rgba(82, 196, 26, 0.12)',
        }
        : {}),
    },
    input: textAlign ? { textAlign } : undefined,
    count: textAlign ? { textAlign } : undefined,
  };

  const inputProps: Omit<Partial<InputProps>, 'value' | 'defaultValue' | 'onChange' | 'style'> = {
    size,
    status,
    variant,
    allowClear: dsl.clearable === true ? true : undefined,
    disabled: dsl.disabled === true ? true : undefined,
    readOnly: dsl.readOnly === true ? true : undefined,
    maxLength,
    showCount,
    autoFocus: dsl.autofocus === true ? true : undefined,
    name: dsl.name?.trim() || undefined,
    type: (dsl.type?.trim() as InputProps['type']) || 'text',
    styles: semanticStyles,
  };

  return { inputProps, style, tips };
}

/** 与 `propAccessors.getTextareaAutosizeProp` 对 DSL 原始 `autosize` 解析一致，供预览等场景复用。 */
export function parseDslAutosizeValue(value: unknown): boolean | { minRows?: number; maxRows?: number } | undefined {
  if (typeof value === 'boolean') {
    return value;
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    const minRows = typeof record.minRows === 'number' && Number.isFinite(record.minRows) ? record.minRows : undefined;
    const maxRows = typeof record.maxRows === 'number' && Number.isFinite(record.maxRows) ? record.maxRows : undefined;
    if (typeof minRows === 'number' || typeof maxRows === 'number') {
      return { minRows, maxRows };
    }
    return undefined;
  }
  if (typeof value === 'string') {
    const text = value.trim();
    if (!text) {
      return undefined;
    }
    if (text === 'true') {
      return true;
    }
    if (text === 'false') {
      return false;
    }
    try {
      const parsed = JSON.parse(text) as unknown;
      if (typeof parsed === 'boolean') {
        return parsed;
      }
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const record = parsed as Record<string, unknown>;
        const minRows = typeof record.minRows === 'number' && Number.isFinite(record.minRows) ? record.minRows : undefined;
        const maxRows = typeof record.maxRows === 'number' && Number.isFinite(record.maxRows) ? record.maxRows : undefined;
        if (typeof minRows === 'number' || typeof maxRows === 'number') {
          return { minRows, maxRows };
        }
      }
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export type TdesignTextareaDslForAntd = {
  status?: string;
  disabled?: boolean;
  readOnly?: boolean;
  maxlength?: number;
  maxcharacter?: number;
  /** TDesign Textarea「计数器」→ antd showCount */
  count?: boolean;
  allowInputOverMax?: boolean;
  autofocus?: boolean;
  name?: string;
  className?: string;
  tips?: string;
  rows?: number;
  autosize?: boolean | { minRows?: number; maxRows?: number };
};

export function mapTdesignTextareaPropsToAntd(dsl: TdesignTextareaDslForAntd): {
  textareaProps: Omit<Partial<TextAreaProps>, 'value' | 'defaultValue' | 'onChange' | 'style'>;
  style: CSSProperties;
  tips?: string;
} {
  const statusRaw = String(dsl.status ?? 'default').trim();
  const status: TextAreaProps['status'] =
    statusRaw === 'error' ? 'error' : statusRaw === 'warning' ? 'warning' : undefined;

  const rawMax =
    typeof dsl.maxlength === 'number' && dsl.maxlength > 0
      ? dsl.maxlength
      : typeof dsl.maxcharacter === 'number' && dsl.maxcharacter > 0
        ? dsl.maxcharacter
        : undefined;
  const maxLength = dsl.allowInputOverMax === true ? undefined : rawMax;

  let showCount: TextAreaProps['showCount'];
  if (dsl.count === true) {
    if (rawMax != null && rawMax > 0) {
      showCount = true;
    } else {
      showCount = { formatter: ({ value }: { value: string }) => `${value?.length ?? 0}` };
    }
  }

  const rows = typeof dsl.rows === 'number' && dsl.rows > 0 ? Math.round(dsl.rows) : 4;
  const autoSize = dsl.autosize === false ? false : dsl.autosize;

  const tips = dsl.tips?.trim() || undefined;

  const textareaProps: Omit<Partial<TextAreaProps>, 'value' | 'defaultValue' | 'onChange' | 'style'> = {
    rows,
    autoSize,
    status,
    disabled: dsl.disabled === true ? true : undefined,
    readOnly: dsl.readOnly === true ? true : undefined,
    maxLength,
    showCount,
    autoFocus: dsl.autofocus === true ? true : undefined,
    name: dsl.name?.trim() || undefined,
    className: dsl.className?.trim() || undefined,
  };

  return { textareaProps, style: {}, tips };
}

/**
 * TDesign `InputNumber` DSL → antd `InputNumber`。
 * - `theme: normal`：无步进按钮 → antd `controls={false}`；`row` / `column` 使用默认 `controls`。
 * - `decimalPlaces` → `precision`。
 * - `align` → `styles.input.textAlign`。
 * - `status: success`：antd 无对应项，用 `styles.root` 模拟绿色描边。
 */
export function mapTdesignInputNumberPropsToAntd(dsl: {
  size?: string;
  status?: string;
  align?: string;
  theme?: string;
  decimalPlaces?: number;
}): Pick<InputNumberProps, 'size' | 'status' | 'precision' | 'controls' | 'styles'> {
  const sizeRaw = String(dsl.size ?? 'medium').trim();
  const sizeMap: Record<string, NonNullable<InputNumberProps['size']>> = {
    large: 'large',
    small: 'small',
    medium: 'middle',
    middle: 'middle',
    normal: 'middle',
  };
  const size = sizeMap[sizeRaw] ?? 'middle';

  const statusRaw = String(dsl.status ?? 'default').trim();
  const status: InputNumberProps['status'] =
    statusRaw === 'error' ? 'error' : statusRaw === 'warning' ? 'warning' : undefined;

  const themeStr = String(dsl.theme ?? 'row').trim();
  const controls: InputNumberProps['controls'] = themeStr === 'normal' ? false : undefined;

  const dp = dsl.decimalPlaces;
  const precision: InputNumberProps['precision'] =
    typeof dp === 'number' && Number.isFinite(dp) && dp >= 0 && dp <= 20 ? Math.round(dp) : undefined;

  const textAlign =
    dsl.align === 'center' || dsl.align === 'right' ? dsl.align : dsl.align === 'left' ? 'left' : undefined;

  const styles: InputNumberProps['styles'] = {
    ...(textAlign ? { input: { textAlign } } : {}),
    ...(statusRaw === 'success'
      ? {
          root: {
            borderColor: '#52c41a',
            boxShadow: '0 0 0 2px rgba(82, 196, 26, 0.12)',
          },
        }
      : {}),
  };

  const hasStyles = Boolean(styles.input || styles.root);

  return {
    size,
    status,
    ...(typeof precision === 'number' ? { precision } : {}),
    ...(controls === false ? { controls: false } : {}),
    ...(hasStyles ? { styles } : {}),
  };
}

export function mapTdesignButtonToAntd(opts: {
  theme?: string;
  variant?: string;
  shape?: string;
  size?: string;
  danger?: boolean;
  block?: boolean;
}): ButtonAntdMapping {
  const variantRaw = String(opts.variant ?? 'base').trim().toLowerCase();
  const shape = String(opts.shape ?? 'rect').trim().toLowerCase();
  const sizeRaw = String(opts.size ?? 'normal').trim().toLowerCase();

  const sizeMap: Record<string, 'large' | 'middle' | 'small'> = {
    large: 'large',
    small: 'small',
    normal: 'middle',
    medium: 'middle',
  };
  const size = sizeMap[sizeRaw] ?? 'middle';

  const variantToAntd: Record<string, NonNullable<ButtonProps['variant']>> = {
    base: 'solid',
    outline: 'outlined',
    dashed: 'dashed',
    text: 'text',
  };

  const color = tdesignSemanticThemeToAntdButtonColor(opts.theme, { danger: opts.danger });

  const variant: NonNullable<ButtonProps['variant']> = variantToAntd[variantRaw] ?? 'solid';

  const block = opts.block === true;
  const shapeAnt: 'default' | 'round' | 'circle' =
    shape === 'round' ? 'round' : shape === 'circle' ? 'circle' : 'default';

  return { color, variant, size, block, shape: shapeAnt };
}

/** TDesign Space.size 为 number，Ant Space 为 small|middle|large|number */
export function antdSpaceSizeFromTdesign(raw: unknown): number | 'small' | 'middle' | 'large' {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return raw;
  }
  const s = String(raw ?? '8');
  if (s === 'small') {
    return 'small';
  }
  if (s === 'middle' || s === 'medium') {
    return 'middle';
  }
  if (s === 'large') {
    return 'large';
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : 8;
}

export function tdesignTableColumnsToAntd(columnsUnknown: unknown) {
  const normalized = normalizeBuilderTableColumns(columnsUnknown);
  return normalized.map((col, index) => ({
    title: String(col.title ?? ''),
    dataIndex: String(col.colKey ?? index),
    key: String(col.colKey ?? `col-${index}`),
    width: typeof col.width === 'number' ? col.width : undefined,
    align: col.align === 'center' || col.align === 'right' ? (col.align as 'center' | 'right') : ('left' as const),
    ellipsis: col.ellipsis === true ? ({ showTitle: true } as const) : undefined,
  }));
}

const TABLE_FALLBACK = [
  { id: 'row-1', name: '张三', role: '管理员', status: '启用' },
  { id: 'row-2', name: '李四', role: '编辑', status: '启用' },
  { id: 'row-3', name: '王五', role: '访客', status: '禁用' },
];

export function resolveAntdTableDataSource(raw: unknown): Array<Record<string, unknown>> {
  return Array.isArray(raw) && raw.length > 0 ? (raw as Array<Record<string, unknown>>) : TABLE_FALLBACK;
}

/**
 * TDesign Drawer 的 `size`（及可选数值 `width`）与 antd Drawer 的 `width`/`height` 对齐。
 * 尺寸表与 tdesign-react `drawer/Drawer.js` 内 `sizeMap` 一致（small/medium/large）。
 */
export function drawerWidthPxFromTdesignSize(opts: {
  width?: number;
  size?: string;
}): number {
  if (typeof opts.width === 'number' && opts.width > 0) {
    return opts.width;
  }
  const raw = String(opts.size ?? 'small').trim().toLowerCase();
  const sizeMap: Record<string, number> = {
    small: 300,
    medium: 500,
    large: 760,
  };
  if (sizeMap[raw]) {
    return sizeMap[raw];
  }
  const n = Number(raw);
  if (Number.isFinite(n) && n > 0) {
    return n;
  }
  return 300;
}

/**
 * Ant Design Image：TDesign 把 DSL 的 `style` 叠在组件**外层 wrapper** 上；antd 若把同一套 `style` 只给 `<img>`，
 * 会出现「壳 100%、图 50%」与 TDesign 不一致。
 * 做法：DSL 整段进 `styles.root`（与 TDesign 外层一致）；`styles.image` 只负责在壳内铺满：
 * width/height 100% + objectFit（与 TDesign 内层 img 填满 wrapper 一致）。
 * 不要同时把 `style={merged}` 传给 antd Image，否则 rc-image 仍会叠到 img 上再算一遍宽高。
 */
export function antdImageStylesFromMergeStyle(merged: CSSProperties | undefined): {
  root: CSSProperties;
  image: CSSProperties;
} {
  const m = merged ?? {};
  const objectFit = (m.objectFit as CSSProperties['objectFit']) ?? 'cover';
  return {
    root: { ...m },
    image: {
      width: '100%',
      height: '100%',
      objectFit,
      verticalAlign: 'middle',
    },
  };
}
