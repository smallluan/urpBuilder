import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  DialogPlugin,
  Dropdown,
  MessagePlugin,
  Popup,
  Select,
  Space,
  Switch,
  Tag,
  Typography,
} from 'tdesign-react';
import {
  ArrowLeftIcon,
  ChevronDownIcon,
  BrowseIcon,
  ViewListIcon,
  CodeIcon,
  RollbackIcon,
  SettingIcon,
} from 'tdesign-icons-react';
import type { Node, Edge } from '@xyflow/react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  getComponentTemplateDetail,
  getComponentVersionList,
  updateComponentDraft,
} from '../../api/componentTemplate';
import type { ComponentDetail, ComponentVersionListItem } from '../../api/types';
import type { UiTreeNode } from '../../builder/store/types';
import { diffComponentTemplates } from '../../builder/versionDiff/computeSnapshotDiff';
import { buildRollbackDraftPayload } from '../../builder/versionDiff/dehydrateTemplateForSave';
import { openComponentTemplateDiffWorkbench } from '../../builder/versionDiff/openDiffWorkbench';
import { buildTemplateSliceForCompare } from '../../builder/versionDiff/buildCompareTemplateSlice';
import { computeUiTreeDiff, summarizeUiDiff } from '../../builder/versionDiff/uiTreeDiff';
import { computeFlowDiff } from '../../builder/versionDiff/flowGraphDiff';
import { buildPathTree, type VirtualPathTreeNode } from '../../builder/versionDiff/virtualTemplateFiles';
import type { ComparePaneLayout } from './comparePaneLayout';
import VersionDiffSimulator from './VersionDiffSimulator';
import VersionDiffFlow from './VersionDiffFlow';
import './style.less';

const { Text, Title } = Typography;

type DetailView = 'summary' | 'ui' | 'flow' | 'code';

const resolveComponentId = (params: URLSearchParams) => {
  const raw = (params.get('id') || params.get('pageId') || '').trim();
  if (!raw) return '';
  const normalized = raw.toLowerCase();
  if (normalized === 'undefined' || normalized === 'null') return '';
  return raw;
};

const parseVersionParam = (raw: string | null): number | null => {
  if (raw == null || raw === '') return null;
  const n = Number(String(raw).trim());
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
};

const isCodeVirtualPath = (path: string) => path.startsWith('flow/code/');

function filterEdgesForNodes(edges: Edge[], nodes: Node[]): Edge[] {
  const ids = new Set(nodes.map((n) => n.id));
  return edges.filter((e) => ids.has(e.source) && ids.has(e.target));
}

