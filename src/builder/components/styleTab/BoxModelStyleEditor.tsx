import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, Input, Popup, Select } from 'tdesign-react';
import type { PopupRef } from 'tdesign-react/es/popup/Popup';
import { Menu } from 'lucide-react';
import { hasShorthandSpacing, normalizeStyleValue } from '../../utils/nodeStyleCodec';
import './BoxModelStyleEditor.less';

const SIDES = ['Top', 'Right', 'Bottom', 'Left'] as const;
type Side = (typeof SIDES)[number];
type LayerId = 'margin' | 'padding' | 'border';

export interface BoxModelStyleEditorProps {
  value?: Record<string, unknown>;
  onPatch: (patch: Record<string, string | undefined>) => void;
  readOnly?: boolean;
}

const gv = (style: Record<string, unknown>, key: string): string => normalizeStyleValue(style)[key] ?? '';

const BORDER_BLOCK_KEYS = [
  'border',
  'borderTop',
  'borderRight',
  'borderBottom',
  'borderLeft',
  'borderWidth',
] as const;

const hasBorderShorthand = (style: Record<string, unknown>): boolean =>
  BORDER_BLOCK_KEYS.some((k) => String(gv(style, k)).trim().length > 0);

/** 展示用：空 → 0px；非负纯数字 → 加 px */
const displayPx = (raw: string): string => {
  const t = String(raw ?? '').trim();
  if (!t) {
    return '0px';
  }
  if (/^\d+(\.\d+)?$/.test(t)) {
    return `${t}px`;
  }
  return t;
};

/** 左/右：数字 + px 竖排；底：横排；否则整段文案 */
type EdgeVisual = { type: 'numeric'; num: string } | { type: 'text'; text: string };

const parseEdgeVisual = (raw: string): EdgeVisual => {
  const t = String(raw ?? '').trim();
  if (!t) {
    return { type: 'numeric', num: '0' };
  }
  const m = t.match(/^(\d+(?:\.\d+)?)px$/i);
  if (m) {
    return { type: 'numeric', num: m[1] };
  }
  if (/^\d+(?:\.\d+)?$/.test(t)) {
    return { type: 'numeric', num: t };
  }
  return { type: 'text', text: displayPx(t) };
};

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

/** 输入过程：仅保留数字与一个小数点，不含负号与其它字符 */
const filterNonNegDecimalDraft = (raw: string): string => {
  let s = String(raw ?? '').replace(/[^\d.]/g, '');
  const dot = s.indexOf('.');
  if (dot !== -1) {
    s = `${s.slice(0, dot + 1)}${s.slice(dot + 1).replace(/\./g, '')}`;
  }
  return s.length > 16 ? s.slice(0, 16) : s;
};

/** 提交：空或非有限 / 负数 → 0px；否则规范化数字 + px */
const normalizePxInput = (raw: string): string => {
  const t = String(raw ?? '').trim();
  if (!t || t === '.') {
    return '0px';
  }
  const n = parseFloat(t.replace(/px$/i, ''));
  if (!Number.isFinite(n) || n < 0) {
    return '0px';
  }
  return `${n}px`;
};

/** 顶边一行：四边相同显示该值；全空 0px；不同 ··· */
const topStripText = (vals: Record<Side, string>): string => {
  const list = SIDES.map((s) => vals[s].trim());
  if (list.every((x) => !x)) {
    return '0px';
  }
  const first = list[0];
  if (list.every((x) => x === first)) {
    return displayPx(first);
  }
  return '···';
};

const LAYER_TITLES: Record<'margin' | 'border' | 'padding', string> = {
  margin: '外边距',
  border: '边框',
  padding: '内边距',
};

const clearBorderShorthandPatch = (): Record<string, string | undefined> => ({
  border: undefined,
  borderWidth: undefined,
  borderTop: undefined,
  borderRight: undefined,
  borderBottom: undefined,
  borderLeft: undefined,
});

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
      const key = `${prefix}${side}${suffix}` as const;
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

