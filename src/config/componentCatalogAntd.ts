/**
 * 无 1:1 TDesign 物料条目的 Ant 组件：保留独立 schema；其余由 antdCatalogMirror 从 TDesign 镜像生成。
 */
import { buildMirroredAntdCatalogEntries, type CatalogComponentDef } from './antdCatalogMirror';

/** 在 TDesign 侧暂无对应搭建物料的 Ant 扩展（后续若补齐 TDesign 物料可改为镜像或删除） */
const ANT_ONLY_CATALOG_ENTRIES: CatalogComponentDef[] = [
  {
    type: 'antd.Tag',
    name: '标签',
    props: {
      content: { name: '文字', value: '标签', editType: 'input' as const },
      color: { name: '颜色', value: '', editType: 'input' as const },
    },
  },
  {
    type: 'antd.Badge',
    name: '徽标',
    props: {
      count: { name: '数量', value: 5, editType: 'inputNumber' as const },
      dot: { name: '点状', value: false, editType: 'switch' as const },
      content: { name: '子内容', value: 'Badge', editType: 'input' as const },
    },
  },
  {
    type: 'antd.Empty',
    name: '空状态',
    props: {
      description: { name: '描述', value: '暂无数据', editType: 'input' as const },
    },
  },
  {
    type: 'antd.Dropdown',
    name: '下拉菜单',
    props: {
      menuItems: { name: '菜单项(JSON)', value: '[{"key":"1","label":"第一项"},{"key":"2","label":"第二项"}]', editType: 'jsonCode' as const },
      trigger: { name: '触发', value: 'hover', editType: 'select' as const, payload: { options: ['hover', 'click'] } },
      content: { name: '触发器文字', value: '菜单', editType: 'input' as const },
    },
  },
  {
    type: 'antd.Select',
    name: '选择器',
    props: {
      value: { name: '值', value: '', editType: 'input' as const },
      options: { name: '选项(JSON)', value: '[{"value":"a","label":"选项A"},{"value":"b","label":"选项B"}]', editType: 'jsonCode' as const },
      placeholder: { name: '占位', value: '请选择', editType: 'input' as const },
      controlled: { name: '受控', value: true, editType: 'switch' as const },
    },
    lifetimes: ['onChange'],
  },
  {
    type: 'antd.Checkbox',
    name: '复选框',
    props: {
      checked: { name: '选中', value: false, editType: 'switch' as const },
      content: { name: '标签', value: '复选框', editType: 'input' as const },
      controlled: { name: '受控', value: true, editType: 'switch' as const },
    },
    lifetimes: ['onChange'],
  },
  {
    type: 'antd.Radio.Group',
    name: '单选组',
    props: {
      value: { name: '值', value: 'a', editType: 'input' as const },
      options: { name: '选项(JSON)', value: '[{"value":"a","label":"A"},{"value":"b","label":"B"}]', editType: 'jsonCode' as const },
      optionType: { name: '样式', value: 'default', editType: 'select' as const, payload: { options: ['default', 'button'] } },
      controlled: { name: '受控', value: true, editType: 'switch' as const },
    },
    lifetimes: ['onChange'],
  },
  {
    type: 'antd.Form',
    name: '表单',
    props: {
      layout: { name: '布局', value: 'vertical', editType: 'select' as const, payload: { options: ['horizontal', 'vertical', 'inline'] } },
    },
  },
  {
    type: 'antd.Form.Item',
    name: '表单项',
    props: {
      label: { name: '标签', value: '字段', editType: 'input' as const },
      name: { name: '字段名', value: 'field', editType: 'input' as const },
    },
  },
  {
    type: 'antd.Spin',
    name: '加载中',
    props: {
      spinning: { name: '旋转', value: true, editType: 'switch' as const },
      tip: { name: '提示', value: '', editType: 'input' as const },
    },
  },
  {
    type: 'antd.Alert',
    name: '警告提示',
    props: {
      message: { name: '内容', value: '提示', editType: 'input' as const },
      type: { name: '类型', value: 'info', editType: 'select' as const, payload: { options: ['success', 'info', 'warning', 'error'] } },
      showIcon: { name: '图标', value: false, editType: 'switch' as const },
    },
  },
  {
    type: 'antd.Breadcrumb',
    name: '面包屑',
    props: {
      items: { name: '项(JSON)', value: '[{"title":"首页"},{"title":"列表"}]', editType: 'jsonCode' as const },
    },
  },
  {
    type: 'antd.Pagination',
    name: '分页',
    props: {
      total: { name: '总数', value: 50, editType: 'inputNumber' as const },
      current: { name: '当前页', value: 1, editType: 'inputNumber' as const },
      pageSize: { name: '每页条数', value: 10, editType: 'inputNumber' as const },
    },
    lifetimes: ['onChange'],
  },
  {
    type: 'antd.DatePicker',
    name: '日期',
    props: {
      placeholder: { name: '占位', value: '选择日期', editType: 'input' as const },
      controlled: { name: '受控', value: true, editType: 'switch' as const },
    },
    lifetimes: ['onChange'],
  },
];

export function buildAntdCatalogBundle(tdesignCatalog: readonly CatalogComponentDef[]): CatalogComponentDef[] {
  const mirrored = buildMirroredAntdCatalogEntries(tdesignCatalog);
  const mirroredTypes = new Set(mirrored.map((x) => x.type));
  const legacy = ANT_ONLY_CATALOG_ENTRIES.filter((x) => !mirroredTypes.has(x.type));
  return [...mirrored, ...legacy];
}
