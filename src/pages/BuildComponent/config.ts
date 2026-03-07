export const columns = [
  { colKey: 'name', title: '组件名称', width: 220 },
  { colKey: 'author', title: '创建人', width: 140 },
  { colKey: 'createdAt', title: '创建时间', width: 180 },
  { colKey: 'updatedAt', title: '上次修改时间', width: 180 },
  { colKey: 'device', title: '设备信息', width: 200 },
  { colKey: 'description', title: '描述', width: 300 },
  // 操作列不包含自定义元素，留给页面使用者渲染按钮，固定在右侧以便在横向滚动时保持可见
  { colKey: 'operations', title: '操作', width: 180, fixed: 'right' as const },
];

export default columns;
