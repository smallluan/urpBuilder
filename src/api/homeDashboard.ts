import requestClient from './request';
import type { ApiResponse } from './types';
import type { CloudFunctionInvocationStats } from './cloudFunction';
import type { WorkspaceDailyEditStats } from './pageTemplate';

export type HomeDashboardParams =
  | { mine: true }
  | { ownerType: 'team'; ownerTeamId: string };

/** 与 `RecentEditsTicker` 条目一致 */
export type HomeDashboardRecentEdit = {
  pageId: string;
  pageName: string;
  entityType: 'page' | 'component';
  updatedAt: string;
};

export type HomeDashboardData = {
  stats: {
    components: number;
    apps: number;
    constants: number;
    functions: number;
    assets: number;
  };
  recentEdits: HomeDashboardRecentEdit[];
  invocationStats: CloudFunctionInvocationStats;
  activityStats: WorkspaceDailyEditStats;
};

/** 将服务端返回的调用统计整理为与原先 `getCloudFunctionInvocationStats` 一致的结构 */
function normalizeInvocationStats(data: unknown): CloudFunctionInvocationStats {
  const raw = data as Record<string, unknown> | null | undefined;
  const rawDaily: unknown[] = Array.isArray(raw?.daily) ? (raw.daily as unknown[]) : [];
  const daily: CloudFunctionInvocationStats['daily'] = rawDaily.map((row: unknown) => {
    const rec = row as Record<string, unknown>;
    const date = String(rec.date ?? '').slice(0, 10);
    const successCount = typeof rec.successCount === 'number' ? rec.successCount : 0;
    const failureCount = typeof rec.failureCount === 'number' ? rec.failureCount : 0;
    const legacy = typeof rec.count === 'number' ? rec.count : 0;
    const ok = successCount + failureCount > 0 ? successCount : legacy;
    const fail = successCount + failureCount > 0 ? failureCount : 0;
    return {
      date,
      successCount: ok,
      failureCount: fail,
      count: ok + fail,
    };
  });
  return {
    daily,
    totalCount: typeof raw?.totalCount === 'number' ? raw.totalCount : daily.reduce((s, x) => s + x.count, 0),
    successTotal: typeof raw?.successTotal === 'number' ? raw.successTotal : daily.reduce((s, x) => s + x.successCount, 0),
    failureTotal: typeof raw?.failureTotal === 'number' ? raw.failureTotal : daily.reduce((s, x) => s + x.failureCount, 0),
    rangeDays: typeof raw?.rangeDays === 'number' ? raw.rangeDays : 365,
  };
}

function normalizeActivityStats(data: unknown): WorkspaceDailyEditStats {
  const raw = data as Record<string, unknown> | null | undefined;
  const dailyRaw = Array.isArray(raw?.daily) ? raw.daily : [];
  const daily = dailyRaw.map((row: unknown) => {
    const rec = row as Record<string, unknown>;
    return {
      date: String(rec.date ?? '').slice(0, 10),
      newCount: typeof rec.newCount === 'number' ? rec.newCount : 0,
      saveCount: typeof rec.saveCount === 'number' ? rec.saveCount : 0,
      total: typeof rec.total === 'number' ? rec.total : 0,
    };
  });
  return {
    daily,
    totalNew: typeof raw?.totalNew === 'number' ? raw.totalNew : 0,
    totalSave: typeof raw?.totalSave === 'number' ? raw.totalSave : 0,
    rangeDays: typeof raw?.rangeDays === 'number' ? raw.rangeDays : 365,
    fromDate: typeof raw?.fromDate === 'string' ? raw.fromDate.slice(0, 10) : undefined,
    toDate: typeof raw?.toDate === 'string' ? raw.toDate.slice(0, 10) : undefined,
  };
}

export async function fetchHomeDashboard(params: HomeDashboardParams): Promise<HomeDashboardData> {
  const query =
    'mine' in params && params.mine === true
      ? { mine: true as const }
      : { ownerType: 'team' as const, ownerTeamId: (params as { ownerType: 'team'; ownerTeamId: string }).ownerTeamId };

  const response = await requestClient.get<ApiResponse<Record<string, unknown>>>('/home/dashboard', {
    params: query,
    skipGlobalLoading: true,
    skipErrorToast: true,
  });

  const payload = response.data.data;
  const statsRaw = payload?.stats as Record<string, unknown> | undefined;
  const stats = {
    components: typeof statsRaw?.components === 'number' ? statsRaw.components : 0,
    apps: typeof statsRaw?.apps === 'number' ? statsRaw.apps : 0,
    constants: typeof statsRaw?.constants === 'number' ? statsRaw.constants : 0,
    functions: typeof statsRaw?.functions === 'number' ? statsRaw.functions : 0,
    assets: typeof statsRaw?.assets === 'number' ? statsRaw.assets : 0,
  };

  const recentRaw = Array.isArray(payload?.recentEdits) ? payload.recentEdits : [];
  const recentEdits: HomeDashboardRecentEdit[] = recentRaw.map((row: unknown) => {
    const rec = row as Record<string, unknown>;
    const et = rec.entityType === 'component' ? 'component' : 'page';
    return {
      pageId: String(rec.pageId ?? ''),
      pageName: String(rec.pageName ?? '').trim() || '未命名',
      entityType: et,
      updatedAt: String(rec.updatedAt ?? ''),
    };
  });

  return {
    stats,
    recentEdits,
    invocationStats: normalizeInvocationStats(payload?.invocationStats),
    activityStats: normalizeActivityStats(payload?.activityStats),
  };
}
