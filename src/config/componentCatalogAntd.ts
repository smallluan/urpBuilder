/**
 * Ant Design 物料：与搭建器 registry、PreviewRenderer 中的 antd.* 类型一一对应。
 */
export const antdComponentCatalogEntries = [
  {
    type: 'antd.Divider',
    name: 'Ant 分割线',
    props: {
      dashed: { name: '虚线', value: false, editType: 'switch' as const },
      orientation: { name: '标题位置', value: 'center', editType: 'select' as const, payload: { options: ['left', 'center', 'right'] } },
      content: { name: '中间文字', value: '', editType: 'input' as const },
    },
  },
  {
    type: 'antd.Typography.Title',
    name: 'Ant 标题',
    props: {
      level: { name: '级别', value: '4', editType: 'select' as const, payload: { options: ['1', '2', '3', '4', '5'] } },
      content: { name: '内容', value: '标题', editType: 'input' as const },
    },
  },
  {
    type: 'antd.Typography.Paragraph',
    name: 'Ant 段落',
    props: {
      content: { name: '内容', value: '段落文本', editType: 'input' as const },
    },
  },
  {
    type: 'antd.Typography.Text',
    name: 'Ant 文本',
    props: {
      content: { name: '内容', value: '文本', editType: 'input' as const },
      strong: { name: '加粗', value: false, editType: 'switch' as const },
    },
  },
  {
    type: 'antd.Typography.Link',
    name: 'Ant 链接',
    props: {
      content: { name: '内容', value: '链接', editType: 'input' as const },
      href: { name: '地址', value: '', editType: 'input' as const },
      target: { name: '打开方式', value: '_self', editType: 'select' as const, payload: { options: ['_self', '_blank'] } },
    },
  },
  {
    type: 'antd.Tag',
    name: 'Ant 标签',
    props: {
      content: { name: '文字', value: '标签', editType: 'input' as const },
      color: { name: '颜色', value: '', editType: 'input' as const },
    },
  },
  {
    type: 'antd.Badge',
    name: 'Ant 徽标',
    props: {
      count: { name: '数量', value: 5, editType: 'inputNumber' as const },
      dot: { name: '点状', value: false, editType: 'switch' as const },
      content: { name: '子内容', value: 'Badge', editType: 'input' as const },
    },
  },
  {
    type: 'antd.Empty',
    name: 'Ant 空状态',
    props: {
      description: { name: '描述', value: '暂无数据', editType: 'input' as const },
    },
  },
  {
    type: 'antd.Button',
    name: 'Ant 按钮',
    props: {
      content: { name: '文字', value: '按钮', editType: 'input' as const },
      type: { name: '类型', value: 'primary', editType: 'select' as const, payload: { options: ['primary', 'default', 'dashed', 'link', 'text'] } },
      size: { name: '尺寸', value: 'middle', editType: 'select' as const, payload: { options: ['large', 'middle', 'small'] } },
      danger: { name: '危险', value: false, editType: 'switch' as const },
      block: { name: '块级', value: false, editType: 'switch' as const },
    },
    lifetimes: ['onClick'],
  },
  {
    type: 'antd.Dropdown',
    name: 'Ant 下拉菜单',
    props: {
      menuItems: { name: '菜单项(JSON)', value: '[{"key":"1","label":"第一项"},{"key":"2","label":"第二项"}]', editType: 'jsonCode' as const },
      trigger: { name: '触发', value: 'hover', editType: 'select' as const, payload: { options: ['hover', 'click'] } },
      content: { name: '触发器文字', value: '菜单', editType: 'input' as const },
    },
  },
  {
    type: 'antd.Input',
    name: 'Ant 输入框',
    props: {
      value: { name: '值', value: '', editType: 'input' as const },
      placeholder: { name: '占位', value: '请输入', editType: 'input' as const },
      controlled: { name: '受控', value: true, editType: 'switch' as const },
    },
    lifetimes: ['onChange', 'onPressEnter'],
  },
  {
    type: 'antd.Textarea',
    name: 'Ant 多行输入',
    props: {
      value: { name: '值', value: '', editType: 'input' as const },
      placeholder: { name: '占位', value: '', editType: 'input' as const },
      rows: { name: '行数', value: 4, editType: 'inputNumber' as const },
      controlled: { name: '受控', value: true, editType: 'switch' as const },
    },
    lifetimes: ['onChange'],
  },
  {
    type: 'antd.InputNumber',
    name: 'Ant 数字输入',
    props: {
      value: { name: '值', value: 0, editType: 'inputNumber' as const },
      min: { name: '最小', value: 0, editType: 'inputNumber' as const },
      max: { name: '最大', value: 999999, editType: 'inputNumber' as const },
      controlled: { name: '受控', value: true, editType: 'switch' as const },
    },
    lifetimes: ['onChange'],
  },
  {
    type: 'antd.Select',
    name: 'Ant 选择器',
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
    name: 'Ant 复选框',
    props: {
      checked: { name: '选中', value: false, editType: 'switch' as const },
      content: { name: '标签', value: '复选框', editType: 'input' as const },
      controlled: { name: '受控', value: true, editType: 'switch' as const },
    },
    lifetimes: ['onChange'],
  },
  {
    type: 'antd.Radio.Group',
    name: 'Ant 单选组',
    props: {
      value: { name: '值', value: 'a', editType: 'input' as const },
      options: { name: '选项(JSON)', value: '[{"value":"a","label":"A"},{"value":"b","label":"B"}]', editType: 'jsonCode' as const },
      optionType: { name: '样式', value: 'default', editType: 'select' as const, payload: { options: ['default', 'button'] } },
      controlled: { name: '受控', value: true, editType: 'switch' as const },
    },
    lifetimes: ['onChange'],
  },
  {
    type: 'antd.Switch',
    name: 'Ant 开关',
    props: {
      checked: { name: '打开', value: false, editType: 'switch' as const },
      controlled: { name: '受控', value: true, editType: 'switch' as const },
    },
    lifetimes: ['onChange'],
  },
  {
    type: 'antd.DatePicker',
    name: 'Ant 日期',
    props: {
      placeholder: { name: '占位', value: '选择日期', editType: 'input' as const },
      controlled: { name: '受控', value: true, editType: 'switch' as const },
    },
    lifetimes: ['onChange'],
  },
  {
    type: 'antd.Form',
    name: 'Ant 表单',
    props: {
      layout: { name: '布局', value: 'vertical', editType: 'select' as const, payload: { options: ['horizontal', 'vertical', 'inline'] } },
    },
  },
  {
    type: 'antd.Form.Item',
    name: 'Ant 表单项',
    props: {
      label: { name: '标签', value: '字段', editType: 'input' as const },
      name: { name: '字段名', value: 'field', editType: 'input' as const },
    },
  },
  {
    type: 'antd.Modal',
    name: 'Ant 对话框',
    props: {
      title: { name: '标题', value: '标题', editType: 'input' as const },
      visible: { name: '显示', value: false, editType: 'switch' as const },
      okText: { name: '确定', value: '确定', editType: 'input' as const },
      cancelText: { name: '取消', value: '取消', editType: 'input' as const },
    },
    lifetimes: ['onOk', 'onCancel'],
  },
  {
    type: 'antd.Drawer',
    name: 'Ant 抽屉',
    props: {
      title: { name: '标题', value: '抽屉', editType: 'input' as const },
      visible: { name: '显示', value: false, editType: 'switch' as const },
      placement: { name: '方向', value: 'right', editType: 'select' as const, payload: { options: ['top', 'right', 'bottom', 'left'] } },
    },
    lifetimes: ['onClose'],
  },
  {
    type: 'antd.Spin',
    name: 'Ant 加载中',
    props: {
      spinning: { name: '旋转', value: true, editType: 'switch' as const },
      tip: { name: '提示', value: '', editType: 'input' as const },
    },
  },
  {
    type: 'antd.Alert',
    name: 'Ant 警告',
    props: {
      message: { name: '内容', value: '提示', editType: 'input' as const },
      type: { name: '类型', value: 'info', editType: 'select' as const, payload: { options: ['success', 'info', 'warning', 'error'] } },
      showIcon: { name: '图标', value: false, editType: 'switch' as const },
    },
  },
  {
    type: 'antd.Menu',
    name: 'Ant 菜单',
    props: {
      mode: { name: '模式', value: 'vertical', editType: 'select' as const, payload: { options: ['vertical', 'horizontal', 'inline'] } },
    },
  },
  {
    type: 'antd.Menu.Item',
    name: 'Ant 菜单项',
    props: {
      title: { name: '标题', value: '菜单项', editType: 'input' as const },
    },
    lifetimes: ['onClick'],
  },
  {
    type: 'antd.Menu.SubMenu',
    name: 'Ant 子菜单',
    props: {
      title: { name: '标题', value: '子菜单', editType: 'input' as const },
    },
  },
  {
    type: 'antd.Breadcrumb',
    name: 'Ant 面包屑',
    props: {
      items: { name: '项(JSON)', value: '[{"title":"首页"},{"title":"列表"}]', editType: 'jsonCode' as const },
    },
  },
  {
    type: 'antd.Pagination',
    name: 'Ant 分页',
    props: {
      total: { name: '总数', value: 50, editType: 'inputNumber' as const },
      current: { name: '当前页', value: 1, editType: 'inputNumber' as const },
      pageSize: { name: '每页条数', value: 10, editType: 'inputNumber' as const },
    },
    lifetimes: ['onChange'],
  },
  {
    type: 'antd.Row',
    name: 'Ant 行',
    props: {
      gutter: { name: '间距', value: 0, editType: 'inputNumber' as const },
      justify: { name: '主轴', value: 'start', editType: 'select' as const, payload: { options: ['start', 'end', 'center', 'space-around', 'space-between'] } },
      align: { name: '交叉轴', value: 'top', editType: 'select' as const, payload: { options: ['top', 'middle', 'bottom', 'stretch'] } },
    },
  },
  {
    type: 'antd.Col',
    name: 'Ant 列',
    props: {
      span: { name: '占位', value: 12, editType: 'inputNumber' as const },
      offset: { name: '偏移', value: 0, editType: 'inputNumber' as const },
    },
  },
  {
    type: 'antd.Layout',
    name: 'Ant 布局',
    props: {},
  },
  {
    type: 'antd.Layout.Header',
    name: 'Ant 顶栏',
    props: {},
  },
  {
    type: 'antd.Layout.Content',
    name: 'Ant 内容区',
    props: {},
  },
  {
    type: 'antd.Layout.Footer',
    name: 'Ant 底栏',
    props: {},
  },
  {
    type: 'antd.Layout.Sider',
    name: 'Ant 侧边栏',
    props: {
      width: { name: '宽度', value: 200, editType: 'inputNumber' as const },
    },
  },
  {
    type: 'antd.Space',
    name: 'Ant 间距',
    props: {
      direction: { name: '方向', value: 'horizontal', editType: 'select' as const, payload: { options: ['horizontal', 'vertical'] } },
      size: { name: '间距', value: 'small', editType: 'select' as const, payload: { options: ['small', 'middle', 'large'] } },
    },
  },
  {
    type: 'antd.Table',
    name: 'Ant 表格',
    props: {
      columns: { name: '列(JSON)', value: '[{"title":"姓名","dataIndex":"name","key":"name"},{"title":"年龄","dataIndex":"age","key":"age"}]', editType: 'jsonCode' as const },
      dataSource: { name: '数据(JSON)', value: '[{"key":"1","name":"张三","age":18}]', editType: 'jsonCode' as const },
    },
    lifetimes: ['onChange'],
  },
  {
    type: 'antd.List',
    name: 'Ant 列表',
    props: {
      bordered: { name: '边框', value: false, editType: 'switch' as const },
    },
  },
];
