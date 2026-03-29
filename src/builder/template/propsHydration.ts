/**
 * 模板 props 脱水存储（v2）与前端水合。
 * 持久化：props[key] 仅存 schema.value；内存/编辑器仍为完整 { name, editType, value, payload? }。
 */

import cloneDeep from 'lodash/cloneDeep';
import componentCatalog from '../../config/componentCatalog';
import requestClient from '../../api/request';
import type { ApiResponse, ComponentDetail, ComponentTemplateContent, PageDetail, PageTemplateContent } from '../../api/types';
import type { UiTreeNode } from '../store/types';
import { SLOT_PROP_KEY } from '../utils/slot';
import { resolveComponentSlots, resolveExposedPropSchemas } from '../../utils/customComponentRuntime';

/** 节点自定义样式；内存里常为 { value: CSS对象 } 且无 editType，脱水后原样落库，水合时不能当「整坨 value」再包一层。 */
const STYLE_PROP_KEY = '__style';

export const PROPS_STORAGE_VERSION = 2;

export type HydrateContext = {
  customDetailsById: Map<string, ComponentDetail | null>;
};

const catalogByType = new Map<string, (typeof componentCatalog)[number]>();
componentCatalog.forEach((item) => {
  const t = String(item.type ?? '').trim();
  if (t) {
    catalogByType.set(t, item);
  }
});

export const isLegacyPropEntry = (v: unknown): boolean => {
  if (!v || typeof v !== 'object' || Array.isArray(v)) {
    return false;
  }
  const o = v as Record<string, unknown>;
  return typeof o.editType === 'string' || typeof o.editInput === 'string';
};

export const extractStoredPropValue = (raw: unknown): unknown => {
  if (isLegacyPropEntry(raw)) {
    return cloneDeep((raw as { value?: unknown }).value);
  }
  return cloneDeep(raw);
};

/** 插槽节点 props.__slot 仅存 { value: slotKey }，不能走通用 hydrate（否则会被包成 editor schema，导致 getNodeSlotKey 失效）。 */
const normalizeHydratedSlotProp = (raw: unknown): { value: string } | undefined => {
  let cur: unknown = raw;
  for (let i = 0; i < 8 && cur != null; i += 1) {
    if (typeof cur === 'string' && cur.trim()) {
      return { value: cur.trim() };
    }
    if (!cur || typeof cur !== 'object' || Array.isArray(cur)) {
      return undefined;
    }
    if (isLegacyPropEntry(cur)) {
      cur = (cur as { value?: unknown }).value;
      continue;
    }
    if ('value' in (cur as object)) {
      cur = (cur as { value: unknown }).value;
      continue;
    }
    return undefined;
  }
  return undefined;
};

/** 得到 props.__style.value 应有的扁平 CSS 对象。 */
const normalizeHydratedStylePropValue = (raw: unknown): Record<string, unknown> => {
  let cur: unknown = raw;
  for (let i = 0; i < 8; i += 1) {
    if (cur === null || cur === undefined) {
      return {};
    }
    if (typeof cur !== 'object' || Array.isArray(cur)) {
      return {};
    }
    if (isLegacyPropEntry(cur)) {
      cur = (cur as { value?: unknown }).value;
      continue;
    }
    const o = cur as Record<string, unknown>;
    const keys = Object.keys(o);
    if (keys.length === 1 && keys[0] === 'value') {
      const inner = o.value;
      if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
        cur = inner;
        continue;
      }
      return {};
    }
    return { ...o };
  }
  return {};
};

export const dehydrateProps = (props: Record<string, unknown> | undefined): Record<string, unknown> => {
  if (!props || typeof props !== 'object') {
    return {};
  }
  const out: Record<string, unknown> = {};
  Object.keys(props).forEach((key) => {
    const v = props[key];
    if (isLegacyPropEntry(v)) {
      out[key] = cloneDeep((v as { value?: unknown }).value);
    } else {
      out[key] = cloneDeep(v);
    }
  });
  return out;
};

export const dehydrateUiTree = (node: UiTreeNode | Record<string, unknown>): UiTreeNode => {
  const base = cloneDeep(node) as UiTreeNode;
  const nextProps = dehydrateProps(base.props as Record<string, unknown> | undefined);
  const children = (base.children ?? []).map((ch) => dehydrateUiTree(ch));
  return {
    ...base,
    props: nextProps,
    children,
  };
};

