import type { ListRecord } from '../types/component';

export const LIST_TEMPLATE_ALLOWED_TYPES = new Set([
  'Image',
  'Avatar',
  'Button',
  'Link',
  'Typography.Title',
  'Typography.Paragraph',
  'Typography.Text',
]);

export const CORE_LIFETIMES = [
  'onInit',
  'onBeforeMount',
  'onMounted',
  'onBeforeUpdate',
  'onUpdated',
  'onBeforeUnmount',
  'onUnmounted',
];

export const LIST_PREVIEW_DATA: ListRecord[] = [
  {
    title: '列表项A',
    description: '这是第一条示例数据',
    image: 'https://tdesign.gtimg.com/demo/demo-image-1.png',
    actionText: '查看',
  },
  {
    title: '列表项B',
    description: '这是第二条示例数据',
    image: 'https://tdesign.gtimg.com/demo/demo-image-2.png',
    actionText: '编辑',
  },
];