import React, { useCallback, useState } from 'react';
import { ColorPicker, Input, Select } from 'tdesign-react';
import { normalizeStyleValue } from '../../utils/nodeStyleCodec';
import { FONT_WEIGHT_OPTIONS, TEXT_ALIGN_OPTIONS, TEXT_DECORATION_OPTIONS } from './layoutOptions';
import StyleTokenSelect from './StyleTokenSelect';

export interface TypographyStyleSectionProps {
  value?: Record<string, unknown>;
  onPatch: (patch: Record<string, string | undefined>) => void;
  readOnly?: boolean;
}

const gv = (style: Record<string, unknown>, key: string): string => normalizeStyleValue(style)[key] ?? '';

const isLikelyHexColor = (s: string): boolean => /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(s.trim());

const TypographyStyleSection: React.FC<TypographyStyleSectionProps> = ({ value, onPatch, readOnly }) => {
  const style = value ?? {};
  const [tokKey, setTokKey] = useState(0);

  const patch = useCallback(
    (p: Record<string, string | undefined>) => {
      if (readOnly) {
        return;
      }
      onPatch(p);
    },
    [onPatch, readOnly],
  );

  const col = gv(style, 'color');

  return (
    <div className="node-style-tab__section-body">
      <div className="config-row config-row--editor">
        <span className="config-label">color</span>
        <div className="config-editor node-style-tab__editor-stack">
          {isLikelyHexColor(col) || col === '' ? (
            <ColorPicker
              value={col || undefined}
              disabled={readOnly}
              onChange={(v) => patch({ color: String(v ?? '') || undefined })}
            />
          ) : null}
          <Input
            size="small"
            clearable
            disabled={readOnly}
            placeholder="#333 或 var(--td-...)"
            value={col}
            onChange={(v) => patch({ color: String(v ?? '') || undefined })}
          />
          <StyleTokenSelect
            key={`fg-${tokKey}`}
            disabled={readOnly}
            placeholder="文字语义色"
            onPick={(cssValue) => {
              patch({ color: cssValue });
              setTokKey((k) => k + 1);
            }}
          />
        </div>
      </div>
      <div className="config-row config-row--editor">
        <span className="config-label">fontSize</span>
        <div className="config-editor">
          <Input
            size="small"
            clearable
            disabled={readOnly}
            placeholder="如 14px"
            value={gv(style, 'fontSize')}
            onChange={(v) => patch({ fontSize: String(v ?? '') || undefined })}
          />
        </div>
      </div>
      <div className="config-row config-row--editor">
        <span className="config-label">fontWeight</span>
        <div className="config-editor">
          <Select
            size="small"
            options={FONT_WEIGHT_OPTIONS}
            value={gv(style, 'fontWeight') || undefined}
            clearable
            disabled={readOnly}
            onChange={(v) => patch({ fontWeight: String(v ?? '') || undefined })}
          />
        </div>
      </div>
      <div className="config-row config-row--editor">
        <span className="config-label">lineHeight</span>
        <div className="config-editor">
          <Input
            size="small"
            clearable
            disabled={readOnly}
            placeholder="如 1.5 或 22px"
            value={gv(style, 'lineHeight')}
            onChange={(v) => patch({ lineHeight: String(v ?? '') || undefined })}
          />
        </div>
      </div>
      <div className="config-row config-row--editor">
        <span className="config-label">textAlign</span>
        <div className="config-editor">
          <Select
            size="small"
            options={TEXT_ALIGN_OPTIONS}
            value={gv(style, 'textAlign') || undefined}
            clearable
            disabled={readOnly}
            onChange={(v) => patch({ textAlign: String(v ?? '') || undefined })}
          />
        </div>
      </div>
      <div className="config-row config-row--editor">
        <span className="config-label">textDecoration</span>
        <div className="config-editor">
          <Select
            size="small"
            options={TEXT_DECORATION_OPTIONS}
            value={gv(style, 'textDecoration') || undefined}
            clearable
            disabled={readOnly}
            onChange={(v) => patch({ textDecoration: String(v ?? '') || undefined })}
          />
        </div>
      </div>
    </div>
  );
};

export default React.memo(TypographyStyleSection);
