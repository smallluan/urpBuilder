import isEqual from 'lodash/isEqual';
import type { UiTreeNode } from '../store/types';
import { findNodeByKey } from '../../utils/createComponentTree';
import { extractStoredPropValue } from '../template/propsHydration';

export type UiNodeDiffStatus = 'added' | 'removed' | 'modified' | 'unchanged';

/** 仅比较业务值，忽略编辑器 schema 包装差异 */
function normalizePropsForDiff(props: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!props || typeof props !== 'object') {
    return {};
  }
  const out: Record<string, unknown> = {};
  const keys = Object.keys(props).sort();
  for (const k of keys) {
    out[k] = extractStoredPropValue(props[k]);
  }
  return out;
}

function fingerprintNode(node: UiTreeNode): unknown {
  return {
    type: node.type,
    label: node.label,
    props: normalizePropsForDiff(node.props as Record<string, unknown> | undefined),
    lifetimes: node.lifetimes ? [...node.lifetimes].sort() : [],
  };
}

function collectAllKeys(node: UiTreeNode, acc: Set<string>): void {
  acc.add(node.key);
  for (const ch of node.children ?? []) {
    collectAllKeys(ch, acc);
  }
}

/**
 * 基于节点 `key` 对比两棵 UI 树（与画布一致）。
 * base 侧展示 removed / modified；compare 侧展示 added / modified。
 */
export function computeUiTreeDiff(baseRoot: UiTreeNode, compareRoot: UiTreeNode): {
  baseStatus: Map<string, UiNodeDiffStatus>;
  compareStatus: Map<string, UiNodeDiffStatus>;
} {
  const baseKeys = new Set<string>();
  const compareKeys = new Set<string>();
  collectAllKeys(baseRoot, baseKeys);
  collectAllKeys(compareRoot, compareKeys);

  const baseStatus = new Map<string, UiNodeDiffStatus>();
  const compareStatus = new Map<string, UiNodeDiffStatus>();

  for (const key of baseKeys) {
    const inCompare = compareKeys.has(key);
    if (!inCompare) {
      baseStatus.set(key, 'removed');
      continue;
    }
    const nb = findNodeByKey(baseRoot, key);
    const nc = findNodeByKey(compareRoot, key);
    if (!nb || !nc) {
      baseStatus.set(key, 'modified');
      compareStatus.set(key, 'modified');
      continue;
    }
    const same = isEqual(fingerprintNode(nb), fingerprintNode(nc));
    const st: UiNodeDiffStatus = same ? 'unchanged' : 'modified';
    baseStatus.set(key, st);
    compareStatus.set(key, st);
  }

  for (const key of compareKeys) {
    if (!baseKeys.has(key)) {
      compareStatus.set(key, 'added');
    }
  }

  return { baseStatus, compareStatus };
}

export function summarizeUiDiff(baseStatus: Map<string, UiNodeDiffStatus>, compareStatus: Map<string, UiNodeDiffStatus>): {
  added: number;
  removed: number;
  modified: number;
  /** 可用于跳转（两侧树若存在该 key 则滚动） */
  modifiedKeys: string[];
  addedKeys: string[];
  removedKeys: string[];
} {
  let added = 0;
  let removed = 0;
  let modified = 0;
  const modifiedKeys: string[] = [];
  const addedKeys: string[] = [];
  const removedKeys: string[] = [];

  for (const [k, s] of compareStatus) {
    if (s === 'added') {
      added += 1;
      addedKeys.push(k);
    } else if (s === 'modified') {
      modified += 1;
      modifiedKeys.push(k);
    }
  }
  for (const [k, s] of baseStatus) {
    if (s === 'removed') {
      removed += 1;
      removedKeys.push(k);
    }
  }

  return { added, removed, modified, modifiedKeys, addedKeys, removedKeys };
}
