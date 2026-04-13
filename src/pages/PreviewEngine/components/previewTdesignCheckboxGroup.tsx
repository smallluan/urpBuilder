import React from 'react';
import { Checkbox } from 'tdesign-react';
import type { UiTreeNode } from '../../../builder/store/types';
import type { DslCheckboxRow } from '../../../builder/utils/checkboxDsl';
import {
  collectDslCheckboxRows,
  coerceCheckboxGroupStoredValue,
  optionsFromCheckboxRows,
  parseCheckboxGroupMax,
  parseCheckboxGroupOptionGap,
  parseCheckboxGroupOptionLayout,
  parseCheckboxLabelAlign,
  checkboxGroupOptionLayoutStyle,
  checkboxGroupValuePropsForReact,
} from '../../../builder/utils/checkboxDsl';
import { normalizeDslBoolean } from '../../../builder/utils/radioDsl';

function getProp(node: UiTreeNode, propName: string): unknown {
  const prop = node?.props?.[propName] as { value?: unknown } | undefined;
  return prop?.value;
}

function getStringProp(node: UiTreeNode, propName: string): string | undefined {
  const v = getProp(node, propName);
  return typeof v === 'string' ? v : undefined;
}

function getBooleanProp(node: UiTreeNode, propName: string): boolean | undefined {
  const v = getProp(node, propName);
  return typeof v === 'boolean' ? v : undefined;
}

function parseJsonRecordArray(raw: string | undefined): Array<Record<string, unknown>> {
  if (!raw?.trim()) {
    return [];
  }
  try {
    const v = JSON.parse(raw) as unknown;
    return Array.isArray(v) ? (v.filter((x) => x && typeof x === 'object') as Array<Record<string, unknown>>) : [];
  } catch {
    return [];
  }
}

type MergeStyle = (base?: React.CSSProperties) => React.CSSProperties | undefined;

/** TDesign 预览：`Checkbox.Group` 与 DSL 一致；子节点 `Checkbox` 优先于 `options` JSON。 */
export function PreviewTdesignCheckboxGroup(props: {
  node: UiTreeNode;
  mergeStyle: MergeStyle;
  emitInteractionLifecycle: (lifetime: string, payload?: unknown) => void;
  renderCheckboxItemChildren?: (checkboxNode: UiTreeNode) => React.ReactNode;
}): React.ReactElement {
  const { node, mergeStyle, emitInteractionLifecycle, renderCheckboxItemChildren } = props;
  const rows = collectDslCheckboxRows(node.children);
  const useChildCheckboxes = rows.length > 0;
  const optsJson = parseJsonRecordArray(getStringProp(node, 'options')).map((o) => ({
    value: o.value as string | number | boolean,
    label: String(o.label ?? o.value ?? ''),
    disabled: o.disabled === true,
  }));
  const opts = useChildCheckboxes ? optionsFromCheckboxRows(rows) : optsJson;
  const controlled = getBooleanProp(node, 'controlled') !== false;
  const valueRaw = getProp(node, 'value');
  const defaultRaw = getProp(node, 'defaultValue');
  const valueResolved = coerceCheckboxGroupStoredValue(valueRaw, opts);
  const defaultVal = coerceCheckboxGroupStoredValue(defaultRaw, opts);
  const valueProps = checkboxGroupValuePropsForReact(controlled, valueResolved, defaultVal);
  const blockPointerForControlled = controlled;

  const groupDisabled = normalizeDslBoolean(getProp(node, 'disabled'));
  const maxProp = parseCheckboxGroupMax(getProp(node, 'max'), opts.length);
  const optionLayout = parseCheckboxGroupOptionLayout(getProp(node, 'optionLayout'));
  const optionGapPx = parseCheckboxGroupOptionGap(getProp(node, 'optionGap'));
  const groupLayoutStyle = checkboxGroupOptionLayoutStyle(optionLayout, optionGapPx);
  const groupLabelAlign = parseCheckboxLabelAlign(getProp(node, 'labelAlign'));
  const checkboxAlignAttr = {
    'data-builder-checkbox-label-align': groupLabelAlign,
  } as const;

  const renderCheckboxLabel = (r: DslCheckboxRow) => {
    const hasKids = (r.node.children?.length ?? 0) > 0;
    if (!hasKids) {
      return null;
    }
    return renderCheckboxItemChildren ? renderCheckboxItemChildren(r.node) : null;
  };

  return (
    <Checkbox.Group
      {...(useChildCheckboxes ? {} : { options: opts as any })}
      {...(valueProps as any)}
      disabled={groupDisabled}
      max={maxProp}
      style={{
        ...(mergeStyle() ?? {}),
        ...(blockPointerForControlled ? { pointerEvents: 'none' as const } : {}),
        ...groupLayoutStyle,
      }}
      onChange={(v) => {
        emitInteractionLifecycle('onChange', { value: v });
      }}
    >
      {useChildCheckboxes
        ? rows.map((r) => (
            <Checkbox key={r.key} value={r.value as any} disabled={r.disabled} {...checkboxAlignAttr}>
              {renderCheckboxLabel(r)}
            </Checkbox>
          ))
        : null}
    </Checkbox.Group>
  );
}
