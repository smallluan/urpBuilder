import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, Input, Popup, Select } from 'tdesign-react';
import type { PopupRef } from 'tdesign-react/es/popup/Popup';
import { ArrowLeft, ArrowRight, ArrowUp, ArrowDown, Link2, Unlink2, Menu } from 'lucide-react';
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
}

const gv = (style: Record<string, unknown>, key: string): string => normalizeStyleValue(style)[key] ?? '';

const BORDER_BLOCK_KEYS = [
  'border', 'borderTop', 'borderRight', 'borderBottom', 'borderLeft', 'borderWidth',
] as const;

const hasBorderShorthand = (style: Record<string, unknown>): boolean =>
  BORDER_BLOCK_KEYS.some((k) => String(gv(style, k)).trim().length > 0);

const displayPx = (raw: string): string => {
  const t = String(raw ?? '').trim();
  if (!t) return '0px';
  if (/^\d+(\.\d+)?$/.test(t)) return `${t}px`;
  return t;
};

type EdgeVisual = { type: 'numeric'; num: string } | { type: 'text'; text: string };

const parseEdgeVisual = (raw: string): EdgeVisual => {
  const t = String(raw ?? '').trim();
  if (!t) return { type: 'numeric', num: '0' };
  const m = t.match(/^(\d+(?:\.\d+)?)px$/i);
  if (m) return { type: 'numeric', num: m[1] };
  if (/^\d+(?:\.\d+)?$/.test(t)) return { type: 'numeric', num: t };
  return { type: 'text', text: displayPx(t) };
};

const filterNonNegDecimalDraft = (raw: string): string => {
  let s = String(raw ?? '').replace(/[^\d.]/g, '');
  const dot = s.indexOf('.');
  if (dot !== -1) s = `${s.slice(0, dot + 1)}${s.slice(dot + 1).replace(/\./g, '')}`;
  return s.length > 16 ? s.slice(0, 16) : s;
};

const normalizePxInput = (raw: string): string => {
  const t = String(raw ?? '').trim();
  if (!t || t === '.') return '0px';
  const n = parseFloat(t.replace(/px$/i, ''));
  if (!Number.isFinite(n) || n < 0) return '0px';
  return `${n}px`;
};

const topStripText = (vals: Record<Side, string>): string => {
  const list = SIDES.map((s) => vals[s].trim());
  if (list.every((x) => !x)) return '0px';
  const first = list[0];
  if (list.every((x) => x === first)) return displayPx(first);
  return '···';
};

const LAYER_TITLES: Record<LayerId, string> = { margin: '外边距', border: '边框', padding: '内边距' };

const clearBorderShorthandPatch = (): Record<string, string | undefined> => ({
  border: undefined, borderWidth: undefined,
  borderTop: undefined, borderRight: undefined, borderBottom: undefined, borderLeft: undefined,
});

/* ── Small Sub-Components ───────────────────────────────── */

const EdgeSideLR: React.FC<{ raw: string }> = ({ raw }) => {
  const v = parseEdgeVisual(raw);
  const tip = displayPx(raw);
  if (v.type === 'numeric') {
    return (
      <span className="box-model-editor__edge-label box-model-editor__edge-vstack" title={tip}>
        <span className="box-model-editor__edge-vstack__num">{v.num}</span>
        <span className="box-model-editor__edge-vstack__unit">px</span>
      </span>
    );
  }
  return (
    <span className="box-model-editor__edge-label box-model-editor__edge-text-full" title={tip}>
      {v.text}
    </span>
  );
};

const EdgeBottom: React.FC<{ raw: string }> = ({ raw }) => {
  const v = parseEdgeVisual(raw);
  const tip = displayPx(raw);
  if (v.type === 'numeric') {
    return (
      <span className="box-model-editor__edge-label box-model-editor__edge-bottom" title={tip}>
        <span className="box-model-editor__edge-bottom__num">{v.num}</span>
        <span className="box-model-editor__edge-bottom__unit">px</span>
      </span>
    );
  }
  return (
    <span className="box-model-editor__edge-label box-model-editor__edge-bottom-text" title={tip}>
      {v.text}
    </span>
  );
};

