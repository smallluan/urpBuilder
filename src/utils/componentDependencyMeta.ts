import { getComponentTemplateDetail } from '../api/componentTemplate';
import type { ComponentDetail, ComponentTemplateBaseInfo } from '../api/types';
import type { ComponentTemplateBundle, CustomComponentInstanceMeta } from './customComponentUpgrade';
import type { DependencyUpgradeItem } from '../builder/components/DependencyUpgradeIndicator';

export const fetchLatestComponentInfoMap = async (
  componentIds: string[],
): Promise<Map<string, ComponentTemplateBundle>> => {
  const tasks = componentIds.map(async (componentId) => {
    try {
      const res = await getComponentTemplateDetail(componentId);
      const base = (res.data?.base ?? {}) as ComponentTemplateBaseInfo;
      return { componentId, base, detail: res.data as ComponentDetail };
    } catch {
      return {
        componentId,
        base: null as unknown as ComponentTemplateBaseInfo,
        detail: null as ComponentDetail | null,
      };
    }
  });
  const results = await Promise.all(tasks);
  const map = new Map<string, ComponentTemplateBundle>();
  results.forEach((item) => {
    if (!item?.componentId || !item.base) {
      return;
    }
    map.set(item.componentId, { base: item.base, detail: item.detail });
  });
  return map;
};

type DepAgg = {
  componentId: string;
  name: string;
  latestVersion: number;
  /** 所有已钉实例中的最小版本；无已钉实例时为 Infinity */
  minPinned: number;
  /** 是否存在未钉版本（usedVersion 缺失或 ≤0）的实例 */
  hasUnpinned: boolean;
};

/**
 * 合并同一 componentId 多实例时：不得用 Math.min(已钉版本, 0)，否则会把「全已钉最新」误判成 usedVersion=0 而一直提示升级。
 */
export const computeDependencyUpgradeItems = (
  instances: CustomComponentInstanceMeta[],
  latestMap: Map<string, ComponentTemplateBundle>,
  ignoredIds: Set<string>,
): DependencyUpgradeItem[] => {
  const merged = new Map<string, DepAgg>();

  instances.forEach((instance) => {
    if (ignoredIds.has(instance.componentId)) {
      return;
    }
    const latest = latestMap.get(instance.componentId);
    if (!latest) {
      return;
    }
    const latestVersion = Number(latest.base.currentVersion);
    if (!Number.isFinite(latestVersion)) {
      return;
    }

    const rawV = typeof instance.usedVersion === 'number' && Number.isFinite(instance.usedVersion) ? instance.usedVersion : 0;
    const isPinned = rawV > 0;

    const prev = merged.get(instance.componentId);
    if (!prev) {
      merged.set(instance.componentId, {
        componentId: instance.componentId,
        name: String(latest.base.pageName ?? instance.componentId),
        latestVersion,
        minPinned: isPinned ? rawV : Number.POSITIVE_INFINITY,
        hasUnpinned: !isPinned,
      });
      return;
    }

    prev.hasUnpinned = prev.hasUnpinned || !isPinned;
    if (isPinned) {
      prev.minPinned = Math.min(prev.minPinned, rawV);
    }
  });

  const result: DependencyUpgradeItem[] = [];
  merged.forEach((agg) => {
    const { componentId, name, latestVersion, minPinned, hasUnpinned } = agg;
    const allPinnedUpToDate =
      !hasUnpinned && Number.isFinite(minPinned) && minPinned < Number.POSITIVE_INFINITY && minPinned >= latestVersion;
    if (allPinnedUpToDate) {
      return;
    }
    const usedVersion = hasUnpinned ? 0 : (Number.isFinite(minPinned) && minPinned < Number.POSITIVE_INFINITY ? minPinned : 0);
    result.push({
      componentId,
      usedVersion,
      latestVersion,
      name,
    });
  });

  return result;
};
