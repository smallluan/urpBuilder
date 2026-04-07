import React, { useCallback, useMemo } from 'react';
import { Input, Select } from 'tdesign-react';
import { getEffectiveStyleString } from '../../utils/styleEffectiveValue';
import './PositionStyleEditor.less';

export interface PositionStyleEditorProps {
  value?: Record<string, unknown>;
  onPatch: (patch: Record<string, string | undefined>) => void;
  readOnly?: boolean;
  computedHints?: Record<string, string>;
}

const POSITION_OPTIONS = [
  { label: 'static', value: 'static' },
  { label: 'relative', value: 'relative' },
  { label: 'absolute', value: 'absolute' },
  { label: 'fixed', value: 'fixed' },
  { label: 'sticky', value: 'sticky' },
] as const;

const PositionStyleEditor: React.FC<PositionStyleEditorProps> = ({
  value,
  onPatch,
  readOnly,
  computedHints,
}) => {
  const style = value ?? {};

  const positionRaw = useMemo(
    () => getEffectiveStyleString(style, 'position', computedHints),
    [style, computedHints],
  );
  const effectivePosition = (positionRaw.trim() || 'static');
  const isNotStatic = effectivePosition !== 'static';

  const topVal = useMemo(
    () => getEffectiveStyleString(style, 'top', computedHints),
    [style, computedHints],
  );
  const rightVal = useMemo(
    () => getEffectiveStyleString(style, 'right', computedHints),
    [style, computedHints],
  );
  const bottomVal = useMemo(
    () => getEffectiveStyleString(style, 'bottom', computedHints),
    [style, computedHints],
  );
  const leftVal = useMemo(
    () => getEffectiveStyleString(style, 'left', computedHints),
    [style, computedHints],
  );
  const zIndexVal = useMemo(
    () => getEffectiveStyleString(style, 'zIndex', computedHints),
    [style, computedHints],
  );

  const patch = useCallback(
    (p: Record<string, string | undefined>) => {
      if (!readOnly) onPatch(p);
    },
    [onPatch, readOnly],
  );

  const handlePositionChange = useCallback(
    (v: unknown) => {
      patch({ position: v != null && String(v) !== '' ? String(v) : undefined });
    },
    [patch],
  );

  const handleTopChange = useCallback(
    (v: string | number | undefined) => {
      patch({ top: String(v ?? '').trim() || undefined });
    },
    [patch],
  );
  const handleRightChange = useCallback(
    (v: string | number | undefined) => {
      patch({ right: String(v ?? '').trim() || undefined });
    },
    [patch],
  );
  const handleBottomChange = useCallback(
    (v: string | number | undefined) => {
      patch({ bottom: String(v ?? '').trim() || undefined });
    },
    [patch],
  );
  const handleLeftChange = useCallback(
    (v: string | number | undefined) => {
      patch({ left: String(v ?? '').trim() || undefined });
    },
    [patch],
  );

  const handleZIndexChange = useCallback(
    (v: string | number | undefined) => {
      patch({ zIndex: String(v ?? '').trim() || undefined });
    },
    [patch],
  );

  return (
    <div className="position-style-editor">
      <div className="position-style-editor__header">
        <span className="position-style-editor__title">定位</span>
      </div>

      <div className="position-style-editor__field">
        <span className="position-style-editor__label">position</span>
        <Select
          size="small"
          clearable
          disabled={!!readOnly}
          placeholder="默认"
          options={[...POSITION_OPTIONS]}
          value={positionRaw.trim() || undefined}
          onChange={handlePositionChange}
        />
      </div>

      {isNotStatic && (
        <>
          <div className="position-style-editor__cross">
            <div className="position-style-editor__cross-top">
              <Input
                size="small"
                align="center"
                clearable
                disabled={!!readOnly}
                placeholder="top"
                value={topVal}
                onChange={handleTopChange}
              />
            </div>
            <div className="position-style-editor__cross-mid">
              <Input
                size="small"
                align="center"
                clearable
                disabled={!!readOnly}
                placeholder="left"
                value={leftVal}
                onChange={handleLeftChange}
              />
              <div className="position-style-editor__cross-center" aria-hidden="true" />
              <Input
                size="small"
                align="center"
                clearable
                disabled={!!readOnly}
                placeholder="right"
                value={rightVal}
                onChange={handleRightChange}
              />
            </div>
            <div className="position-style-editor__cross-bottom">
              <Input
                size="small"
                align="center"
                clearable
                disabled={!!readOnly}
                placeholder="bottom"
                value={bottomVal}
                onChange={handleBottomChange}
              />
            </div>
          </div>
          <div className="position-style-editor__field">
            <span className="position-style-editor__label">z-index</span>
            <Input
              size="small"
              clearable
              disabled={!!readOnly}
              placeholder="auto"
              value={zIndexVal}
              onChange={handleZIndexChange}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default React.memo(PositionStyleEditor);