const findRingLayerFromNode = (root: HTMLElement, start: Node | null): LayerId | null => {
  let el: Element | null = start instanceof Element ? start : null;
  while (el && root.contains(el)) {
    const r = el.getAttribute('data-box-ring');
    if (r === 'margin' || r === 'border' || r === 'padding') {
      return r;
    }
    el = el.parentElement;
  }
  return null;
};

const RingLayer: React.FC<{
  variant: 'margin' | 'border' | 'padding';
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
  variant,
  vals,
  disabled,
  detail,
  readOnly,
  editing,
  draft,
  setDraft,
  onBeginEdit,
  onUniformCommit,
  onFinishEdit,
  children,
  glowActive,
  onLayerMouseEnter,
  onLayerMouseLeave,
}) => {
  const inputWrapRef = useRef<HTMLDivElement>(null);
  const detailPopupRef = useRef<PopupRef>(null);
  const [detailVisible, setDetailVisible] = useState(false);

  useEffect(() => {
    if (!editing) {
      return;
    }
    const el = inputWrapRef.current?.querySelector('input');
    el?.focus();
    el?.select?.();
  }, [editing]);

  useEffect(() => {
    if (!editing) {
      setDetailVisible(false);
    }
  }, [editing]);

  const handleDetailVisibleChange = useCallback((next: boolean, ctx: { trigger?: string; e?: unknown }) => {
    if (!next && ctx.trigger === 'document' && ctx.e && typeof ctx.e === 'object' && ctx.e !== null && 'target' in ctx.e) {
      const target = (ctx.e as { target: unknown }).target;
      if (target instanceof Node) {
        const popupRoot = detailPopupRef.current?.getPopupElement?.() ?? null;
        if (popupRoot?.contains(target)) {
          return;
        }
        if (target instanceof Element) {
          if (target.closest('.box-model-editor__popup-body')) {
            return;
          }
          if (target.closest('.t-select__dropdown')) {
            return;
          }
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

const BoxModelStyleEditor: React.FC<BoxModelStyleEditorProps> = ({ value, onPatch, readOnly }) => {
  const style = value ?? {};
  const sh = hasShorthandSpacing(style);
  const borderBlocked = hasBorderShorthand(style);

  const [editing, setEditing] = useState<LayerId | null>(null);
  const [draft, setDraft] = useState('');
  const diagramRef = useRef<HTMLDivElement>(null);
  const [glowLayer, setGlowLayer] = useState<LayerId | null>(null);

  const handleRingMouseLeave = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rel = e.relatedTarget as Node | null;
    const root = diagramRef.current;
    if (!root) {
      setGlowLayer(null);
      return;
    }
    if (!rel || !root.contains(rel)) {
      setGlowLayer(null);
      return;
    }
    setGlowLayer(findRingLayerFromNode(root, rel));
  }, []);

  const patch = useCallback(
    (p: Record<string, string | undefined>) => {
      if (readOnly) {
        return;
      }
      onPatch(p);
    },
    [onPatch, readOnly],
  );

  const marginVals = useMemo(
    () => Object.fromEntries(SIDES.map((s) => [s, gv(style, `margin${s}`)])) as Record<Side, string>,
    [style],
  );
  const paddingVals = useMemo(
    () => Object.fromEntries(SIDES.map((s) => [s, gv(style, `padding${s}`)])) as Record<Side, string>,
    [style],
  );
  const borderWVals = useMemo(
    () => Object.fromEntries(SIDES.map((s) => [s, gv(style, `border${s}Width`)])) as Record<Side, string>,
    [style],
  );

  const borderStyleVal = gv(style, 'borderStyle');
  const borderColorVal = gv(style, 'borderColor');

  const draftMarginSide = useCallback(
    (side: Side, raw: string) => {
      if (sh.margin) {
        return;
      }
      const t = raw.trim();
      patch({ margin: undefined, [`margin${side}`]: t ? t : undefined });
    },
    [patch, sh.margin],
  );

  const finalizeMarginSide = useCallback(
    (side: Side, raw: string) => {
      if (sh.margin) {
        return;
      }
      const val = normalizePxInput(raw);
      patch({ margin: undefined, [`margin${side}`]: val });
    },
    [patch, sh.margin],
  );

  const commitMarginUniform = useCallback(
    (raw: string) => {
      if (sh.margin) {
        return;
      }
      const val = normalizePxInput(raw);
      const next: Record<string, string | undefined> = { margin: undefined };
      SIDES.forEach((s) => {
        next[`margin${s}`] = val;
      });
      patch(next);
    },
    [patch, sh.margin],
  );

  const draftPaddingSide = useCallback(
    (side: Side, raw: string) => {
      if (sh.padding) {
        return;
      }
      const t = raw.trim();
      patch({ padding: undefined, [`padding${side}`]: t ? t : undefined });
    },
    [patch, sh.padding],
  );

  const finalizePaddingSide = useCallback(
    (side: Side, raw: string) => {
      if (sh.padding) {
        return;
      }
      const val = normalizePxInput(raw);
      patch({ padding: undefined, [`padding${side}`]: val });
    },
    [patch, sh.padding],
  );

  const commitPaddingUniform = useCallback(
    (raw: string) => {
      if (sh.padding) {
        return;
      }
      const val = normalizePxInput(raw);
      const next: Record<string, string | undefined> = { padding: undefined };
      SIDES.forEach((s) => {
        next[`padding${s}`] = val;
      });
      patch(next);
    },
    [patch, sh.padding],
  );

  const draftBorderWidthSide = useCallback(
    (side: Side, raw: string) => {
      if (borderBlocked) {
        return;
      }
      const t = raw.trim();
      patch({ ...clearBorderShorthandPatch(), [`border${side}Width`]: t ? t : undefined });
    },
    [borderBlocked, patch],
  );

  const finalizeBorderWidthSide = useCallback(
    (side: Side, raw: string) => {
      if (borderBlocked) {
        return;
      }
      const val = normalizePxInput(raw);
      patch({ ...clearBorderShorthandPatch(), [`border${side}Width`]: val });
    },
    [borderBlocked, patch],
  );

  const commitBorderUniform = useCallback(
    (raw: string) => {
      if (borderBlocked) {
        return;
      }
      const val = normalizePxInput(raw);
      const next: Record<string, string | undefined> = { ...clearBorderShorthandPatch() };
      SIDES.forEach((s) => {
        next[`border${s}Width`] = val;
      });
      patch(next);
    },
    [borderBlocked, patch],
  );

  const beginEdit = useCallback(
    (id: LayerId, vals: Record<Side, string>) => {
      if (readOnly) {
        return;
      }
      const t = topStripText(vals);
      const base = t === '···' || t === '0px' ? '' : t.replace(/px$/i, '');
      setDraft(filterNonNegDecimalDraft(base));
      setEditing(id);
    },
    [readOnly],
  );

  const finishEdit = useCallback(() => {
    setEditing(null);
    setDraft('');
  }, []);

  const marginDetail = (
    <div className="box-model-editor__popup-body">
      <div className="box-model-editor__popup-title">外边距 · 四边</div>
      <SideGrid
        prefix="margin"
        suffix=""
        vals={marginVals}
        disabled={readOnly || sh.margin}
        onDraft={draftMarginSide}
        onCommit={finalizeMarginSide}
      />
    </div>
  );

  const paddingDetail = (
    <div className="box-model-editor__popup-body">
      <div className="box-model-editor__popup-title">内边距 · 四边</div>
      <SideGrid
        prefix="padding"
        suffix=""
        vals={paddingVals}
        disabled={readOnly || sh.padding}
        onDraft={draftPaddingSide}
        onCommit={finalizePaddingSide}
      />
    </div>
  );

  const borderDetail = (
    <div className="box-model-editor__popup-body">
      <div className="box-model-editor__popup-title">边框 · 线宽</div>
      <SideGrid
        prefix="border"
        suffix="Width"
        vals={borderWVals}
        disabled={readOnly || borderBlocked}
        onDraft={draftBorderWidthSide}
        onCommit={finalizeBorderWidthSide}
      />
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
          popupProps={{
            attach: (triggerNode) =>
              (triggerNode && triggerNode.closest('.box-model-editor__popup-body')) || document.body,
          }}
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
      {(sh.margin || sh.padding) && (
        <Alert
          theme="warning"
          message={
            sh.margin && sh.padding
              ? '存在 margin / padding 简写，与四向编辑冲突。'
              : sh.margin
                ? '存在 margin 简写。'
                : '存在 padding 简写。'
          }
          className="box-model-editor__alert"
        />
      )}
      {borderBlocked && (
        <Alert theme="warning" message="存在 border 相关简写，与线宽四向冲突。" className="box-model-editor__alert" />
      )}

      <div className="box-model-editor__shorthand-actions">
        {sh.margin && (
          <Button size="small" variant="text" theme="primary" disabled={readOnly} onClick={() => patch({ margin: undefined })}>
            清除 margin 简写
          </Button>
        )}
        {sh.padding && (
          <Button size="small" variant="text" theme="primary" disabled={readOnly} onClick={() => patch({ padding: undefined })}>
            清除 padding 简写
          </Button>
        )}
        {borderBlocked && (
          <Button
            size="small"
            variant="text"
            theme="primary"
            disabled={readOnly}
            onClick={() => patch(clearBorderShorthandPatch())}
          >
            清除 border 简写
          </Button>
        )}
      </div>

      <div ref={diagramRef} className="box-model-editor__diagram" aria-label="盒模型">
        <RingLayer
          variant="margin"
          vals={marginVals}
          disabled={sh.margin}
          detail={marginDetail}
          readOnly={!!readOnly}
          editing={editing === 'margin'}
          draft={draft}
          setDraft={setDraft}
          onBeginEdit={() => beginEdit('margin', marginVals)}
          onUniformCommit={commitMarginUniform}
          onFinishEdit={finishEdit}
          glowActive={glowLayer === 'margin'}
          onLayerMouseEnter={() => setGlowLayer('margin')}
          onLayerMouseLeave={handleRingMouseLeave}
        >
          <RingLayer
            variant="border"
            vals={borderWVals}
            disabled={borderBlocked}
            detail={borderDetail}
            readOnly={!!readOnly}
            editing={editing === 'border'}
            draft={draft}
            setDraft={setDraft}
            onBeginEdit={() => beginEdit('border', borderWVals)}
            onUniformCommit={commitBorderUniform}
            onFinishEdit={finishEdit}
            glowActive={glowLayer === 'border'}
            onLayerMouseEnter={() => setGlowLayer('border')}
            onLayerMouseLeave={handleRingMouseLeave}
          >
            <RingLayer
              variant="padding"
              vals={paddingVals}
              disabled={sh.padding}
              detail={paddingDetail}
              readOnly={!!readOnly}
              editing={editing === 'padding'}
              draft={draft}
              setDraft={setDraft}
              onBeginEdit={() => beginEdit('padding', paddingVals)}
              onUniformCommit={commitPaddingUniform}
              onFinishEdit={finishEdit}
              glowActive={glowLayer === 'padding'}
              onLayerMouseEnter={() => setGlowLayer('padding')}
              onLayerMouseLeave={handleRingMouseLeave}
            >
              <div className="box-model-editor__content-core">
                <span className="box-model-editor__content-label">内容</span>
              </div>
            </RingLayer>
          </RingLayer>
        </RingLayer>
      </div>
    </div>
  );
};

export default React.memo(BoxModelStyleEditor);
