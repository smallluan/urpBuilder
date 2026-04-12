import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, Button, ColorPicker, Input, Select } from 'tdesign-react';
import { ArrowLeft, ArrowRight, ArrowUp, ArrowDown, Link2, Unlink2 } from 'lucide-react';
import { hasShorthandSpacing, normalizeStyleValue } from '../../utils/nodeStyleCodec';
import { getEffectiveStyleString } from '../../utils/styleEffectiveValue';
import './BoxModelStyleEditor.less';

const SIDES = ['Top', 'Right', 'Bottom', 'Left'] as const;
type Side = (typeof SIDES)[number];
type LayerId = 'margin' | 'padding' | 'border';

const RADIUS_CORNERS = [
  { key: 'borderTopLeftRadius', label: 'TL' },
  { key: 'borderTopRightRadius', label: 'TR' },
  { key: 'borderBottomLeftRadius', label: 'BL' },
  { key: 'borderBottomRightRadius', label: 'BR' },
] as const;

export interface BoxModelStyleEditorProps {
  value?: Record<string, unknown>;
  onPatch: (patch: Record<string, string | undefined>) => void;
  readOnly?: boolean;
  computedHints?: Record<string, string>;
  /** 将四边编辑 Popup 挂到该容器内（如样式抽屉 body），避免挂到 document.body 时与 Drawer 焦点隔离导致无法聚焦输入框 */
  popupAttachRef?: React.RefObject<HTMLElement | null>;
}

const gv = (style: Record<string, unknown>, key: string): string => normalizeStyleValue(style)[key] ?? '';