function buildCustomComponentBlueprint(detail: ComponentDetail | null): Record<string, Record<string, unknown>> {
  if (!detail?.base) {
    return {};
  }
  const base = detail.base;
  const exposedPropSchemas = resolveExposedPropSchemas(detail);
  const componentSlots = resolveComponentSlots(detail);

  const props: Record<string, Record<string, unknown>> = {
    __componentId: {
      name: '组件ID',
      value: String(base.pageId ?? ''),
      editType: 'input',
    },
    __componentName: {
      name: '组件名称',
      value: String(base.pageName ?? base.pageId ?? '自定义组件'),
      editType: 'input',
    },
    __componentVersion: {
      name: '组件版本',
      value: Number.isFinite(Number((base as { currentVersion?: unknown }).currentVersion))
        ? Number((base as { currentVersion?: unknown }).currentVersion)
        : 0,
      editType: 'inputNumber',
    },
    __componentUpdatedAt: {
      name: '组件更新时间',
      value: String((base as { updatedAt?: unknown }).updatedAt ?? ''),
      editType: 'input',
    },
    __slots: {
      name: '插槽定义',
      value: componentSlots,
      editType: 'jsonCode',
    },
  };

  exposedPropSchemas.forEach((item) => {
    props[item.propKey] = {
      ...item.schema,
      name: String(item.schema.name ?? item.propKey),
      value: item.schema.value ?? '',
    };
  });

  return props;
}

export const hydrateProps = (
  type: string,
  props: Record<string, unknown> | undefined,
  ctx: HydrateContext,
): Record<string, unknown> => {
  const incoming = props && typeof props === 'object' ? props : {};
  const t = String(type ?? '').trim();

  if (t === 'CustomComponent') {
    return hydrateCustomComponentProps(incoming, ctx);
  }

  const catalogProps = catalogByType.get(t)?.props as Record<string, Record<string, unknown>> | undefined;
  const keys = new Set<string>([...Object.keys(catalogProps ?? {}), ...Object.keys(incoming)]);
  const out: Record<string, unknown> = {};

  keys.forEach((key) => {
    const raw = incoming[key];
    const bp = catalogProps?.[key] as Record<string, unknown> | undefined;

    if (raw === undefined && bp) {
      out[key] = cloneDeep(bp);
      return;
    }

    if (raw === undefined) {
      return;
    }

    if (key === SLOT_PROP_KEY) {
      const slot = normalizeHydratedSlotProp(raw);
      if (slot) {
        out[key] = slot;
      }
      return;
    }

    if (key === STYLE_PROP_KEY) {
      out[key] = {
        name: '__style',
        value: normalizeHydratedStylePropValue(raw),
        editType: 'jsonCode',
      };
      return;
    }

    const extracted = extractStoredPropValue(raw);

    if (bp) {
      out[key] = {
        ...cloneDeep(bp),
        value: extracted !== undefined ? extracted : cloneDeep((bp as { value?: unknown }).value),
      };
    } else if (isLegacyPropEntry(raw)) {
      out[key] = cloneDeep(raw) as Record<string, unknown>;
    } else {
      out[key] = {
        name: key,
        value: extracted,
        editType: 'jsonCode',
      };
    }
  });

  return out;
};

function hydrateCustomComponentProps(
  incoming: Record<string, unknown>,
  ctx: HydrateContext,
): Record<string, unknown> {
  const idRaw = incoming.__componentId;
  const componentId =
    typeof idRaw === 'string'
      ? idRaw.trim()
      : String(extractStoredPropValue(idRaw) ?? '').trim();

  const detail = componentId ? ctx.customDetailsById.get(componentId) ?? null : null;
  const blueprint = buildCustomComponentBlueprint(detail);

  const keys = new Set<string>([...Object.keys(blueprint), ...Object.keys(incoming)]);
  const out: Record<string, unknown> = {};

  keys.forEach((key) => {
    const raw = incoming[key];
    const bp = blueprint[key];

    if (raw === undefined && bp) {
      out[key] = cloneDeep(bp);
      return;
    }

    if (raw === undefined) {
      return;
    }

    if (key === SLOT_PROP_KEY) {
      const slot = normalizeHydratedSlotProp(raw);
      if (slot) {
        out[key] = slot;
      }
      return;
    }

    if (key === STYLE_PROP_KEY) {
      out[key] = {
        name: '__style',
        value: normalizeHydratedStylePropValue(raw),
        editType: 'jsonCode',
      };
      return;
    }

    const extracted = extractStoredPropValue(raw);

    if (bp) {
      out[key] = {
        ...cloneDeep(bp),
        value: extracted !== undefined ? extracted : cloneDeep((bp as { value?: unknown }).value),
      };
    } else if (isLegacyPropEntry(raw)) {
      out[key] = cloneDeep(raw) as Record<string, unknown>;
    } else {
      out[key] = {
        name: key,
        value: extracted,
        editType: 'jsonCode',
      };
    }
  });

  return out;
}

