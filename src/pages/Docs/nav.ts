/**
 * 侧边栏目录：单源配置，路由与导航一致。
 * 路径规则：/help/doc/{sectionId}/{slugPath}
 * slugPath 可为多级，如 overview、guide/setup（对应 content 下多级 .mdx）
 */

export interface NavItem {
  title: string;
  /**
   * 相对当前 section 的文档路径段；多级子文档用 `/` 拼接，如 `guide/first-step`。
   * 仅作分组、不对应单独页面时，可省略 slug，只使用 children。
   */
  slug?: string;
  children?: NavItem[];
}

export interface NavSection {
  id: string;
  title: string;
  items: NavItem[];
}

export const HELP_HOME = '/help';

export const SIDEBAR_NAV: NavSection[] = [
  {
    id: 'intro',
    title: '入门与概念',
    items: [
      { slug: 'overview', title: '什么是 BuilderNext' },
      { slug: 'design-philosophy', title: 'BuilderNext 设计理念' },
      { slug: 'ui', title: 'BuilderNext 的能力边界' },
      /** 示例 ①：仅分组标题（无 slug）+ children，子项 slug 可多级 */
      // {
      //   title: '快速上手（仅分组）',
      //   children: [
      //     { slug: 'guide', title: '上手总览' },
      //     { slug: 'guide/first-step', title: '第一步（多级路径）' },
      //   ],
      // },
    ],
  },
  {
    id: 'build',
    title: '搭建',
    items: [
      {
        title: '搭建你的第一个组件',
        children: [
          { slug: 'guide', title: '上手总览' },
          { slug: 'guide/first-step', title: '第一步（多级路径）' },
        ],
      },
      { slug: 'page', title: '搭建页面' },
      { slug: 'component', title: '搭建组件' },
      { slug: 'preview', title: '预览与调试' },
      /** 示例 ②：父级有 slug（可点开）且带 children，子项 slug 拼在父路径后 */
      {
        slug: 'nested-root',
        title: '多级示例（父页+子页）',
        children: [{ slug: 'sub', title: '子文档' }],
      },
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
      /** 示例 ③：同一父 slug 下多个并列子文档 */
      {
        slug: 'flow',
        title: '流程搭建',
        children: [
          { slug: 'overview', title: '流程总览' },
          { slug: 'canvas', title: '画布与节点' },
        ],
      },
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

export function docPath(sectionId: string, slugPath: string): string {
  const seg = slugPath.replace(/^\/+|\/+$/g, '');
  return `${HELP_HOME}/doc/${sectionId}/${seg}`;
}

export type FlatNavEntry = {
  path: string;
  sectionId: string;
  /** 完整 slug 路径，可含 / */
  slug: string;
  title: string;
  sectionTitle: string;
};

function collectItems(
  sectionId: string,
  sectionTitle: string,
  items: NavItem[],
  parentSlugPath: string,
  out: FlatNavEntry[],
): void {
  for (const item of items) {
    const slugPath =
      item.slug !== undefined && item.slug !== ''
        ? parentSlugPath
          ? `${parentSlugPath}/${item.slug}`
          : item.slug
        : parentSlugPath;

    if (item.slug !== undefined && item.slug !== '') {
      out.push({
        path: docPath(sectionId, slugPath),
        sectionId,
        slug: slugPath,
        title: item.title,
        sectionTitle,
      });
    }

    if (item.children?.length) {
      const nextParent =
        item.slug !== undefined && item.slug !== ''
          ? parentSlugPath
            ? `${parentSlugPath}/${item.slug}`
            : item.slug
          : parentSlugPath;
      collectItems(sectionId, sectionTitle, item.children, nextParent, out);
    }
  }
}

export function flattenNav(): FlatNavEntry[] {
  const out: FlatNavEntry[] = [];
  for (const sec of SIDEBAR_NAV) {
    collectItems(sec.id, sec.title, sec.items, '', out);
  }
  return out;
}

/** 按侧边栏扁平顺序返回上一篇 / 下一篇（用于文末导航） */
export function getAdjacentNavEntries(
  sectionId: string,
  slug: string,
  flatNav?: FlatNavEntry[],
): { prev: FlatNavEntry | null; next: FlatNavEntry | null } {
  const flat = flatNav ?? flattenNav();
  const idx = flat.findIndex((x) => x.sectionId === sectionId && x.slug === slug);
  if (idx === -1) {
    return { prev: null, next: null };
  }
  return {
    prev: idx > 0 ? flat[idx - 1]! : null,
    next: idx < flat.length - 1 ? flat[idx + 1]! : null,
  };
}
