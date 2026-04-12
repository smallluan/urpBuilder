import React from 'react';
import { Button, Link, BackTop, Progress, Radio } from 'tdesign-react';
import type { ComponentRegistry, ComponentRenderContext } from '../componentContext';
import { ActivateWrapper } from '../componentHelpers';
import { renderNamedIcon } from '../../../constants/iconRegistry';
import DropArea from '../../../components/DropArea';
import {
  collectDslRadioRows,
  coerceRadioGroupStoredValue,
  normalizeDslBoolean,
  optionsFromRadioRows,
  radioGroupValuePropsForReact,
} from '../../utils/radioDsl';

function parseJsonRecordArray(raw: string | undefined): Array<Record<string, unknown>> {
  if (!raw?.trim()) {
    return [];
  }
  try {
    const v = JSON.parse(raw) as unknown;
    return Array.isArray(v) ? v.filter((x) => x && typeof x === 'object') : [];
  } catch {
    return [];
  }
}

function BuilderTdesignRadioGroup(props: { ctx: ComponentRenderContext }) {
  const {
    getStringProp,
    getBooleanProp,
    getProp,
    mergeStyle,
    handleActivateSelf,
    data,
    isNodeActive,
    onDropData,
  } = props.ctx;
  const rows = collectDslRadioRows(data?.children);
  const useChildRadios = rows.length > 0;
  const optsJson = parseJsonRecordArray(getStringProp('options')).map((o) => ({
    value: o.value as string | number | boolean,
    label: String(o.label ?? o.value ?? ''),
    disabled: o.disabled === true,
  }));
  const opts = useChildRadios ? optionsFromRadioRows(rows) : optsJson;
  const controlled = getBooleanProp('controlled') !== false;
  const valueRaw = getProp('value');
  const defaultRaw = getProp('defaultValue');
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
  const isButton = getStringProp('theme') === 'button';
  const Btn = Radio.Button;
  /** TDesign：可取消选中仅对非受控生效（与组件库一致） */
  const allowUncheck = !controlled && normalizeDslBoolean(getProp('allowUncheck'));
  const blockPointerForControlled = controlled;
  const groupDisabled = normalizeDslBoolean(getProp('disabled'));
  return (
    <DropArea
      data={data}
      onDropData={onDropData}
      emptyText="拖入单选项（Radio）"
      compactWhenFilled
      isTreeNode
    >
      <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf} nodeKey={data?.key} active={isNodeActive}>
        <Radio.Group
          {...(useChildRadios ? {} : { options: opts })}
          {...valueProps}
          theme={isButton ? 'button' : 'radio'}
          variant={(getStringProp('variant') as 'outline' | 'primary-filled' | 'default-filled') ?? 'outline'}
          disabled={groupDisabled}
          allowUncheck={allowUncheck}
          style={mergeStyle(blockPointerForControlled ? { pointerEvents: 'none' } : undefined)}
        >
          {useChildRadios
            ? rows.map((r) =>
                isButton ? (
                  <Btn key={r.key} value={r.value} disabled={r.disabled}>
                    {r.label}
                  </Btn>
                ) : (
                  <Radio key={r.key} value={r.value} disabled={r.disabled}>
                    {r.label}
                  </Radio>
                ),
              )
            : null}
        </Radio.Group>
      </ActivateWrapper>
    </DropArea>
  );
}

