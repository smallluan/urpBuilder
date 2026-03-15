import cloneDeep from 'lodash/cloneDeep';
import { getComponentTemplateDetail } from '../api/componentTemplate';
import type { ComponentDetail } from '../api/types';
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
  sourcePropKey?: string;
  schema: Record<string, unknown>;
}

interface ExposedPropRefItem {
  propKey: string;
  key?: string;
  sourceKey?: string;
  sourceRef?: string;
}

interface ExposedLifecycleRefItem {
  lifetime: string;
  key?: string;
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

const resolveComponentContract = (detail: ComponentDetail | null): ComponentContract | null => {
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

const resolveFlowNodeExposedProps = (detail: ComponentDetail | null): ExposedPropRefItem[] => {
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
    const selectedMappings = Array.isArray(data.selectedMappings)
      ? data.selectedMappings
        .map((item) => {
          if (!item || typeof item !== 'object') {
            return null;
          }

          const mapping = item as Record<string, unknown>;
          const sourcePropKey = String(mapping.sourcePropKey ?? '').trim();
          if (!sourcePropKey) {
            return null;
          }

          const alias = typeof mapping.alias === 'string' ? String(mapping.alias).trim() : '';
          return {
            sourcePropKey,
            alias,
          };
        })
        .filter((item): item is { sourcePropKey: string; alias: string } => !!item)
      : [];

    if (selectedMappings.length > 0) {
      selectedMappings.forEach((item) => {
        result.push({
          propKey: item.sourcePropKey,
          key: item.alias || item.sourcePropKey,
          sourceKey,
          sourceRef,
        });
      });
      return;
    }

    const selectedPropKeys = Array.isArray(data.selectedPropKeys)
      ? data.selectedPropKeys.map((item) => String(item ?? '').trim()).filter(Boolean)
      : [];

    selectedPropKeys.forEach((propKey) => {
      result.push({
        propKey,
        key: propKey,
        sourceKey,
        sourceRef,
      });
    });
  });

  return result;
};

const resolveFlowNodeExposedLifecycles = (detail: ComponentDetail | null): ExposedLifecycleRefItem[] => {
  const flowNodes = Array.isArray(detail?.template?.flowNodes)
    ? (detail?.template?.flowNodes as Array<Record<string, unknown>>)
    : [];

  const lifecycles: ExposedLifecycleRefItem[] = [];
  flowNodes.forEach((node) => {
    const nodeType = String(node?.type ?? '').trim();
    if (nodeType !== 'lifecycleExposeNode') {
      return;
    }

    const data = (node?.data ?? {}) as Record<string, unknown>;
    const selectedMappings: ExposedLifecycleRefItem[] = Array.isArray(data.selectedMappings)
      ? data.selectedMappings.reduce<ExposedLifecycleRefItem[]>((acc, item) => {
          if (!item || typeof item !== 'object') {
            return acc;
          }

          const mapping = item as Record<string, unknown>;
          const sourceLifetime = String(mapping.sourceLifetime ?? '').trim();
          if (!sourceLifetime) {
            return acc;
          }

          const alias = typeof mapping.alias === 'string' ? String(mapping.alias).trim() : '';
          acc.push({
            lifetime: sourceLifetime,
            key: alias || sourceLifetime,
          });
          return acc;
        }, [])
      : [];

    if (selectedMappings.length > 0) {
      lifecycles.push(...selectedMappings);
      return;
    }

    const selectedLifetimes = Array.isArray(data.selectedLifetimes)
      ? data.selectedLifetimes.map((item) => String(item ?? '').trim()).filter(Boolean)
      : [];

    selectedLifetimes.forEach((lifetime) => {
      lifecycles.push({ lifetime, key: lifetime });
    });
  });

  const deduped = new Map<string, ExposedLifecycleRefItem>();
  lifecycles.forEach((item) => {
    deduped.set(`${item.lifetime}::${item.key ?? item.lifetime}`, item);
  });

  return Array.from(deduped.values());
};

const detailCache = new Map<string, Promise<ComponentDetail | null>>();

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

