import type { UiTreeNode } from '../builder/store/types';
import type { ComponentDetail, ComponentTemplateBaseInfo } from '../api/types';
import { resolveComponentSlots, resolveExposedLifecycles, resolveExposedPropSchemas } from './customComponentRuntime';

export type CustomComponentInstanceMeta = {
  nodeKey: string;
  componentId: string;
  usedVersion?: number;
  usedUpdatedAt?: string;
};

const getSchemaValue = (node: UiTreeNode, propKey: string): unknown => {
  const schema = (node.props?.[propKey] ?? null) as { value?: unknown } | null;
  return schema?.value;
};

export const collectCustomComponentInstances = (root: UiTreeNode | null | undefined): CustomComponentInstanceMeta[] => {
  if (!root) {
    return [];
  }

  const result: CustomComponentInstanceMeta[] = [];
  const walk = (node: UiTreeNode) => {
    const type = String(node.type ?? '').trim();
    if (type === 'CustomComponent') {
      const componentId = String(getSchemaValue(node, '__componentId') ?? '').trim();
      if (componentId) {
        const usedVersionRaw = getSchemaValue(node, '__componentVersion');
        const usedVersion = Number(usedVersionRaw);
        const usedUpdatedAt = String(getSchemaValue(node, '__componentUpdatedAt') ?? '').trim() || undefined;
        result.push({
          nodeKey: String(node.key ?? ''),
          componentId,
          usedVersion: Number.isFinite(usedVersion) ? usedVersion : undefined,
          usedUpdatedAt,
        });
      }
    }

    (node.children ?? []).forEach((child) => walk(child));
  };

  walk(root);
  return result;
};

type LatestComponentInfo = {
  base: ComponentTemplateBaseInfo;
  detail: ComponentDetail | null;
};

const normalizeNumber = (value: unknown): number | undefined => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }
  return parsed;
};

const upgradeCustomComponentNode = (
  node: UiTreeNode,
  latest: LatestComponentInfo,
): UiTreeNode => {
  const componentId = String(getSchemaValue(node, '__componentId') ?? '').trim();
  if (!componentId || componentId !== String(latest.base.pageId ?? '').trim()) {
    return node;
  }

  const exposedPropSchemas = resolveExposedPropSchemas(latest.detail);
  const exposedLifecycles = resolveExposedLifecycles(latest.detail);
  const componentSlots = resolveComponentSlots(latest.detail);

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
      value: String(latest.base.pageName ?? componentId),
      editType: 'input',
    },
    __componentVersion: {
      ...(currentProps.__componentVersion as Record<string, unknown> | undefined),
      name: '组件版本',
      value: normalizeNumber(latest.base.currentVersion) ?? 0,
      editType: 'inputNumber',
    },
    __componentUpdatedAt: {
      ...(currentProps.__componentUpdatedAt as Record<string, unknown> | undefined),
      name: '组件更新时间',
      value: String(latest.base.updatedAt ?? ''),
      editType: 'input',
    },
    __slots: {
      ...(currentProps.__slots as Record<string, unknown> | undefined),
      name: '插槽定义',
      value: componentSlots,
      editType: 'jsonCode',
    },
  };

  // 合并暴露属性：保留旧值；缺失则用 schema.value 兜底
  exposedPropSchemas.forEach((item) => {
    const key = item.propKey;
    const existingSchema = (currentProps[key] ?? null) as { value?: unknown } | null;
    const existingValue = existingSchema?.value;
    nextProps[key] = {
      ...item.schema,
      name: String(item.schema.name ?? key),
      value: typeof existingValue === 'undefined' ? (item.schema.value ?? '') : existingValue,
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
  latestById: Map<string, LatestComponentInfo>,
): UiTreeNode => {
  const visit = (node: UiTreeNode): UiTreeNode => {
    const type = String(node.type ?? '').trim();
    const componentId = type === 'CustomComponent' ? String(getSchemaValue(node, '__componentId') ?? '').trim() : '';
    const latest = componentId ? latestById.get(componentId) : undefined;
    const upgradedSelf = latest ? upgradeCustomComponentNode(node, latest) : node;
    const children = upgradedSelf.children ?? [];
    if (!children.length) {
      return upgradedSelf;
    }
    const nextChildren = children.map((child) => visit(child));
    // 避免不必要的对象抖动
    const same = nextChildren.every((child, idx) => child === children[idx]);
    return same ? upgradedSelf : { ...upgradedSelf, children: nextChildren };
  };

  return visit(root);
};

