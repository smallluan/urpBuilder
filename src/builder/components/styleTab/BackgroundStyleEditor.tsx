import React, { useCallback, useMemo } from 'react';
import { ColorPicker, Input, Select } from 'tdesign-react';
import { STYLE_TOKEN_GROUPS } from '../../config/styleTokens';
import { normalizeStyleValue } from '../../utils/nodeStyleCodec';
import './BackgroundStyleEditor.less';

export interface BackgroundStyleEditorProps {
  value?: Record<string, unknown>;
  onPatch: (patch: Record<string, string | undefined>) => void;
  readOnly?: boolean;
  computedHints?: Record<string, string>;
}

const gv = (style: Record<string, unknown>, key: string): string =>
  normalizeStyleValue(style)[key] ?? '';

const isVarColor = (c: string) => /^\s*var\s*\(/.test(c);

const BackgroundStyleEditor: React.FC<BackgroundStyleEditorProps> = ({
  value,
  onPatch,
  readOnly,
  computedHints,
}) => {
  const style = value ?? {};
  const explicit = useMemo(() => String(gv(style, 'backgroundColor')).trim(), [style]);
  const fromComputed = (computedHints?.backgroundColor ?? '').trim();
  const shown = explicit || fromComputed;
  const canvasOnly = !explicit && !!fromComputed;
  const colorIsVar = isVarColor(shown);

  const tokenOptions = useMemo(
    () =>
      STYLE_TOKEN_GROUPS.flatMap((g) =>
        g.items.map((item) => ({
          label: `${g.title} · ${item.label}`,
          value: item.value,
        })),
      ),
    [],
  );

  const selectValue = useMemo(() => {
    if (explicit && tokenOptions.some((o) => o.value === explicit)) return explicit;
    if (!explicit && shown && tokenOptions.some((o) => o.value === shown)) return shown;
    return undefined;
  }, [explicit, shown, tokenOptions]);

  const patch = useCallback(
    (p: Record<string, string | undefined>) => { if (!readOnly) onPatch(p); },
    [onPatch, readOnly],
  );

  return (
    <div className="background-style-editor">
      <div className="background-style-editor__intro">
        <div className="background-style-editor__title-row">
          <span className="background-style-editor__title">背景色</span>
          {canvasOnly ? <span className="background-style-editor__pill">画布</span> : null}
        </div>
        {canvasOnly ? (
          <p className="background-style-editor__sub">
            与当前渲染一致；修改后将写入 <code className="background-style-editor__code">backgroundColor</code>。
          </p>
        ) : (
          <p className="background-style-editor__sub background-style-editor__sub--muted">
            对应样式字段 <code className="background-style-editor__code">backgroundColor</code>
          </p>
        )}
      </div>

      <div className="background-style-editor__body">
        <div className="background-style-editor__preview-area">
          <div
            className="background-style-editor__swatch-large"
            style={{ backgroundColor: shown || 'transparent' }}
            title={shown || '无'}
          />
        </div>

        <div className="background-style-editor__fields">
          {!colorIsVar && (
            <div className="background-style-editor__field">
              <span className="background-style-editor__label">取色器</span>
              <ColorPicker
                value={shown || '#ffffff'}
                onChange={(v) => patch({ backgroundColor: String(v ?? '').trim() || undefined })}
                disabled={!!readOnly}
              />
            </div>
          )}

          <label className="background-style-editor__field">
            <span className="background-style-editor__label">语义色 / 快捷</span>
            <Select
              size="small"
              clearable
              disabled={!!readOnly}
              placeholder="选择 token"
              options={tokenOptions}
              value={selectValue}
              onChange={(v) => {
                const next = v ? String(v) : '';
                patch({ backgroundColor: next || undefined });
              }}
              popupProps={{ overlayInnerStyle: { maxHeight: 280 } }}
            />
          </label>

          <label className="background-style-editor__field background-style-editor__field--wide">
            <span className="background-style-editor__label">自定义值</span>
            <Input
              size="small"
              clearable
              disabled={!!readOnly}
              placeholder="#fff、rgb()、var(--td-*)"
              value={shown}
              onChange={(v) => patch({ backgroundColor: String(v ?? '').trim() || undefined })}
            />
          </label>
        </div>
      </div>
    </div>
  );
};

export default React.memo(BackgroundStyleEditor);