export const resolveExposedPropSchemas = (detail: ComponentDetail | null): ExposedPropSchemaItem[] => {
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
    const sourcePropKey = typeof item === 'string'
      ? String(item).trim()
      : String(item?.propKey ?? '').trim();
    const exposePropKey = typeof item === 'string'
      ? String(item).trim()
      : String(item?.key ?? item?.propKey ?? '').trim();

    if (!sourcePropKey || !exposePropKey) {
      return;
    }

    const sourceNode = findSourceNodeByExposeItem(templateRoot, {
      sourceKey: typeof item === 'string' ? '' : item?.sourceKey,
      sourceRef: typeof item === 'string' ? '' : item?.sourceRef,
    });
    const fallbackSourceNode = sourceNode ?? findFirstNodeContainsProp(templateRoot, sourcePropKey);
    const schema = fallbackSourceNode?.props?.[sourcePropKey] as Record<string, unknown> | undefined;
    const nextSchema = schema
      ? cloneDeep(schema)
      : {
          name: sourcePropKey,
          value: '',
          editType: 'input',
        };

    if (exposePropKey !== sourcePropKey) {
      nextSchema.name = exposePropKey;
    }

    map.set(exposePropKey, {
      propKey: exposePropKey,
      sourcePropKey,
      schema: nextSchema,
    });
  });

  return Array.from(map.values());
};

export const resolveExposedLifecycleMappings = (detail: ComponentDetail | null): ExposedLifecycleRefItem[] => {
  const contract = resolveComponentContract(detail);
  const contractLifecycles = Array.isArray(contract?.exposedLifecycles) ? contract?.exposedLifecycles : [];
  const lifecycles = contractLifecycles.length > 0
    ? contractLifecycles
    : resolveFlowNodeExposedLifecycles(detail);

  const normalized = lifecycles
    .map((item) => {
      if (typeof item === 'string') {
        const lifetime = String(item).trim();
        if (!lifetime) {
          return null;
        }

        return {
          lifetime,
          key: lifetime,
        } as ExposedLifecycleRefItem;
      }

      const lifetime = String(item?.lifetime ?? item?.key ?? '').trim();
      if (!lifetime) {
        return null;
      }

      const key = String(item?.key ?? lifetime).trim() || lifetime;
      return {
        lifetime,
        key,
      } as ExposedLifecycleRefItem;
    })
    .filter((item): item is ExposedLifecycleRefItem => !!item);

  const deduped = new Map<string, ExposedLifecycleRefItem>();
  normalized.forEach((item) => {
    deduped.set(`${item.lifetime}::${item.key}`, item);
  });

  return Array.from(deduped.values());
};

export const resolveExposedLifecycles = (detail: ComponentDetail | null): string[] => {
  const mappings = resolveExposedLifecycleMappings(detail);
  return Array.from(new Set(mappings.map((item) => item.key || item.lifetime).filter(Boolean)));
};

export const loadCustomComponentDetail = async (componentId: string, options?: { forceRefresh?: boolean }): Promise<ComponentDetail | null> => {
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
      getComponentTemplateDetail(normalizedId)
        .then((res) => res.data ?? null)
        .catch(() => null),
    );
  }

  return detailCache.get(normalizedId) ?? null;
};

export const cloneTemplateUiTree = (detail: ComponentDetail | null): UiTreeNode | null => {
  const tree = detail?.template?.uiTree as unknown;
  if (!tree || typeof tree !== 'object' || Array.isArray(tree)) {
    return null;
  }

  return cloneDeep(tree as UiTreeNode);
};

export const applyExposedPropsToTemplate = (
  instanceNode: UiTreeNode,
  templateRoot: UiTreeNode,
  detail: ComponentDetail | null,
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
    const sourcePropKey = typeof item === 'string'
      ? String(item).trim()
      : String(item?.propKey ?? item?.key ?? '').trim();
    if (!sourcePropKey) {
      return;
    }

    // external property name on instance: if contract provides explicit external name (key), use it, otherwise fallback to sourcePropKey
    const externalPropName = typeof item === 'string'
      ? String(item).trim()
      : String(item?.key ?? item?.propKey ?? '').trim();

    const externalValue = getNodePropValue(instanceNode, externalPropName);
    if (externalValue === undefined) {
      return;
    }

    const targetNode = findSourceNodeByExposeItem(nextRoot, {
      sourceKey: typeof item === 'string' ? '' : item?.sourceKey,
      sourceRef: typeof item === 'string' ? '' : item?.sourceRef,
    });
    const fallbackTargetNode = targetNode ?? findFirstNodeContainsProp(nextRoot, sourcePropKey);
    if (!fallbackTargetNode) {
      return;
    }

    const targetProps = (fallbackTargetNode.props ?? {}) as Record<string, unknown>;
    const targetProp = (targetProps[sourcePropKey] ?? {}) as Record<string, unknown>;
    fallbackTargetNode.props = {
      ...targetProps,
      [sourcePropKey]: {
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
