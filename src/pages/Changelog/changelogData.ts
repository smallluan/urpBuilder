/**
 * 更新日志条目：按时间倒序维护（越新越靠前）。
 * 节点依据仓库提交历史归纳，后续发版时在此追加或调整文案即可。
 */
export type ChangelogEntry = {
  version: string;
  /** 展示用日期（YYYY-MM-DD） */
  date: string;
  title: string;
  highlights: string[];
};

export const CHANGELOG_ENTRIES: ChangelogEntry[] = [
  {
    version: 'v0.10.0',
    date: '2026-04-12',
    title: '数据流与 DSL 增强',
    highlights: [
      '动态列表流程代码数据源',
      'DSL 对齐文档与显示组件配置更新',
    ],
  },
  {
    version: 'v0.9.0',
    date: '2026-04-11',
    title: '工作台、常量与模板',
    highlights: [
      '数据常量能力与预览渲染优化',
      '页面模板 JSON 导入与团队创建入口',
      '粘性边界、模拟器树滚动联动与图标选择器',
      '输入字段 / 图标 DSL 与表单、菜单对齐',
    ],
  },
  {
    version: 'v0.8.0',
    date: '2026-04-09',
    title: '双 UI 库与主题体系',
    highlights: [
      'Ant Design 与 TDesign 双物料与预览切换',
      '全局亮暗色、View Transition 与沉浸式预览 Chrome',
      '组件版本对比与发布流程、代码工作台增强',
    ],
  },
  {
    version: 'v0.7.0',
    date: '2026-04-07',
    title: '素材库与样式工程',
    highlights: [
      '素材节点树与完整 CRUD',
      '样式侧栏重构与语义令牌、盒模型编辑',
      '流程代码节点外壳与代码工作台体验',
    ],
  },
  {
    version: 'v0.6.0',
    date: '2026-04-03',
    title: '搭建器体验深化',
    highlights: [
      '流程大图性能与网格吸附、主题开关与快捷键',
      '结构树虚拟滚动、快速查找与画布尺寸',
      '登录 / 注册页 3D 门户视觉',
    ],
  },
  {
    version: 'v0.5.0',
    date: '2026-03-29',
    title: '版本治理与资产',
    highlights: [
      '组件版本隔离与升级、模板 props 脱水存储 v2',
      '移动端模拟器、素材库拖拽应用',
      '搭建列表表格化与保存并发布',
    ],
  },
  {
    version: 'v0.4.0',
    date: '2026-03-20',
    title: '协作与云能力',
    highlights: [
      '团队邀请、资源归属与个人 / 团队空间',
      '账户注销与平台用户 / 团队治理',
      '云函数控制台、常量管理与 ECharts 集成',
    ],
  },
  {
    version: 'v0.3.0',
    date: '2026-03-15',
    title: '认证与多路由运行时',
    highlights: [
      '注册、鉴权与资源权限控制',
      '路由出口、DataHub 与自定义组件运行时',
      '组件引导暴露节点与契约',
    ],
  },
  {
    version: 'v0.2.0',
    date: '2026-03-10',
    title: '预览引擎与流程节点',
    highlights: [
      '独立预览解析引擎与流程执行链路',
      '定时器节点、事件过滤与代码节点扩展',
      '组件物料持续扩展（菜单、Tabs、Upload 等）',
    ],
  },
  {
    version: 'v0.1.0',
    date: '2026-03-07',
    title: '项目起步',
    highlights: [
      '工程初始化、路由布局与懒加载',
      '搭建页 / 组件构建器与 Flow 布局',
      '引入 Zustand 与搭建区基础交互',
    ],
  },
];
