import React, { useCallback } from 'react';
import { Alert, Input } from 'tdesign-react';
import { hasShorthandSpacing, normalizeStyleValue } from '../../utils/nodeStyleCodec';

export interface SpacingStyleSectionProps {
  value?: Record<string, unknown>;
  onPatch: (patch: Record<string, string | undefined>) => void;
  readOnly?: boolean;
}

const gv = (style: Record<string, unknown>, key: string): string => normalizeStyleValue(style)[key] ?? '';

const keys = ['Top', 'Right', 'Bottom', 'Left'] as const;

const SpacingStyleSection: React.FC<SpacingStyleSectionProps> = ({ value, onPatch, readOnly }) => {
  const style = value ?? {};
  const patch = useCallback(
    (p: Record<string, string | undefined>) => {
      if (readOnly) {
        return;
      }
      onPatch(p);
    },
    [onPatch, readOnly],
  );

  const sh = hasShorthandSpacing(style);

  return (
    <div className="node-style-tab__section-body">
      {(sh.padding || sh.margin) && (
        <Alert
          theme="warning"
          message={
            sh.padding && sh.margin
              ? '存在 padding、margin 简写，请在「高级 CSS」中编辑；下方四向仅作用于 longhand。'
              : sh.padding
                ? '存在 padding 简写，请在「高级 CSS」中编辑。'
                : '存在 margin 简写，请在「高级 CSS」中编辑。'
          }
          style={{ marginBottom: 8 }}
        />
      )}

      <div className="node-style-tab__subhead">padding</div>
      {keys.map((side) => {
        const prop = `padding${side}` as const;
        return (
          <div key={prop} className="config-row config-row--editor">
            <span className="config-label">{prop}</span>
            <div className="config-editor">
              <Input
                size="small"
                clearable
                disabled={readOnly || sh.padding}
                placeholder="如 8px"
                value={gv(style, prop)}
                onChange={(v) => patch({ [prop]: String(v ?? '') || undefined })}
              />
            </div>
          </div>
        );
      })}

      <div className="node-style-tab__subhead">margin</div>
      {keys.map((side) => {
        const prop = `margin${side}` as const;
        return (
          <div key={prop} className="config-row config-row--editor">
            <span className="config-label">{prop}</span>
            <div className="config-editor">
              <Input
                size="small"
                clearable
                disabled={readOnly || sh.margin}
                placeholder="如 8px"
                value={gv(style, prop)}
                onChange={(v) => patch({ [prop]: String(v ?? '') || undefined })}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default React.memo(SpacingStyleSection);
