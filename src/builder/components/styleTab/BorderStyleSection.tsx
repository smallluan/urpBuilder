import React, { useCallback, useState } from 'react';
import { ColorPicker, Input, Select } from 'tdesign-react';
import { normalizeStyleValue } from '../../utils/nodeStyleCodec';
import { BORDER_STYLE_OPTIONS } from './layoutOptions';
import StyleTokenSelect from './StyleTokenSelect';

export interface BorderStyleSectionProps {
  value?: Record<string, unknown>;
  onPatch: (patch: Record<string, string | undefined>) => void;
  readOnly?: boolean;
}

const gv = (style: Record<string, unknown>, key: string): string => normalizeStyleValue(style)[key] ?? '';

const isLikelyHexColor = (s: string): boolean => /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(s.trim());

const BorderStyleSection: React.FC<BorderStyleSectionProps> = ({ value, onPatch, readOnly }) => {
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

  const bc = gv(style, 'borderColor');

  return (
    <div className="node-style-tab__section-body">
      <div className="config-row config-row--editor">
        <span className="config-label">borderWidth</span>
        <div className="config-editor">
          <Input
            size="small"
            clearable
            disabled={readOnly}
            placeholder="如 1px"
            value={gv(style, 'borderWidth')}
            onChange={(v) => patch({ borderWidth: String(v ?? '') || undefined })}
          />
        </div>
      </div>
      <div className="config-row config-row--editor">
        <span className="config-label">borderStyle</span>
        <div className="config-editor">
          <Select
            size="small"
            options={BORDER_STYLE_OPTIONS}
            value={gv(style, 'borderStyle') || undefined}
            clearable
            disabled={readOnly}
            onChange={(v) => patch({ borderStyle: String(v ?? '') || undefined })}
          />
        </div>
      </div>
      <div className="config-row config-row--editor">
        <span className="config-label">borderColor</span>
        <div className="config-editor node-style-tab__editor-stack">
          {isLikelyHexColor(bc) || bc === '' ? (
            <ColorPicker
              value={bc || undefined}
              disabled={readOnly}
              onChange={(v) => patch({ borderColor: String(v ?? '') || undefined })}
            />
          ) : null}
          <Input
            size="small"
            clearable
            disabled={readOnly}
            placeholder="# 或 var(--td-...)"
            value={bc}
            onChange={(v) => patch({ borderColor: String(v ?? '') || undefined })}
          />
          <StyleTokenSelect
            key={`bd-${tokKey}`}
            disabled={readOnly}
            onPick={(cssValue) => {
              patch({ borderColor: cssValue });
              setTokKey((k) => k + 1);
            }}
          />
        </div>
      </div>
      <div className="config-row config-row--editor">
        <span className="config-label">borderRadius</span>
        <div className="config-editor">
          <Input
            size="small"
            clearable
            disabled={readOnly}
            placeholder="如 8px"
            value={gv(style, 'borderRadius')}
            onChange={(v) => patch({ borderRadius: String(v ?? '') || undefined })}
          />
        </div>
      </div>
      <div className="config-row config-row--editor">
        <span className="config-label">border</span>
        <div className="config-editor">
          <Input
            size="small"
            clearable
            disabled={readOnly}
            placeholder="简写，如 1px solid #eee"
            value={gv(style, 'border')}
            onChange={(v) => patch({ border: String(v ?? '') || undefined })}
          />
        </div>
      </div>
    </div>
  );
};

export default React.memo(BorderStyleSection);