export const hydrateUiTree = (node: UiTreeNode | Record<string, unknown>, ctx: HydrateContext): UiTreeNode => {
  const base = cloneDeep(node) as UiTreeNode;
  const type = String(base.type ?? '').trim();
  const nextProps = hydrateProps(type, base.props as Record<string, unknown> | undefined, ctx);
  const nextChildren = (base.children ?? []).map((ch) => hydrateUiTree(ch, ctx));
  return {
    ...base,
    props: nextProps,
    children: nextChildren,
  };
};

export const collectCustomComponentIdsFromUiTree = (node: unknown, into?: Set<string>): Set<string> => {
  const set = into ?? new Set<string>();
  if (!node || typeof node !== 'object' || Array.isArray(node)) {
    return set;
  }
  const n = node as UiTreeNode;
  const nodeType = String(n.type ?? '').trim();
  const props = n.props as Record<string, unknown> | undefined;

  if (nodeType === 'CustomComponent') {
    const raw = props?.__componentId;
    const id = typeof raw === 'string' ? raw.trim() : String(extractStoredPropValue(raw) ?? '').trim();
    if (id) {
      set.add(id);
    }
  }

  (n.children ?? []).forEach((ch) => collectCustomComponentIdsFromUiTree(ch, set));
  return set;
};

export const collectCustomComponentIdsFromTemplateContent = (
  template: PageTemplateContent | ComponentTemplateContent | Record<string, unknown> | null | undefined,
): string[] => {
  if (!template || typeof template !== 'object') {
    return [];
  }
  const t = template as PageTemplateContent;
  const set = new Set<string>();

  if (t.uiTree) {
    collectCustomComponentIdsFromUiTree(t.uiTree, set);
  }
  if (Array.isArray(t.routes)) {
    t.routes.forEach((route) => {
      if (route?.uiTree) {
        collectCustomComponentIdsFromUiTree(route.uiTree, set);
      }
    });
  }
  const pc = t.pageConfig as Record<string, unknown> | undefined;
  if (pc?.sharedUiTree && typeof pc.sharedUiTree === 'object' && !Array.isArray(pc.sharedUiTree)) {
    collectCustomComponentIdsFromUiTree(pc.sharedUiTree, set);
  }

  return Array.from(set);
};

async function fetchRawComponentDetail(componentId: string): Promise<ComponentDetail | null> {
  const id = String(componentId ?? '').trim();
  if (!id) {
    return null;
  }

  try {
    const response = await requestClient.get<ApiResponse<ComponentDetail>>(`/page-template/${id}`, {
      params: { entityType: 'component' },
    });
    const body = response.data;
    if (!body?.data?.base?.pageId) {
      return null;
    }
    return cloneDeep(body.data);
  } catch {
    return null;
  }
}

async function ensureTransitiveRawComponentDetails(
  seedIds: string[],
  rawMap: Map<string, ComponentDetail>,
): Promise<void> {
  const queue = seedIds.filter(Boolean).map((s) => String(s).trim()).filter(Boolean);
  const seen = new Set<string>();

  while (queue.length > 0) {
    const id = queue.pop()!;
    if (seen.has(id)) {
      continue;
    }
    seen.add(id);

    if (!rawMap.has(id)) {
      const detail = await fetchRawComponentDetail(id);
      if (detail?.base?.pageId) {
        rawMap.set(detail.base.pageId, detail);
      }
    }

    const detail = rawMap.get(id);
    const nested = detail ? collectCustomComponentIdsFromUiTree(detail.template?.uiTree as unknown) : new Set<string>();
    nested.forEach((nid) => {
      if (!seen.has(nid)) {
        queue.push(nid);
      }
    });
  }
}