const isVarColor = (c: string) => /^\s*var\s*\(/.test(String(c ?? ''));

const BORDER_STYLE_OPTIONS = [
  { label: 'solid', value: 'solid' },
  { label: 'dashed', value: 'dashed' },
  { label: 'dotted', value: 'dotted' },
  { label: 'none', value: 'none' },
] as const;

const SIDE_SHORT: Record<Side, string> = { Top: 'T', Right: 'R', Bottom: 'B', Left: 'L' };

const BORDER_BLOCK_KEYS = [
  'border', 'borderTop', 'borderRight', 'borderBottom', 'borderLeft', 'borderWidth',
] as const;

const hasBorderShorthand = (style: Record<string, unknown>): boolean =>
  BORDER_BLOCK_KEYS.some((k) => String(gv(style, k)).trim().length > 0);

const normalizePxInput = (raw: string): string => {
  const t = String(raw ?? '').trim();
  if (!t || t === '.') return '0px';
  const n = parseFloat(t.replace(/px$/i, ''));
  if (!Number.isFinite(n) || n < 0) return '0px';
  return `${n}px`;
};

const normalizeSpacingToken = (raw: string): string => {
  const t = String(raw ?? '').trim();
  if (!t) return '';
  if (/^\d+(\.\d+)?$/.test(t)) return `${t}px`;
  return t;
};

const parseSpacingShorthand = (raw: string): Record<Side, string> | null => {
  const t = String(raw ?? '').trim();
  if (!t) return null;
  const tokens = t.split(/\s+/).filter(Boolean);
  if (tokens.length < 1 || tokens.length > 4) return null;
  const one = normalizeSpacingToken(tokens[0] ?? '');
  const two = normalizeSpacingToken(tokens[1] ?? tokens[0] ?? '');
  const three = normalizeSpacingToken(tokens[2] ?? tokens[0] ?? '');
  const four = normalizeSpacingToken(tokens[3] ?? tokens[1] ?? tokens[0] ?? '');
  if (tokens.length === 1) {
    return { Top: one, Right: one, Bottom: one, Left: one };
  }
  if (tokens.length === 2) {
    return { Top: one, Right: two, Bottom: one, Left: two };
  }
  if (tokens.length === 3) {
    return { Top: one, Right: two, Bottom: three, Left: two };
  }
  return { Top: one, Right: two, Bottom: three, Left: four };
};

const LAYER_TITLES: Record<LayerId, string> = { margin: '外边距', border: '边框', padding: '内边距' };

const clearBorderShorthandPatch = (): Record<string, string | undefined> => ({
  border: undefined, borderWidth: undefined,
  borderTop: undefined, borderRight: undefined, borderBottom: undefined, borderLeft: undefined,
});

/* ── Small Sub-Components ───────────────────────────────── */

/* ── Ring Layer ──────────────────────────────────────────── */

const findRingLayerFromNode = (root: HTMLElement, start: Node | null): LayerId | null => {
  let el: Element | null = start instanceof Element ? start : null;
  while (el && root.contains(el)) {
    const r = el.getAttribute('data-box-ring');
    if (r === 'margin' || r === 'border' || r === 'padding') return r;
    el = el.parentElement;
  }
  return null;
};

const RingLayer: React.FC<{
  variant: LayerId;
  vals: Record<Side, string>;
  disabled: boolean;
  readOnly: boolean;
  onSideDraft: (side: Side, raw: string) => void;
  onSideCommit: (side: Side, raw: string) => void;
  children: React.ReactNode;
  glowActive: boolean;
  onLayerMouseEnter: () => void;
  onLayerMouseLeave: (e: React.MouseEvent<HTMLDivElement>) => void;
}> = ({
  variant, vals, disabled, readOnly, onSideDraft, onSideCommit, children, glowActive,
  onLayerMouseEnter, onLayerMouseLeave,
}) => {
  const layerTitle = LAYER_TITLES[variant];

  return (
    <div
      data-box-ring={variant}
      className={`box-model-editor__ring box-model-editor__ring--${variant}${glowActive ? ' box-model-editor__ring--glow' : ''}`}
      onMouseEnter={onLayerMouseEnter}
      onMouseLeave={onLayerMouseLeave}
    >
      <div className="box-model-editor__ring-bar">
        <div className="box-model-editor__ring-bar-side box-model-editor__ring-bar-side--start">
          <span className="box-model-editor__ring-layer-title">{layerTitle}</span>
        </div>
        <div className="box-model-editor__ring-bar-center">
          <div className="box-model-editor__ring-top-slot">
            <div className="box-model-editor__top-input-wrap">
              <Input
                size="small"
                borderless
                align="center"
                className="box-model-editor__top-input"
                disabled={readOnly || disabled}
                placeholder="0"
                value={vals.Top}
                onChange={(v) => onSideDraft('Top', String(v ?? ''))}
                onBlur={(v) => onSideCommit('Top', String(v ?? ''))}
                onEnter={(v) => onSideCommit('Top', String(v ?? ''))}
              />
            </div>
          </div>
        </div>
        <div className="box-model-editor__ring-bar-side box-model-editor__ring-bar-side--end" aria-hidden="true">
          <span className="box-model-editor__ring-layer-title">{layerTitle}</span>
        </div>
      </div>

      <div className="box-model-editor__ring-mid">
        <div className="box-model-editor__ring-side box-model-editor__ring-side--left">
          <Input
            size="small"
            borderless
            align="center"
            className="box-model-editor__edge-input box-model-editor__edge-input--v"
            disabled={readOnly || disabled}
            placeholder="0"
            value={vals.Left}
            onChange={(v) => onSideDraft('Left', String(v ?? ''))}
            onBlur={(v) => onSideCommit('Left', String(v ?? ''))}
            onEnter={(v) => onSideCommit('Left', String(v ?? ''))}
          />
        </div>
        <div className="box-model-editor__ring-core">{children}</div>
        <div className="box-model-editor__ring-side box-model-editor__ring-side--right">
          <Input
            size="small"
            borderless
            align="center"
            className="box-model-editor__edge-input box-model-editor__edge-input--v"
            disabled={readOnly || disabled}
            placeholder="0"
            value={vals.Right}
            onChange={(v) => onSideDraft('Right', String(v ?? ''))}
            onBlur={(v) => onSideCommit('Right', String(v ?? ''))}
            onEnter={(v) => onSideCommit('Right', String(v ?? ''))}
          />
        </div>
      </div>

      <div className="box-model-editor__ring-bottom">
        <Input
          size="small"
          borderless
          align="center"
          className="box-model-editor__edge-input"
          disabled={readOnly || disabled}
          placeholder="0"
          value={vals.Bottom}
          onChange={(v) => onSideDraft('Bottom', String(v ?? ''))}
          onBlur={(v) => onSideCommit('Bottom', String(v ?? ''))}
          onEnter={(v) => onSideCommit('Bottom', String(v ?? ''))}
        />
      </div>
    </div>
  );
};

/* ── Main Component ─────────────────────────────────────── */

const BoxModelStyleEditor: React.FC<BoxModelStyleEditorProps> = ({
  value,
  onPatch,
  readOnly,
  computedHints,
  popupAttachRef,
}) => {
  const style = value ?? {};
  const sh = hasShorthandSpacing(style);
  const borderBlocked = hasBorderShorthand(style);

  const marginHasLonghand = useMemo(
    () => SIDES.some((s) => gv(style, `margin${s}`).trim().length > 0), [style],
  );
  const paddingHasLonghand = useMemo(
    () => SIDES.some((s) => gv(style, `padding${s}`).trim().length > 0), [style],
  );
  const borderHasLonghand = useMemo(
    () => SIDES.some((s) => gv(style, `border${s}Width`).trim().length > 0), [style],
  );
  const marginBlockHints = sh.margin && marginHasLonghand;
  const paddingBlockHints = sh.padding && paddingHasLonghand;
  const borderBlockHints = borderBlocked && borderHasLonghand;
  const marginFromShorthand = useMemo(() => parseSpacingShorthand(gv(style, 'margin')), [style]);
  const paddingFromShorthand = useMemo(() => parseSpacingShorthand(gv(style, 'padding')), [style]);

  const diagramRef = useRef<HTMLDivElement>(null);
  const [glowLayer, setGlowLayer] = useState<LayerId | null>(null);

  // ── Width / Height ──
  const [widthDraft, setWidthDraft] = useState<string | null>(null);
  const [heightDraft, setHeightDraft] = useState<string | null>(null);
  const widthEff = getEffectiveStyleString(style, 'width', computedHints);
  const heightEff = getEffectiveStyleString(style, 'height', computedHints);
  const widthCanvas = !gv(style, 'width').trim() && !!(computedHints?.width ?? '').trim();
  const heightCanvas = !gv(style, 'height').trim() && !!(computedHints?.height ?? '').trim();

  // ── Border Radius ──
  const [radiusLinked, setRadiusLinked] = useState(true);
  const [radiusDrafts, setRadiusDrafts] = useState<Record<string, string | null>>({});

  /** 边框样式/颜色：与圆角一致，统一 ↔ 四边 */
  const [borderAppearanceLinked, setBorderAppearanceLinked] = useState(true);

  const radiusVals = useMemo(() => {
    const out: Record<string, string> = {};
    for (const c of RADIUS_CORNERS) {
      out[c.key] = getEffectiveStyleString(style, c.key, computedHints);
    }
    if (!out.borderTopLeftRadius && !out.borderTopRightRadius && !out.borderBottomLeftRadius && !out.borderBottomRightRadius) {
      const unified = getEffectiveStyleString(style, 'borderRadius', computedHints);
      if (unified) {
        for (const c of RADIUS_CORNERS) out[c.key] = unified;
      }
    }
    return out;
  }, [style, computedHints]);

  // ── Ring Edge Values ──
  const handleRingMouseLeave = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rel = e.relatedTarget as Node | null;
    const root = diagramRef.current;
    if (!root) { setGlowLayer(null); return; }
    if (!rel || !root.contains(rel)) { setGlowLayer(null); return; }
    setGlowLayer(findRingLayerFromNode(root, rel));
  }, []);

  const patch = useCallback(
    (p: Record<string, string | undefined>) => { if (!readOnly) onPatch(p); },
    [onPatch, readOnly],
  );

  const marginVals = useMemo(
    () => Object.fromEntries(
      SIDES.map((s) => [s, marginFromShorthand?.[s] ?? getEffectiveStyleString(style, `margin${s}`, computedHints, marginBlockHints)]),
    ) as Record<Side, string>,
    [style, computedHints, marginBlockHints, marginFromShorthand],
  );
  const paddingVals = useMemo(
    () => Object.fromEntries(
      SIDES.map((s) => [s, paddingFromShorthand?.[s] ?? getEffectiveStyleString(style, `padding${s}`, computedHints, paddingBlockHints)]),
    ) as Record<Side, string>,
    [style, computedHints, paddingBlockHints, paddingFromShorthand],
  );
  const borderWVals = useMemo(
    () => Object.fromEntries(
      SIDES.map((s) => [s, getEffectiveStyleString(style, `border${s}Width`, computedHints, borderBlockHints)]),
    ) as Record<Side, string>,
    [style, computedHints, borderBlockHints],
  );

  /**
   * 写入边框样式/颜色时一并带上四向线宽。仅设 border-*-style 而未设 width 时，CSS 初始宽度为 medium，会出现「线宽为 0 仍看见边框」。
   */
  const withBorderAppearanceWidths = useCallback(
    (base: Record<string, string | undefined>): Record<string, string | undefined> => {
      if (borderBlocked) return base;
      const next: Record<string, string | undefined> = { ...clearBorderShorthandPatch(), ...base };
      for (const s of SIDES) {
        next[`border${s}Width`] = normalizePxInput(borderWVals[s]);
      }
      return next;
    },
    [borderBlocked, borderWVals],
  );

  /** 四边样式：显式 longhand 优先；仅 borderStyle 简写且单值时铺到四边；其余用 effective */
  const borderStylePerSide = useMemo(() => {
    const out: Record<Side, string> = { Top: '', Right: '', Bottom: '', Left: '' };
    for (const s of SIDES) {
      const ex = gv(style, `border${s}Style`).trim();
      if (ex) out[s] = ex;
    }
    const sh = gv(style, 'borderStyle').trim();
    if (sh) {
      const tokens = sh.split(/\s+/).filter(Boolean);
      if (tokens.length === 1) {
        for (const s of SIDES) {
          if (!out[s]) out[s] = tokens[0];
        }
      }
    }
    for (const s of SIDES) {
      if (!out[s]) out[s] = getEffectiveStyleString(style, `border${s}Style`, computedHints);
    }
    return out;
  }, [style, computedHints]);

  /** 四边颜色：longhand 优先；仅 borderColor 简写且无分边显式值时用整段简写；其余 effective（含 rgb/var） */
  const borderColorPerSide = useMemo(() => {
    const out: Record<Side, string> = { Top: '', Right: '', Bottom: '', Left: '' };
    for (const s of SIDES) {
      const ex = gv(style, `border${s}Color`).trim();
      if (ex) out[s] = ex;
    }
    const sh = gv(style, 'borderColor').trim();
    const hasAnyPerSideExplicit = SIDES.some((s) => gv(style, `border${s}Color`).trim());
    if (sh && !hasAnyPerSideExplicit) {
      for (const s of SIDES) out[s] = sh;
      return out;
    }
    for (const s of SIDES) {
      if (!out[s]) out[s] = getEffectiveStyleString(style, `border${s}Color`, computedHints);
    }
    return out;
  }, [style, computedHints]);

  const borderColorUnifiedIsVar = isVarColor(borderColorPerSide.Top);

  // ── Margin / Padding / Border callbacks (unchanged logic) ──
  const draftMarginSide = useCallback((side: Side, raw: string) => {
    const next: Record<string, string | undefined> = { margin: undefined };
    SIDES.forEach((s) => {
      next[`margin${s}`] = s === side ? (raw.trim() || undefined) : (marginVals[s].trim() || undefined);
    });
    patch(next);
  }, [patch, marginVals]);
  const finalizeMarginSide = useCallback((side: Side, raw: string) => {
    const next: Record<string, string | undefined> = { margin: undefined };
    SIDES.forEach((s) => {
      next[`margin${s}`] = s === side ? normalizePxInput(raw) : (marginVals[s].trim() || undefined);
    });
    patch(next);
  }, [patch, marginVals]);

  const draftPaddingSide = useCallback((side: Side, raw: string) => {
    const next: Record<string, string | undefined> = { padding: undefined };
    SIDES.forEach((s) => {
      next[`padding${s}`] = s === side ? (raw.trim() || undefined) : (paddingVals[s].trim() || undefined);
    });
    patch(next);
  }, [patch, paddingVals]);
  const finalizePaddingSide = useCallback((side: Side, raw: string) => {
    const next: Record<string, string | undefined> = { padding: undefined };
    SIDES.forEach((s) => {
      next[`padding${s}`] = s === side ? normalizePxInput(raw) : (paddingVals[s].trim() || undefined);
    });
    patch(next);
  }, [patch, paddingVals]);

  const draftBorderWidthSide = useCallback((side: Side, raw: string) => {
    if (borderBlocked) return;
    patch({ ...clearBorderShorthandPatch(), [`border${side}Width`]: raw.trim() || undefined });
  }, [borderBlocked, patch]);
  const finalizeBorderWidthSide = useCallback((side: Side, raw: string) => {
    if (borderBlocked) return;
    patch({ ...clearBorderShorthandPatch(), [`border${side}Width`]: normalizePxInput(raw) });
  }, [borderBlocked, patch]);

  const expandSpacingShorthandToLonghand = useCallback((kind: 'margin' | 'padding') => {
    const parsed = parseSpacingShorthand(gv(style, kind));
    if (!parsed) {
      patch({ [kind]: undefined });
      return;
    }
    const next: Record<string, string | undefined> = { [kind]: undefined };
    SIDES.forEach((s) => {
      const token = normalizeSpacingToken(parsed[s]);
      next[`${kind}${s}`] = token || undefined;
    });
    patch(next);
  }, [patch, style]);

  // ── Width / Height commit ──
  const commitWidth = useCallback((raw: string) => {
    setWidthDraft(null);
    patch({ width: raw.trim() || undefined });
  }, [patch]);
  const commitHeight = useCallback((raw: string) => {
    setHeightDraft(null);
    patch({ height: raw.trim() || undefined });
  }, [patch]);

  // ── Border Radius commit ──
  const commitRadius = useCallback((key: string, raw: string) => {
    setRadiusDrafts((d) => { const n = { ...d }; delete n[key]; return n; });
    if (radiusLinked) {
      const p: Record<string, string | undefined> = { borderRadius: undefined };
      for (const c of RADIUS_CORNERS) p[c.key] = raw.trim() || undefined;
      patch(p);
    } else {
      patch({ [key]: raw.trim() || undefined });
    }
  }, [patch, radiusLinked]);

  const patchBorderStyleUnified = useCallback(
    (v: string | undefined) => {
      const val = v ? String(v).trim() : undefined;
      const p: Record<string, string | undefined> = { borderStyle: undefined };
      for (const s of SIDES) p[`border${s}Style`] = val;
      patch(withBorderAppearanceWidths(p));
    },
    [patch, withBorderAppearanceWidths],
  );

  const patchBorderStyleSide = useCallback(
    (side: Side, v: string | undefined) => {
      const val = v ? String(v).trim() : undefined;
      const p: Record<string, string | undefined> = { borderStyle: undefined };
      for (const s of SIDES) {
        p[`border${s}Style`] = s === side ? val : (borderStylePerSide[s].trim() || undefined);
      }
      patch(withBorderAppearanceWidths(p));
    },
    [patch, borderStylePerSide, withBorderAppearanceWidths],
  );

  const patchBorderColorUnified = useCallback(
    (raw: string) => {
      const val = String(raw ?? '').trim() || undefined;
      const p: Record<string, string | undefined> = { borderColor: undefined };
      for (const s of SIDES) p[`border${s}Color`] = val;
      patch(withBorderAppearanceWidths(p));
    },
    [patch, withBorderAppearanceWidths],
  );

  const patchBorderColorSide = useCallback(
    (side: Side, raw: string) => {
      const val = String(raw ?? '').trim() || undefined;
      const p: Record<string, string | undefined> = { borderColor: undefined };
      for (const s of SIDES) {
        p[`border${s}Color`] = s === side ? val : (borderColorPerSide[s].trim() || undefined);
      }
      patch(withBorderAppearanceWidths(p));
    },
    [patch, borderColorPerSide, withBorderAppearanceWidths],
  );

  const borderAppearanceDisabled = !!readOnly || borderBlocked;

  /** 抽屉 zIndex=5600，Popup 默认 5500 会被挡住；挂到抽屉内并抬高层级 */
  /**
   * 取色面板必须挂到 document.body：挂到抽屉 body（overflow:auto）时会被滚动区域裁成「只露一半」。
   * zIndex 需高于 StyleTabShell 里 Drawer 的 5600。
   */
  const colorPickerPopupProps = useMemo(
    () => ({
      attach: () => document.body,
      zIndex: 5700,
    }),
    [],
  );

  /** ColorPicker 无根级 `size` API，触发条为 Input，与官网一致用 inputProps.size */
  const colorPickerInputProps = useMemo(() => ({ size: 'small' as const }), []);

  const borderAppearancePanel = (
    <div className="box-model-editor__border-appearance">
      <div className="box-model-editor__border-appearance-header">
        <span className="box-model-editor__border-appearance-title">边框样式与颜色</span>
        <button
          type="button"
          className="box-model-editor__radius-link"
          disabled={borderAppearanceDisabled}
          title={borderAppearanceLinked ? '统一编辑 → 分边' : '分边编辑 → 统一'}
          onClick={() => setBorderAppearanceLinked((p) => !p)}
        >
          {borderAppearanceLinked ? <Link2 size={14} /> : <Unlink2 size={14} />}
        </button>
      </div>
      {borderAppearanceLinked ? (
        <div className="box-model-editor__border-appearance-unified-row box-model-editor__border-appearance-unified-row--inline">
          <span className="box-model-editor__popup-field-label">样式</span>
          <Select
            size="small"
            disabled={borderAppearanceDisabled}
            clearable
            placeholder="默认"
            value={borderStylePerSide.Top.trim() || undefined}
            options={[...BORDER_STYLE_OPTIONS]}
            className="box-model-editor__border-appearance-inline-select"
            popupProps={{ attach: () => popupAttachRef?.current ?? document.body }}
            onChange={(v) => patchBorderStyleUnified(v ? String(v) : undefined)}
          />
          <span className="box-model-editor__popup-field-label">颜色</span>
          {borderColorUnifiedIsVar ? (
            <Input
              size="small"
              clearable
              disabled={borderAppearanceDisabled}
              placeholder="var(--...)"
              className="box-model-editor__border-appearance-inline-color"
              value={borderColorPerSide.Top}
              onChange={(v) => patchBorderColorUnified(String(v ?? ''))}
            />
          ) : (
            <ColorPicker
              value={borderColorPerSide.Top.trim() || '#000000'}
              onChange={(v) => patchBorderColorUnified(String(v ?? ''))}
              onClear={() => patchBorderColorUnified('')}
              disabled={borderAppearanceDisabled}
              clearable
              className="box-model-editor__border-appearance-inline-color"
              inputProps={colorPickerInputProps}
              popupProps={colorPickerPopupProps}
            />
          )}
        </div>
      ) : (
        <div className="box-model-editor__border-appearance-split-rows">
          {SIDES.map((s) => {
            const raw = borderColorPerSide[s];
            const sideVar = isVarColor(raw);
            return (
              <div key={s} className="box-model-editor__border-appearance-split-row">
                <span className="box-model-editor__border-appearance-side-label">{SIDE_SHORT[s]}</span>
                <Select
                  size="small"
                  disabled={borderAppearanceDisabled}
                  clearable
                  placeholder="默认"
                  value={borderStylePerSide[s].trim() || undefined}
                  options={[...BORDER_STYLE_OPTIONS]}
                  className="box-model-editor__border-appearance-inline-select"
                  popupProps={{ attach: () => popupAttachRef?.current ?? document.body }}
                  onChange={(v) => patchBorderStyleSide(s, v ? String(v) : undefined)}
                />
                {sideVar ? (
                  <Input
                    size="small"
                    clearable
                    disabled={borderAppearanceDisabled}
                    placeholder="var(--...)"
                    className="box-model-editor__border-appearance-split-color-input"
                    value={raw}
                    onChange={(v) => patchBorderColorSide(s, String(v ?? ''))}
                  />
                ) : (
                  <ColorPicker
                    value={raw.trim() || '#000000'}
                    onChange={(v) => patchBorderColorSide(s, String(v ?? ''))}
                    onClear={() => patchBorderColorSide(s, '')}
                    disabled={borderAppearanceDisabled}
                    clearable
                    className="box-model-editor__border-appearance-split-color-input"
                    inputProps={colorPickerInputProps}
                    popupProps={colorPickerPopupProps}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div className="box-model-editor">
      {/* ── Shorthand Alerts ── */}
      {(sh.margin || sh.padding || borderBlocked) && (
        <div className="box-model-editor__alerts">
          {(sh.margin || sh.padding) && (
            <Alert theme="info" message="存在简写属性；编辑四边将清除简写写入四向数值。" className="box-model-editor__alert" />
          )}
          {borderBlocked && (
            <Alert theme="warning" message="存在 border 简写，与线宽四向冲突。" className="box-model-editor__alert" />
          )}
          <div className="box-model-editor__shorthand-actions">
            {sh.margin && (
              <Button
                size="small"
                variant="text"
                theme="primary"
                disabled={readOnly}
                onClick={() => expandSpacingShorthandToLonghand('margin')}
              >
                展开 margin 为四边
              </Button>
            )}
            {sh.padding && (
              <Button
                size="small"
                variant="text"
                theme="primary"
                disabled={readOnly}
                onClick={() => expandSpacingShorthandToLonghand('padding')}
              >
                展开 padding 为四边
              </Button>
            )}
            {borderBlocked && (
              <Button size="small" variant="text" theme="primary" disabled={readOnly} onClick={() => patch(clearBorderShorthandPatch())}>清除 border</Button>
            )}
          </div>
        </div>
      )}

      {/* ── Width Dimension Bar ── */}
      <div className="box-model-editor__dim-bar box-model-editor__dim-bar--h">
        <ArrowLeft size={14} className="box-model-editor__dim-arrow" />
        <div className="box-model-editor__dim-track" />
        <div className="box-model-editor__dim-center">
          <span className="box-model-editor__dim-tag">W</span>
          <Input
            size="small"
            borderless
            align="center"
            className="box-model-editor__dim-input"
            disabled={!!readOnly}
            placeholder="auto"
            value={widthDraft ?? widthEff}
            onChange={(v) => setWidthDraft(String(v ?? ''))}
            onBlur={(v) => commitWidth(String(v ?? ''))}
            onEnter={(v) => commitWidth(String(v ?? ''))}
          />
          {widthCanvas && <span className="box-model-editor__dim-pill">画布</span>}
        </div>
        <div className="box-model-editor__dim-track" />
        <ArrowRight size={14} className="box-model-editor__dim-arrow" />
      </div>

      {/* ── Body: Height bar + Rings ── */}
      <div className="box-model-editor__body-row">
        <div className="box-model-editor__dim-bar box-model-editor__dim-bar--v">
          <ArrowUp size={14} className="box-model-editor__dim-arrow" />
          <div className="box-model-editor__dim-track box-model-editor__dim-track--v" />
          <div className="box-model-editor__dim-center box-model-editor__dim-center--v">
            <span className="box-model-editor__dim-tag">H</span>
            <Input
              size="small"
              borderless
              align="center"
              className="box-model-editor__dim-input box-model-editor__dim-input--v"
              disabled={!!readOnly}
              placeholder="auto"
              value={heightDraft ?? heightEff}
              onChange={(v) => setHeightDraft(String(v ?? ''))}
              onBlur={(v) => commitHeight(String(v ?? ''))}
              onEnter={(v) => commitHeight(String(v ?? ''))}
            />
          </div>
          <div className="box-model-editor__dim-track box-model-editor__dim-track--v" />
          {heightCanvas && <span className="box-model-editor__dim-pill box-model-editor__dim-pill--v">画布</span>}
          <ArrowDown size={14} className="box-model-editor__dim-arrow" />
        </div>

        <div ref={diagramRef} className="box-model-editor__diagram" aria-label="盒模型">
          <RingLayer
            variant="margin" vals={marginVals} disabled={!!readOnly}
            readOnly={!!readOnly}
            onSideDraft={draftMarginSide}
            onSideCommit={finalizeMarginSide}
            glowActive={glowLayer === 'margin'}
            onLayerMouseEnter={() => setGlowLayer('margin')} onLayerMouseLeave={handleRingMouseLeave}
          >
            <RingLayer
              variant="border" vals={borderWVals} disabled={borderBlocked}
              readOnly={!!readOnly}
              onSideDraft={draftBorderWidthSide}
              onSideCommit={finalizeBorderWidthSide}
              glowActive={glowLayer === 'border'}
              onLayerMouseEnter={() => setGlowLayer('border')} onLayerMouseLeave={handleRingMouseLeave}
            >
              <RingLayer
                variant="padding" vals={paddingVals} disabled={!!readOnly}
                readOnly={!!readOnly}
                onSideDraft={draftPaddingSide}
                onSideCommit={finalizePaddingSide}
                glowActive={glowLayer === 'padding'}
                onLayerMouseEnter={() => setGlowLayer('padding')} onLayerMouseLeave={handleRingMouseLeave}
              >
                <div className="box-model-editor__content-core">
                  <span className="box-model-editor__content-label">content</span>
                </div>
              </RingLayer>
            </RingLayer>
          </RingLayer>
        </div>
      </div>

      {borderAppearancePanel}

      {/* ── Border Radius ── */}
      <div className="box-model-editor__radius">
        <div className="box-model-editor__radius-header">
          <span className="box-model-editor__radius-title">圆角 (border-radius)</span>
          <button
            type="button"
            className="box-model-editor__radius-link"
            disabled={!!readOnly}
            title={radiusLinked ? '统一编辑 → 分角' : '分角编辑 → 统一'}
            onClick={() => setRadiusLinked((p) => !p)}
          >
            {radiusLinked ? <Link2 size={14} /> : <Unlink2 size={14} />}
          </button>
        </div>
        {radiusLinked ? (
          <div className="box-model-editor__radius-unified">
            <Input
              size="small"
              clearable
              disabled={!!readOnly}
              placeholder="0"
              value={radiusDrafts.borderTopLeftRadius ?? radiusVals.borderTopLeftRadius ?? ''}
              onChange={(v) => {
                const val = String(v ?? '');
                setRadiusDrafts({ borderTopLeftRadius: val, borderTopRightRadius: val, borderBottomLeftRadius: val, borderBottomRightRadius: val });
              }}
              onBlur={(v) => commitRadius('borderTopLeftRadius', String(v ?? ''))}
              onEnter={(v) => commitRadius('borderTopLeftRadius', String(v ?? ''))}
            />
          </div>
        ) : (
          <div className="box-model-editor__radius-grid">
            {RADIUS_CORNERS.map((c) => (
              <label key={c.key} className="box-model-editor__radius-field">
                <span className="box-model-editor__radius-label">{c.label}</span>
                <Input
                  size="small"
                  clearable
                  disabled={!!readOnly}
                  placeholder="0"
                  value={radiusDrafts[c.key] ?? radiusVals[c.key] ?? ''}
                  onChange={(v) => setRadiusDrafts((d) => ({ ...d, [c.key]: String(v ?? '') }))}
                  onBlur={(v) => commitRadius(c.key, String(v ?? ''))}
                  onEnter={(v) => commitRadius(c.key, String(v ?? ''))}
                />
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(BoxModelStyleEditor);
