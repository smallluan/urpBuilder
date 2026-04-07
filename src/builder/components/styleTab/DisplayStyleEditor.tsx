import React, { useCallback, useMemo } from 'react';
import { Input, Select } from 'tdesign-react';
import { ArrowRight, ArrowDown, ArrowLeftRight, ArrowUpDown } from 'lucide-react';
import { getEffectiveStyleString } from '../../utils/styleEffectiveValue';
import './DisplayStyleEditor.less';

export interface DisplayStyleEditorProps {
  value?: Record<string, unknown>;
  onPatch: (patch: Record<string, string | undefined>) => void;
  readOnly?: boolean;
  computedHints?: Record<string, string>;
}

const DISPLAY_OPTIONS = [
  { label: 'block', value: 'block' },
  { label: 'flex', value: 'flex' },
  { label: 'inline-flex', value: 'inline-flex' },
  { label: 'inline-block', value: 'inline-block' },
  { label: 'inline', value: 'inline' },
  { label: 'grid', value: 'grid' },
  { label: 'none', value: 'none' },
] as const;

const FLEX_DIRECTION_OPTIONS = [
  { label: 'row', value: 'row' },
  { label: 'column', value: 'column' },
  { label: 'row-reverse', value: 'row-reverse' },
  { label: 'column-reverse', value: 'column-reverse' },
] as const;

const JUSTIFY_OPTIONS = [
  { label: 'flex-start', value: 'flex-start' },
  { label: 'center', value: 'center' },
  { label: 'flex-end', value: 'flex-end' },
  { label: 'space-between', value: 'space-between' },
  { label: 'space-around', value: 'space-around' },
  { label: 'space-evenly', value: 'space-evenly' },
] as const;

const ALIGN_ITEMS_OPTIONS = [
  { label: 'stretch', value: 'stretch' },
  { label: 'flex-start', value: 'flex-start' },
  { label: 'center', value: 'center' },
  { label: 'flex-end', value: 'flex-end' },
  { label: 'baseline', value: 'baseline' },
] as const;

const OVERFLOW_OPTIONS = [
  { label: 'visible', value: 'visible' },
  { label: 'hidden', value: 'hidden' },
  { label: 'auto', value: 'auto' },
  { label: 'scroll', value: 'scroll' },
] as const;

const FLEX_DIR_ICONS: Record<string, typeof ArrowRight> = {
  row: ArrowRight,
  column: ArrowDown,
  'row-reverse': ArrowLeftRight,
  'column-reverse': ArrowUpDown,
};

const DisplayStyleEditor: React.FC<DisplayStyleEditorProps> = ({
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

  const displayVal = useMemo(
    () => getEffectiveStyleString(value, 'display', computedHints),
    [value, computedHints],
  );
  const isFlex = displayVal.includes('flex');

  const flexDirVal = useMemo(
    () => getEffectiveStyleString(value, 'flexDirection', computedHints),
    [value, computedHints],
  );
  const justifyVal = useMemo(
    () => getEffectiveStyleString(value, 'justifyContent', computedHints),
    [value, computedHints],
  );
  const alignVal = useMemo(
    () => getEffectiveStyleString(value, 'alignItems', computedHints),
    [value, computedHints],
  );
  const gapVal = useMemo(
    () => getEffectiveStyleString(value, 'gap', computedHints),
    [value, computedHints],
  );
  const overflowVal = useMemo(
    () => getEffectiveStyleString(value, 'overflow', computedHints),
    [value, computedHints],
  );

  const FlexDirIcon = useMemo(() => FLEX_DIR_ICONS[flexDirVal] ?? ArrowRight, [flexDirVal]);

  return (
    <div className="display-style-editor">
      <section className="display-style-editor__card">
        <h3 className="display-style-editor__heading">布局模式</h3>

        <div className="display-style-editor__stack">
          <label className="display-style-editor__field">
            <span className="display-style-editor__label">display</span>
            <Select
              size="small"
              clearable
              disabled={!!readOnly}
              placeholder="默认"
              options={[...DISPLAY_OPTIONS]}
              value={displayVal || undefined}
              onChange={(v) => patch({ display: v != null && v !== '' ? String(v) : undefined })}
            />
          </label>

          {isFlex ? (
            <section className="display-style-editor__flex-sub">
              <h4 className="display-style-editor__subheading">Flex 布局</h4>
              <div className="display-style-editor__form display-style-editor__form--flex">
                <label className="display-style-editor__field">
                  <span className="display-style-editor__label">flex-direction</span>
                  <div className="display-style-editor__dir-row">
                    <span className="display-style-editor__dir-icon" aria-hidden>
                      <FlexDirIcon size={16} strokeWidth={2} />
                    </span>
                    <Select
                      size="small"
                      clearable
                      disabled={!!readOnly}
                      placeholder="默认"
                      className="display-style-editor__dir-select"
                      options={[...FLEX_DIRECTION_OPTIONS]}
                      value={flexDirVal || undefined}
                      onChange={(v) => patch({ flexDirection: v != null && v !== '' ? String(v) : undefined })}
                    />
                  </div>
                </label>
                <label className="display-style-editor__field">
                  <span className="display-style-editor__label">justify-content</span>
                  <Select
                    size="small"
                    clearable
                    disabled={!!readOnly}
                    placeholder="默认"
                    options={[...JUSTIFY_OPTIONS]}
                    value={justifyVal || undefined}
                    onChange={(v) => patch({ justifyContent: v != null && v !== '' ? String(v) : undefined })}
                  />
                </label>
                <label className="display-style-editor__field display-style-editor__field--full">
                  <span className="display-style-editor__label">align-items</span>
                  <Select
                    size="small"
                    clearable
                    disabled={!!readOnly}
                    placeholder="默认"
                    options={[...ALIGN_ITEMS_OPTIONS]}
                    value={alignVal || undefined}
                    onChange={(v) => patch({ alignItems: v != null && v !== '' ? String(v) : undefined })}
                  />
                </label>
              </div>
            </section>
          ) : null}

          <div className="display-style-editor__form display-style-editor__form--tail">
            <label className="display-style-editor__field">
              <span className="display-style-editor__label">gap</span>
              <Input
                size="small"
                clearable
                disabled={!!readOnly}
                placeholder="0"
                value={gapVal}
                onChange={(v) => patch({ gap: String(v ?? '').trim() || undefined })}
              />
            </label>
            <label className="display-style-editor__field">
              <span className="display-style-editor__label">overflow</span>
              <Select
                size="small"
                clearable
                disabled={!!readOnly}
                placeholder="默认"
                options={[...OVERFLOW_OPTIONS]}
                value={overflowVal || undefined}
                onChange={(v) => patch({ overflow: v != null && v !== '' ? String(v) : undefined })}
              />
            </label>
          </div>
        </div>
      </section>
    </div>
  );
};

export default React.memo(DisplayStyleEditor);
