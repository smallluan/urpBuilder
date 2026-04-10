import type { ComponentTemplateContent, RouteTemplateContent } from '../../api/types';
import { stableStringify } from './stableJson';

/** 虚拟路径片段：仅允许安全字符，避免路径注入 */
export function sanitizePathSegment(raw: string): string {
  return String(raw ?? '')
    .trim()
    .replace(/[\\/]/g, '_')
    .replace(/\s+/g, ' ')
    .slice(0, 128) || 'unnamed';
}

export type VirtualFileMap = Map<string, string>;

/**
 * 将组件模板拆为虚拟文件路径 → 文本内容，供 diff / 侧边栏树展示。
 *
 * 约定：
 * - pageConfig.json
 * - ui/tree.json
 * - flow/edges.json
 * - flow/nodes/{nodeId}.json — 按 id 排序
 * - flow/code/{nodeId}.js — 仅 codeNode，便于代码级对比（与节点 JSON 内容有重叠，可接受）
 * - routes/{routeId}/... — 若存在多路由模板
 */
export function componentTemplateToVirtualFiles(template: ComponentTemplateContent): VirtualFileMap {
  const files: VirtualFileMap = new Map();

  const add = (path: string, body: string) => {
    files.set(path, body);
  };

  add('pageConfig.json', stableStringify(template.pageConfig ?? {}));
  add('ui/tree.json', stableStringify(template.uiTree ?? {}));
  add('flow/edges.json', stableStringify(template.flowEdges ?? []));

  const flowNodes = Array.isArray(template.flowNodes) ? template.flowNodes : [];
  const sorted = [...flowNodes].sort((a, b) => {
    const idA = String((a as { id?: string }).id ?? '');
    const idB = String((b as { id?: string }).id ?? '');
    return idA.localeCompare(idB);
  });

  for (const node of sorted) {
    const id = String((node as { id?: string }).id ?? 'unknown');
    const seg = sanitizePathSegment(id);
    add(`flow/nodes/${seg}.json`, stableStringify(node));
    const type = String((node as { type?: string }).type ?? '');
    if (type === 'codeNode') {
      const data = (node as { data?: { code?: string } }).data ?? {};
      add(`flow/code/${seg}.js`, String(data.code ?? ''));
    }
  }

  const routes = template.routes;
  if (Array.isArray(routes) && routes.length > 0) {
    for (const r of routes) {
      addRouteSubtree(files, r as RouteTemplateContent);
    }
  }

  return files;
}

function addRouteSubtree(files: VirtualFileMap, r: RouteTemplateContent): void {
  const rid = sanitizePathSegment(String(r.routeId ?? 'route'));
  const prefix = `routes/${rid}`;
  files.set(`${prefix}/routeConfig.json`, stableStringify(r.routeConfig ?? {}));
  files.set(`${prefix}/uiTree.json`, stableStringify(r.uiTree ?? {}));
  files.set(`${prefix}/flow/edges.json`, stableStringify(r.flowEdges ?? []));

  const flowNodes = Array.isArray(r.flowNodes) ? r.flowNodes : [];
  const sorted = [...flowNodes].sort((a, b) => {
    const idA = String((a as { id?: string }).id ?? '');
    const idB = String((b as { id?: string }).id ?? '');
    return idA.localeCompare(idB);
  });

  for (const node of sorted) {
    const id = String((node as { id?: string }).id ?? 'unknown');
    const seg = sanitizePathSegment(id);
    files.set(`${prefix}/flow/nodes/${seg}.json`, stableStringify(node));
    const type = String((node as { type?: string }).type ?? '');
    if (type === 'codeNode') {
      const data = (node as { data?: { code?: string } }).data ?? {};
      files.set(`${prefix}/flow/code/${seg}.js`, String(data.code ?? ''));
    }
  }
}

/** 将虚拟路径列表构造成树节点（用于侧边栏） */
export type VirtualPathTreeNode = {
  name: string;
  path: string | null;
  children: VirtualPathTreeNode[];
};

export function buildPathTree(paths: string[]): VirtualPathTreeNode {
  const root: VirtualPathTreeNode = { name: '', path: null, children: [] };

  for (const p of paths) {
    const parts = p.split('/').filter(Boolean);
    let cur = root;
    let acc = '';
    for (let i = 0; i < parts.length; i += 1) {
      const part = parts[i];
      acc = acc ? `${acc}/${part}` : part;
      const isLeaf = i === parts.length - 1;
      let next = cur.children.find((c) => c.name === part);
      if (!next) {
        next = { name: part, path: isLeaf ? p : null, children: [] };
        cur.children.push(next);
      } else if (isLeaf) {
        next.path = p;
      }
      cur = next;
    }
  }

  const sortTree = (node: VirtualPathTreeNode) => {
    node.children.sort((a, b) => a.name.localeCompare(b.name));
    node.children.forEach(sortTree);
  };
  sortTree(root);
  return root;
}
