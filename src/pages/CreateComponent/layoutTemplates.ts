import cloneDeep from 'lodash/cloneDeep';
import componentCatalog from '../../config/componentCatalog';
import { toUiTreeNode } from '../../utils/createComponentTree';
import type { UiTreeNode } from './store/type';
import type { BuiltInLayoutTemplateId } from '../BuilderCore/store/types';

// BuiltInLayoutTemplateId 已迁移至 BuilderCore，此处保持向后兼容的再导出
export type { BuiltInLayoutTemplateId } from '../BuilderCore/store/types';

interface LayoutTemplateNodeSchema {
  type: string;
  children?: LayoutTemplateNodeSchema[];
}

export interface BuiltInLayoutTemplate {
  id: BuiltInLayoutTemplateId;
  name: string;
  description: string;
  previewLines: string[];
  schema: LayoutTemplateNodeSchema[];
}

const componentCatalogMap = new Map(
  componentCatalog
    .filter((item) => !!item.type)
    .map((item) => [String(item.type), item]),
);

const createTemplateNode = (schema: LayoutTemplateNodeSchema): UiTreeNode => {
  const componentSchema = componentCatalogMap.get(schema.type);
  if (!componentSchema) {
    throw new Error(`未在组件目录中找到布局组件：${schema.type}`);
  }

  const node = toUiTreeNode(cloneDeep(componentSchema) as Record<string, unknown>);
  const templateChildren = schema.children?.map((child) => createTemplateNode(child)) ?? [];
  if (!templateChildren.length) {
    return node;
  }

  return {
    ...node,
    children: templateChildren,
  };
};

export const BUILT_IN_LAYOUT_TEMPLATES: BuiltInLayoutTemplate[] = [
  {
    id: 'header-body',
    name: 'Header + Body',
    description: '顶部导航 + 主内容区，最常见的单栏页面结构。',
    previewLines: ['Header', 'Body'],
    schema: [
      {
        type: 'Layout',
        children: [
          { type: 'Layout.Header' },
          { type: 'Layout.Content' },
        ],
      },
    ],
  },
  {
    id: 'header-aside-body',
    name: 'Header + Aside + Body',
    description: '顶部导航 + 左侧边栏 + 主内容区，适合后台类页面。',
    previewLines: ['Header', 'Aside | Body'],
    schema: [
      {
        type: 'Layout',
        children: [
          { type: 'Layout.Header' },
          {
            type: 'Layout',
            children: [
              { type: 'Layout.Aside' },
              { type: 'Layout.Content' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'header-body-footer',
    name: 'Header + Body + Footer',
    description: '顶部导航 + 主内容 + 底部区域，适合官网/展示页。',
    previewLines: ['Header', 'Body', 'Footer'],
    schema: [
      {
        type: 'Layout',
        children: [
          { type: 'Layout.Header' },
          { type: 'Layout.Content' },
          { type: 'Layout.Footer' },
        ],
      },
    ],
  },
  {
    id: 'header-aside-body-footer',
    name: 'Header + Aside + Body + Footer',
    description: '完整框架：顶部 + 侧栏 + 内容 + 底部，适合复杂管理页。',
    previewLines: ['Header', 'Aside | Body', 'Footer'],
    schema: [
      {
        type: 'Layout',
        children: [
          { type: 'Layout.Header' },
          {
            type: 'Layout',
            children: [
              { type: 'Layout.Aside' },
              { type: 'Layout.Content' },
            ],
          },
          { type: 'Layout.Footer' },
        ],
      },
    ],
  },
];

export const buildNodesByLayoutTemplate = (templateId: BuiltInLayoutTemplateId): UiTreeNode[] => {
  const targetTemplate = BUILT_IN_LAYOUT_TEMPLATES.find((item) => item.id === templateId);
  if (!targetTemplate) {
    return [];
  }

  return targetTemplate.schema.map((schema) => createTemplateNode(schema));
};
