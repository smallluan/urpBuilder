import React, { useCallback, useMemo } from 'react';
import { InputNumber, Slider } from 'tdesign-react';
import { getEffectiveStyleString } from '../../utils/styleEffectiveValue';
import './OpacityStyleEditor.less';

export interface OpacityStyleEditorProps {
  value?: Record<string, unknown>;
  onPatch: (patch: Record<string, string | undefined>) => void;
  readOnly?: boolean;
  computedHints?: Record<string, string>;
}

function parseOpacityToFraction(raw: string): number {
  const s = String(raw).trim();
  if (!s) return 1;
  if (s.endsWith('%')) {
    const n = parseFloat(s);
    if (Number.isNaN(n)) return 1;
    return Math.min(1, Math.max(0, n / 100));
  }
  const n = parseFloat(s);
  if (Number.isNaN(n)) return 1;
  return Math.min(1, Math.max(0, n));
}

function fractionToPct(f: number): number {
  return Math.min(100, Math.max(0, Math.round(f * 100)));
}

const OpacityStyleEditor: React.FC<OpacityStyleEditorProps> = ({
  value,
  onPatch,
  readOnly,
  computedHints,
}) => {
  const explicit = useMemo(
    () => getEffectiveStyleString(value, 'opacity', undefined, true).trim(),
    [value],
  );
  const fromComputed = (computedHints?.opacity ?? '').trim();
  const canvasOnly = !explicit && !!fromComputed;

  const effectiveRaw = useMemo(() => {
    const s = getEffectiveStyleString(value, 'opacity', computedHints).trim();
    return s || '1';
  }, [value, computedHints]);

  const pct = useMemo(
    () => fractionToPct(parseOpacityToFraction(effectiveRaw)),
    [effectiveRaw],
  );

  const patch = useCallback(
    (p: Record<string, string | undefined>) => {
      if (!readOnly) onPatch(p);
    },
    [onPatch, readOnly],
  );

  const applyPct = useCallback(
    (nextPct: number) => {
      if (readOnly) return;
      if (Number.isNaN(nextPct)) return;
      const clamped = Math.min(100, Math.max(0, Math.round(nextPct)));
      const unit = clamped / 100;
      patch({ opacity: String(unit) });
    },
    [patch, readOnly],
  );

  const handleSlider = useCallback(
    (v: number | number[]) => {
      const n = Array.isArray(v) ? v[0] : v;
      applyPct(Number(n));
    },
    [applyPct],
  );

  const handleNumber = useCallback(
    (v: string | number | undefined) => {
      if (readOnly) return;
      if (v === undefined || v === '') {
        patch({ opacity: undefined });
        return;
      }
      applyPct(Number(v));
    },
    [applyPct, patch, readOnly],
  );

  return (
    <div className="opacity-style-editor">
      <div className="opacity-style-editor__header">
        <span className="opacity-style-editor__title">透明度</span>
        {canvasOnly && <span className="opacity-style-editor__pill">画布</span>}
      </div>
      <div className="opacity-style-editor__row">
        <Slider
          min={0}
          max={100}
          step={1}
          value={pct}
          onChange={handleSlider}
          disabled={readOnly}
        />
        <InputNumber
          size="small"
          min={0}
          max={100}
          step={1}
          value={pct}
          onChange={handleNumber}
          disabled={readOnly}
          suffix="%"
        />
      </div>
    </div>
  );
};

export default React.memo(OpacityStyleEditor);
