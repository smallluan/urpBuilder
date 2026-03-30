import type { SelectOption } from 'tdesign-react';

const opt = (label: string, value: string): SelectOption => ({ label, value });

export const DISPLAY_OPTIONS: SelectOption[] = [
  opt('默认', ''),
  opt('block', 'block'),
  opt('flex', 'flex'),
  opt('inline-flex', 'inline-flex'),
  opt('grid', 'grid'),
  opt('inline', 'inline'),
  opt('inline-block', 'inline-block'),
  opt('none', 'none'),
];

export const FLEX_DIRECTION_OPTIONS: SelectOption[] = [
  opt('默认', ''),
  opt('row', 'row'),
  opt('row-reverse', 'row-reverse'),
  opt('column', 'column'),
  opt('column-reverse', 'column-reverse'),
];

export const JUSTIFY_CONTENT_OPTIONS: SelectOption[] = [
  opt('默认', ''),
  opt('flex-start', 'flex-start'),
  opt('center', 'center'),
  opt('flex-end', 'flex-end'),
  opt('space-between', 'space-between'),
  opt('space-around', 'space-around'),
  opt('space-evenly', 'space-evenly'),
];

export const ALIGN_ITEMS_OPTIONS: SelectOption[] = [
  opt('默认', ''),
  opt('stretch', 'stretch'),
  opt('flex-start', 'flex-start'),
  opt('center', 'center'),
  opt('flex-end', 'flex-end'),
  opt('baseline', 'baseline'),
];

export const FLEX_WRAP_OPTIONS: SelectOption[] = [
  opt('默认', ''),
  opt('nowrap', 'nowrap'),
  opt('wrap', 'wrap'),
  opt('wrap-reverse', 'wrap-reverse'),
];

export const OVERFLOW_OPTIONS: SelectOption[] = [
  opt('默认', ''),
  opt('visible', 'visible'),
  opt('hidden', 'hidden'),
  opt('scroll', 'scroll'),
  opt('auto', 'auto'),
];

export const BORDER_STYLE_OPTIONS: SelectOption[] = [
  opt('默认', ''),
  opt('none', 'none'),
  opt('solid', 'solid'),
  opt('dashed', 'dashed'),
  opt('dotted', 'dotted'),
];

export const TEXT_ALIGN_OPTIONS: SelectOption[] = [
  opt('默认', ''),
  opt('left', 'left'),
  opt('center', 'center'),
  opt('right', 'right'),
  opt('justify', 'justify'),
];

export const TEXT_DECORATION_OPTIONS: SelectOption[] = [
  opt('默认', ''),
  opt('none', 'none'),
  opt('underline', 'underline'),
  opt('line-through', 'line-through'),
];

export const FONT_WEIGHT_OPTIONS: SelectOption[] = [
  opt('默认', ''),
  opt('400', '400'),
  opt('500', '500'),
  opt('600', '600'),
  opt('700', '700'),
];
