import type { UiTreeNode } from '../store/types';

export type DslRadioRow = {
  key: string;
  value: string | number | boolean;
  label: string;
  disabled: boolean;
};

const RADIO_NODE_TYPES = new Set(['Radio', 'antd.Radio']);

/** 解析禁用、开关等布尔字段（兼容历史或非严格 boolean 存储） */
export function normalizeDslBoolean(raw: unknown): boolean {
  if (raw === true || raw === 1) return true;
  if (raw === false || raw === 0 || raw === null || raw === undefined) return false;
  if (typeof raw === 'string') {
    const t = raw.trim().toLowerCase();
    return t === 'true' || t === '1' || t === 'yes';
  }
  return false;
}

/** 两个选项 value 是否视为同一选中项（如 1 与 "1"） */
export function valuesEqualForRadio(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  return String(a) === String(b);
}

/** 从 DSL 子节点收集单选项（与搭建/预览中 Radio.Group 子树一致） */
export function collectDslRadioRows(children: UiTreeNode[] | undefined): DslRadioRow[] {
  return (children ?? [])
    .filter((child) => RADIO_NODE_TYPES.has(String(child.type ?? '').trim()))
    .map((child) => {
      const get = (name: string) => (child.props?.[name] as { value?: unknown } | undefined)?.value;
      const valueRaw = get('value');
      let value: string | number | boolean =
        typeof valueRaw === 'number' || typeof valueRaw === 'boolean'
          ? valueRaw
          : typeof valueRaw === 'string' && valueRaw.trim()
            ? valueRaw.trim()
            : child.key;
      const content = get('content');
      const label = typeof content === 'string' ? content : String(value);
      const disabled = normalizeDslBoolean(get('disabled'));
      return { key: child.key, value, label, disabled };
    });
}

export function hasDslRadioChildren(children: UiTreeNode[] | undefined): boolean {
  return (children ?? []).some((c) => RADIO_NODE_TYPES.has(String(c.type ?? '').trim()));
}

/** 供 `Radio.Group` `options` 属性或等价结构使用 */
export function optionsFromRadioRows(
  rows: DslRadioRow[],
): Array<{ value: string | number | boolean; label: string; disabled?: boolean }> {
  return rows.map((r) => ({
    value: r.value,
    label: r.label,
    ...(r.disabled ? { disabled: true as const } : {}),
  }));
}

/**
 * React 单选组：非受控时**不能**传入 `value`（含 `value={undefined}`），否则仍会视为受控且会忽略 `defaultValue`。
 * 受控时只传 `value`，不传 `defaultValue`。
 */
export function radioGroupValuePropsForReact(
  controlled: boolean,
  valueResolved: string | number | boolean | undefined,
  defaultVal: string | number | boolean | undefined,
): { value?: string | number | boolean; defaultValue?: string | number | boolean } {
  if (controlled) {
    return { value: valueResolved };
  }
  if (defaultVal !== undefined) {
    return { defaultValue: defaultVal };
  }
  return {};
}

/**
 * 将属性面板里多为 string 的 `value` / `defaultValue` 与选项（或子 Radio）的 `value` 对齐，
 * 避免 JSON 里是数字 `1`、输入框里是 `"1"` 时受控选中不生效。
 */
export function coerceRadioGroupStoredValue(
  raw: unknown,
  options: Array<{ value: string | number | boolean }>,
): string | number | boolean | undefined {
  if (raw === undefined || raw === null) {
    return undefined;
  }
  if (typeof raw === 'string' && raw.trim() === '') {
    return undefined;
  }

  if (options.length === 0) {
    if (typeof raw === 'string') {
      const t = raw.trim();
      const n = Number(t);
      if (Number.isFinite(n) && String(n) === t) {
        return n;
      }
      return t;
    }
    if (typeof raw === 'number' || typeof raw === 'boolean') {
      return raw;
    }
    return undefined;
  }

  const match = (candidate: unknown): string | number | boolean | undefined => {
    for (const o of options) {
      if (Object.is(o.value, candidate)) {
        return o.value;
      }
    }
    return undefined;
  };

  const direct = match(raw);
  if (direct !== undefined) {
    return direct;
  }

  if (typeof raw === 'string') {
    const t = raw.trim();
    const fromStr = match(t);
    if (fromStr !== undefined) {
      return fromStr;
    }
    const n = Number(t);
    if (Number.isFinite(n) && String(n) === t) {
      const fromNum = match(n);
      if (fromNum !== undefined) {
        return fromNum;
      }
    }
    for (const o of options) {
      if (String(o.value) === t) {
        return o.value;
      }
    }
    return t;
  }

  if (typeof raw === 'number' && Number.isFinite(raw)) {
    const fromNum = match(raw);
    if (fromNum !== undefined) {
      return fromNum;
    }
    for (const o of options) {
      if (String(o.value) === String(raw)) {
        return o.value;
      }
    }
    return raw;
  }

  if (typeof raw === 'boolean') {
    return match(raw);
  }

  return undefined;
}