function hydrateComponentDetailDeep(
  componentId: string,
  rawMap: Map<string, ComponentDetail>,
  hydratedMap: Map<string, ComponentDetail>,
): void {
  if (hydratedMap.has(componentId)) {
    return;
  }

  const raw = rawMap.get(componentId);
  if (!raw?.template?.uiTree) {
    return;
  }

  const nested = [...collectCustomComponentIdsFromUiTree(raw.template.uiTree)];
  nested.forEach((nid) => hydrateComponentDetailDeep(nid, rawMap, hydratedMap));

  const inner = new Map<string, ComponentDetail | null>();
  nested.forEach((nid) => {
    inner.set(nid, hydratedMap.get(nid) ?? null);
  });

  const newTree = hydrateUiTree(raw.template.uiTree as unknown as UiTreeNode, { customDetailsById: inner });
  hydratedMap.set(componentId, {
    ...raw,
    template: {
      ...raw.template,
      uiTree: newTree as unknown as Record<string, unknown>,
    },
  });
}

function buildHydratedCustomDetailsMap(rawMap: Map<string, ComponentDetail>): Map<string, ComponentDetail | null> {
  const hydratedMap = new Map<string, ComponentDetail>();
  rawMap.forEach((_v, id) => {
    hydrateComponentDetailDeep(id, rawMap, hydratedMap);
  });
  const out = new Map<string, ComponentDetail | null>();
  rawMap.forEach((_v, id) => {
    out.set(id, hydratedMap.get(id) ?? null);
  });
  return out;
}

export async function hydrateTemplateContentTrees(
  template: PageTemplateContent | ComponentTemplateContent,
): Promise<PageTemplateContent | ComponentTemplateContent> {
  const next = cloneDeep(template);
  const seedIds = collectCustomComponentIdsFromTemplateContent(next);
  const rawMap = new Map<string, ComponentDetail>();

  await ensureTransitiveRawComponentDetails(seedIds, rawMap);

  const customDetailsById = buildHydratedCustomDetailsMap(rawMap);

  if (next.uiTree) {
    next.uiTree = hydrateUiTree(next.uiTree as unknown as UiTreeNode, { customDetailsById }) as unknown as Record<
      string,
      unknown
    >;
  }

  if (Array.isArray(next.routes)) {
    next.routes = next.routes.map((route) => ({
      ...route,
      uiTree: route.uiTree
        ? (hydrateUiTree(route.uiTree as unknown as UiTreeNode, { customDetailsById }) as unknown as Record<
            string,
            unknown
          >)
        : route.uiTree,
    }));
  }

  const pc = next.pageConfig as Record<string, unknown> | undefined;
  if (pc && pc.sharedUiTree && typeof pc.sharedUiTree === 'object' && !Array.isArray(pc.sharedUiTree)) {
    next.pageConfig = {
      ...pc,
      sharedUiTree: hydrateUiTree(pc.sharedUiTree as UiTreeNode, { customDetailsById }) as unknown as Record<
        string,
        unknown
      >,
    };
  }

  return next;
}

export async function hydratePageDetailFromApi(detail: PageDetail): Promise<PageDetail> {
  if (!detail?.template) {
    return cloneDeep(detail);
  }
  const template = await hydrateTemplateContentTrees(cloneDeep(detail.template));
  return { ...detail, template };
}

export async function hydrateComponentDetailFromApi(detail: ComponentDetail): Promise<ComponentDetail> {
  if (!detail?.template) {
    return cloneDeep(detail);
  }
  const selfId = String(detail.base?.pageId ?? '').trim();
  const rawMap = new Map<string, ComponentDetail>();

  if (selfId) {
    rawMap.set(selfId, cloneDeep(detail));
  }

  const nested = collectCustomComponentIdsFromUiTree(detail.template?.uiTree);
  await ensureTransitiveRawComponentDetails([...nested], rawMap);

  const hydratedMap = new Map<string, ComponentDetail>();
  rawMap.forEach((_v, id) => {
    hydrateComponentDetailDeep(id, rawMap, hydratedMap);
  });

  const hydratedSelf = selfId ? hydratedMap.get(selfId) : null;
  if (!hydratedSelf) {
    const customDetailsById = buildHydratedCustomDetailsMap(rawMap);
    const ui = detail.template.uiTree
      ? hydrateUiTree(detail.template.uiTree as unknown as UiTreeNode, { customDetailsById })
      : detail.template.uiTree;
    return {
      ...detail,
      template: {
        ...detail.template,
        uiTree: ui as unknown as Record<string, unknown>,
      },
    };
  }

  return hydratedSelf;
}
