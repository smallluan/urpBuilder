import React, { useCallback, useEffect, useState } from 'react';
import { Input } from 'tdesign-react';
import type { InputProps } from 'tdesign-react/es/input/Input';

export type BuilderTdesignInputFieldProps = Omit<InputProps, 'value' | 'defaultValue' | 'onChange'> & {
  /** DSL「受控模式」：与 props.controlled 一致 */
  dslControlled: boolean;
  /** 受控时为 `value`；非受控时为 `defaultValue` 的展示字符串 */
  dslValue: string;
  /** 第二参数为 TDesign `onChange` 的 context（预览里用于 lifetimes） */
  onDslChange: (nextValue: string, context?: unknown) => void;
};

/**
 * TDesign `Input` 内部用 `useLengthLimit`：仅当设置了 `maxlength` 或 `maxcharacter` 之一时，`limitNumber` 才非空，
 * `showLimitNumber` 才会渲染计数节点。仅打开「显示字数」而未设上限时，用 `suffix` 显示当前字数（与 antd 侧「无上限仍显示计数」对齐）。
 */
export const BuilderTdesignInputField: React.FC<BuilderTdesignInputFieldProps> = ({
  dslControlled,
  dslValue,
  onDslChange,
  showLimitNumber,
  maxlength,
  maxcharacter,
  suffix: suffixFromProps,
  ...rest
}) => {
  const hasMax =
    (typeof maxlength === 'number' && maxlength > 0) || (typeof maxcharacter === 'number' && maxcharacter > 0);
  const showNativeLimit = Boolean(showLimitNumber && hasMax);
  const showSuffixOnly = Boolean(showLimitNumber && !hasMax);

  const [suffixCount, setSuffixCount] = useState(() => String(dslValue ?? '').length);

  useEffect(() => {
    setSuffixCount(String(dslValue ?? '').length);
  }, [dslValue]);

  const handleChange = useCallback<NonNullable<InputProps['onChange']>>(
    (val, context) => {
      if (showSuffixOnly) {
        setSuffixCount(String(val ?? '').length);
      }
      onDslChange(String(val ?? ''), context);
    },
    [onDslChange, showSuffixOnly],
  );

  const suffixNode =
    showSuffixOnly ? (
      <span style={{ fontSize: 12, color: 'rgba(0, 0, 0, 0.45)', whiteSpace: 'nowrap' }}>{suffixCount}</span>
    ) : (
      suffixFromProps
    );

  return (
    <Input
      {...rest}
      value={dslControlled ? dslValue : undefined}
      defaultValue={dslControlled ? undefined : dslValue}
      maxlength={maxlength}
      maxcharacter={maxcharacter}
      showLimitNumber={showNativeLimit}
      suffix={suffixNode}
      onChange={handleChange}
    />
  );
};
