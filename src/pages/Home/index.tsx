import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, ConfigProvider, theme as antdTheme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import ReactEcharts from 'echarts-for-react';
import { CodeIcon, FileIcon } from 'tdesign-icons-react';
import { Statistic } from 'tdesign-react';
import { useAuth } from '../../auth/context';
import { useBuilderThemeStore } from '../../builder/theme/builderThemeStore';
import { useTeam } from '../../team/context';
import requestClient from '../../api/request';
import { getDataConstantList } from '../../api/dataConstant';
import {
  getCloudFunctionInvocationStats,
  getCloudFunctionList,
  type CloudFunctionInvocationDailyPoint,
  type CloudFunctionInvocationStats,
} from '../../api/cloudFunction';
import {
  getWorkspaceDailyEditStats,
  type WorkspaceDailyEditStats,
} from '../../api/pageTemplate';
import { listPersonalAssets, listTeamAssets } from '../../api/assets';
import type { ApiResponse, PageBaseInfo } from '../../api/types';
import '../../styles/app-shell-page.less';
import { EditActivityContributionGrid } from './EditActivityContributionGrid';
import {
  HomeAssetStatIconApps,
  HomeAssetStatIconAssets,
  HomeAssetStatIconComponents,
  HomeAssetStatIconConstants,
  HomeAssetStatIconFunctions,
} from '../../components/icons/homeAssetStatIcons';
import { RecentEditsTicker, type RecentEditItem } from './RecentEditsTicker';
import { openEditorInNewTab } from './openEditorInNewTab';
import './style.less';

dayjs.locale('zh-cn');

/** 每次进入首页随机展示一条 */
const SOUP_QUOTES: string[] = [
  '完成比完美更重要，先上路再迭代。',
  '把复杂留给自己，把简单留给用户。',
  '小步快跑，持续交付可见的价值。',
  '今天的积累，是明天少加的班。',
  '专注可控之事，其余交给时间与协作。',
  '接口可以改，方向要先对。',
  '代码是写给人看的，顺便让机器执行。',
  '问题拆解到底，方案自然浮现。',
  '先验证假设，再投入工程化。',
  '团队对齐一次，胜过个人加班十次。',
  '可读性是最好的性能优化之一。',
  '把「以后再说」变成「现在记一笔」。',
  '细节里藏着专业，也藏着尊重。',
  '慢一点想清楚，快一点做对事。',
  '你写的每一行，都会在某个深夜被感谢。',
];

type PageBaseListPayload = { list?: unknown[]; total?: number };

type StatKey = 'components' | 'apps' | 'constants' | 'functions' | 'assets';

const ASSET_STAT_ICON: Record<StatKey, React.FC> = {
  components: HomeAssetStatIconComponents,
  apps: HomeAssetStatIconApps,
  constants: HomeAssetStatIconConstants,
  functions: HomeAssetStatIconFunctions,
  assets: HomeAssetStatIconAssets,
};

/** TDesign Statistic 预设色：black / blue / red / orange / green */
type StatisticThemeColor = 'black' | 'blue' | 'red' | 'orange' | 'green';

const STAT_ITEMS: { key: StatKey; label: string; color: StatisticThemeColor }[] = [
  { key: 'components', label: '组件', color: 'blue' },
  { key: 'apps', label: '应用', color: 'green' },
  { key: 'constants', label: '常量', color: 'orange' },
  { key: 'functions', label: '云函数', color: 'red' },
  { key: 'assets', label: '素材', color: 'black' },
];

function buildInvocationMaps(daily: CloudFunctionInvocationDailyPoint[]) {
  const success = new Map<string, number>();
  const failure = new Map<string, number>();
  for (const row of daily) {
    const key = row.date.slice(0, 10);
    success.set(key, row.successCount);
    failure.set(key, row.failureCount);
  }
  return { success, failure };
}

function eachDateKeyInclusive(start: dayjs.Dayjs, end: dayjs.Dayjs): string[] {
  const keys: string[] = [];
  let cur = start.startOf('day');
  const last = end.startOf('day');
  while (!cur.isAfter(last)) {
    keys.push(cur.format('YYYY-MM-DD'));
    cur = cur.add(1, 'day');
  }
  return keys;
}

async function fetchPageBaseTotal(
  entityType: 'page' | 'component',
  scope: Record<string, unknown>,
): Promise<number> {
  try {
    const response = await requestClient.get<ApiResponse<PageBaseListPayload>>('/page-base/list', {
      params: { page: 1, pageSize: 1, entityType, ...scope },
      skipGlobalLoading: true,
      skipErrorToast: true,
    });
    const t = response.data?.data?.total;
    return typeof t === 'number' ? t : 0;
  } catch {
    return 0;
  }
}

