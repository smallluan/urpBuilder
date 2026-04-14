import { Menu } from 'tdesign-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { NavItem } from './nav';
import { HELP_HOME, SIDEBAR_NAV, docPath } from './nav';

/** 与 flattenNav / 路由一致的 slug 路径计算 */
function collectDescendantSlugs(item: NavItem, parentSlugPath: string): string[] {
  const slugPath =
    item.slug !== undefined && item.slug !== ''
      ? parentSlugPath
        ? `${parentSlugPath}/${item.slug}`
        : item.slug
      : parentSlugPath;

  const nextParent =
    item.slug !== undefined && item.slug !== ''
      ? parentSlugPath
        ? `${parentSlugPath}/${item.slug}`
        : item.slug
      : parentSlugPath;

  const out: string[] = [];
  if (item.slug !== undefined && item.slug !== '') {
    out.push(slugPath);
  }
  if (item.children?.length) {
    for (const ch of item.children) {
      out.push(...collectDescendantSlugs(ch, nextParent));
    }
  }
  return out;
}

function subtreeContainsActiveDoc(item: NavItem, parentSlugPath: string, activeSlug: string): boolean {
  return collectDescendantSlugs(item, parentSlugPath).some((s) => s === activeSlug);
}

function subMenuValue(sectionId: string, parentSlugPath: string, item: NavItem, index: number): string {
  return `sub:${sectionId}:${parentSlugPath}:${item.slug ?? '_'}:${index}`;
}

function parseDocPath(pathname: string): { sectionId: string; slug: string } | null {
  const p = pathname.replace(/\/$/, '') || '/';
  const prefix = `${HELP_HOME}/doc/`;
  if (!p.startsWith(prefix)) {
    return null;
  }
  const rest = p.slice(prefix.length);
  const slash = rest.indexOf('/');
  if (slash === -1) {
    return null;
  }
  return {
    sectionId: rest.slice(0, slash),
    slug: rest.slice(slash + 1).replace(/^\/+|\/+$/g, ''),
  };
}

function computeExpandedKeys(pathname: string): MenuValue[] {
  const parsed = parseDocPath(pathname);
  if (!parsed?.slug) {
    return [];
  }
  const { sectionId, slug } = parsed;
  const section = SIDEBAR_NAV.find((s) => s.id === sectionId);
  if (!section) {
    return [];
  }
  const keys: MenuValue[] = [];
  const walk = (items: NavItem[], parentSlugPath: string) => {
    items.forEach((item, i) => {
      if (!item.children?.length) {
        return;
      }
      const subVal = subMenuValue(sectionId, parentSlugPath, item, i);
      if (subtreeContainsActiveDoc(item, parentSlugPath, slug)) {
        keys.push(subVal);
      }
      const nextParent =
        item.slug !== undefined && item.slug !== ''
          ? parentSlugPath
            ? `${parentSlugPath}/${item.slug}`
            : item.slug
          : parentSlugPath;
      walk(item.children, nextParent);
    });
  };
  walk(section.items, '');
  return keys;
}

type MenuValue = string | number;

function docsNavItems(sectionId: string, parentSlugPath: string, items: NavItem[]): ReactNode[] {
  const result: ReactNode[] = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const slugPath =
      item.slug !== undefined && item.slug !== ''
        ? parentSlugPath
          ? `${parentSlugPath}/${item.slug}`
          : item.slug
        : parentSlugPath;

    const nextParent =
      item.slug !== undefined && item.slug !== ''
        ? parentSlugPath
          ? `${parentSlugPath}/${item.slug}`
          : item.slug
        : parentSlugPath;

    const hasSlug = item.slug !== undefined && item.slug !== '';
    const to = hasSlug ? docPath(sectionId, slugPath) : null;
    const subVal = subMenuValue(sectionId, parentSlugPath, item, i);
    const key = `${subVal}-${item.title}`;

    if (item.children?.length) {
      result.push(
        <Menu.SubMenu key={key} value={subVal} title={item.title}>
          {hasSlug && to ? <Menu.MenuItem value={to}>概述</Menu.MenuItem> : null}
          {docsNavItems(sectionId, nextParent, item.children)}
        </Menu.SubMenu>,
      );
    } else if (hasSlug && to) {
      result.push(
        <Menu.MenuItem key={key} value={to}>
          {item.title}
        </Menu.MenuItem>,
      );
    }
  }
  return result;
}

export default function DocsSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname.replace(/\/$/, '') || '/';

  const menuValue = useMemo(() => {
    const parsed = parseDocPath(path);
    if (!parsed?.slug) {
      return undefined;
    }
    return docPath(parsed.sectionId, parsed.slug);
  }, [path]);

  const neededExpanded = useMemo(() => computeExpandedKeys(path), [path]);
  const [expanded, setExpanded] = useState<MenuValue[]>(neededExpanded);

  useEffect(() => {
    setExpanded(neededExpanded);
  }, [neededExpanded]);

  return (
    <aside className="sidebar docs-sidebar" aria-label="文档目录">
      <Menu
        className="docs-td-menu"
        theme="light"
        expandMutex={false}
        expandType="normal"
        width="100%"
        value={menuValue}
        expanded={expanded}
        onExpand={(value) => {
          setExpanded(value);
        }}
        onChange={(value) => {
          if (value === undefined || value === '') {
            return;
          }
          navigate(String(value));
        }}
      >
        {SIDEBAR_NAV.map((section) => (
          <Menu.MenuGroup key={section.id} title={<span className="docs-menu-section-label">{section.title}</span>}>
            {docsNavItems(section.id, '', section.items)}
          </Menu.MenuGroup>
        ))}
      </Menu>
    </aside>
  );
}