export function registerBasicComponents(registry: ComponentRegistry): void {
  registry.set('Button', (ctx) => {
    const { getStringProp, getBooleanProp, mergeStyle, handleActivateSelf, data, isNodeActive } = ctx;
    const isBlockButton = getBooleanProp('block') === true;
    const prefixIcon = renderNamedIcon(getStringProp('prefixIconName'));
    const suffixIcon = renderNamedIcon(getStringProp('suffixIconName'));
    return (
      <ActivateWrapper
        style={mergeStyle(isBlockButton ? { width: '100%' } : undefined)}
        onActivate={handleActivateSelf}
        nodeKey={data?.key}
        active={isNodeActive}
      >
        <Button
          theme={getStringProp('theme') as any}
          shape={getStringProp('shape') as any}
          size={getStringProp('size') as any}
          variant={getStringProp('variant') as any}
          icon={prefixIcon as any}
          suffix={suffixIcon as any}
          block={isBlockButton}
          style={mergeStyle(isBlockButton ? { width: '100%', display: 'flex' } : undefined)}
        >
          {getStringProp('content')}
        </Button>
      </ActivateWrapper>
    );
  });

  registry.set('Link', (ctx) => {
    const { getStringProp, getBooleanProp, mergeStyle, handleActivateSelf, data, isNodeActive } = ctx;
    const prefixIcon = renderNamedIcon(getStringProp('prefixIconName'));
    const suffixIcon = renderNamedIcon(getStringProp('suffixIconName'));
    return (
      <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf} nodeKey={data?.key} active={isNodeActive}>
        <Link
          content={getStringProp('content')}
          href={getStringProp('href') || undefined}
          target={getStringProp('target') || undefined}
          theme={getStringProp('theme') as any}
          size={getStringProp('size') as any}
          hover={getStringProp('hover') as any}
          prefixIcon={prefixIcon as any}
          suffixIcon={suffixIcon as any}
          underline={getBooleanProp('underline')}
          disabled={getBooleanProp('disabled')}
          onClick={(event) => { event.preventDefault(); }}
        />
      </ActivateWrapper>
    );
  });

  registry.set('Icon', (ctx) => {
    const { getStringProp, getNumberProp, mergeStyle, handleActivateSelf, data, isNodeActive } = ctx;
    const iconNode = renderNamedIcon(getStringProp('iconName'), {
      size: getNumberProp('size') ?? 16,
      strokeWidth: getNumberProp('strokeWidth') ?? 2,
    });
    return (
      <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf} nodeKey={data?.key} active={isNodeActive}>
        {iconNode}
      </ActivateWrapper>
    );
  });

  registry.set('BackTop', (ctx) => {
    const {
      getStringProp, getFiniteNumberProp, mergeStyle, handleActivateSelf, data, isNodeActive,
      getBackTopOffsetProp, getBackTopContainerProp, getBackTopTargetProp,
      getBackTopVisibleHeightProp, getBackTopContentNode,
    } = ctx;
    return (
      <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf} nodeKey={data?.key} active={isNodeActive}>
        <BackTop
          className="builder-back-top"
          content={getBackTopContentNode()}
          duration={getFiniteNumberProp('duration')}
          offset={getBackTopOffsetProp('offset') as any}
          shape={getStringProp('shape') as any}
          size={getStringProp('size') as any}
          target={getBackTopTargetProp('target') as any}
          container={getBackTopContainerProp() as any}
          theme={getStringProp('theme') as any}
          visibleHeight={getBackTopVisibleHeightProp('visibleHeight') as any}
          style={mergeStyle()}
        />
      </ActivateWrapper>
    );
  });

  registry.set('Radio.Group', (ctx) => <BuilderTdesignRadioGroup ctx={ctx} />);

  registry.set('Progress', (ctx) => {
    const {
      getStringProp, getFiniteNumberProp, mergeStyle, handleActivateSelf, data, isNodeActive,
      getProgressColorProp, getProgressLabelProp, getProgressSizeProp, getProgressStatusProp,
    } = ctx;
    return (
      <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf} nodeKey={data?.key} active={isNodeActive}>
        <Progress
          className={getStringProp('className') || undefined}
          color={getProgressColorProp('color') as any}
          label={getProgressLabelProp() as any}
          percentage={getFiniteNumberProp('percentage') ?? 0}
          size={getProgressSizeProp('size') as any}
          status={getProgressStatusProp() as any}
          strokeWidth={getProgressSizeProp('strokeWidth') as any}
          theme={getStringProp('theme') as any}
          trackColor={getStringProp('trackColor') || undefined}
          style={mergeStyle()}
        />
      </ActivateWrapper>
    );
  });
}
