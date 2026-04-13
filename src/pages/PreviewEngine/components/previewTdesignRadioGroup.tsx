import React from 'react';
import { Radio } from 'tdesign-react';
import type { UiTreeNode } from '../../../builder/store/types';
import type { DslRadioRow } from '../../../builder/utils/radioDsl';
import {
  collectDslRadioRows,
  coerceRadioGroupStoredValue,
  normalizeDslBoolean,
  optionsFromRadioRows,
  parseRadioGroupOptionGap,
  parseRadioGroupOptionLayout,
  parseRadioLabelAlign,
  radioGroupOptionLayoutStyle,
  radioGroupValuePropsForReact,
} from '../../../builder/utils/radioDsl';

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

/** TDesign 预览：`Radio.Group` 与 DSL 一致；子节点 `Radio` 优先于 `options` JSON。 */
export function PreviewTdesignRadioGroup(props: {
  node: UiTreeNode;
  mergeStyle: MergeStyle;
  emitInteractionLifecycle: (lifetime: string, payload?: unknown) => void;
  renderRadioItemChildren?: (radioNode: UiTreeNode) => React.ReactNode;
}): React.ReactElement {
  const { node, mergeStyle, emitInteractionLifecycle, renderRadioItemChildren } = props;
  const rows = collectDslRadioRows(node.children);
  const useChildRadios = rows.length > 0;
  const optsJson = parseJsonRecordArray(getStringProp(node, 'options')).map((o) => ({
    value: o.value as string | number | boolean,
    label: String(o.label ?? o.value ?? ''),
    disabled: o.disabled === true,
  }));
  const opts = useChildRadios ? optionsFromRadioRows(rows) : optsJson;
  const controlled = getBooleanProp(node, 'controlled') !== false;
  const valueRaw = getProp(node, 'value');
  const defaultRaw = getProp(node, 'defaultValue');
  const firstVal = opts[0]?.value;
  const defaultValRaw =
    defaultRaw !== undefined && defaultRaw !== null
      ? defaultRaw
      : valueRaw !== undefined && valueRaw !== null
        ? valueRaw
        : firstVal;
  const valueResolved = coerceRadioGroupStoredValue(valueRaw, opts);
  const defaultVal = coerceRadioGroupStoredValue(defaultValRaw, opts) ?? defaultValRaw;
  const valueProps = radioGroupValuePropsForReact(controlled, valueResolved, defaultVal as string | number | boolean | undefined);
  /** 与 TDesign 一致：仅非受控时「可取消选中」生效 */
  const allowUncheck = !controlled && normalizeDslBoolean(getProp(node, 'allowUncheck'));
  const blockPointerForControlled = controlled;

  const isButton = getStringProp(node, 'theme') === 'button';
  const Btn = Radio.Button;
  const optionLayout = parseRadioGroupOptionLayout(getProp(node, 'optionLayout'));
  const optionGapPx = parseRadioGroupOptionGap(getProp(node, 'optionGap'));
  const groupLayoutStyle = radioGroupOptionLayoutStyle(optionLayout, optionGapPx);
  const groupLabelAlign = parseRadioLabelAlign(getProp(node, 'labelAlign'));
  const radioAlignAttr = {
    'data-builder-radio-label-align': groupLabelAlign,
  } as const;

  const renderRadioLabel = (r: DslRadioRow) => {
    const hasKids = (r.node.children?.length ?? 0) > 0;
    if (!hasKids) {
      return null;
    }
    return renderRadioItemChildren ? renderRadioItemChildren(r.node) : null;
  };

  return (
    <Radio.Group
      {...(useChildRadios ? {} : { options: opts })}
      {...valueProps}
      theme={isButton ? 'button' : 'radio'}
      variant={
        (getStringProp(node, 'variant') as 'outline' | 'primary-filled' | 'default-filled' | undefined) ?? 'outline'
      }
      disabled={normalizeDslBoolean(getProp(node, 'disabled'))}
      allowUncheck={allowUncheck}
      style={{
        ...(mergeStyle() ?? {}),
        ...(blockPointerForControlled ? { pointerEvents: 'none' as const } : {}),
        ...groupLayoutStyle,
      }}
      onChange={(v) => {
        emitInteractionLifecycle('onChange', { value: v });
      }}
    >
      {useChildRadios
        ? rows.map((r) =>
            isButton ? (
              <Btn key={r.key} value={r.value} disabled={r.disabled} {...radioAlignAttr}>
                {renderRadioLabel(r)}
              </Btn>
            ) : (
              <Radio key={r.key} value={r.value} disabled={r.disabled} {...radioAlignAttr}>
                {renderRadioLabel(r)}
              </Radio>
            ),
          )
        : null}
    </Radio.Group>
  );
}
