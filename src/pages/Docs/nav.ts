/**
 * 侧边栏目录：单源配置，路由与导航一致。
 * 路径规则：/help/doc/{sectionId}/{pageSlug}
 */

export interface NavLeaf {
  title: string;
  slug: string;
}

export interface NavSection {
  id: string;
  title: string;
  items: NavLeaf[];
}

export const HELP_HOME = '/help';

export const SIDEBAR_NAV: NavSection[] = [
  {
    id: 'intro',
    title: '入门与概念',
    items: [
      { slug: 'overview', title: '产品能做什么' },
      { slug: 'workspace', title: '工作区与资源范围' },
      { slug: 'ui', title: '界面总览' },
    ],
  },
  {
    id: 'build',
    title: '搭建',
    items: [
      { slug: 'from-list', title: '从列表进入编辑器' },
      { slug: 'page', title: '搭建页面' },
      { slug: 'component', title: '搭建组件' },
      { slug: 'preview', title: '预览与调试' },
    ],
  },
  {
    id: 'data',
    title: '数据与集成',
    items: [
      { slug: 'overview', title: '数据能力总览' },
      { slug: 'constants', title: '常量' },
      { slug: 'api', title: 'API' },
      { slug: 'cloud-function', title: '云函数' },
      { slug: 'assets', title: '素材' },
    ],
  },
  {
    id: 'advanced',
    title: '进阶',
    items: [
      { slug: 'routes', title: '多路由与 RouteOutlet' },
      { slug: 'custom-component', title: '自定义组件与版本' },
      { slug: 'flow', title: '流程搭建' },
      { slug: 'code-workbench', title: '代码工作台' },
      { slug: 'version', title: '组件版本目录与对比' },
    ],
  },
  {
    id: 'collab',
    title: '协作与治理',
    items: [{ slug: 'team', title: '团队与权限' }],
  },
  {
    id: 'appendix',
    title: '附录',
    items: [
      { slug: 'shortcuts', title: '快捷键' },
      { slug: 'glossary', title: '术语表' },
      { slug: 'troubleshoot', title: '故障排查' },
    ],
  },
];

export function docPath(sectionId: string, slug: string): string {
  return `${HELP_HOME}/doc/${sectionId}/${slug}`;
}

export function flattenNav(): Array<{
  path: string;
  sectionId: string;
  slug: string;
  title: string;
  sectionTitle: string;
}> {
  const out: Array<{
    path: string;
    sectionId: string;
    slug: string;
    title: string;
    sectionTitle: string;
  }> = [];
  for (const sec of SIDEBAR_NAV) {
    for (const item of sec.items) {
      out.push({
        path: docPath(sec.id, item.slug),
        sectionId: sec.id,
        slug: item.slug,
        title: item.title,
        sectionTitle: sec.title,
      });
    }
  }
  return out;
}
