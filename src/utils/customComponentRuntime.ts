import cloneDeep from 'lodash/cloneDeep';
import { getPageDetail } from '../api/pageTemplate';
import type { PageDetail } from '../api/types';
import type { UiTreeNode } from '../builder/store/types';

interface ComponentContract {
  exposedProps?: Array<string | {
    propKey?: string;
    sourceKey?: string;
    sourceRef?: string;
    key?: string;
  }>;
  exposedLifecycles?: Array<string | {
    lifetime?: string;
    key?: string;
  }>;
}

interface ExposedPropSchemaItem {
  propKey: string;
  schema: Record<string, unknown>;
}

interface ExposedPropRefItem {
  propKey: string;
  key?: string;
  sourceKey?: string;
  sourceRef?: string;
}

const tryParseJsonObject = (value: unknown): Record<string, unknown> | null => {
  if (!value) {
    return null;
  }

  if (typeof value === 'string') {
    const text = value.trim();
    if (!text) {
      return null;
    }

    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
      return null;
    } catch {
      return null;
    }
  }

  if (typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return null;
};

const resolveComponentContract = (detail: PageDetail | null): ComponentContract | null => {
  const pageConfigRaw = detail?.template?.pageConfig;
  const pageConfig = tryParseJsonObject(pageConfigRaw);
  if (!pageConfig) {
    return null;
  }

  const contractRaw = pageConfig.componentContract;
  const contractObject = tryParseJsonObject(contractRaw);
  if (!contractObject) {
    return null;
  }

  return contractObject as ComponentContract;
};

const resolveFlowNodeExposedProps = (detail: PageDetail | null): ExposedPropRefItem[] => {
  const flowNodes = Array.isArray(detail?.template?.flowNodes)
    ? (detail?.template?.flowNodes as Array<Record<string, unknown>>)
    : [];

  const result: ExposedPropRefItem[] = [];
  flowNodes.forEach((node) => {
    const nodeType = String(node?.type ?? '').trim();
    if (nodeType !== 'propExposeNode') {
      return;
    }

    const data = (node?.data ?? {}) as Record<string, unknown>;
    const sourceKey = typeof data.sourceKey === 'string' ? data.sourceKey : '';
    const sourceRef = typeof data.sourceRef === 'string' ? data.sourceRef : '';
    const selectedPropKeys = Array.isArray(data.selectedPropKeys)
      ? data.selectedPropKeys.map((item) => String(item ?? '').trim()).filter(Boolean)
      : [];

    selectedPropKeys.forEach((propKey) => {
      result.push({
        propKey,
        sourceKey,
        sourceRef,
      });
    });
  });

  return result;
};

const resolveFlowNodeExposedLifecycles = (detail: PageDetail | null): string[] => {
  const flowNodes = Array.isArray(detail?.template?.flowNodes)
    ? (detail?.template?.flowNodes as Array<Record<string, unknown>>)
    : [];

  const lifecycles: string[] = [];
  flowNodes.forEach((node) => {
    const nodeType = String(node?.type ?? '').trim();
    if (nodeType !== 'lifecycleExposeNode') {
      return;
    }

    const data = (node?.data ?? {}) as Record<string, unknown>;
    const selectedLifetimes = Array.isArray(data.selectedLifetimes)
      ? data.selectedLifetimes.map((item) => String(item ?? '').trim()).filter(Boolean)
      : [];

    lifecycles.push(...selectedLifetimes);
  });

  return Array.from(new Set(lifecycles));
};

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

const extractKeyFromRefLike = (value: string) => {
  const input = String(value ?? '').trim();
  if (!input) {
    return '';
  }

  const delimiterIndex = input.lastIndexOf('::');
  if (delimiterIndex < 0) {
    return input;
  }

  return input.slice(delimiterIndex + 2).trim();
};

const findFirstNodeContainsProp = (root: UiTreeNode, propKey: string): UiTreeNode | null => {
  let found: UiTreeNode | null = null;
  const normalizedPropKey = String(propKey ?? '').trim();

  if (!normalizedPropKey) {
    return null;
  }

  walkTree(root, (node) => {
    if (found) {
      return;
    }

    const props = (node.props ?? {}) as Record<string, unknown>;
    if (Object.prototype.hasOwnProperty.call(props, normalizedPropKey)) {
      found = node;
    }
  });

  return found;
};

export const getNodePropValue = (node: UiTreeNode | undefined, propName: string): unknown => {
  const prop = node?.props?.[propName] as { value?: unknown } | undefined;
  return prop?.value;
};

