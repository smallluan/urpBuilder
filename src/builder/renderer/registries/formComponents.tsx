import { Switch, ColorPicker, TimePicker, TimeRangePicker, Input, Textarea, InputNumber, Slider, Space } from 'tdesign-react';
import type { ComponentRegistry } from '../componentContext';
import { ActivateWrapper } from '../componentHelpers';

export function registerFormComponents(registry: ComponentRegistry): void {
  registry.set('Switch', (ctx) => {
    const { getStringProp, getBooleanProp, mergeStyle, handleActivateSelf, data, isNodeActive } = ctx;
    const isControlled = getBooleanProp('controlled') !== false;
    const controlledValue = Boolean(getBooleanProp('value'));
    const defaultValue = Boolean(getBooleanProp('defaultValue'));
    return (
      <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf} nodeKey={data?.key} active={isNodeActive}>
        {/* <Space align="center" size={8}> */}
          <Switch
            size={getStringProp('size') as any}
            value={isControlled ? controlledValue : undefined}
            defaultValue={isControlled ? undefined : defaultValue}
            onChange={() => { /* 搭建态仅展示 */ }}
          />
        {/* </Space> */}
      </ActivateWrapper>
    );
  });

  registry.set('ColorPicker', (ctx) => {
    const { getStringProp, getBooleanProp, mergeStyle, handleActivateSelf, data, isNodeActive } = ctx;
    const isControlled = getBooleanProp('controlled') !== false;
    return (
      <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf} nodeKey={data?.key} active={isNodeActive}>
        <ColorPicker
          format={getStringProp('format') as any}
          value={isControlled ? (getStringProp('value') || undefined) : undefined}
          defaultValue={isControlled ? undefined : (getStringProp('defaultValue') || undefined)}
          clearable={getBooleanProp('clearable')}
          borderless={getBooleanProp('borderless')}
          disabled={getBooleanProp('disabled')}
          enableAlpha={getBooleanProp('enableAlpha')}
          showPrimaryColorPreview={getBooleanProp('showPrimaryColorPreview')}
          style={mergeStyle()}
        />
      </ActivateWrapper>
    );
  });

  registry.set('TimePicker', (ctx) => {
    const { getStringProp, getBooleanProp, mergeStyle, handleActivateSelf, data, isNodeActive, getTimeStepsProp } = ctx;
    const isControlled = getBooleanProp('controlled') !== false;
    return (
      <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf} nodeKey={data?.key} active={isNodeActive}>
        <TimePicker
          format={getStringProp('format') || 'HH:mm:ss'}
          value={isControlled ? (getStringProp('value') || undefined) : undefined}
          defaultValue={isControlled ? undefined : (getStringProp('defaultValue') || undefined)}
          placeholder={getStringProp('placeholder') || undefined}
          size={getStringProp('size') as any}
          status={getStringProp('status') as any}
          steps={getTimeStepsProp() as any}
          allowInput={getBooleanProp('allowInput')}
          borderless={getBooleanProp('borderless')}
          clearable={getBooleanProp('clearable')}
          disabled={getBooleanProp('disabled')}
          hideDisabledTime={getBooleanProp('hideDisabledTime')}
          style={mergeStyle()}
        />
      </ActivateWrapper>
    );
  });

  registry.set('TimeRangePicker', (ctx) => {
    const {
      getStringProp, getBooleanProp, mergeStyle, handleActivateSelf, data, isNodeActive,
      getTimeStepsProp, getTimeRangeValueProp,
    } = ctx;
    const isControlled = getBooleanProp('controlled') !== false;
    const value = getTimeRangeValueProp('value');
    const defaultValue = getTimeRangeValueProp('defaultValue');
    const placeholderStart = getStringProp('placeholderStart');
    const placeholderEnd = getStringProp('placeholderEnd');
    const placeholder = placeholderStart || placeholderEnd
      ? [placeholderStart || '开始时间', placeholderEnd || '结束时间']
      : undefined;
    return (
      <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf} nodeKey={data?.key} active={isNodeActive}>
        <TimeRangePicker
          format={getStringProp('format') || 'HH:mm:ss'}
          value={isControlled ? (value as any) : undefined}
          defaultValue={isControlled ? undefined : (defaultValue as any)}
          placeholder={placeholder as any}
          size={getStringProp('size') as any}
          status={getStringProp('status') as any}
          steps={getTimeStepsProp() as any}
          allowInput={getBooleanProp('allowInput')}
          autoSwap={getBooleanProp('autoSwap')}
          borderless={getBooleanProp('borderless')}
          clearable={getBooleanProp('clearable')}
          disabled={getBooleanProp('disabled')}
          hideDisabledTime={getBooleanProp('hideDisabledTime')}
          style={mergeStyle()}
        />
      </ActivateWrapper>
    );
  });

  registry.set('Input', (ctx) => {
    const { getStringProp, getBooleanProp, getFiniteNumberProp, mergeStyle, handleActivateSelf, data, isNodeActive } = ctx;
    const isControlled = getBooleanProp('controlled') !== false;
    const inputValueProps = isControlled
      ? { value: getStringProp('value') || undefined }
      : { defaultValue: getStringProp('defaultValue') || undefined };
    return (
      <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf} nodeKey={data?.key} active={isNodeActive}>
        <Input
          {...inputValueProps}
          className={getStringProp('className') || undefined}
          align={getStringProp('align') as any}
          allowInputOverMax={getBooleanProp('allowInputOverMax')}
          autoWidth={getBooleanProp('autoWidth')}
          autocomplete={getStringProp('autocomplete') || undefined}
          autofocus={getBooleanProp('autofocus')}
          borderless={getBooleanProp('borderless')}
          placeholder={getStringProp('placeholder') || undefined}
          size={getStringProp('size') as any}
          status={getStringProp('status') as any}
          clearable={getBooleanProp('clearable')}
          disabled={getBooleanProp('disabled')}
          readonly={getBooleanProp('readOnly') ?? getBooleanProp('readonly')}
          maxcharacter={getFiniteNumberProp('maxcharacter') as any}
          maxlength={getFiniteNumberProp('maxlength') as any}
          name={getStringProp('name') || undefined}
          showClearIconOnEmpty={getBooleanProp('showClearIconOnEmpty')}
          showLimitNumber={getBooleanProp('showLimitNumber')}
          spellCheck={getBooleanProp('spellCheck')}
          tips={getStringProp('tips') || undefined}
          type={getStringProp('type') as any}
          style={mergeStyle()}
        />
      </ActivateWrapper>
    );
  });

  registry.set('Textarea', (ctx) => {
    const {
      getStringProp, getBooleanProp, getFiniteNumberProp, mergeStyle, handleActivateSelf, data, isNodeActive,
      getTextareaStyleProp, getTextareaAutosizeProp,
    } = ctx;
    const isControlled = getBooleanProp('controlled') !== false;
    const textareaValueProps = isControlled
      ? { value: getStringProp('value') || undefined }
      : { defaultValue: getStringProp('defaultValue') || undefined };
    const textareaStyle = getTextareaStyleProp();
    const mergedTextareaStyle = textareaStyle ? { ...mergeStyle(), ...textareaStyle } : mergeStyle();
    return (
      <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf} nodeKey={data?.key} active={isNodeActive}>
        <Textarea
          {...textareaValueProps}
          className={getStringProp('className') || undefined}
          allowInputOverMax={getBooleanProp('allowInputOverMax')}
          autofocus={getBooleanProp('autofocus')}
          count={getBooleanProp('count')}
          placeholder={getStringProp('placeholder') || undefined}
          status={getStringProp('status') as any}
          disabled={getBooleanProp('disabled')}
          readonly={getBooleanProp('readOnly') ?? getBooleanProp('readonly')}
          maxcharacter={getFiniteNumberProp('maxcharacter') as any}
          maxlength={getFiniteNumberProp('maxlength') as any}
          name={getStringProp('name') || undefined}
          tips={getStringProp('tips') || undefined}
          autosize={getTextareaAutosizeProp()}
          style={mergedTextareaStyle}
        />
      </ActivateWrapper>
    );
  });

  registry.set('InputNumber', (ctx) => {
    const {
      getStringProp, getBooleanProp, getFiniteNumberProp, mergeStyle, handleActivateSelf, data, isNodeActive,
      getInputNumberValueProp,
    } = ctx;
    const isControlled = getBooleanProp('controlled') !== false;
    return (
      <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf} nodeKey={data?.key} active={isNodeActive}>
        <InputNumber
          value={isControlled ? getInputNumberValueProp('value') as any : undefined}
          defaultValue={isControlled ? undefined : getInputNumberValueProp('defaultValue') as any}
          min={getInputNumberValueProp('min') as any}
          max={getInputNumberValueProp('max') as any}
          step={getInputNumberValueProp('step') as any}
          decimalPlaces={getFiniteNumberProp('decimalPlaces') as any}
          placeholder={getStringProp('placeholder') || undefined}
          size={getStringProp('size') as any}
          status={getStringProp('status') as any}
          align={getStringProp('align') as any}
          theme={getStringProp('theme') as any}
          allowInputOverLimit={getBooleanProp('allowInputOverLimit')}
          autoWidth={getBooleanProp('autoWidth')}
          disabled={getBooleanProp('disabled')}
          readOnly={getBooleanProp('readOnly')}
          largeNumber={getBooleanProp('largeNumber')}
          style={mergeStyle()}
        />
      </ActivateWrapper>
    );
  });

  registry.set('Slider', (ctx) => {
    const {
      getStringProp, getBooleanProp, getFiniteNumberProp, mergeStyle, handleActivateSelf, data, isNodeActive,
      getSliderValueProp,
    } = ctx;
    const isControlled = getBooleanProp('controlled') !== false;
    const isRange = getBooleanProp('range') === true;
    const min = getFiniteNumberProp('min') ?? 0;
    const max = getFiniteNumberProp('max') ?? 100;
    const rawValue = getSliderValueProp('value');
    const rawDefaultValue = getSliderValueProp('defaultValue');

    const value = isRange
      ? (Array.isArray(rawValue) ? rawValue : (typeof rawValue === 'number' ? [rawValue, rawValue] : [min, min]))
      : (Array.isArray(rawValue) ? rawValue[0] : (typeof rawValue === 'number' ? rawValue : min));
    const defaultValue = isRange
      ? (Array.isArray(rawDefaultValue) ? rawDefaultValue : (typeof rawDefaultValue === 'number' ? [rawDefaultValue, rawDefaultValue] : [min, min]))
      : (Array.isArray(rawDefaultValue) ? rawDefaultValue[0] : (typeof rawDefaultValue === 'number' ? rawDefaultValue : min));

    const sliderValueProps = isControlled ? { value: value as any } : { defaultValue: defaultValue as any };
    return (
      <ActivateWrapper style={mergeStyle()} onActivate={handleActivateSelf} nodeKey={data?.key} active={isNodeActive}>
        <Slider
          {...sliderValueProps}
          layout={getStringProp('layout') as any}
          min={min}
          max={max}
          step={getFiniteNumberProp('step')}
          range={isRange}
          disabled={getBooleanProp('disabled')}
          onChange={() => { /* 搭建态仅展示 */ }}
          style={mergeStyle()}
        />
      </ActivateWrapper>
    );
  });
}
