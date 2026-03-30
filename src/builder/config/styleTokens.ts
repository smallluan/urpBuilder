/**
 * 样式 Tab 可选语义色（写入 __style 仍为 CSS 字符串，如 var(--td-*)）
 */
export type StyleTokenItem = { label: string; value: string };

export type StyleTokenGroup = { id: string; title: string; items: StyleTokenItem[] };

export const STYLE_TOKEN_GROUPS: StyleTokenGroup[] = [
  {
    id: 'bg',
    title: '背景 / 表面',
    items: [
      { label: '页面底', value: 'var(--td-bg-color-page)' },
      { label: '容器', value: 'var(--td-bg-color-container)' },
      { label: '次级容器', value: 'var(--td-bg-color-secondarycontainer)' },
      { label: '组件描边区', value: 'var(--td-bg-color-component)' },
      { label: '品牌浅色', value: 'var(--td-brand-color-1)' },
    ],
  },
  {
    id: 'text',
    title: '文字',
    items: [
      { label: '主色', value: 'var(--td-text-color-primary)' },
      { label: '次要', value: 'var(--td-text-color-secondary)' },
      { label: '占位', value: 'var(--td-text-color-placeholder)' },
      { label: '反色', value: 'var(--td-text-color-anti)' },
      { label: '品牌色', value: 'var(--td-brand-color)' },
    ],
  },
  {
    id: 'border',
    title: '边框 / 分割',
    items: [
      { label: '组件边框', value: 'var(--td-component-border)' },
      { label: '分割线', value: 'var(--td-gray-color-11)' },
    ],
  },
];

export const STYLE_TOKEN_HINT =
  '语义色会随页面/运行环境主题变化；固定十六进制颜色不随主题切换。';
