import React, { useCallback } from 'react';
import { Input, Select } from 'tdesign-react';
import { normalizeStyleValue } from '../../utils/nodeStyleCodec';
import {
  ALIGN_ITEMS_OPTIONS,
  DISPLAY_OPTIONS,
  FLEX_DIRECTION_OPTIONS,
  FLEX_WRAP_OPTIONS,
  JUSTIFY_CONTENT_OPTIONS,
  OVERFLOW_OPTIONS,
} from './layoutOptions';

export interface LayoutStyleSectionProps {
  value?: Record<string, unknown>;
  onPatch: (patch: Record<string, string | undefined>) => void;
  readOnly?: boolean;
}

const gv = (style: Record<string, unknown>, key: string): string => normalizeStyleValue(style)[key] ?? '';

const LayoutStyleSection: React.FC<LayoutStyleSectionProps> = ({ value, onPatch, readOnly }) => {
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

  return (
    <div className="node-style-tab__section-body">
      <div className="config-row config-row--editor">
        <span className="config-label">display</span>
        <div className="config-editor">
          <Select
            size="small"
            options={DISPLAY_OPTIONS}
            value={gv(style, 'display') || undefined}
            clearable
            disabled={readOnly}
            onChange={(v) => patch({ display: String(v ?? '') || undefined })}
          />
        </div>
      </div>
      <div className="config-row config-row--editor">
        <span className="config-label">flexDirection</span>
        <div className="config-editor">
          <Select
            size="small"
            options={FLEX_DIRECTION_OPTIONS}
            value={gv(style, 'flexDirection') || undefined}
            clearable
            disabled={readOnly}
            onChange={(v) => patch({ flexDirection: String(v ?? '') || undefined })}
          />
        </div>
      </div>
      <div className="config-row config-row--editor">
        <span className="config-label">justifyContent</span>
        <div className="config-editor">
          <Select
            size="small"
            options={JUSTIFY_CONTENT_OPTIONS}
            value={gv(style, 'justifyContent') || undefined}
            clearable
            disabled={readOnly}
            onChange={(v) => patch({ justifyContent: String(v ?? '') || undefined })}
          />
        </div>
      </div>
      <div className="config-row config-row--editor">
        <span className="config-label">alignItems</span>
        <div className="config-editor">
          <Select
            size="small"
            options={ALIGN_ITEMS_OPTIONS}
            value={gv(style, 'alignItems') || undefined}
            clearable
            disabled={readOnly}
            onChange={(v) => patch({ alignItems: String(v ?? '') || undefined })}
          />
        </div>
      </div>
      <div className="config-row config-row--editor">
        <span className="config-label">flexWrap</span>
        <div className="config-editor">
          <Select
            size="small"
            options={FLEX_WRAP_OPTIONS}
            value={gv(style, 'flexWrap') || undefined}
            clearable
            disabled={readOnly}
            onChange={(v) => patch({ flexWrap: String(v ?? '') || undefined })}
          />
        </div>
      </div>
      <div className="config-row config-row--editor">
        <span className="config-label">gap</span>
        <div className="config-editor">
          <Input
            size="small"
            clearable
            disabled={readOnly}
            placeholder="如 8px"
            value={gv(style, 'gap')}
            onChange={(v) => patch({ gap: String(v ?? '') || undefined })}
          />
        </div>
      </div>
      <div className="config-row config-row--editor">
        <span className="config-label">width</span>
        <div className="config-editor">
          <Input
            size="small"
            clearable
            disabled={readOnly}
            value={gv(style, 'width')}
            onChange={(v) => patch({ width: String(v ?? '') || undefined })}
          />
        </div>
      </div>
      <div className="config-row config-row--editor">
        <span className="config-label">height</span>
        <div className="config-editor">
          <Input
            size="small"
            clearable
            disabled={readOnly}
            value={gv(style, 'height')}
            onChange={(v) => patch({ height: String(v ?? '') || undefined })}
          />
        </div>
      </div>
      <div className="config-row config-row--editor">
        <span className="config-label">minWidth</span>
        <div className="config-editor">
          <Input
            size="small"
            clearable
            disabled={readOnly}
            value={gv(style, 'minWidth')}
            onChange={(v) => patch({ minWidth: String(v ?? '') || undefined })}
          />
        </div>
      </div>
      <div className="config-row config-row--editor">
        <span className="config-label">maxWidth</span>
        <div className="config-editor">
          <Input
            size="small"
            clearable
            disabled={readOnly}
            value={gv(style, 'maxWidth')}
            onChange={(v) => patch({ maxWidth: String(v ?? '') || undefined })}
          />
        </div>
      </div>
      <div className="config-row config-row--editor">
        <span className="config-label">minHeight</span>
        <div className="config-editor">
          <Input
            size="small"
            clearable
            disabled={readOnly}
            value={gv(style, 'minHeight')}
            onChange={(v) => patch({ minHeight: String(v ?? '') || undefined })}
          />
        </div>
      </div>
      <div className="config-row config-row--editor">
        <span className="config-label">maxHeight</span>
        <div className="config-editor">
          <Input
            size="small"
            clearable
            disabled={readOnly}
            value={gv(style, 'maxHeight')}
            onChange={(v) => patch({ maxHeight: String(v ?? '') || undefined })}
          />
        </div>
      </div>
      <div className="config-row config-row--editor">
        <span className="config-label">overflow</span>
        <div className="config-editor">
          <Select
            size="small"
            options={OVERFLOW_OPTIONS}
            value={gv(style, 'overflow') || undefined}
            clearable
            disabled={readOnly}
            onChange={(v) => patch({ overflow: String(v ?? '') || undefined })}
          />
        </div>
      </div>
    </div>
  );
};

export default React.memo(LayoutStyleSection);
