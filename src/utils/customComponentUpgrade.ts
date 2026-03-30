import type { UiTreeNode } from '../builder/store/types';
import type { ComponentDetail, ComponentTemplateBaseInfo } from '../api/types';
import { getComponentTemplateDetail } from '../api/componentTemplate';
import { extractStoredPropValue } from '../builder/template/propsHydration';
import { resolveComponentSlots, resolveExposedLifecycles, resolveExposedPropSchemas } from './customComponentRuntime';
import type { PageRouteRecord } from '../builder/store/types';
import { composeRouteUiTreeForEditor } from './pageEditorCompose';

export type CustomComponentInstanceMeta = {
  nodeKey: string;
  componentId: string;
  usedVersion?: number;
  usedUpdatedAt?: string;
  displayName?: string;
};

export type ComponentTemplateBundle = {
  base: ComponentTemplateBaseInfo;
  detail: ComponentDetail | null;
};

/** 与 dehydrate/v2 水合一致：支持 { value }、简写及落库后的原始值 */
const readCustomComponentPropValue = (node: UiTreeNode, propKey: string): unknown => {
  const raw = (node.props ?? {})[propKey];
  return extractStoredPropValue(raw);
};

export const collectCustomComponentInstances = (root: UiTreeNode | null | undefined): CustomComponentInstanceMeta[] => {
  if (!root) {
    return [];
  }

  const result: CustomComponentInstanceMeta[] = [];
  const walk = (node: UiTreeNode) => {
    const type = String(node.type ?? '').trim();
    if (type === 'CustomComponent') {
      const componentIdRaw = readCustomComponentPropValue(node, '__componentId');
      const componentId = typeof componentIdRaw === 'string' ? componentIdRaw.trim() : String(componentIdRaw ?? '').trim();
      if (componentId) {
        const usedVersionRaw = readCustomComponentPropValue(node, '__componentVersion');
        const usedVersion = Number(usedVersionRaw);
        const usedUpdatedAtRaw = readCustomComponentPropValue(node, '__componentUpdatedAt');
        const usedUpdatedAt = String(usedUpdatedAtRaw ?? '').trim() || undefined;
        const displayNameRaw = readCustomComponentPropValue(node, '__componentName');
        const displayName =
          typeof displayNameRaw === 'string' && displayNameRaw.trim()
            ? displayNameRaw.trim()
            : undefined;
        result.push({
          nodeKey: String(node.key ?? ''),
          componentId,
          usedVersion: Number.isFinite(usedVersion) ? usedVersion : undefined,
          usedUpdatedAt,
          displayName,
        });
      }
    }

    (node.children ?? []).forEach((child) => walk(child));
  };

  walk(root);
  return result;
};

export const fetchComponentTemplateBundle = async (
  componentId: string,
  version?: number | null,
): Promise<ComponentTemplateBundle | null> => {
  const id = String(componentId ?? '').trim();
  if (!id) {
    return null;
  }

  try {
    const v = Number(version);
    const res =
      Number.isFinite(v) && v > 0
        ? await getComponentTemplateDetail(id, { version: Math.floor(v) })
        : await getComponentTemplateDetail(id);
    const detail = res.data as ComponentDetail | undefined;
    if (!detail?.base) {
      return null;
    }

    return {
      base: detail.base,
      detail,
    };
  } catch {
    return null;
  }
};

/**
 * 拉取依赖组件「当前最新」详情（用于无感升级点击时，避免使用进入页面时缓存的 stale 数据）。
 */
export const fetchLatestComponentBundle = async (componentId: string): Promise<ComponentTemplateBundle | null> => {
  return fetchComponentTemplateBundle(componentId, null);
};

const normalizeNumber = (value: unknown): number | undefined => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }
  return parsed;
};