export const getNodeStringProp = (node: UiTreeNode | undefined, propName: string): string => {
  const value = getNodePropValue(node, propName);
  return typeof value === 'string' ? value.trim() : '';
};

const findSourceNodeByExposeItem = (
  templateRoot: UiTreeNode,
  exposeItem: { sourceKey?: string; sourceRef?: string },
) => {
  const sourceRef = String(exposeItem.sourceRef ?? '').trim();
  const sourceKeyFromRef = extractKeyFromRefLike(sourceRef);
  const sourceKeyRaw = String(exposeItem.sourceKey ?? '').trim();
  const sourceKey = sourceKeyFromRef || extractKeyFromRefLike(sourceKeyRaw);
  if (!sourceKey) {
    return null;
  }

  return findNodeByKey(templateRoot, sourceKey);
};

export const resolveExposedPropSchemas = (detail: PageDetail | null): ExposedPropSchemaItem[] => {
  const templateRoot = cloneTemplateUiTree(detail);
  if (!templateRoot) {
    return [];
  }

  const contract = resolveComponentContract(detail);
  const contractExposedProps = Array.isArray(contract?.exposedProps) ? contract?.exposedProps ?? [] : [];
  const exposedProps = contractExposedProps.length > 0
    ? contractExposedProps
    : resolveFlowNodeExposedProps(detail);
  if (exposedProps.length === 0) {
    return [];
  }

  const map = new Map<string, ExposedPropSchemaItem>();
  exposedProps.forEach((item) => {
    const propKey = typeof item === 'string'
      ? String(item).trim()
      : String(item?.propKey ?? item?.key ?? '').trim();
    if (!propKey) {
      return;
    }

    const sourceNode = findSourceNodeByExposeItem(templateRoot, {
      sourceKey: typeof item === 'string' ? '' : item?.sourceKey,
      sourceRef: typeof item === 'string' ? '' : item?.sourceRef,
    });
    const fallbackSourceNode = sourceNode ?? findFirstNodeContainsProp(templateRoot, propKey);
    const schema = fallbackSourceNode?.props?.[propKey] as Record<string, unknown> | undefined;

    map.set(propKey, {
      propKey,
      schema: schema
        ? cloneDeep(schema)
        : {
            name: propKey,
            value: '',
            editType: 'input',
          },
    });
  });

  return Array.from(map.values());
};

export const resolveExposedLifecycles = (detail: PageDetail | null): string[] => {
  const contract = resolveComponentContract(detail);
  const contractLifecycles = Array.isArray(contract?.exposedLifecycles) ? contract?.exposedLifecycles : [];
  const lifecycles = contractLifecycles.length > 0
    ? contractLifecycles
    : resolveFlowNodeExposedLifecycles(detail);

  return Array.from(
    new Set(
      lifecycles
        .map((item) => (typeof item === 'string'
          ? String(item).trim()
          : String(item?.lifetime ?? item?.key ?? '').trim()))
        .filter(Boolean),
    ),
  );
};

export const loadCustomComponentDetail = async (componentId: string, options?: { forceRefresh?: boolean }): Promise<PageDetail | null> => {
  const normalizedId = normalizeComponentId(componentId);
  if (!normalizedId) {
    return null;
  }

  if (options?.forceRefresh) {
    detailCache.delete(normalizedId);
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
  const contract = resolveComponentContract(detail);
  const contractExposedProps = Array.isArray(contract?.exposedProps) ? contract?.exposedProps ?? [] : [];
  const exposedProps = contractExposedProps.length > 0
    ? contractExposedProps
    : resolveFlowNodeExposedProps(detail);

  if (exposedProps.length === 0) {
    return templateRoot;
  }

  const nextRoot = cloneDeep(templateRoot);

  exposedProps.forEach((item) => {
    const propKey = typeof item === 'string'
      ? String(item).trim()
      : String(item?.propKey ?? item?.key ?? '').trim();
    if (!propKey) {
      return;
    }

    const externalValue = getNodePropValue(instanceNode, propKey);
    if (externalValue === undefined) {
      return;
    }

    const targetNode = findSourceNodeByExposeItem(nextRoot, {
      sourceKey: typeof item === 'string' ? '' : item?.sourceKey,
      sourceRef: typeof item === 'string' ? '' : item?.sourceRef,
    });
    const fallbackTargetNode = targetNode ?? findFirstNodeContainsProp(nextRoot, propKey);
    if (!fallbackTargetNode) {
      return;
    }

    const targetProps = (fallbackTargetNode.props ?? {}) as Record<string, unknown>;
    const targetProp = (targetProps[propKey] ?? {}) as Record<string, unknown>;
    fallbackTargetNode.props = {
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
