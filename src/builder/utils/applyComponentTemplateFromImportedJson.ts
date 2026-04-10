import type { ComponentTemplateContent } from '../../api/types';
import type { Edge, Node } from '@xyflow/react';
import cloneDeep from 'lodash/cloneDeep';
import { hydrateTemplateContentTrees, PROPS_STORAGE_VERSION } from '../template/propsHydration';
import type { UiHistoryAction, UiTreeNode } from '../store/types';

export type ParsedComponentTemplateImport = {
  template: ComponentTemplateContent;
  base?: {
    pageName?: string;
    pageId?: string;
    description?: string;
  };
};

/**
 * 解析粘贴的 JSON，支持与接口一致的 `{ base?, template }` 或仅 `template` 根对象。
 * 会对 uiTree 做水合（含嵌套自定义组件的异步拉取）。
 */
export async function applyComponentTemplateFromImportedJson(
  raw: unknown,
): Promise<{ ok: true; data: ParsedComponentTemplateImport } | { ok: false; message: string }> {
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
  let baseOut: ParsedComponentTemplateImport['base'];

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

  if (!templateRaw.uiTree || typeof templateRaw.uiTree !== 'object' || Array.isArray(templateRaw.uiTree)) {
    return { ok: false, message: '缺少 template.uiTree（对象）' };
  }

  const pageConfig =
    templateRaw.pageConfig && typeof templateRaw.pageConfig === 'object' && !Array.isArray(templateRaw.pageConfig)
      ? ({ ...cloneDeep(templateRaw.pageConfig) } as ComponentTemplateContent['pageConfig'])
      : {};

  if (pageConfig.propsStorageVersion === undefined || pageConfig.propsStorageVersion === null) {
    pageConfig.propsStorageVersion = PROPS_STORAGE_VERSION;
  }

  const content: ComponentTemplateContent = {
    uiTree: templateRaw.uiTree as Record<string, unknown>,
    flowNodes: Array.isArray(templateRaw.flowNodes) ? (templateRaw.flowNodes as Array<Record<string, unknown>>) : [],
    flowEdges: Array.isArray(templateRaw.flowEdges) ? (templateRaw.flowEdges as Array<Record<string, unknown>>) : [],
    pageConfig,
  };

  try {
    const hydrated = (await hydrateTemplateContentTrees(cloneDeep(content))) as ComponentTemplateContent;
    return { ok: true, data: { template: hydrated, base: baseOut } };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, message: `模板水合失败：${msg}` };
  }
}

/** 写入 createBuilderStore 的局部状态（不含 currentPage*，由调用方根据 base 决定） */
export function templateToBuilderStatePatch(data: ParsedComponentTemplateImport) {
  const { template } = data;
  const pageConfig = template.pageConfig ?? {};
  const initialTree = template.uiTree as unknown as UiTreeNode;

  return {
    previewUiLibrary: pageConfig.previewUiLibrary === 'antd' ? ('antd' as const) : ('tdesign' as const),
    screenSize: (pageConfig.screenSize as string | number | undefined) ?? 'auto',
    autoWidth:
      typeof pageConfig.autoWidth === 'number' && Number.isFinite(pageConfig.autoWidth)
        ? pageConfig.autoWidth
        : 1800,
    uiPageData: initialTree,
    flowNodes: (template.flowNodes as unknown as Node[]) ?? [],
    flowEdges: (template.flowEdges as unknown as Edge[]) ?? [],
    selectedLayoutTemplateId: (pageConfig.selectedLayoutTemplateId as never) ?? null,
    flowActiveNodeId: null,
    activeNodeKey: null,
    activeNode: null,
    history: { pointer: -1, actions: [] as UiHistoryAction[] },
  };
}
