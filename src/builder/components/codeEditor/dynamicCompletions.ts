import type { UiTreeNode } from '../../store/types';

const RESERVED_PROP_KEYS = new Set(['__style', '__slot']);

export interface CodeEditorDynamicComponentOption {
  key: string;
  ref: string;
  label: string;
  type?: string;
  propKeys: string[];
}

export interface CodeEditorDynamicCompletionContext {
  scopeId?: string;
  components: CodeEditorDynamicComponentOption[];
}

const normalizePropKeys = (props: unknown) => {
  if (!props || typeof props !== 'object' || Array.isArray(props)) {
    return [] as string[];
  }
  return Object.keys(props as Record<string, unknown>)
    .filter((propKey) => propKey && !RESERVED_PROP_KEYS.has(propKey))
    .sort((a, b) => a.localeCompare(b, 'zh-CN'));
};

export const buildDynamicCompletionContextFromUiTree = (
  uiTree: UiTreeNode | null | undefined,
  scopeId = 'root',
): CodeEditorDynamicCompletionContext => {
  if (!uiTree) {
    return { scopeId, components: [] };
  }

  const nextScopeId = String(scopeId || 'root').trim() || 'root';
  const map = new Map<string, CodeEditorDynamicComponentOption>();

  const walk = (node: UiTreeNode) => {
    const key = String(node.key ?? '').trim();
    if (key && !map.has(key)) {
      map.set(key, {
        key,
        ref: `${nextScopeId}::${key}`,
        label: String(node.label ?? key).trim() || key,
        type: String(node.type ?? '').trim() || undefined,
        propKeys: normalizePropKeys(node.props),
      });
    }

    (node.children ?? []).forEach(walk);
  };

  walk(uiTree);

  const components = Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key, 'zh-CN'));
  return { scopeId: nextScopeId, components };
};