function renderPathTreeNode(
  node: VirtualPathTreeNode,
  depth: number,
  selectedPath: string | null,
  onSelect: (path: string) => void,
  changedSet: Set<string>,
): React.ReactNode {
  return (
    <ul className="cv-diff-tree__list" style={{ paddingLeft: depth === 0 ? 0 : 12 }}>
      {node.children.map((child) => {
        const isLeaf = child.path != null;
        const isSel = isLeaf && child.path === selectedPath;
        const changed = isLeaf && child.path ? changedSet.has(child.path) : false;
        return (
          <li key={`${depth}-${child.name}`} className="cv-diff-tree__item">
            {isLeaf ? (
              <button
                type="button"
                className={`cv-diff-tree__leaf ${isSel ? 'is-active' : ''} ${changed ? 'is-changed' : ''}`}
                onClick={() => child.path && onSelect(child.path)}
              >
                <span className="cv-diff-tree__name">{child.name}</span>
              </button>
            ) : (
              <div className="cv-diff-tree__dir">
                <span className="cv-diff-tree__dir-name">{child.name}</span>
                {renderPathTreeNode(child, depth + 1, selectedPath, onSelect, changedSet)}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

const ComponentVersionCompare: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const componentId = resolveComponentId(searchParams);

  const [list, setList] = useState<ComponentVersionListItem[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [baseVersion, setBaseVersion] = useState<number | null>(null);
  const [compareVersion, setCompareVersion] = useState<number | null>(null);
  const [onlyChangedCode, setOnlyChangedCode] = useState(true);

  const [diffLoading, setDiffLoading] = useState(false);
  const [diffError, setDiffError] = useState('');
  const [selectedCodePath, setSelectedCodePath] = useState<string | null>(null);

  const [baseTemplate, setBaseTemplate] = useState<ComponentDetail['template'] | null>(null);
  const [compareTemplate, setCompareTemplate] = useState<ComponentDetail['template'] | null>(null);
  const [compareMeta, setCompareMeta] = useState<ComponentVersionListItem | null>(null);
  const [baseMeta, setBaseMeta] = useState<ComponentVersionListItem | null>(null);

  const [compareRouteId, setCompareRouteId] = useState<string | null>(null);
  const [uiJump, setUiJump] = useState<{ key: string; nonce: number }>({ key: '', nonce: 0 });
  const [comparePaneLayout, setComparePaneLayout] = useState<ComparePaneLayout>('unified');
  const [activeView, setActiveView] = useState<DetailView>('summary');

  const loadList = useCallback(async () => {
    if (!componentId) { setList([]); return; }
    setListLoading(true);
    try {
      const res = await getComponentVersionList(componentId);
      if (res.code !== 0) { MessagePlugin.warning(res.message || '版本目录加载失败'); setList([]); return; }
      const raw = res.data?.list;
      const sorted = Array.isArray(raw) ? [...raw].sort((a, b) => a.version - b.version) : [];
      setList(sorted);
      const params = new URLSearchParams(window.location.search);
      const urlBase = parseVersionParam(params.get('base'));
      const urlCompare = parseVersionParam(params.get('compare'));
      if (sorted.length > 0) {
        const maxV = sorted[sorted.length - 1].version;
        setCompareVersion(urlCompare ?? maxV);
        setBaseVersion(urlBase ?? (sorted.length >= 2 ? sorted[sorted.length - 2].version : sorted[0].version));
      } else {
        setBaseVersion(urlBase);
        setCompareVersion(urlCompare);
      }
    } catch {
      setList([]);
      MessagePlugin.warning('版本目录加载失败');
    } finally {
      setListLoading(false);
    }
  }, [componentId]);

  useEffect(() => { void loadList(); }, [loadList]);

  useEffect(() => {
    if (!baseTemplate || !compareTemplate) return;
    const ids = new Set<string>();
    baseTemplate.routes?.forEach((r) => ids.add(r.routeId));
    compareTemplate.routes?.forEach((r) => ids.add(r.routeId));
    if (ids.size === 0) { setCompareRouteId(null); return; }
    const ordered = [...ids];
    setCompareRouteId((prev) => (prev && ids.has(prev) ? prev : ordered[0]));
  }, [baseTemplate, compareTemplate]);

  const versionOptions = useMemo(
    () => list.map((item) => ({ label: `v${item.version}`, value: item.version })),
    [list],
  );

  const runDiff = useCallback(async () => {
    if (!componentId || baseVersion == null || compareVersion == null) {
      MessagePlugin.warning('请选择 base 与 compare 版本');
      return;
    }
    setDiffLoading(true);
    setDiffError('');
    setBaseTemplate(null);
    setCompareTemplate(null);
    setSelectedCodePath(null);
    setActiveView('summary');
    try {
      const [resBase, resCompare] = await Promise.all([
        getComponentTemplateDetail(componentId, { version: baseVersion }),
        getComponentTemplateDetail(componentId, { version: compareVersion }),
      ]);
      if (resBase?.code !== 0 || resCompare?.code !== 0) {
        setDiffError(resBase?.message || resCompare?.message || '接口返回错误');
        return;
      }
      const b = resBase?.data?.template;
      const c = resCompare?.data?.template;
      if (!b || !c) { setDiffError('无法加载某一版本的模板数据'); return; }
      setBaseTemplate(b);
      setCompareTemplate(c);
      setBaseMeta(list.find((x) => x.version === baseVersion) ?? null);
      setCompareMeta(list.find((x) => x.version === compareVersion) ?? null);
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('id', componentId);
          next.set('base', String(baseVersion));
          next.set('compare', String(compareVersion));
          return next;
        },
        { replace: true },
      );
      const { stats } = diffComponentTemplates(b, c);
      const codeStats = stats.filter((s) => isCodeVirtualPath(s.path));
      const firstCodeChange = codeStats.find((s) => s.changed);
      setSelectedCodePath(firstCodeChange?.path ?? codeStats[0]?.path ?? null);
    } catch {
      setDiffError('对比请求失败');
    } finally {
      setDiffLoading(false);
    }
  }, [baseVersion, compareVersion, componentId, list, setSearchParams]);

  const routeOptions = useMemo(() => {
    if (!baseTemplate || !compareTemplate) return [] as { label: string; value: string }[];
    const map = new Map<string, string>();
    const push = (routes: typeof baseTemplate.routes) => {
      routes?.forEach((r) => {
        const rc = r.routeConfig as { routeName?: string; routePath?: string } | undefined;
        map.set(r.routeId, String(rc?.routeName || rc?.routePath || r.routeId));
      });
    };
    push(baseTemplate.routes);
    push(compareTemplate.routes);
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }, [baseTemplate, compareTemplate]);

  const baseSlice = useMemo(() => baseTemplate ? buildTemplateSliceForCompare(baseTemplate, compareRouteId) : null, [baseTemplate, compareRouteId]);
  const compareSlice = useMemo(() => compareTemplate ? buildTemplateSliceForCompare(compareTemplate, compareRouteId) : null, [compareTemplate, compareRouteId]);

  const uiDiff = useMemo(() => {
    if (!baseSlice || !compareSlice) return null;
    return computeUiTreeDiff(
      baseSlice.template.uiTree as unknown as UiTreeNode,
      compareSlice.template.uiTree as unknown as UiTreeNode,
    );
  }, [baseSlice, compareSlice]);

  const uiSummary = useMemo(() => uiDiff ? summarizeUiDiff(uiDiff.baseStatus, uiDiff.compareStatus) : null, [uiDiff]);

  const diffResult = useMemo(() => {
    if (!baseTemplate || !compareTemplate) return null;
    return diffComponentTemplates(baseTemplate, compareTemplate);
  }, [baseTemplate, compareTemplate]);

  const flowSummary = useMemo(() => {
    if (!baseSlice || !compareSlice) return null;
    const bNodes = (baseSlice.template.flowNodes ?? []) as Node[];
    const bEdges = filterEdgesForNodes((baseSlice.template.flowEdges ?? []) as Edge[], bNodes);
    const cNodes = (compareSlice.template.flowNodes ?? []) as Node[];
    const cEdges = filterEdgesForNodes((compareSlice.template.flowEdges ?? []) as Edge[], cNodes);
    const { nodeBase, nodeCompare, edgeBase, edgeCompare } = computeFlowDiff(bNodes, bEdges, cNodes, cEdges);
    let nodesAdded = 0; let nodesRemoved = 0; let nodesModified = 0;
    let edgesAdded = 0; let edgesRemoved = 0; let edgesModified = 0;
    for (const s of nodeCompare.values()) { if (s === 'added') nodesAdded++; else if (s === 'modified') nodesModified++; }
    for (const s of nodeBase.values()) { if (s === 'removed') nodesRemoved++; }
    for (const s of edgeCompare.values()) { if (s === 'added') edgesAdded++; else if (s === 'modified') edgesModified++; }
    for (const s of edgeBase.values()) { if (s === 'removed') edgesRemoved++; }
    return {
      nodesAdded, nodesRemoved, nodesModified,
      edgesAdded, edgesRemoved, edgesModified,
      total: nodesAdded + nodesRemoved + nodesModified + edgesAdded + edgesRemoved + edgesModified,
    };
  }, [baseSlice, compareSlice]);

  const codeSummary = useMemo(() => {
    if (!diffResult) return null;
    const codeStats = diffResult.stats.filter((s) => isCodeVirtualPath(s.path));
    const changed = codeStats.filter((s) => s.changed).length;
    return { total: codeStats.length, changed };
  }, [diffResult]);

  const codeDiffResult = useMemo(() => {
    if (!diffResult) return null;
    const stats = onlyChangedCode
      ? diffResult.stats.filter((s) => isCodeVirtualPath(s.path) && s.changed)
      : diffResult.stats.filter((s) => isCodeVirtualPath(s.path));
    return { stats, fileDiffs: diffResult.fileDiffs, treePaths: stats.map((s) => s.path) };
  }, [diffResult, onlyChangedCode]);

  useEffect(() => {
    if (!codeDiffResult) return;
    const validPaths = new Set(codeDiffResult.treePaths);
    if (selectedCodePath && validPaths.has(selectedCodePath)) return;
    const firstChanged = codeDiffResult.stats.find((s) => s.changed);
    setSelectedCodePath(firstChanged?.path ?? codeDiffResult.treePaths[0] ?? null);
  }, [codeDiffResult, selectedCodePath]);

  const codePathTree = useMemo(() => codeDiffResult ? buildPathTree(codeDiffResult.treePaths) : buildPathTree([]), [codeDiffResult]);
  const codeChangedSet = useMemo(() => codeDiffResult ? new Set(codeDiffResult.stats.filter((s) => s.changed).map((s) => s.path)) : new Set<string>(), [codeDiffResult]);
  const activeCodeUnified = useMemo(() => (!codeDiffResult || !selectedCodePath) ? '' : (codeDiffResult.fileDiffs.get(selectedCodePath)?.unified ?? ''), [codeDiffResult, selectedCodePath]);

  const flowBase = useMemo(() => {
    if (!baseSlice) return { nodes: [] as Node[], edges: [] as Edge[] };
    return { nodes: (baseSlice.template.flowNodes ?? []) as Node[], edges: (baseSlice.template.flowEdges ?? []) as Edge[] };
  }, [baseSlice]);
  const flowCompare = useMemo(() => {
    if (!compareSlice) return { nodes: [] as Node[], edges: [] as Edge[] };
    return { nodes: (compareSlice.template.flowNodes ?? []) as Node[], edges: (compareSlice.template.flowEdges ?? []) as Edge[] };
  }, [compareSlice]);

  const triggerUiJump = useCallback((key: string) => { setUiJump((j) => ({ key, nonce: j.nonce + 1 })); }, []);

  const handleOpenCodeWorkbench = () => {
    if (!diffResult || !componentId || baseVersion == null || compareVersion == null) return;
    const files = diffResult.stats
      .filter((s) => s.changed && isCodeVirtualPath(s.path))
      .map((s) => ({
        id: s.path.replace(/\//g, '__'),
        path: s.path,
        base: diffResult.baseFiles.get(s.path) ?? '',
        compare: diffResult.compareFiles.get(s.path) ?? '',
        language: 'javascript' as const,
      }));
    if (files.length === 0) { MessagePlugin.info('流程代码节点无变更'); return; }
    openComponentTemplateDiffWorkbench({
      returnTo: window.location.pathname + window.location.search,
      title: `组件 ${componentId} · 代码 Diff`,
      baseVersionLabel: `v${baseVersion}`,
      compareVersionLabel: `v${compareVersion}`,
      files,
    });
  };

  const handleRollback = (target: 'base' | 'compare') => {
    if (!componentId) return;
    const v = target === 'base' ? baseVersion : compareVersion;
    if (v == null) return;
    const label = target === 'base' ? 'Base' : 'Compare';
    const dialog = DialogPlugin.confirm({
      header: '恢复草稿',
      body: `确定用 ${label} 的 v${v} 快照覆盖当前服务端草稿？未发布的编辑将丢失。`,
      confirmBtn: '恢复',
      cancelBtn: '取消',
      onConfirm: async () => {
        dialog.hide();
        try {
          const res = await getComponentTemplateDetail(componentId, { version: v });
          if (!res.data?.template) { MessagePlugin.error('加载该版本失败'); return; }
          await updateComponentDraft(componentId, buildRollbackDraftPayload(res.data));
          MessagePlugin.success(`已将 v${v} 写入草稿，请打开编辑器继续`);
        } catch {
          MessagePlugin.error('恢复失败，请稍后重试');
        }
      },
    });
  };

  if (!componentId) {
    return (
      <div className="cv-diff-page">
        <div className="cv-diff-page__narrow">
          <Title level="h5">缺少组件 ID</Title>
          <Text>请在 URL 中提供 <code>?id=组件ID</code></Text>
          <Button style={{ marginTop: 16 }} variant="outline" onClick={() => navigate(-1)}>返回</Button>
        </div>
      </div>
    );
  }

  const hasDiff = Boolean(baseTemplate && compareTemplate);

  const layoutDropdownOptions = [
    { content: '上下对照（推荐）', value: 'unified' },
    { content: '左右两栏', value: 'split' },
    { content: '上下两栏', value: 'stack' },
  ];

  const moreActionsOptions = [
    { content: '将 Compare 写入草稿', value: 'rollback-compare', prefixIcon: <RollbackIcon /> },
    { content: '将 Base 写入草稿', value: 'rollback-base', prefixIcon: <RollbackIcon /> },
    { content: '打开编辑器', value: 'editor' },
    { content: '版本目录', value: 'catalog' },
  ];

  const handleMoreAction = (data: { value: string }) => {
    switch (data.value) {
      case 'rollback-compare': handleRollback('compare'); break;
      case 'rollback-base': handleRollback('base'); break;
      case 'editor': navigate(`/create-component?id=${encodeURIComponent(componentId)}`); break;
      case 'catalog': navigate(`/component-version-catalog?id=${encodeURIComponent(componentId)}`); break;
    }
  };

  const uiHasChanges = uiSummary ? (uiSummary.added + uiSummary.removed + uiSummary.modified) > 0 : false;
  const flowHasChanges = flowSummary ? flowSummary.total > 0 : false;
  const codeHasChanges = codeSummary ? codeSummary.changed > 0 : false;

  return (
    <div className="cv-diff-page cv-diff-page--v3">
      {/* ── 顶部导航栏 ── */}
      <header className="cv3-topbar">
        <div className="cv3-topbar__left">
          <Button shape="circle" variant="text" icon={<ArrowLeftIcon />} onClick={() => navigate(-1)} />
          <div className="cv3-topbar__title-group">
            <span className="cv3-topbar__title">版本对比</span>
            <span className="cv3-topbar__id">{componentId}</span>
          </div>
        </div>
        <div className="cv3-topbar__right">
          <Select
            clearable={false}
            style={{ width: 110 }}
            options={versionOptions}
            value={baseVersion ?? undefined}
            onChange={(v) => setBaseVersion(typeof v === 'number' ? v : null)}
            loading={listLoading}
            placeholder="Base"
            prefixIcon={<span className="cv3-version-label">Base</span>}
          />
          <span className="cv3-topbar__vs">vs</span>
          <Select
            clearable={false}
            style={{ width: 110 }}
            options={versionOptions}
            value={compareVersion ?? undefined}
            onChange={(v) => setCompareVersion(typeof v === 'number' ? v : null)}
            loading={listLoading}
            placeholder="Compare"
            prefixIcon={<span className="cv3-version-label">New</span>}
          />
          <Button theme="primary" loading={diffLoading} onClick={() => void runDiff()} size="small">
            对比
          </Button>
          {hasDiff ? (
            <Dropdown
              options={moreActionsOptions as any}
              onClick={handleMoreAction as any}
              trigger="click"
              minColumnWidth={180}
            >
              <Button variant="text" icon={<ChevronDownIcon />} size="small">更多</Button>
            </Dropdown>
          ) : null}
        </div>
      </header>

      {diffError ? <div className="cv3-error">{diffError}</div> : null}

      {/* ── 版本说明条（收敛为单行，hover 可展开） ── */}
      {hasDiff && baseMeta && compareMeta ? (
        <div className="cv3-version-bar">
          <Popup
            trigger="hover"
            placement="bottom"
            content={
              <div style={{ maxWidth: 360, padding: '8px 4px', fontSize: 13, lineHeight: 1.6 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>v{baseVersion} 版本说明</div>
                <div style={{ marginBottom: 8 }}>{baseMeta.versionNote?.trim() || '（无）'}</div>
                <div style={{ fontSize: 12, color: 'var(--td-text-color-placeholder)' }}>
                  {baseMeta.publishedAt ? new Date(baseMeta.publishedAt).toLocaleString() : ''}
                </div>
              </div>
            }
          >
            <span className="cv3-version-bar__tag cv3-version-bar__tag--base">
              v{baseVersion}
              <span className="cv3-version-bar__note">{baseMeta.versionNote?.trim().slice(0, 40) || '无说明'}</span>
            </span>
          </Popup>
          <span className="cv3-version-bar__arrow">→</span>
          <Popup
            trigger="hover"
            placement="bottom"
            content={
              <div style={{ maxWidth: 360, padding: '8px 4px', fontSize: 13, lineHeight: 1.6 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>v{compareVersion} 版本说明</div>
                <div style={{ marginBottom: 8 }}>{compareMeta.versionNote?.trim() || '（无）'}</div>
                <div style={{ fontSize: 12, color: 'var(--td-text-color-placeholder)' }}>
                  {compareMeta.publishedAt ? new Date(compareMeta.publishedAt).toLocaleString() : ''}
                </div>
              </div>
            }
          >
            <span className="cv3-version-bar__tag cv3-version-bar__tag--compare">
              v{compareVersion}
              <span className="cv3-version-bar__note">{compareMeta.versionNote?.trim().slice(0, 40) || '无说明'}</span>
            </span>
          </Popup>
        </div>
      ) : null}

      {/* ── 摘要卡片 ── */}
      {hasDiff && uiSummary && flowSummary && codeSummary ? (
        <>
          <div className="cv3-summary-grid">
            <button type="button" className={`cv3-summary-card ${activeView === 'ui' ? 'is-active' : ''}`} onClick={() => setActiveView(activeView === 'ui' ? 'summary' : 'ui')}>
              <div className="cv3-summary-card__icon"><BrowseIcon /></div>
              <div className="cv3-summary-card__body">
                <div className="cv3-summary-card__title">界面</div>
                {uiHasChanges ? (
                  <div className="cv3-summary-card__stats">
                    {uiSummary.added > 0 ? <Tag size="small" theme="success" variant="light">+{uiSummary.added}</Tag> : null}
                    {uiSummary.removed > 0 ? <Tag size="small" theme="danger" variant="light">-{uiSummary.removed}</Tag> : null}
                    {uiSummary.modified > 0 ? <Tag size="small" theme="primary" variant="light">~{uiSummary.modified}</Tag> : null}
                  </div>
                ) : <span className="cv3-summary-card__no-change">无变更</span>}
              </div>
            </button>
            <button type="button" className={`cv3-summary-card ${activeView === 'flow' ? 'is-active' : ''}`} onClick={() => setActiveView(activeView === 'flow' ? 'summary' : 'flow')}>
              <div className="cv3-summary-card__icon"><ViewListIcon /></div>
              <div className="cv3-summary-card__body">
                <div className="cv3-summary-card__title">流程</div>
                {flowHasChanges ? (
                  <div className="cv3-summary-card__stats">
                    <Tag size="small" variant="light">{flowSummary.total} 处变更</Tag>
                  </div>
                ) : <span className="cv3-summary-card__no-change">无变更</span>}
              </div>
            </button>
            <button type="button" className={`cv3-summary-card ${activeView === 'code' ? 'is-active' : ''}`} onClick={() => setActiveView(activeView === 'code' ? 'summary' : 'code')}>
              <div className="cv3-summary-card__icon"><CodeIcon /></div>
              <div className="cv3-summary-card__body">
                <div className="cv3-summary-card__title">代码</div>
                {codeHasChanges ? (
                  <div className="cv3-summary-card__stats">
                    <Tag size="small" variant="light">{codeSummary.changed}/{codeSummary.total} 文件变更</Tag>
                  </div>
                ) : <span className="cv3-summary-card__no-change">无变更</span>}
              </div>
            </button>
          </div>

          {/* ── 详情工作区 ── */}
          {activeView !== 'summary' ? (
            <section className="cv3-detail">
              <div className="cv3-detail__bar">
                <span className="cv3-detail__bar-title">
                  {activeView === 'ui' ? '界面对比' : activeView === 'flow' ? '流程对比' : '代码对比'}
                </span>
                <div className="cv3-detail__bar-actions">
                  {activeView === 'ui' && routeOptions.length > 1 ? (
                    <Select
                      clearable={false}
                      style={{ minWidth: 160, maxWidth: 280 }}
                      options={routeOptions}
                      value={compareRouteId ?? undefined}
                      onChange={(v) => setCompareRouteId(typeof v === 'string' ? v : null)}
                      size="small"
                      placeholder="路由"
                    />
                  ) : null}
                  {(activeView === 'ui' || activeView === 'flow') ? (
                    <Dropdown
                      options={layoutDropdownOptions as any}
                      onClick={(data: any) => setComparePaneLayout(data.value as ComparePaneLayout)}
                      trigger="click"
                      minColumnWidth={160}
                    >
                      <Button variant="outline" size="small" icon={<SettingIcon />}>
                        布局
                      </Button>
                    </Dropdown>
                  ) : null}
                  {activeView === 'code' ? (
                    <>
                      <Space align="center" size={4}>
                        <Switch value={onlyChangedCode} onChange={setOnlyChangedCode} size="small" />
                        <Text theme="secondary" style={{ fontSize: 12 }}>仅变更</Text>
                      </Space>
                      <Button variant="outline" size="small" onClick={handleOpenCodeWorkbench}>代码工作台</Button>
                    </>
                  ) : null}
                  <Button variant="text" size="small" onClick={() => setActiveView('summary')}>收起</Button>
                </div>
              </div>

              {/* UI 详情 */}
              {activeView === 'ui' && baseSlice && compareSlice && uiDiff ? (
                <div className="cv3-detail__content">
                  {(uiSummary!.modifiedKeys.length > 0 || uiSummary!.addedKeys.length > 0 || uiSummary!.removedKeys.length > 0) ? (
                    <Popup
                      trigger="click"
                      placement="bottom-left"
                      content={
                        <div className="cv3-jump-popup">
                          {uiSummary!.modifiedKeys.length > 0 ? (
                            <div className="cv3-jump-popup__group">
                              <div className="cv3-jump-popup__label">修改</div>
                              <div className="cv3-jump-popup__tags">
                                {uiSummary!.modifiedKeys.map((k) => (
                                  <Tag key={`jm-${k}`} size="small" theme="primary" variant="light" className="cv3-jump-tag" onClick={() => triggerUiJump(k)}>{k}</Tag>
                                ))}
                              </div>
                            </div>
                          ) : null}
                          {uiSummary!.addedKeys.length > 0 ? (
                            <div className="cv3-jump-popup__group">
                              <div className="cv3-jump-popup__label">新增</div>
                              <div className="cv3-jump-popup__tags">
                                {uiSummary!.addedKeys.map((k) => (
                                  <Tag key={`ja-${k}`} size="small" theme="success" variant="light" className="cv3-jump-tag" onClick={() => triggerUiJump(k)}>{k}</Tag>
                                ))}
                              </div>
                            </div>
                          ) : null}
                          {uiSummary!.removedKeys.length > 0 ? (
                            <div className="cv3-jump-popup__group">
                              <div className="cv3-jump-popup__label">删除</div>
                              <div className="cv3-jump-popup__tags">
                                {uiSummary!.removedKeys.map((k) => (
                                  <Tag key={`jr-${k}`} size="small" theme="danger" variant="light" className="cv3-jump-tag" onClick={() => triggerUiJump(k)}>{k}</Tag>
                                ))}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      }
                    >
                      <Button variant="outline" size="small" style={{ marginBottom: 10 }}>跳转到变更节点</Button>
                    </Popup>
                  ) : null}
                  <VersionDiffSimulator
                    baseTemplate={baseSlice.template}
                    compareTemplate={compareSlice.template}
                    baseStatus={uiDiff.baseStatus}
                    compareStatus={uiDiff.compareStatus}
                    jumpTargetKey={uiJump.key}
                    jumpNonce={uiJump.nonce}
                    paneLayout={comparePaneLayout}
                  />
                </div>
              ) : null}

              {/* 流程详情 */}
              {activeView === 'flow' ? (
                <div className="cv3-detail__content">
                  <VersionDiffFlow
                    baseNodes={flowBase.nodes}
                    baseEdges={flowBase.edges}
                    compareNodes={flowCompare.nodes}
                    compareEdges={flowCompare.edges}
                    paneLayout={comparePaneLayout}
                  />
                </div>
              ) : null}

              {/* 代码详情 */}
              {activeView === 'code' ? (
                <div className="cv3-detail__content">
                  <div className="cv-diff-page__code-split">
                    <Card bordered className="cv-diff-page__code-tree-card" title="代码文件">
                      {codeDiffResult && codeDiffResult.treePaths.length > 0 ? (
                        <div className="cv-diff-tree">{renderPathTreeNode(codePathTree, 0, selectedCodePath, setSelectedCodePath, codeChangedSet)}</div>
                      ) : (
                        <Text theme="secondary">无代码节点文件或未变更</Text>
                      )}
                    </Card>
                    <Card bordered className="cv-diff-page__code-diff-card" title={selectedCodePath ?? 'Unified diff'}>
                      {selectedCodePath && codeDiffResult?.fileDiffs.has(selectedCodePath) ? (
                        <div className="cv-diff-unified">
                          <pre className="cv-diff-unified__pre">{activeCodeUnified}</pre>
                        </div>
                      ) : (
                        <Text theme="secondary">选择左侧文件</Text>
                      )}
                    </Card>
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}
        </>
      ) : !hasDiff ? (
        <div className="cv3-empty">
          <Text theme="secondary">选择版本后点击「对比」</Text>
        </div>
      ) : null}
    </div>
  );
};

export default ComponentVersionCompare;
