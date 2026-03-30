import type { ComponentDetail } from '../api/types';
import type { PageRouteRecord, UiTreeNode } from '../builder/store/types';
import { resolveExposedLifecycles, resolveExposedPropSchemas } from './customComponentRuntime';
export type CustomComponentVersionRiskLevel = 'safe' | 'warning' | 'danger';

export type CustomComponentVersionRiskResult = {
  level: CustomComponentVersionRiskLevel;
  reasons: string[];
};

const getSchemaValue = (node: UiTreeNode, propKey: string): unknown => {
  const schema = (node.props?.[propKey] ?? null) as { value?: unknown } | null;
  return schema?.value;
};

const propSchemaMeaningfullySet = (propEntry: unknown): boolean => {
  if (!propEntry || typeof propEntry !== 'object' || Array.isArray(propEntry)) {
    return false;
  }
  const v = (propEntry as { value?: unknown }).value;
  if (v === undefined || v === null) {
    return false;
  }
  if (typeof v === 'string' && v.trim() === '') {
    return false;
  }
  if (typeof v === 'object' && !Array.isArray(v) && Object.keys(v as object).length === 0) {
    return false;
  }
  return true;
};

/**
 * 对比「当前使用版本」与「目标版本」契约，判断切换是否可能破坏父模板对已暴露属性/生命周期的使用。
 * 流程图中对已删除暴露项的引用未纳入（见文档 Phase2）。
 */
export const assessCustomComponentVersionSwitch = (
  instanceNodes: UiTreeNode[],
  sourceDetail: ComponentDetail | null,
  targetDetail: ComponentDetail | null,
): CustomComponentVersionRiskResult => {
  const reasons: string[] = [];
  const warnings: string[] = [];

  if (!targetDetail?.base) {
    return { level: 'danger', reasons: ['无法加载目标版本契约'] };
  }

  const sourceKeys = new Set(resolveExposedLifecycles(sourceDetail));
  const targetKeys = new Set(resolveExposedLifecycles(targetDetail));

  const sourcePropKeys = new Set(resolveExposedPropSchemas(sourceDetail).map((x) => x.propKey));
  const targetPropKeys = new Set(resolveExposedPropSchemas(targetDetail).map((x) => x.propKey));

  instanceNodes.forEach((node) => {
    const lifetimes = Array.isArray(node.lifetimes) ? node.lifetimes : [];
    lifetimes.forEach((k) => {
      const key = String(k ?? '').trim();
      if (!key) {
        return;
      }
      if (!sourceKeys.has(key)) {
        warnings.push(`实例使用了生命周期「${key}」，但当前钉住版本的契约中未声明（可能是历史数据）`);
        return;
      }
      if (!targetKeys.has(key)) {
        reasons.push(`目标版本不再提供生命周期「${key}」，可能影响已配置逻辑`);
      }
    });
  });

  instanceNodes.forEach((node) => {
    if (!node?.props || typeof node.props !== 'object') {
      return;
    }
    const props = node.props as Record<string, unknown>;
    Object.keys(props).forEach((propKey) => {
      if (propKey.startsWith('__')) {
        return;
      }
      if (!sourcePropKeys.has(propKey)) {
        return;
      }
      if (!propSchemaMeaningfullySet(props[propKey])) {
        return;
      }
      if (!targetPropKeys.has(propKey)) {
        reasons.push(`目标版本不再暴露属性「${propKey}」，当前实例已填写该属性`);
      }
    });
  });

  if (reasons.length > 0) {
    return { level: 'danger', reasons };
  }
  if (warnings.length > 0) {
    return { level: 'warning', reasons: warnings };
  }
  return { level: 'safe', reasons: [] };
};

/** 从整棵树收集某 componentId 的实例节点（用于风险评估，需完整 UiTreeNode） */
export const collectCustomComponentNodesForId = (root: UiTreeNode | null | undefined, componentId: string): UiTreeNode[] => {
  const id = String(componentId ?? '').trim();
  if (!root || !id) {
    return [];
  }
  const out: UiTreeNode[] = [];
  const walk = (node: UiTreeNode) => {
    const type = String(node.type ?? '').trim();
    if (type === 'CustomComponent') {
      const cid = String(getSchemaValue(node, '__componentId') ?? '').trim();
      if (cid === id) {
        out.push(node);
      }
    }
    (node.children ?? []).forEach((child) => walk(child));
  };
  walk(root);
  return out;
};

export const collectPageCustomComponentNodesForId = (
  pageRoutes: PageRouteRecord[],
  sharedUiTree: UiTreeNode | null,
  componentId: string,
): UiTreeNode[] => {
  const roots: UiTreeNode[] = [];
  if (sharedUiTree) {
    roots.push(sharedUiTree);
  }
  pageRoutes.forEach((r) => roots.push(r.uiTree));
  return roots.flatMap((root) => collectCustomComponentNodesForId(root, componentId));
};
