import React, { useMemo } from 'react';
import { Select, type SelectOption } from 'tdesign-react';
import { STYLE_TOKEN_GROUPS } from '../../config/styleTokens';

const buildGroupedOptions = (): SelectOption[] =>
  STYLE_TOKEN_GROUPS.map((g) => ({
    group: g.title,
    children: g.items.map((item) => ({ label: item.label, value: item.value })),
  }));

export interface StyleTokenSelectProps {
  size?: 'small' | 'medium' | 'large';
  placeholder?: string;
  disabled?: boolean;
  onPick: (cssValue: string) => void;
}

/** 选中文本后写入对应 style 字段 */
const StyleTokenSelect: React.FC<StyleTokenSelectProps> = ({
  size = 'small',
  placeholder = '插入语义色',
  disabled,
  onPick,
}) => {
  const options = useMemo(buildGroupedOptions, []);

  return (
    <Select
      size={size}
      clearable
      placeholder={placeholder}
      disabled={disabled}
      options={options}
      value={undefined}
      onChange={(v) => {
        const s = String(v ?? '').trim();
        if (s) {
          onPick(s);
        }
      }}
    />
  );
};

export default React.memo(StyleTokenSelect);
