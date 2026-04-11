import type { FlowCodeListOutputContract } from '../../types/flow';
import { pickByPath } from '../../types/dataSource';

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

export interface ParseListContractResult {
  ok: true;
  contract: FlowCodeListOutputContract;
}

export interface ParseListContractError {
  ok: false;
  message: string;
}

/** 从 JSON 文本解析契约：支持裸数组、单条对象、或外层对象（需配合 arrayPath） */
export function parseListContractFromJsonText(
  text: string,
  arrayPathOverride?: string,
): ParseListContractResult | ParseListContractError {
  const trimmed = String(text ?? '').trim();
  if (!trimmed) {
    return { ok: false, message: '请粘贴 JSON 内容' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return { ok: false, message: 'JSON 格式不正确' };
  }

  const pathRaw = String(arrayPathOverride ?? '').trim();

  if (Array.isArray(parsed)) {
    const first = parsed[0];
    if (!first || typeof first !== 'object' || Array.isArray(first)) {
      return { ok: false, message: '数组首项必须是对象才能推断字段' };
    }
    return {
      ok: true,
      contract: { fields: Object.keys(first as Record<string, unknown>), arrayPath: pathRaw || undefined },
    };
  }

  if (isPlainObject(parsed)) {
    const keys = Object.keys(parsed);
    if (keys.length === 0) {
      return { ok: false, message: '对象为空' };
    }
    // 单条列表项样本
    if (!pathRaw) {
      return { ok: true, contract: { fields: keys } };
    }
    const atPath = pickByPath(parsed, pathRaw);
    if (Array.isArray(atPath)) {
      const first = atPath[0];
      if (!first || typeof first !== 'object' || Array.isArray(first)) {
        return { ok: false, message: '路径指向的数组首项必须是对象' };
      }
      return {
        ok: true,
        contract: { fields: Object.keys(first as Record<string, unknown>), arrayPath: pathRaw },
      };
    }
    return { ok: false, message: '当前路径未指向数组，请检查「数组路径」' };
  }

  return { ok: false, message: '仅支持 JSON 对象或数组' };
}

/** 手填：逗号/换行/分号分隔字段名 */
export function parseListContractFromManualFields(text: string): ParseListContractResult | ParseListContractError {
  const raw = String(text ?? '').trim();
  if (!raw) {
    return { ok: false, message: '请至少填写一个字段名' };
  }
  const fields = Array.from(
    new Set(
      raw
        .split(/[\s,，;；]+/)
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  );
  if (fields.length === 0) {
    return { ok: false, message: '请至少填写一个字段名' };
  }
  return { ok: true, contract: { fields } };
}
