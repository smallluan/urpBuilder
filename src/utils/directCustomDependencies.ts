import type { PageRouteRecord, UiTreeNode } from '../builder/store/types';
import { collectCustomComponentInstances, type CustomComponentInstanceMeta } from './customComponentUpgrade';

export type DirectCustomDependencyRow = {
  componentId: string;
  displayName: string;
  minUsedVersion: number;
  maxUsedVersion: number;
  instanceCount: number;
  versionMismatch: boolean;
};

export const collectPageDirectCustomInstances = (
  pageRoutes: PageRouteRecord[],
  sharedUiTree: UiTreeNode | null,
): CustomComponentInstanceMeta[] => {
  const roots: UiTreeNode[] = [];
  if (sharedUiTree) {
    roots.push(sharedUiTree);
  }
  pageRoutes.forEach((r) => roots.push(r.uiTree));
  return roots.flatMap((root) => collectCustomComponentInstances(root));
};

export const aggregateDirectCustomDependencyRows = (
  instances: CustomComponentInstanceMeta[],
): DirectCustomDependencyRow[] => {
  type Acc = {
    displayNames: string[];
    versions: number[];
    unpinned: boolean;
    count: number;
  };

  const map = new Map<string, Acc>();
  instances.forEach((inst) => {
    const id = inst.componentId;
    if (!id) {
      return;
    }
    const prev = map.get(id);
    const v = typeof inst.usedVersion === 'number' && inst.usedVersion > 0 ? inst.usedVersion : 0;
    const name = (inst.displayName ?? '').trim();
    if (!prev) {
      map.set(id, {
        displayNames: name ? [name] : [],
        versions: [v],
        unpinned: v <= 0,
        count: 1,
      });
      return;
    }
    if (name) {
      prev.displayNames.push(name);
    }
    prev.versions.push(v);
    if (v <= 0) {
      prev.unpinned = true;
    }
    prev.count += 1;
  });

  const rows: DirectCustomDependencyRow[] = [];
  map.forEach((acc, componentId) => {
    const pinned = acc.versions.filter((x) => x > 0);
    const minUsedVersion = pinned.length > 0 ? Math.min(...pinned) : 0;
    const maxUsedVersion = pinned.length > 0 ? Math.max(...pinned) : 0;
    const versionMismatch = pinned.length > 1 && minUsedVersion !== maxUsedVersion;
    const displayName =
      acc.displayNames.find((n) => n.length > 0)?.trim()
      || componentId;
    rows.push({
      componentId,
      displayName,
      minUsedVersion,
      maxUsedVersion,
      instanceCount: acc.count,
      versionMismatch,
    });
  });

  rows.sort((a, b) => a.componentId.localeCompare(b.componentId));
  return rows;
};
