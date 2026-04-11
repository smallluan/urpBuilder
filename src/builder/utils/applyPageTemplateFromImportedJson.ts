import type { PageTemplateContent, RouteTemplateContent } from '../../api/types';
import cloneDeep from 'lodash/cloneDeep';
import { hydrateTemplateContentTrees, PROPS_STORAGE_VERSION } from '../template/propsHydration';

export type ParsedPageTemplateImport = {
  template: PageTemplateContent;
  base?: {
    pageName?: string;
    pageId?: string;
    description?: string;
  };
};

const MIN_ROOT: Record<string, unknown> = {
  key: '__root__',
  type: 'root',
  label: '该页面',
  props: {},
  children: [],
};

/**
 * 解析粘贴的页面 JSON，支持与接口一致的 `{ base?, template }` 或仅 `template` 根对象；
 * 多路由时可仅有 `routes`（将补全最小 `uiTree`）。会对各 uiTree 做水合（含嵌套自定义组件）。
 */
export async function applyPageTemplateFromImportedJson(
  raw: unknown,
): Promise<{ ok: true; data: ParsedPageTemplateImport } | { ok: false; message: string }> {
  let parsed: unknown;
  if (typeof raw === 'string') {
    const text = raw.trim();
    if (!text) {
      return { ok: false, message: '内容为空' };
    }
    try {
      parsed = JSON.parse(text) as unknown;
    } catch {
      return { ok: false, message: 'JSON 解析失败，请检查括号与引号' };
    }
  } else {
    parsed = raw;
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, message: '根类型须为 JSON 对象' };
  }

  const root = parsed as Record<string, unknown>;
  let templateRaw: Record<string, unknown>;
  let baseOut: ParsedPageTemplateImport['base'];

  if (root.template && typeof root.template === 'object' && !Array.isArray(root.template)) {
    templateRaw = root.template as Record<string, unknown>;
    if (root.base && typeof root.base === 'object' && !Array.isArray(root.base)) {
      const b = root.base as Record<string, unknown>;
      baseOut = {
        pageName: typeof b.pageName === 'string' ? b.pageName : undefined,
        pageId: typeof b.pageId === 'string' ? b.pageId : undefined,
        description: typeof b.description === 'string' ? b.description : undefined,
      };
    }
  } else {
    templateRaw = root;
  }

  const routesRaw = templateRaw.routes;
  const hasRoutes = Array.isArray(routesRaw) && routesRaw.length > 0;

  const uiTreeRaw = templateRaw.uiTree;
  const hasUiTree = uiTreeRaw && typeof uiTreeRaw === 'object' && !Array.isArray(uiTreeRaw);

  if (!hasRoutes && !hasUiTree) {
    return { ok: false, message: '缺少 template.uiTree（对象）或 template.routes（非空数组）' };
  }

  const pageConfig =
    templateRaw.pageConfig && typeof templateRaw.pageConfig === 'object' && !Array.isArray(templateRaw.pageConfig)
      ? ({ ...cloneDeep(templateRaw.pageConfig) } as PageTemplateContent['pageConfig'])
      : ({} as PageTemplateContent['pageConfig']);

  if (pageConfig.propsStorageVersion === undefined || pageConfig.propsStorageVersion === null) {
    pageConfig.propsStorageVersion = PROPS_STORAGE_VERSION;
  }

  const uiTree = (hasUiTree ? uiTreeRaw : MIN_ROOT) as Record<string, unknown>;

  const content: PageTemplateContent = {
    uiTree,
    flowNodes: Array.isArray(templateRaw.flowNodes) ? (templateRaw.flowNodes as Array<Record<string, unknown>>) : [],
    flowEdges: Array.isArray(templateRaw.flowEdges) ? (templateRaw.flowEdges as Array<Record<string, unknown>>) : [],
    pageConfig,
    ...(hasRoutes ? { routes: routesRaw as unknown as RouteTemplateContent[] } : {}),
  };

  try {
    const hydrated = (await hydrateTemplateContentTrees(cloneDeep(content))) as PageTemplateContent;
    return { ok: true, data: { template: hydrated, base: baseOut } };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, message: `模板水合失败：${msg}` };
  }
}
