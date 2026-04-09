export type ComponentLibraryCategory = 'layout' | 'text' | 'display' | 'action' | 'navigation';

export interface ComponentLibraryItemDefinition {
  type: string;
  helperText?: string;
  keywords?: string[];
}

interface ComponentLibraryEntryBase {
  key: string;
  name: string;
  category: ComponentLibraryCategory;
  keywords?: string[];
}

export interface ComponentLibrarySingleEntry extends ComponentLibraryEntryBase {
  kind: 'item';
  type: string;
}

export interface ComponentLibraryGroupEntry extends ComponentLibraryEntryBase {
  kind: 'group';
  iconType?: string;
  helperText?: string;
  children: ComponentLibraryItemDefinition[];
}

export type ComponentLibraryEntry = ComponentLibrarySingleEntry | ComponentLibraryGroupEntry;

const GROUPED_COMPONENT_TYPES = new Set([
  'Grid.Row',
  'Grid.Col',
  'Menu',
  'HeadMenu',
  'Menu.Submenu',
  'Menu.Item',
  'Menu.Group',
  'Steps',
  'Steps.Item',
  'Layout',
  'Layout.Header',
  'Layout.Content',
  'Layout.Aside',
  'Layout.Footer',
  'antd.Row',
  'antd.Col',
  'antd.Menu',
  'antd.Menu.Item',
  'antd.Menu.SubMenu',
  'antd.Layout',
  'antd.Layout.Header',
  'antd.Layout.Content',
  'antd.Layout.Footer',
  'antd.Layout.Sider',
]);

const LIBRARY_GROUP_ENTRIES: ComponentLibraryGroupEntry[] = [
  {
    key: 'grid',
    kind: 'group',
    name: '栅格',
    category: 'layout',
    iconType: 'Grid.Row',
    helperText: '点击后选择栅格行或栅格列',
    keywords: ['栅格', 'Grid'],
    children: [
      {
        type: 'Grid.Row',
        helperText: '作为栅格容器使用，可继续拖入栅格列',
        keywords: ['栅格行', 'row'],
      },
      {
        type: 'Grid.Col',
        helperText: '仅可拖入栅格行中',
        keywords: ['栅格列', 'col'],
      },
    ],
  },
  {
    key: 'head-menu',
    kind: 'group',
    name: '顶部菜单',
    category: 'navigation',
    iconType: 'HeadMenu',
    helperText: '点击后选择顶部菜单及其结构节点',
    keywords: ['顶部菜单', '菜单', '导航', 'headmenu'],
    children: [
      {
        type: 'HeadMenu',
        helperText: '顶部横向菜单容器',
        keywords: ['顶部菜单', 'headmenu'],
      },
      {
        type: 'Menu.Submenu',
        helperText: '仅可拖入顶部菜单或子菜单中',
        keywords: ['子菜单', 'submenu'],
      },
      {
        type: 'Menu.Item',
        helperText: '仅可拖入顶部菜单或子菜单中',
        keywords: ['菜单项', 'item'],
      },
      {
        type: 'Menu.Group',
        helperText: '顶部菜单分组节点',
        keywords: ['菜单分组', 'group'],
      },
    ],
  },
  {
    key: 'side-menu',
    kind: 'group',
    name: '侧边菜单',
    category: 'navigation',
    iconType: 'Menu',
    helperText: '点击后选择侧边菜单及其结构节点',
    keywords: ['侧边菜单', '菜单', '导航', 'menu'],
    children: [
      {
        type: 'Menu',
        helperText: '侧边纵向菜单容器',
        keywords: ['侧边菜单', 'sidemenu'],
      },
      {
        type: 'Menu.Submenu',
        helperText: '仅可拖入侧边菜单或子菜单中',
        keywords: ['子菜单', 'submenu'],
      },
      {
        type: 'Menu.Item',
        helperText: '仅可拖入侧边菜单或子菜单中',
        keywords: ['菜单项', 'item'],
      },
      {
        type: 'Menu.Group',
        helperText: '侧边菜单分组节点',
        keywords: ['菜单分组', 'group'],
      },
    ],
  },
  {
    key: 'steps',
    kind: 'group',
    name: '步骤条',
    category: 'text',
    iconType: 'Steps',
    helperText: '点击后选择步骤条或步骤项',
    keywords: ['步骤', 'steps'],
    children: [
      {
        type: 'Steps',
        helperText: '步骤条容器',
        keywords: ['步骤条'],
      },
      {
        type: 'Steps.Item',
        helperText: '仅可拖入步骤条中',
        keywords: ['步骤项'],
      },
    ],
  },
  {
    key: 'layout',
    kind: 'group',
    name: '布局',
    category: 'layout',
    iconType: 'Layout',
    helperText: '点击后选择布局容器及区域节点',
    keywords: ['布局', 'layout'],
    children: [
      {
        type: 'Layout',
        helperText: '顶层布局容器',
        keywords: ['布局容器'],
      },
      {
        type: 'Layout.Header',
        helperText: '布局头部区域',
        keywords: ['头部'],
      },
      {
        type: 'Layout.Content',
        helperText: '布局内容区域',
        keywords: ['内容'],
      },
      {
        type: 'Layout.Aside',
        helperText: '布局侧栏区域',
        keywords: ['侧栏'],
      },
      {
        type: 'Layout.Footer',
        helperText: '布局底部区域',
        keywords: ['底部'],
      },
      {
        type: 'RouteOutlet',
        helperText: '路由内容出口，切换路由时内部内容同步替换',
        keywords: ['路由出口', 'outlet', '路由内容'],
      },
    ],
  },
];

export const componentLibraryEntries: ComponentLibraryEntry[] = LIBRARY_GROUP_ENTRIES;

export const groupedComponentTypes = GROUPED_COMPONENT_TYPES;
