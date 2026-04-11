import type { ListRecord } from '../types/component';

export const LIST_TEMPLATE_ALLOWED_TYPES = new Set([
  'Image',
  'Avatar',
  'Icon',
  'Button',
  'Link',
  'Typography.Title',
  'Typography.Paragraph',
  'Typography.Text',
]);

/** 动态列表必须保留的唯一行模板壳，禁止单独删除/剪切；应删除整个 DynamicList 或编辑行模板内子组件 */
export const isDynamicListItemNode = (node: { type?: string } | null | undefined): boolean =>
  node?.type === 'DynamicList.Item';

/**
 * 预览/画布中「根节点或组件暴露」的**核心生命周期**名称（与交互类 onClick/onChange 等区分）。
 *
 * 在预览引擎（PreviewRenderer）中的语义与触发时机（对齐常见 Vue 命名，映射到 React 执行时机）：
 *
 * | 名称 | 分类 | 触发时机（预览） |
 * |------|------|------------------|
 * | onInit | 初始化 | 节点首次挂载时，在本节点对应 DOM 已提交之后、浏览器绘制之前（useLayoutEffect，先于 onMounted） |
 * | onBeforeMount | 挂载 | 紧接 onInit 之后同一 useLayoutEffect 内（命名沿用 Vue，语义接近「挂载阶段早期」） |
 * | onMounted | 挂载 | 首次挂载后在 paint 之后（useEffect；表示「可安全读布局/子节点已挂上」的常见时机） |
 * | onBeforeUpdate | 更新 | 该节点在预览树中的**展示数据**（label / props / 子节点 key 等）发生变化时，在 DOM 提交后、绘制前（useLayoutEffect，先于 onUpdated） |
 * | onUpdated | 更新 | 同上一次数据变更，在 onBeforeUpdate 之后同一轮 layout 中触发（useLayoutEffect；与真实浏览器绘制仍可能有一帧差异） |
 * | onBeforeUnmount | 卸载 | 节点即将从预览树移除前（useEffect 清理阶段，先于 onUnmounted） |
 * | onUnmounted | 卸载 | 节点已从预览树移除后（useEffect 清理阶段，在 onBeforeUnmount 之后） |
 *
 * 若节点未配置 `lifetimes` 或为空数组，则默认按上表全部核心生命周期可触发；若显式配置了 `lifetimes`，则**仅**触发列表中的项。
 */
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