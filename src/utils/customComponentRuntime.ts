import cloneDeep from 'lodash/cloneDeep';
import { getPageDetail } from '../api/pageTemplate';
import type { PageDetail } from '../api/types';
import type { UiTreeNode } from '../builder/store/types';

interface ComponentContract {
  exposedProps?: Array<{
    propKey?: string;
    sourceKey?: string;
    sourceRef?: string;
  }>;
}

const detailCache = new Map<string, Promise<PageDetail | null>>();

const normalizeComponentId = (componentId: string) => String(componentId ?? '').trim();

const walkTree = (node: UiTreeNode, visitor: (item: UiTreeNode) => void) => {
  visitor(node);
  (node.children ?? []).forEach((child) => walkTree(child, visitor));
};

const findNodeByKey = (root: UiTreeNode, key: string): UiTreeNode | null => {
  if (!key) {
    return null;
  }

  if (root.key === key) {
    return root;
  }

  for (const child of root.children ?? []) {
    const found = findNodeByKey(child, key);
    if (found) {
      return found;
    }
  }

  return null;
};

export const getNodePropValue = (node: UiTreeNode | undefined, propName: string): unknown => {
  const prop = node?.props?.[propName] as { value?: unknown } | undefined;
  return prop?.value;
};

export const getNodeStringProp = (node: UiTreeNode | undefined, propName: string): string => {
  const value = getNodePropValue(node, propName);
  return typeof value === 'string' ? value.trim() : '';
};

export const loadCustomComponentDetail = async (componentId: string): Promise<PageDetail | null> => {
  const normalizedId = normalizeComponentId(componentId);
  if (!normalizedId) {
    return null;
  }

  if (!detailCache.has(normalizedId)) {
    detailCache.set(
      normalizedId,
      getPageDetail(normalizedId)
        .then((res) => res.data ?? null)
        .catch(() => null),
    );
  }

  return detailCache.get(normalizedId) ?? null;
};

export const cloneTemplateUiTree = (detail: PageDetail | null): UiTreeNode | null => {
  const tree = detail?.template?.uiTree as unknown;
  if (!tree || typeof tree !== 'object' || Array.isArray(tree)) {
    return null;
  }

  return cloneDeep(tree as UiTreeNode);
};

export const applyExposedPropsToTemplate = (
  instanceNode: UiTreeNode,
  templateRoot: UiTreeNode,
  detail: PageDetail | null,
): UiTreeNode => {
  const contract = (detail?.template?.pageConfig?.componentContract ?? null) as ComponentContract | null;
  const exposedProps = Array.isArray(contract?.exposedProps) ? contract?.exposedProps ?? [] : [];

  if (exposedProps.length === 0) {
    return templateRoot;
  }

  const nextRoot = cloneDeep(templateRoot);

  exposedProps.forEach((item) => {
    const propKey = String(item?.propKey ?? '').trim();
    if (!propKey) {
      return;
    }

    const externalValue = getNodePropValue(instanceNode, propKey);
    if (externalValue === undefined) {
      return;
    }

    const sourceRef = String(item?.sourceRef ?? '').trim();
    const sourceKeyFromRef = sourceRef.startsWith('root::') ? sourceRef.slice('root::'.length) : '';
    const sourceKey = sourceKeyFromRef || String(item?.sourceKey ?? '').trim();
    if (!sourceKey) {
      return;
    }

    const targetNode = findNodeByKey(nextRoot, sourceKey);
    if (!targetNode) {
      return;
    }

    const targetProps = (targetNode.props ?? {}) as Record<string, unknown>;
    const targetProp = (targetProps[propKey] ?? {}) as Record<string, unknown>;
    targetNode.props = {
      ...targetProps,
      [propKey]: {
        ...targetProp,
        value: externalValue,
      },
    };
  });

  return nextRoot;
};

export const namespaceUiTreeKeys = (root: UiTreeNode, namespace: string): UiTreeNode => {
  const normalizedNs = String(namespace ?? '').trim();
  if (!normalizedNs) {
    return root;
  }

  const nextRoot = cloneDeep(root);
  walkTree(nextRoot, (node) => {
    const originalKey = String(node.key ?? '').trim();
    node.key = `${normalizedNs}:${originalKey}`;
  });

  return nextRoot;
};
