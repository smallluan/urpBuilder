import React, { useCallback, useMemo } from 'react';
import { ColorPicker, Input, Select } from 'tdesign-react';
import { AlignCenter, AlignJustify, AlignLeft, AlignRight } from 'lucide-react';
import { getEffectiveStyleString } from '../../utils/styleEffectiveValue';
import './TypographyStyleEditor.less';

export interface TypographyStyleEditorProps {
  value?: Record<string, unknown>;
  onPatch: (patch: Record<string, string | undefined>) => void;
  readOnly?: boolean;
  computedHints?: Record<string, string>;
}

const FONT_WEIGHT_OPTIONS = [
  { label: 'normal', value: 'normal' },
  { label: 'bold', value: 'bold' },
  ...[100, 200, 300, 400, 500, 600, 700, 800, 900].map((n) => ({
    label: String(n),
    value: String(n),
  })),
] as const;

const TEXT_ALIGN_OPTIONS = [
  { value: 'left' as const, Icon: AlignLeft },
  { value: 'center' as const, Icon: AlignCenter },
  { value: 'right' as const, Icon: AlignRight },
  { value: 'justify' as const, Icon: AlignJustify },
];

const isVarColor = (c: string) => /^\s*var\s*\(/.test(c);

function normalizeTextAlign(raw: string): string {
  const t = raw.trim().toLowerCase();
  if (t === 'start') return 'left';
  if (t === 'end') return 'right';
  return t;
}

const TypographyStyleEditor: React.FC<TypographyStyleEditorProps> = ({
  value,
  onPatch,
  readOnly,
  computedHints,
}) => {
  const patch = useCallback(
    (p: Record<string, string | undefined>) => {
      if (!readOnly) onPatch(p);
    },
    [onPatch, readOnly],
  );

  const fields = useMemo(() => {
    const keys = [
      'fontSize',
      'fontWeight',
      'lineHeight',
      'letterSpacing',
      'color',
      'textAlign',
    ] as const;
    return keys.reduce(
      (acc, key) => {
        const effective = getEffectiveStyleString(value, key, computedHints);
        const explicit = getEffectiveStyleString(value, key, undefined, true).trim();
        const hint = String(computedHints?.[key] ?? '').trim();
        acc[key] = { effective, canvasBacked: !explicit && !!hint };
        return acc;
      },
      {} as Record<
        (typeof keys)[number],
        { effective: string; canvasBacked: boolean }
      >,
    );
  }, [value, computedHints]);

  const colorEffective = fields.color.effective;
  const colorIsVar = isVarColor(colorEffective);
  const textAlignNorm = normalizeTextAlign(fields.textAlign.effective);

  return (
    <div className="typography-style-editor">
      <div className="typography-style-editor__card">
        <div className="typography-style-editor__title">字体与排版</div>

        <div className="typography-style-editor__grid">
          <label className="typography-style-editor__field">
            <span className="typography-style-editor__label-row">
              <span className="typography-style-editor__label">字号</span>
              {fields.fontSize.canvasBacked ? (
                <span className="typography-style-editor__pill">画布</span>
              ) : null}
            </span>
            <Input
              size="small"
              disabled={readOnly}
              placeholder="14px"
              value={fields.fontSize.effective}
              onChange={(v) =>
                patch({ fontSize: String(v ?? '').trim() || undefined })
              }
            />
          </label>

          <label className="typography-style-editor__field">
            <span className="typography-style-editor__label-row">
              <span className="typography-style-editor__label">字重</span>
              {fields.fontWeight.canvasBacked ? (
                <span className="typography-style-editor__pill">画布</span>
              ) : null}
            </span>
            <Select
              size="small"
              clearable
              disabled={readOnly}
              placeholder="normal"
              options={[...FONT_WEIGHT_OPTIONS]}
              value={fields.fontWeight.effective || undefined}
              onChange={(v) =>
                patch({
                  fontWeight: v != null && v !== '' ? String(v).trim() : undefined,
                })
              }
            />
          </label>

          <label className="typography-style-editor__field">
            <span className="typography-style-editor__label-row">
              <span className="typography-style-editor__label">行高</span>
              {fields.lineHeight.canvasBacked ? (
                <span className="typography-style-editor__pill">画布</span>
              ) : null}
            </span>
            <Input
              size="small"
              disabled={readOnly}
              placeholder="1.5"
              value={fields.lineHeight.effective}
              onChange={(v) =>
                patch({ lineHeight: String(v ?? '').trim() || undefined })
              }
            />
          </label>

          <label className="typography-style-editor__field">
            <span className="typography-style-editor__label-row">
              <span className="typography-style-editor__label">字间距</span>
              {fields.letterSpacing.canvasBacked ? (
                <span className="typography-style-editor__pill">画布</span>
              ) : null}
            </span>
            <Input
              size="small"
              disabled={readOnly}
              placeholder="0"
              value={fields.letterSpacing.effective}
              onChange={(v) =>
                patch({ letterSpacing: String(v ?? '').trim() || undefined })
              }
            />
          </label>

          <div className="typography-style-editor__field typography-style-editor__field--full">
            <span className="typography-style-editor__label-row">
              <span className="typography-style-editor__label">颜色</span>
              {fields.color.canvasBacked ? (
                <span className="typography-style-editor__pill">画布</span>
              ) : null}
            </span>
            {colorIsVar ? (
              <Input
                size="small"
                disabled={readOnly}
                placeholder="var(--token)"
                value={colorEffective}
                onChange={(v) =>
                  patch({ color: String(v ?? '').trim() || undefined })
                }
              />
            ) : (
              <div className="typography-style-editor__color-row">
                <ColorPicker
                  value={colorEffective || '#000000'}
                  onChange={(v) =>
                    patch({ color: String(v ?? '').trim() || undefined })
                  }
                  disabled={readOnly}
                />
                <Input
                  size="small"
                  disabled={readOnly}
                  placeholder="#000、rgb()、var(--token)"
                  className="typography-style-editor__color-input"
                  value={colorEffective}
                  onChange={(v) =>
                    patch({ color: String(v ?? '').trim() || undefined })
                  }
                />
              </div>
            )}
          </div>

          <div className="typography-style-editor__field typography-style-editor__field--full">
            <span className="typography-style-editor__label-row">
              <span className="typography-style-editor__label">对齐</span>
              {fields.textAlign.canvasBacked ? (
                <span className="typography-style-editor__pill">画布</span>
              ) : null}
            </span>
            <div className="typography-style-editor__align-row">
              {TEXT_ALIGN_OPTIONS.map(({ value: align, Icon }) => {
                const active = textAlignNorm === align;
                return (
                  <button
                    key={align}
                    type="button"
                    className={
                      active
                        ? 'typography-style-editor__align-btn typography-style-editor__align-btn--active'
                        : 'typography-style-editor__align-btn'
                    }
                    disabled={readOnly}
                    title={align}
                    aria-pressed={active}
                    onClick={() => patch({ textAlign: align })}
                  >
                    <Icon size={16} strokeWidth={2} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(TypographyStyleEditor);
