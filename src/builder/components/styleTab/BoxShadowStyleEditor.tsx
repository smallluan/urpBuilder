import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, ColorPicker, Input, Switch, Textarea } from 'tdesign-react';
import {
  defaultBoxShadowLayer,
  emptyBoxShadowLayer,
  parseBoxShadow,
  serializeBoxShadow,
  type BoxShadowLayer,
} from '../../utils/boxShadowCodec';
import { normalizeStyleValue } from '../../utils/nodeStyleCodec';
import './BoxShadowStyleEditor.less';

export interface BoxShadowStyleEditorProps {
  value?: Record<string, unknown>;
  onPatch: (patch: Record<string, string | undefined>) => void;
  readOnly?: boolean;
  computedHints?: Record<string, string>;
}

const gv = (style: Record<string, unknown>, key: string): string =>
  normalizeStyleValue(style)[key] ?? '';

const isVarColor = (c: string) => /^\s*var\s*\(/.test(c);

const BoxShadowStyleEditor: React.FC<BoxShadowStyleEditorProps> = ({
  value,
  onPatch,
  readOnly,
  computedHints,
}) => {
  const explicitBoxShadow = useMemo(
    () => String(gv(value ?? {}, 'boxShadow')).trim(),
    [value],
  );
  const computedBoxShadow = (computedHints?.boxShadow ?? '').trim();
  const effectiveBoxShadow = explicitBoxShadow || computedBoxShadow;
  const parsedEffective = useMemo(() => parseBoxShadow(effectiveBoxShadow), [effectiveBoxShadow]);

  const canvasBacked =
    !explicitBoxShadow && !!computedBoxShadow && !/^none$/i.test(computedBoxShadow);

  const [layer, setLayer] = useState<BoxShadowLayer>(() => emptyBoxShadowLayer());
  const [rawDraft, setRawDraft] = useState(effectiveBoxShadow);

  useEffect(() => {
    const p = parseBoxShadow(effectiveBoxShadow);
    if (p.kind === 'single') {
      setLayer(p.layer);
    } else if (p.kind === 'unparsed') {
      setRawDraft(p.raw);
    } else {
      setLayer(emptyBoxShadowLayer());
    }
  }, [effectiveBoxShadow]);

  const previewShadow = useMemo(() => {
    if (parsedEffective.kind === 'unparsed') return rawDraft.trim() || 'none';
    if (parsedEffective.kind === 'none') return 'none';
    return serializeBoxShadow(layer);
  }, [parsedEffective.kind, rawDraft, layer]);

  const pushLayer = useCallback(
    (next: BoxShadowLayer) => {
      setLayer(next);
      if (!readOnly) onPatch({ boxShadow: serializeBoxShadow(next) });
    },
    [onPatch, readOnly],
  );

  const handleRawBlur = useCallback(() => {
    if (readOnly) return;
    const t = rawDraft.trim();
    if (!t) { onPatch({ boxShadow: undefined }); return; }
    const p = parseBoxShadow(t);
    if (p.kind === 'single') {
      setLayer(p.layer);
      onPatch({ boxShadow: serializeBoxShadow(p.layer) });
    } else {
      onPatch({ boxShadow: t });
    }
  }, [onPatch, rawDraft, readOnly]);

  const handleResetSingle = useCallback(() => {
    if (readOnly) return;
    const next = defaultBoxShadowLayer();
    setLayer(next);
    onPatch({ boxShadow: serializeBoxShadow(next) });
  }, [onPatch, readOnly]);

  const handleClear = useCallback(() => {
    if (readOnly) return;
    onPatch({ boxShadow: undefined });
  }, [onPatch, readOnly]);

  const colorIsVar = isVarColor(layer.color);

  const formGrid = (
    <div className="box-shadow-style-editor__form">
      <label className="box-shadow-style-editor__field">
        <span className="box-shadow-style-editor__label">X 偏移</span>
        <Input size="small" value={layer.offsetX} onChange={(v) => pushLayer({ ...layer, offsetX: String(v ?? '') })} disabled={readOnly} placeholder="0" />
      </label>
      <label className="box-shadow-style-editor__field">
        <span className="box-shadow-style-editor__label">Y 偏移</span>
        <Input size="small" value={layer.offsetY} onChange={(v) => pushLayer({ ...layer, offsetY: String(v ?? '') })} disabled={readOnly} placeholder="0" />
      </label>
      <label className="box-shadow-style-editor__field">
        <span className="box-shadow-style-editor__label">模糊</span>
        <Input size="small" value={layer.blur} onChange={(v) => pushLayer({ ...layer, blur: String(v ?? '') })} disabled={readOnly} placeholder="0" />
      </label>
      <label className="box-shadow-style-editor__field">
        <span className="box-shadow-style-editor__label">扩散</span>
        <Input size="small" value={layer.spread} onChange={(v) => pushLayer({ ...layer, spread: String(v ?? '') })} disabled={readOnly} placeholder="0" />
      </label>
      <div className="box-shadow-style-editor__field box-shadow-style-editor__field--color">
        <span className="box-shadow-style-editor__label">颜色</span>
        <div className="box-shadow-style-editor__color-row">
          {!colorIsVar && (
            <ColorPicker
              value={layer.color || '#000000'}
              onChange={(v) => pushLayer({ ...layer, color: String(v ?? '') })}
              disabled={readOnly}
            />
          )}
          <Input
            size="small"
            value={layer.color}
            onChange={(v) => pushLayer({ ...layer, color: String(v ?? '') })}
            disabled={readOnly}
            placeholder="#000 / rgb() / var(--token)"
            className="box-shadow-style-editor__color-input"
          />
        </div>
      </div>
      <div className="box-shadow-style-editor__field box-shadow-style-editor__field--switch">
        <span className="box-shadow-style-editor__label">内阴影 (inset)</span>
        <Switch value={layer.inset} onChange={(v) => pushLayer({ ...layer, inset: v })} disabled={readOnly} />
      </div>
    </div>
  );

  return (
    <div className="box-shadow-style-editor">
      <div className="box-shadow-style-editor__intro">
        <div className="box-shadow-style-editor__title-row">
          <span className="box-shadow-style-editor__title">阴影</span>
          {canvasBacked ? <span className="box-shadow-style-editor__pill">画布</span> : null}
        </div>
        {canvasBacked ? (
          <p className="box-shadow-style-editor__sub">
            与组件当前渲染一致（尚未写入自定义样式）；修改任意项后会写入样式。
          </p>
        ) : (
          <p className="box-shadow-style-editor__sub box-shadow-style-editor__sub--muted">
            对应样式字段 <code className="box-shadow-style-editor__code">boxShadow</code>
          </p>
        )}
      </div>

      <div className="box-shadow-style-editor__body">
        <div className="box-shadow-style-editor__preview-col">
          <div className="box-shadow-style-editor__preview-label">预览</div>
          <div className="box-shadow-style-editor__preview-board">
            <div
              className="box-shadow-style-editor__preview-card"
              style={{ boxShadow: previewShadow === 'none' ? undefined : previewShadow }}
            />
          </div>
        </div>

        <div className="box-shadow-style-editor__controls">
          {parsedEffective.kind === 'unparsed' ? (
            <>
              <Alert className="box-shadow-style-editor__alert" theme="warning" message="多层或复杂语法：可编辑原文；解析为单层后恢复表单。" />
              <Textarea
                className="box-shadow-style-editor__raw"
                value={rawDraft}
                onChange={(v) => setRawDraft(String(v ?? ''))}
                onBlur={handleRawBlur}
                disabled={readOnly}
                autosize={{ minRows: 2, maxRows: 5 }}
                placeholder="box-shadow"
              />
              <div className="box-shadow-style-editor__actions">
                <Button size="small" variant="outline" onClick={handleResetSingle} disabled={readOnly}>设为默认单层</Button>
                <Button size="small" theme="danger" variant="outline" onClick={handleClear} disabled={readOnly}>清除自定义</Button>
              </div>
            </>
          ) : (
            <>
              {formGrid}
              <div className="box-shadow-style-editor__actions">
                <Button size="small" theme="danger" variant="outline" onClick={handleClear} disabled={readOnly}>清除自定义</Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(BoxShadowStyleEditor);