export const applyTemplateBundleToCustomComponentNode = (
  node: UiTreeNode,
  bundle: ComponentTemplateBundle,
): UiTreeNode => {
  const componentIdRaw = readCustomComponentPropValue(node, '__componentId');
  const componentId = typeof componentIdRaw === 'string' ? componentIdRaw.trim() : String(componentIdRaw ?? '').trim();
  if (!componentId) {
    return node;
  }

  const exposedPropSchemas = resolveExposedPropSchemas(bundle.detail);
  const exposedLifecycles = resolveExposedLifecycles(bundle.detail);
  const componentSlots = resolveComponentSlots(bundle.detail);

  const currentProps = (node.props ?? {}) as Record<string, unknown>;
  const nextProps: Record<string, unknown> = {
    ...currentProps,
    __componentId: currentProps.__componentId ?? {
      name: '组件ID',
      value: componentId,
      editType: 'input',
    },
    __componentName: {
      ...(currentProps.__componentName as Record<string, unknown> | undefined),
      name: '组件名称',
      value: String(bundle.base.pageName ?? componentId),
      editType: 'input',
    },
    __componentVersion: {
      ...(currentProps.__componentVersion as Record<string, unknown> | undefined),
      name: '组件版本',
      value: normalizeNumber(bundle.base.currentVersion) ?? 0,
      editType: 'inputNumber',
    },
    __componentUpdatedAt: {
      ...(currentProps.__componentUpdatedAt as Record<string, unknown> | undefined),
      name: '组件更新时间',
      value: String(bundle.base.updatedAt ?? ''),
      editType: 'input',
    },
    __slots: {
      ...(currentProps.__slots as Record<string, unknown> | undefined),
      name: '插槽定义',
      value: componentSlots,
      editType: 'jsonCode',
    },
  };

  exposedPropSchemas.forEach((item) => {
    const key = item.propKey;
    nextProps[key] = {
      ...item.schema,
      name: String(item.schema.name ?? key),
    };
  });

  return {
    ...node,
    props: nextProps as any,
    lifetimes: Array.from(new Set(exposedLifecycles)),
  };
};

export const upgradeCustomComponentsInTree = (
  root: UiTreeNode,
  bundleById: Map<string, ComponentTemplateBundle>,
): UiTreeNode => {
  const visit = (node: UiTreeNode): UiTreeNode => {
    const type = String(node.type ?? '').trim();
    const cidRaw = type === 'CustomComponent' ? readCustomComponentPropValue(node, '__componentId') : '';
    const componentId =
      type === 'CustomComponent'
        ? (typeof cidRaw === 'string' ? cidRaw.trim() : String(cidRaw ?? '').trim())
        : '';
    const bundle = componentId ? bundleById.get(componentId) : undefined;
    const upgradedSelf = bundle ? applyTemplateBundleToCustomComponentNode(node, bundle) : node;
    const children = upgradedSelf.children ?? [];
    if (!children.length) {
      return upgradedSelf;
    }
    const nextChildren = children.map((child) => visit(child));
    const same = nextChildren.every((child, idx) => child === children[idx]);
    return same ? upgradedSelf : { ...upgradedSelf, children: nextChildren };
  };

  return visit(root);
};

export type PageEditorSnapshotForDeps = {
  sharedUiTree: UiTreeNode | null;
  pageRoutes: PageRouteRecord[];
  activePageRouteId: string | null;
  activeRouteOutletKey: string | null;
  uiPageData: UiTreeNode;
};

export const applyBundlesToPageEditorSnapshot = (
  state: PageEditorSnapshotForDeps,
  bundleById: Map<string, ComponentTemplateBundle>,
): { sharedUiTree: UiTreeNode | null; pageRoutes: PageRouteRecord[]; uiPageData: UiTreeNode; didMutate: boolean } => {
  const nextShared = state.sharedUiTree
    ? upgradeCustomComponentsInTree(state.sharedUiTree, bundleById)
    : state.sharedUiTree;
  const nextRoutes = (state.pageRoutes ?? []).map((r) => ({
    ...r,
    uiTree: upgradeCustomComponentsInTree(r.uiTree, bundleById),
  }));
  const didMutate =
    nextShared !== state.sharedUiTree
    || (state.pageRoutes ?? []).some((route, index) => nextRoutes[index]?.uiTree !== route.uiTree);
  const activeRouteId = state.activePageRouteId;
  const activeRoute = nextRoutes.find((r) => r.routeId === activeRouteId) ?? nextRoutes[0];
  const nextUi = activeRoute
    ? composeRouteUiTreeForEditor(activeRoute.uiTree, nextShared, state.activeRouteOutletKey ?? null)
    : state.uiPageData;

  return {
    sharedUiTree: nextShared,
    pageRoutes: nextRoutes,
    uiPageData: nextUi,
    didMutate,
  };
};
