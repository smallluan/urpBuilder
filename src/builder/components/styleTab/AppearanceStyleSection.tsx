import React, { useCallback, useState } from 'react';
import { ColorPicker, Input, Typography } from 'tdesign-react';
import { STYLE_TOKEN_HINT } from '../../config/styleTokens';
import { normalizeStyleValue } from '../../utils/nodeStyleCodec';
import StyleTokenSelect from './StyleTokenSelect';

export interface AppearanceStyleSectionProps {
  value?: Record<string, unknown>;
  onPatch: (patch: Record<string, string | undefined>) => void;
  readOnly?: boolean;
}

const gv = (style: Record<string, unknown>, key: string): string => normalizeStyleValue(style)[key] ?? '';

const isLikelyHexColor = (s: string): boolean => /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(s.trim());

const AppearanceStyleSection: React.FC<AppearanceStyleSectionProps> = ({ value, onPatch, readOnly }) => {
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

  const bgc = gv(style, 'backgroundColor');

  return (
    <div className="node-style-tab__section-body">
      <Typography.Text theme="secondary" style={{ display: 'block', marginBottom: 8, fontSize: 12 }}>
        {STYLE_TOKEN_HINT}
      </Typography.Text>

      <div className="config-row config-row--editor">
        <span className="config-label">backgroundColor</span>
        <div className="config-editor node-style-tab__editor-stack">
          {isLikelyHexColor(bgc) || bgc === '' ? (
            <ColorPicker
              value={bgc || undefined}
              disabled={readOnly}
              onChange={(v) => patch({ backgroundColor: String(v ?? '') || undefined })}
            />
          ) : null}
          <Input
            size="small"
            clearable
            disabled={readOnly}
            placeholder="#fff 或 var(--td-...)"
            value={bgc}
            onChange={(v) => patch({ backgroundColor: String(v ?? '') || undefined })}
          />
          <StyleTokenSelect
            key={`bg-${tokKey}`}
            disabled={readOnly}
            onPick={(cssValue) => {
              patch({ backgroundColor: cssValue });
              setTokKey((k) => k + 1);
            }}
          />
        </div>
      </div>

      <div className="config-row config-row--editor">
        <span className="config-label">background</span>
        <div className="config-editor">
          <Input
            size="small"
            clearable
            disabled={readOnly}
            placeholder="渐变等完整 background"
            value={gv(style, 'background')}
            onChange={(v) => patch({ background: String(v ?? '') || undefined })}
          />
        </div>
      </div>

      <div className="config-row config-row--editor">
        <span className="config-label">opacity</span>
        <div className="config-editor">
          <Input
            size="small"
            clearable
            disabled={readOnly}
            placeholder="0 ~ 1"
            value={gv(style, 'opacity')}
            onChange={(v) => patch({ opacity: String(v ?? '') || undefined })}
          />
        </div>
      </div>

      <div className="config-row config-row--editor">
        <span className="config-label">boxShadow</span>
        <div className="config-editor">
          <Input
            size="small"
            clearable
            disabled={readOnly}
            placeholder="如 0 2px 8px rgba(0,0,0,.08)"
            value={gv(style, 'boxShadow')}
            onChange={(v) => patch({ boxShadow: String(v ?? '') || undefined })}
          />
        </div>
      </div>
    </div>
  );
};

export default React.memo(AppearanceStyleSection);
