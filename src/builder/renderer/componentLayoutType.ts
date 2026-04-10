import { createContext } from 'react';

/**
 * 组件布局类型：控制组件在 flex column 画布中是否整行宽（block）还是按内容缩（inline）。
 *
 * - block: 容器、布局、块级展示类（Card/Tabs/Table/Divider/Chart 等），默认拉满宽度
 * - inline: 控件、按钮、字段等，默认按内容宽度
 *
 * 规则：新增组件必须在此处注册，否则默认 block（安全侧：不会意外缩窄容器）。
 */
export type ComponentLayoutType = 'block' | 'inline';

const INLINE_TYPES = new Set<string>([
  // ── TDesign 控件 ──
  'Button',
  'Link',
  'Icon',
  'Avatar',
  'Switch',
  'ColorPicker',
  'TimePicker',
  'TimeRangePicker',
  'Input',
  'InputNumber',
  'Statistic',
  'Image',
  'Typography.Text',
  'BackTop',
  // Progress：TDesign 根节点在 inline 下不会自动拉满，需 block 与 antd 一致占一行

  // ── Ant Design 控件 ──
  'antd.Button',
  'antd.Icon',
  'antd.Tag',
  'antd.Badge',
  'antd.Avatar',
  'antd.Switch',
  'antd.ColorPicker',
  'antd.TimePicker',
  'antd.TimeRangePicker',
  'antd.DatePicker',
  'antd.Input',
  'antd.InputNumber',
  'antd.Select',
  'antd.Checkbox',
  'antd.Radio.Group',
  'antd.Dropdown',
  'antd.Popover',
  'antd.Upload',
  'antd.BackTop',
  'antd.Progress',
  'antd.Image',
  'antd.Statistic',
  'antd.Typography.Text',
  'antd.Typography.Link',
]);

export function getComponentLayoutType(type: string): ComponentLayoutType {
  return INLINE_TYPES.has(type) ? 'inline' : 'block';
}

export const ComponentLayoutContext = createContext<ComponentLayoutType>('block');