const SideGrid: React.FC<{
  prefix: string;
  suffix: string;
  vals: Record<Side, string>;
  disabled: boolean;
  onDraft: (side: Side, raw: string) => void;
  onCommit: (side: Side, raw: string) => void;
}> = ({ prefix, suffix, vals, disabled, onDraft, onCommit }) => (
  <div className="box-model-editor__side-grid">
    {SIDES.map((side) => {
      const label = { Top: '上', Right: '右', Bottom: '下', Left: '左' }[side];
      const key = `${prefix}${side}${suffix}`;
      return (
        <React.Fragment key={key}>
          <span className="box-model-editor__side-label">{label}</span>
          <Input
            size="small"
            align="center"
            disabled={disabled}
            placeholder="0"
            value={vals[side]}
            onChange={(v) => onDraft(side, filterNonNegDecimalDraft(String(v ?? '')))}
            onBlur={(v) => onCommit(side, String(v ?? ''))}
            onEnter={(v) => onCommit(side, String(v ?? ''))}
          />
        </React.Fragment>
      );
    })}
  </div>
);

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
  detail: React.ReactNode;
  readOnly: boolean;
  editing: boolean;
  draft: string;
  setDraft: (s: string) => void;
  onBeginEdit: () => void;
  onUniformCommit: (raw: string) => void;
  onFinishEdit: () => void;
  children: React.ReactNode;
  glowActive: boolean;
  onLayerMouseEnter: () => void;
  onLayerMouseLeave: (e: React.MouseEvent<HTMLDivElement>) => void;
}> = ({
  variant, vals, disabled, detail, readOnly, editing, draft, setDraft,
  onBeginEdit, onUniformCommit, onFinishEdit, children, glowActive,
  onLayerMouseEnter, onLayerMouseLeave,
}) => {
  const inputWrapRef = useRef<HTMLDivElement>(null);
  const detailPopupRef = useRef<PopupRef>(null);
  const [detailVisible, setDetailVisible] = useState(false);

  useEffect(() => {
    if (!editing) return;
    const el = inputWrapRef.current?.querySelector('input');
    el?.focus();
    el?.select?.();
  }, [editing]);

  useEffect(() => {
    if (!editing) setDetailVisible(false);
  }, [editing]);

  const handleDetailVisibleChange = useCallback((next: boolean, ctx: { trigger?: string; e?: unknown }) => {
    if (!next && ctx.trigger === 'document' && ctx.e && typeof ctx.e === 'object' && ctx.e !== null && 'target' in ctx.e) {
      const target = (ctx.e as { target: unknown }).target;
      if (target instanceof Node) {
        const popupRoot = detailPopupRef.current?.getPopupElement?.() ?? null;
        if (popupRoot?.contains(target)) return;
        if (target instanceof Element) {
          if (target.closest('.box-model-editor__popup-body')) return;
          if (target.closest('.t-select__dropdown')) return;
        }
      }
    }
    setDetailVisible(next);
  }, []);

  const topShown = topStripText(vals);

  const menuSuffix = (
    <Popup
      ref={detailPopupRef}
      trigger="click"
      placement="left-top"
      showArrow={false}
      visible={detailVisible}
      onVisibleChange={handleDetailVisibleChange}
      overlayInnerClassName="box-model-editor__popup-inner"
      overlayStyle={{ overflow: 'visible' }}
      overlayInnerStyle={{ overflow: 'visible' }}
      disabled={readOnly || disabled}
      content={detail}
    >
      <span
        className="box-model-editor__suffix-menu"
        role="button"
        tabIndex={-1}
        title="详细"
        aria-label="详细设置"
        onMouseDown={(e) => e.preventDefault()}
      >
        <Menu size={12} strokeWidth={2} />
      </span>
    </Popup>
  );

  const commitFromInput = (raw: string) => {
    onUniformCommit(String(raw ?? ''));
    onFinishEdit();
  };

  const layerTitle = LAYER_TITLES[variant];

  return (
    <div
      data-box-ring={variant}
      className={`box-model-editor__ring box-model-editor__ring--${variant}${glowActive ? ' box-model-editor__ring--glow' : ''}`}
      onMouseEnter={onLayerMouseEnter}
      onMouseLeave={onLayerMouseLeave}
    >
      <div className={`box-model-editor__ring-bar${editing ? ' box-model-editor__ring-bar--editing' : ''}`}>
        {!editing && (
          <div className="box-model-editor__ring-bar-side box-model-editor__ring-bar-side--start">
            <span className="box-model-editor__ring-layer-title">{layerTitle}</span>
          </div>
        )}
        <div className="box-model-editor__ring-bar-center">
          <div className="box-model-editor__ring-top-slot">
            {!editing ? (
              <button
                type="button"
                className="box-model-editor__edge-label box-model-editor__top-text"
                disabled={readOnly || disabled}
                onClick={onBeginEdit}
              >
                {topShown}
              </button>
            ) : (
              <div ref={inputWrapRef} className="box-model-editor__top-input-wrap">
                <Input
                  size="small"
                  borderless
                  align="center"
                  className="box-model-editor__top-input"
                  disabled={readOnly || disabled}
                  placeholder="0"
                  value={draft}
                  suffix={menuSuffix}
                  onChange={(v) => setDraft(filterNonNegDecimalDraft(String(v ?? '')))}
                  onBlur={(v) => commitFromInput(String(v ?? ''))}
                  onEnter={(v) => commitFromInput(String(v ?? ''))}
                />
              </div>
            )}
          </div>
        </div>
        {!editing && (
          <div className="box-model-editor__ring-bar-side box-model-editor__ring-bar-side--end" aria-hidden="true">
            <span className="box-model-editor__ring-layer-title">{layerTitle}</span>
          </div>
        )}
      </div>

      <div className="box-model-editor__ring-mid">
        <div className="box-model-editor__ring-side box-model-editor__ring-side--left">
          <EdgeSideLR raw={vals.Left} />
        </div>
        <div className="box-model-editor__ring-core">{children}</div>
        <div className="box-model-editor__ring-side box-model-editor__ring-side--right">
          <EdgeSideLR raw={vals.Right} />
        </div>
      </div>

      <div className="box-model-editor__ring-bottom">
        <EdgeBottom raw={vals.Bottom} />
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

  const [editing, setEditing] = useState<LayerId | null>(null);
  const [draft, setDraft] = useState('');
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
      SIDES.map((s) => [s, getEffectiveStyleString(style, `margin${s}`, computedHints, marginBlockHints)]),
    ) as Record<Side, string>,
    [style, computedHints, marginBlockHints],
  );
  const paddingVals = useMemo(
    () => Object.fromEntries(
      SIDES.map((s) => [s, getEffectiveStyleString(style, `padding${s}`, computedHints, paddingBlockHints)]),
    ) as Record<Side, string>,
    [style, computedHints, paddingBlockHints],
  );
  const borderWVals = useMemo(
    () => Object.fromEntries(
      SIDES.map((s) => [s, getEffectiveStyleString(style, `border${s}Width`, computedHints, borderBlockHints)]),
    ) as Record<Side, string>,
    [style, computedHints, borderBlockHints],
  );

  const borderStyleVal = useMemo(() => {
    const ex = gv(style, 'borderStyle').trim();
    if (ex) return ex;
    if (!computedHints) return '';
    const t0 = (computedHints.borderTopStyle ?? '').trim();
    if (!t0) return '';
    if (SIDES.every((s) => (computedHints[`border${s}Style`] ?? '').trim() === t0)) return t0;
    return '';
  }, [style, computedHints]);

  const borderColorVal = useMemo(() => {
    const ex = gv(style, 'borderColor').trim();
    if (ex) return ex;
    if (!computedHints) return '';
    const c0 = (computedHints.borderTopColor ?? '').trim();
    if (!c0) return '';
    if (SIDES.every((s) => (computedHints[`border${s}Color`] ?? '').trim() === c0)) return c0;
    return '';
  }, [style, computedHints]);

  // ── Margin / Padding / Border callbacks (unchanged logic) ──
  const draftMarginSide = useCallback((side: Side, raw: string) => {
    patch({ margin: undefined, [`margin${side}`]: raw.trim() || undefined });
  }, [patch]);
  const finalizeMarginSide = useCallback((side: Side, raw: string) => {
    patch({ margin: undefined, [`margin${side}`]: normalizePxInput(raw) });
  }, [patch]);
  const commitMarginUniform = useCallback((raw: string) => {
    const val = normalizePxInput(raw);
    const next: Record<string, string | undefined> = { margin: undefined };
    SIDES.forEach((s) => { next[`margin${s}`] = val; });
    patch(next);
  }, [patch]);

  const draftPaddingSide = useCallback((side: Side, raw: string) => {
    patch({ padding: undefined, [`padding${side}`]: raw.trim() || undefined });
  }, [patch]);
  const finalizePaddingSide = useCallback((side: Side, raw: string) => {
    patch({ padding: undefined, [`padding${side}`]: normalizePxInput(raw) });
  }, [patch]);
  const commitPaddingUniform = useCallback((raw: string) => {
    const val = normalizePxInput(raw);
    const next: Record<string, string | undefined> = { padding: undefined };
    SIDES.forEach((s) => { next[`padding${s}`] = val; });
    patch(next);
  }, [patch]);

  const draftBorderWidthSide = useCallback((side: Side, raw: string) => {
    if (borderBlocked) return;
    patch({ ...clearBorderShorthandPatch(), [`border${side}Width`]: raw.trim() || undefined });
  }, [borderBlocked, patch]);
  const finalizeBorderWidthSide = useCallback((side: Side, raw: string) => {
    if (borderBlocked) return;
    patch({ ...clearBorderShorthandPatch(), [`border${side}Width`]: normalizePxInput(raw) });
  }, [borderBlocked, patch]);
  const commitBorderUniform = useCallback((raw: string) => {
    if (borderBlocked) return;
    const val = normalizePxInput(raw);
    const next: Record<string, string | undefined> = { ...clearBorderShorthandPatch() };
    SIDES.forEach((s) => { next[`border${s}Width`] = val; });
    patch(next);
  }, [borderBlocked, patch]);

  const beginEdit = useCallback((id: LayerId, vals: Record<Side, string>) => {
    if (readOnly) return;
    const t = topStripText(vals);
    setDraft(filterNonNegDecimalDraft(t === '···' || t === '0px' ? '' : t.replace(/px$/i, '')));
    setEditing(id);
  }, [readOnly]);

  const finishEdit = useCallback(() => { setEditing(null); setDraft(''); }, []);

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

  // ── Popup Detail Panels ──
  const marginDetail = (
    <div className="box-model-editor__popup-body">
      <div className="box-model-editor__popup-title">外边距 · 四边</div>
      <SideGrid prefix="margin" suffix="" vals={marginVals} disabled={!!readOnly} onDraft={draftMarginSide} onCommit={finalizeMarginSide} />
    </div>
  );
  const paddingDetail = (
    <div className="box-model-editor__popup-body">
      <div className="box-model-editor__popup-title">内边距 · 四边</div>
      <SideGrid prefix="padding" suffix="" vals={paddingVals} disabled={!!readOnly} onDraft={draftPaddingSide} onCommit={finalizePaddingSide} />
    </div>
  );
  const borderDetail = (
    <div className="box-model-editor__popup-body">
      <div className="box-model-editor__popup-title">边框 · 线宽</div>
      <SideGrid prefix="border" suffix="Width" vals={borderWVals} disabled={readOnly || borderBlocked} onDraft={draftBorderWidthSide} onCommit={finalizeBorderWidthSide} />
      <div className="box-model-editor__popup-divider" />
      <div className="box-model-editor__popup-title">边框 · 样式与颜色</div>
      <div className="box-model-editor__popup-field">
        <span className="box-model-editor__popup-field-label">样式</span>
        <Select
          size="small"
          disabled={readOnly || borderBlocked}
          clearable
          placeholder="默认"
          value={borderStyleVal || undefined}
          options={[
            { label: 'solid', value: 'solid' },
            { label: 'dashed', value: 'dashed' },
            { label: 'dotted', value: 'dotted' },
            { label: 'none', value: 'none' },
          ]}
          popupProps={{ attach: (t) => (t && t.closest('.box-model-editor__popup-body')) || document.body }}
          onChange={(v) => patch({ borderStyle: v ? String(v) : undefined })}
        />
      </div>
      <div className="box-model-editor__popup-field">
        <span className="box-model-editor__popup-field-label">颜色</span>
        <Input
          size="small"
          clearable
          disabled={readOnly || borderBlocked}
          placeholder="#000 或 var(--...)"
          value={borderColorVal}
          onChange={(v) => patch({ borderColor: String(v ?? '').trim() || undefined })}
        />
      </div>
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
              <Button size="small" variant="text" theme="primary" disabled={readOnly} onClick={() => patch({ margin: undefined })}>清除 margin</Button>
            )}
            {sh.padding && (
              <Button size="small" variant="text" theme="primary" disabled={readOnly} onClick={() => patch({ padding: undefined })}>清除 padding</Button>
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
            variant="margin" vals={marginVals} disabled={!!readOnly} detail={marginDetail}
            readOnly={!!readOnly} editing={editing === 'margin'} draft={draft} setDraft={setDraft}
            onBeginEdit={() => beginEdit('margin', marginVals)} onUniformCommit={commitMarginUniform}
            onFinishEdit={finishEdit} glowActive={glowLayer === 'margin'}
            onLayerMouseEnter={() => setGlowLayer('margin')} onLayerMouseLeave={handleRingMouseLeave}
          >
            <RingLayer
              variant="border" vals={borderWVals} disabled={borderBlocked} detail={borderDetail}
              readOnly={!!readOnly} editing={editing === 'border'} draft={draft} setDraft={setDraft}
              onBeginEdit={() => beginEdit('border', borderWVals)} onUniformCommit={commitBorderUniform}
              onFinishEdit={finishEdit} glowActive={glowLayer === 'border'}
              onLayerMouseEnter={() => setGlowLayer('border')} onLayerMouseLeave={handleRingMouseLeave}
            >
              <RingLayer
                variant="padding" vals={paddingVals} disabled={!!readOnly} detail={paddingDetail}
                readOnly={!!readOnly} editing={editing === 'padding'} draft={draft} setDraft={setDraft}
                onBeginEdit={() => beginEdit('padding', paddingVals)} onUniformCommit={commitPaddingUniform}
                onFinishEdit={finishEdit} glowActive={glowLayer === 'padding'}
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
