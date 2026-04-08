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
  {
    key: 'antd',
    kind: 'group',
    name: 'Ant Design',
    category: 'display',
    iconType: 'antd.Button',
    helperText: 'Ant Design 5 基础组件（与 TDesign 物料并存）',
    keywords: ['antd', 'ant', '蚂蚁'],
    children: [
      { type: 'antd.Divider', helperText: '分割线', keywords: ['divider'] },
      { type: 'antd.Typography.Title', helperText: '标题', keywords: ['title'] },
      { type: 'antd.Typography.Paragraph', helperText: '段落', keywords: ['paragraph'] },
      { type: 'antd.Typography.Text', helperText: '文本', keywords: ['text'] },
      { type: 'antd.Typography.Link', helperText: '链接', keywords: ['link'] },
      { type: 'antd.Tag', helperText: '标签', keywords: ['tag'] },
      { type: 'antd.Badge', helperText: '徽标', keywords: ['badge'] },
      { type: 'antd.Empty', helperText: '空状态', keywords: ['empty'] },
      { type: 'antd.Button', helperText: '按钮', keywords: ['button'] },
      { type: 'antd.Dropdown', helperText: '下拉菜单', keywords: ['dropdown'] },
      { type: 'antd.Input', helperText: '输入框', keywords: ['input'] },
      { type: 'antd.Textarea', helperText: '多行输入', keywords: ['textarea'] },
      { type: 'antd.InputNumber', helperText: '数字输入', keywords: ['number'] },
      { type: 'antd.Select', helperText: '选择器', keywords: ['select'] },
      { type: 'antd.Checkbox', helperText: '复选框', keywords: ['checkbox'] },
      { type: 'antd.Radio.Group', helperText: '单选组', keywords: ['radio'] },
      { type: 'antd.Switch', helperText: '开关', keywords: ['switch'] },
      { type: 'antd.DatePicker', helperText: '日期', keywords: ['date'] },
      { type: 'antd.Form', helperText: '表单容器', keywords: ['form'] },
      { type: 'antd.Form.Item', helperText: '表单项', keywords: ['formitem'] },
      { type: 'antd.Modal', helperText: '对话框', keywords: ['modal'] },
      { type: 'antd.Drawer', helperText: '抽屉', keywords: ['drawer'] },
      { type: 'antd.Spin', helperText: '加载中', keywords: ['spin'] },
      { type: 'antd.Alert', helperText: '警告提示', keywords: ['alert'] },
      { type: 'antd.Menu', helperText: '菜单容器', keywords: ['menu'] },
      { type: 'antd.Menu.Item', helperText: '菜单项', keywords: ['menuitem'] },
      { type: 'antd.Menu.SubMenu', helperText: '子菜单', keywords: ['submenu'] },
      { type: 'antd.Breadcrumb', helperText: '面包屑', keywords: ['breadcrumb'] },
      { type: 'antd.Pagination', helperText: '分页', keywords: ['pagination'] },
      { type: 'antd.Row', helperText: '栅格行', keywords: ['row'] },
      { type: 'antd.Col', helperText: '栅格列', keywords: ['col'] },
      { type: 'antd.Layout', helperText: '布局', keywords: ['layout'] },
      { type: 'antd.Layout.Header', helperText: '顶栏', keywords: ['header'] },
      { type: 'antd.Layout.Content', helperText: '内容', keywords: ['content'] },
      { type: 'antd.Layout.Footer', helperText: '底栏', keywords: ['footer'] },
      { type: 'antd.Layout.Sider', helperText: '侧边栏', keywords: ['sider'] },
      { type: 'antd.Space', helperText: '间距', keywords: ['space'] },
      { type: 'antd.Table', helperText: '表格', keywords: ['table'] },
      { type: 'antd.List', helperText: '列表', keywords: ['list'] },
    ],
  },
];

export const componentLibraryEntries: ComponentLibraryEntry[] = LIBRARY_GROUP_ENTRIES;

export const groupedComponentTypes = GROUPED_COMPONENT_TYPES;