const Home: React.FC = () => {
  const { user } = useAuth();
  const colorMode = useBuilderThemeStore((s) => s.colorMode);
  const { workspaceMode, currentTeamId, initialized: teamInitialized } = useTeam();

  const displayName = user?.nickname?.trim() || user?.username?.trim() || '用户';

  const [quote] = useState(() => SOUP_QUOTES[Math.floor(Math.random() * SOUP_QUOTES.length)]);

  const [stats, setStats] = useState<Record<StatKey, number | null>>({
    components: null,
    apps: null,
    constants: null,
    functions: null,
    assets: null,
  });

  const [invocationStats, setInvocationStats] = useState<CloudFunctionInvocationStats | null>(null);
  const [activityStats, setActivityStats] = useState<WorkspaceDailyEditStats | null>(null);
  const [recentEdits, setRecentEdits] = useState<RecentEditItem[]>([]);
  const [recentEditsLoading, setRecentEditsLoading] = useState(true);

  useEffect(() => {
    if (!teamInitialized) {
      return;
    }

    let cancelled = false;

    const load = async () => {
      const scopeBase: Record<string, unknown> =
        workspaceMode === 'personal'
          ? { mine: true }
          : currentTeamId
            ? { ownerType: 'team', ownerTeamId: currentTeamId }
            : {};

      if (workspaceMode === 'team' && !currentTeamId) {
        if (!cancelled) {
          setStats({
            components: 0,
            apps: 0,
            constants: 0,
            functions: 0,
            assets: 0,
          });
        }
        return;
      }

      const ownerType = workspaceMode === 'team' ? 'team' : 'user';
      const ownerTeamId = ownerType === 'team' ? currentTeamId || undefined : undefined;

      try {
        const [components, apps, constantList, fnList, assetPayload] = await Promise.all([
          fetchPageBaseTotal('component', scopeBase),
          fetchPageBaseTotal('page', scopeBase),
          getDataConstantList({
            ownerType,
            ownerTeamId,
            page: 1,
            pageSize: 1,
          }).catch(() => ({ total: 0, list: [] })),
          getCloudFunctionList({
            ownerType,
            ownerTeamId,
            page: 1,
            pageSize: 1,
          }).catch(() => ({ total: 0, list: [] })),
          ownerType === 'user'
            ? listPersonalAssets({ page: 1, pageSize: 1 })
            : listTeamAssets(currentTeamId as string, { page: 1, pageSize: 1 }),
        ]);

        const assetInner = assetPayload?.data;
        const assetTotal = typeof assetInner?.total === 'number' ? assetInner.total : 0;

        if (!cancelled) {
          setStats({
            components,
            apps,
            constants: constantList.total,
            functions: fnList.total,
            assets: assetTotal,
          });
        }
      } catch {
        if (!cancelled) {
          setStats({
            components: 0,
            apps: 0,
            constants: 0,
            functions: 0,
            assets: 0,
          });
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [teamInitialized, workspaceMode, currentTeamId]);

  useEffect(() => {
    if (!teamInitialized) {
      return;
    }

    let cancelled = false;

    if (workspaceMode === 'team' && !currentTeamId) {
      setRecentEdits([]);
      setRecentEditsLoading(false);
      return;
    }

    const scopeBase: Record<string, unknown> =
      workspaceMode === 'personal'
        ? { mine: true }
        : { ownerType: 'team', ownerTeamId: currentTeamId as string };

    const loadRecent = async () => {
      setRecentEditsLoading(true);
      try {
        const [pRes, cRes] = await Promise.all([
          requestClient.get<ApiResponse<{ list: PageBaseInfo[]; total: number }>>('/page-base/list', {
            params: { entityType: 'page', page: 1, pageSize: 24, ...scopeBase },
            skipGlobalLoading: true,
            skipErrorToast: true,
          }),
          requestClient.get<ApiResponse<{ list: PageBaseInfo[]; total: number }>>('/page-base/list', {
            params: { entityType: 'component', page: 1, pageSize: 24, ...scopeBase },
            skipGlobalLoading: true,
            skipErrorToast: true,
          }),
        ]);
        const pl = Array.isArray(pRes.data?.data?.list) ? pRes.data.data.list : [];
        const cl = Array.isArray(cRes.data?.data?.list) ? cRes.data.data.list : [];
        const merged: RecentEditItem[] = [...pl, ...cl].map((row) => ({
          pageId: row.pageId,
          pageName: row.pageName?.trim() || '未命名',
          entityType: row.entityType === 'component' ? 'component' : 'page',
          updatedAt: row.updatedAt ?? '',
        }));
        merged.sort((a, b) => dayjs(b.updatedAt).valueOf() - dayjs(a.updatedAt).valueOf());
        if (!cancelled) {
          setRecentEdits(merged.slice(0, 16));
        }
      } catch {
        if (!cancelled) {
          setRecentEdits([]);
        }
      } finally {
        if (!cancelled) {
          setRecentEditsLoading(false);
        }
      }
    };

    void loadRecent();

    return () => {
      cancelled = true;
    };
  }, [teamInitialized, workspaceMode, currentTeamId]);

  useEffect(() => {
    if (!teamInitialized) {
      return;
    }

    const emptyInv: CloudFunctionInvocationStats = {
      daily: [],
      totalCount: 0,
      successTotal: 0,
      failureTotal: 0,
      rangeDays: 365,
    };
    const ytdFrom = dayjs().startOf('year').format('YYYY-MM-DD');
    const ytdTo = dayjs().format('YYYY-MM-DD');
    const ytdRangeDays = dayjs(ytdTo).diff(dayjs(ytdFrom), 'day') + 1;
    const emptyAct: WorkspaceDailyEditStats = {
      daily: [],
      totalNew: 0,
      totalSave: 0,
      rangeDays: ytdRangeDays,
      fromDate: ytdFrom,
      toDate: ytdTo,
    };

    if (workspaceMode === 'team' && !currentTeamId) {
      setInvocationStats(emptyInv);
      setActivityStats(emptyAct);
      return;
    }

    let cancelled = false;
    const ownerType = workspaceMode === 'team' ? 'team' : 'user';
    const ownerTeamId = workspaceMode === 'team' ? currentTeamId || undefined : undefined;

    void Promise.all([
      getCloudFunctionInvocationStats({ ownerType, ownerTeamId, rangeDays: 365 }),
      getWorkspaceDailyEditStats({ ownerType, ownerTeamId, fromDate: ytdFrom, toDate: ytdTo }),
    ])
      .then(([inv, act]) => {
        if (!cancelled) {
          setInvocationStats(inv);
          setActivityStats(act);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setInvocationStats(emptyInv);
          setActivityStats(emptyAct);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [teamInitialized, workspaceMode, currentTeamId]);

  const invocationBarOption = useMemo(() => {
    const muted = colorMode === 'dark' ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)';
    const line = colorMode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';
    const daily = invocationStats?.daily ?? [];
    const { success, failure } = buildInvocationMaps(daily);
    const end = dayjs();
    const start = end.subtract(29, 'day');
    const keys = eachDateKeyInclusive(start, end);
    const successData = keys.map((k) => success.get(k) ?? 0);
    const failureData = keys.map((k) => failure.get(k) ?? 0);
    const labels = keys.map((k) => dayjs(k).format('M/D'));
    const perDayTotals = keys.map((_, i) => successData[i] + failureData[i]);
    const dataMax = perDayTotals.length ? Math.max(0, ...perDayTotals) : 0;
    const brandBlue = '#0052d9';

    return {
      legend: {
        data: ['成功', '失败'],
        top: 4,
        left: 'center',
        itemGap: 20,
        itemWidth: 14,
        itemHeight: 10,
        textStyle: { color: muted, fontSize: 12 },
      },
      grid: { left: 48, right: 14, top: 44, bottom: 26 },
      tooltip: {
        trigger: 'axis' as const,
        axisPointer: { type: 'shadow' as const },
        formatter: (items: unknown) => {
          if (!Array.isArray(items) || items.length === 0) {
            return '';
          }
          const first = items[0] as { dataIndex?: number; axisValue?: string };
          const idx = typeof first.dataIndex === 'number' ? first.dataIndex : 0;
          const ok = successData[idx] ?? 0;
          const fail = failureData[idx] ?? 0;
          const dayLabel = typeof first.axisValue === 'string' ? first.axisValue : labels[idx] ?? '';
          if (ok + fail === 0) {
            return `${dayLabel}<br/>当日无调用`;
          }
          return `${dayLabel}<br/>成功 ${ok}<br/>失败 ${fail}`;
        },
      },
      xAxis: {
        type: 'category' as const,
        data: labels,
        axisLine: { lineStyle: { color: line } },
        axisLabel: { color: muted, fontSize: 10, interval: 4 },
      },
      yAxis: {
        type: 'value' as const,
        minInterval: 1,
        max: dataMax === 0 ? 3 : undefined,
        splitLine: { lineStyle: { color: line } },
        axisLabel: { color: muted, fontSize: 11 },
      },
      series: [
        {
          name: '成功',
          type: 'bar' as const,
          stack: 'total',
          barMaxWidth: 18,
          data: successData,
          itemStyle: { color: brandBlue },
        },
        {
          name: '失败',
          type: 'bar' as const,
          stack: 'total',
          barMaxWidth: 18,
          data: failureData,
          itemStyle: {
            color: '#d54941',
            borderRadius: [3, 3, 0, 0],
          },
        },
      ],
    };
  }, [invocationStats, colorMode]);

  function greetingByHour(): string {
    const h = new Date().getHours();
    if (h < 12) return '早上好';
    if (h < 18) return '下午好';
    return '晚上好';
  }

  return (
    <div className="home-page">
      <div className="home-page__backdrop" aria-hidden>
        <div className="home-page__mesh" />
        <div className="home-page__glow home-page__glow--a" />
        <div className="home-page__glow home-page__glow--b" />
      </div>

      <div className="home-page__shell app-shell-page">
        <section className="home-page__top-grid" aria-label="欢迎与日历">
          <div className="home-page__left-stack">
            <section className="home-page__module home-page__module--welcome" aria-label="问候与我的资产">
              <header className="home-page__welcome-head">
                <h1 className="home-page__title app-shell-page__title">
                  {greetingByHour()}，{displayName}
                </h1>
                <p className="home-page__quote" role="status">
                  {quote}
                </p>
              </header>
              <h2 className="home-page__module-title home-page__module-title--inline">我的资产</h2>
              <div className="home-page__asset-stats-card" aria-label="当前空间资源统计">
                {STAT_ITEMS.map((item, index) => {
                  const raw = stats[item.key];
                  const Icon = ASSET_STAT_ICON[item.key];
                  return (
                    <div
                      key={item.key}
                      className={
                        index > 0
                          ? 'home-page__asset-statistic-cell home-page__asset-statistic-cell--with-divider'
                          : 'home-page__asset-statistic-cell'
                      }
                    >
                      <Statistic
                        title={item.label}
                        value={raw ?? 0}
                        loading={raw === null}
                        color={item.color}
                        prefix={<Icon />}
                      />
                    </div>
                  );
                })}
              </div>
            </section>

            <div className="home-page__quick-recent-row">
              <section className="home-page__module home-page__module--quick" aria-label="快速开始">
                <h2 className="home-page__module-title">快速开始</h2>
                <div className="home-page__module-grid home-page__module-grid--quick">
                  <button
                    type="button"
                    className="home-page__tile-item home-page__tile-item--action"
                    onClick={() => openEditorInNewTab('/create-component')}
                  >
                    <span className="home-page__tile-item-icon" aria-hidden>
                      <CodeIcon size="20" />
                    </span>
                    <span className="home-page__tile-item-title">新建组件</span>
                  </button>
                  <button
                    type="button"
                    className="home-page__tile-item home-page__tile-item--action"
                    onClick={() => openEditorInNewTab('/create-page')}
                  >
                    <span className="home-page__tile-item-icon" aria-hidden>
                      <FileIcon size="20" />
                    </span>
                    <span className="home-page__tile-item-title">新建应用</span>
                  </button>
                </div>
              </section>

              <section className="home-page__module home-page__module--recent" aria-label="最近编辑">
                <h2 className="home-page__module-title">最近编辑</h2>
                <RecentEditsTicker items={recentEdits} loading={recentEditsLoading} />
              </section>
            </div>
          </div>

          <div className="home-page__calendar-panel">
            <div className="home-page__panel-head">
              <span className="home-page__panel-hint">{dayjs().format('YYYY年 MMMM')}</span>
            </div>
            <div className="home-page__calendar-body">
              <ConfigProvider
                locale={zhCN}
                theme={{
                  algorithm: colorMode === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
                  token: {
                    colorPrimary: '#0052d9',
                    borderRadius: 8,
                  },
                }}
              >
                <Calendar fullscreen={false} />
              </ConfigProvider>
            </div>
          </div>
        </section>

        <section className="home-page__chart-row" aria-label="云函数与编辑活跃度">
          <div className="home-page__charts-grid">
            <div className="home-page__panel-card home-page__chart-panel">
              <div className="home-page__section-head">
                <h2 className="home-page__section-title">云函数调用量</h2>
              </div>
              <div className="home-page__chart-card home-page__chart-card--bar">
                <ReactEcharts
                  className="home-page__chart home-page__chart--bar"
                  style={{ width: '100%', height: '100%', minHeight: 160 }}
                  option={invocationBarOption}
                  notMerge
                  lazyUpdate
                />
              </div>
            </div>
            <div className="home-page__panel-card home-page__chart-panel">
              <div className="home-page__section-head">
                <h2 className="home-page__section-title">编辑活跃度</h2>
              </div>
              <div className="home-page__chart-card home-page__chart-card--activity-grid">
                <EditActivityContributionGrid stats={activityStats} colorMode={colorMode} />
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Home;
