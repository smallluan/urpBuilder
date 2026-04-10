import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  DialogPlugin,
  Form,
  MessagePlugin,
  Radio,
  Select,
  Space,
  Switch,
  Tabs,
  Tag,
  Typography,
} from 'tdesign-react';
import { ArrowLeftIcon } from 'tdesign-icons-react';
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
import { buildPathTree, type VirtualPathTreeNode } from '../../builder/versionDiff/virtualTemplateFiles';
import type { ComparePaneLayout } from './comparePaneLayout';
import VersionDiffSimulator from './VersionDiffSimulator';
import VersionDiffFlow from './VersionDiffFlow';
import './style.less';

const { Text, Title } = Typography;

const resolveComponentId = (params: URLSearchParams) => {
  const raw = (params.get('id') || params.get('pageId') || '').trim();
  if (!raw) {
    return '';
  }
  const normalized = raw.toLowerCase();
  if (normalized === 'undefined' || normalized === 'null') {
    return '';
  }
  return raw;
};

const parseVersionParam = (raw: string | null): number | null => {
  if (raw == null || raw === '') {
    return null;
  }
  const n = Number(String(raw).trim());
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
};

const isCodeVirtualPath = (path: string) => path.startsWith('flow/code/');

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

  /** 多路由模板：两侧使用同一 routeId 切片后再 diff */
  const [compareRouteId, setCompareRouteId] = useState<string | null>(null);
  /** 界面模拟器：点击节点 key 快速跳转（展开 Tabs/visible 等） */
  const [uiJump, setUiJump] = useState<{ key: string; nonce: number }>({ key: '', nonce: 0 });
  /** 界面 / 流程：并排、上下或单列全宽，缓解窄屏 */
  const [comparePaneLayout, setComparePaneLayout] = useState<ComparePaneLayout>('unified');

  const loadList = useCallback(async () => {
    if (!componentId) {
      setList([]);
      return;
    }
    setListLoading(true);
    try {
      const res = await getComponentVersionList(componentId);
      if (res.code !== 0) {
        MessagePlugin.warning(res.message || '版本目录加载失败');
        setList([]);
        return;
      }
      const raw = res.data?.list;
      const sorted = Array.isArray(raw) ? [...raw].sort((a, b) => a.version - b.version) : [];
      setList(sorted);

      const params = new URLSearchParams(window.location.search);
      const urlBase = parseVersionParam(params.get('base'));
      const urlCompare = parseVersionParam(params.get('compare'));

      if (sorted.length > 0) {
        const maxV = sorted[sorted.length - 1].version;
        const nextCompare = urlCompare ?? maxV;
        const nextBase = urlBase ?? (sorted.length >= 2 ? sorted[sorted.length - 2].version : sorted[0].version);
        setCompareVersion(nextCompare);
        setBaseVersion(nextBase);
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

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    if (!baseTemplate || !compareTemplate) {
      return;
    }
    const ids = new Set<string>();
    baseTemplate.routes?.forEach((r) => ids.add(r.routeId));
    compareTemplate.routes?.forEach((r) => ids.add(r.routeId));
    if (ids.size === 0) {
      setCompareRouteId(null);
      return;
    }
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
      if (!b || !c) {
        setDiffError('无法加载某一版本的模板数据');
        return;
      }
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
    if (!baseTemplate || !compareTemplate) {
      return [] as { label: string; value: string }[];
    }
    const map = new Map<string, string>();
    const push = (routes: typeof baseTemplate.routes) => {
      routes?.forEach((r) => {
        const rc = r.routeConfig as { routeName?: string; routePath?: string } | undefined;
        const label = rc?.routeName || rc?.routePath || r.routeId;
        map.set(r.routeId, String(label));
      });
    };
    push(baseTemplate.routes);
    push(compareTemplate.routes);
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }, [baseTemplate, compareTemplate]);

  const baseSlice = useMemo(() => {
    if (!baseTemplate) {
      return null;
    }
    return buildTemplateSliceForCompare(baseTemplate, compareRouteId);
  }, [baseTemplate, compareRouteId]);

  const compareSlice = useMemo(() => {
    if (!compareTemplate) {
      return null;
    }
    return buildTemplateSliceForCompare(compareTemplate, compareRouteId);
  }, [compareTemplate, compareRouteId]);

  const uiDiff = useMemo(() => {
    if (!baseSlice || !compareSlice) {
      return null;
    }
    return computeUiTreeDiff(
      baseSlice.template.uiTree as unknown as UiTreeNode,
      compareSlice.template.uiTree as unknown as UiTreeNode,
    );
  }, [baseSlice, compareSlice]);

  const uiSummary = useMemo(() => {
    if (!uiDiff) {
      return null;
    }
    return summarizeUiDiff(uiDiff.baseStatus, uiDiff.compareStatus);
  }, [uiDiff]);

  const diffResult = useMemo(() => {
    if (!baseTemplate || !compareTemplate) {
      return null;
    }
    return diffComponentTemplates(baseTemplate, compareTemplate);
  }, [baseTemplate, compareTemplate]);

  const codeDiffResult = useMemo(() => {
    if (!diffResult) {
      return null;
    }
    const stats = onlyChangedCode
      ? diffResult.stats.filter((s) => isCodeVirtualPath(s.path) && s.changed)
      : diffResult.stats.filter((s) => isCodeVirtualPath(s.path));
    const treePaths = stats.map((s) => s.path);
    return {
      stats,
      fileDiffs: diffResult.fileDiffs,
      treePaths,
    };
  }, [diffResult, onlyChangedCode]);

  const codePathTree = useMemo(
    () => (codeDiffResult ? buildPathTree(codeDiffResult.treePaths) : buildPathTree([])),
    [codeDiffResult],
  );

  const codeChangedSet = useMemo(() => {
    if (!codeDiffResult) {
      return new Set<string>();
    }
    return new Set(codeDiffResult.stats.filter((s) => s.changed).map((s) => s.path));
  }, [codeDiffResult]);

  const activeCodeUnified = useMemo(() => {
    if (!codeDiffResult || !selectedCodePath) {
      return '';
    }
    return codeDiffResult.fileDiffs.get(selectedCodePath)?.unified ?? '';
  }, [codeDiffResult, selectedCodePath]);

  const flowBase = useMemo(() => {
    if (!baseSlice) {
      return { nodes: [] as Node[], edges: [] as Edge[] };
    }
    return {
      nodes: (baseSlice.template.flowNodes ?? []) as Node[],
      edges: (baseSlice.template.flowEdges ?? []) as Edge[],
    };
  }, [baseSlice]);

  const flowCompare = useMemo(() => {
    if (!compareSlice) {
      return { nodes: [] as Node[], edges: [] as Edge[] };
    }
    return {
      nodes: (compareSlice.template.flowNodes ?? []) as Node[],
      edges: (compareSlice.template.flowEdges ?? []) as Edge[],
    };
  }, [compareSlice]);

  const triggerUiJump = useCallback((key: string) => {
    setUiJump((j) => ({ key, nonce: j.nonce + 1 }));
  }, []);

  const handleOpenCodeWorkbench = () => {
    if (!diffResult || !componentId || baseVersion == null || compareVersion == null) {
      return;
    }
    const files = diffResult.stats
      .filter((s) => s.changed && isCodeVirtualPath(s.path))
      .map((s) => {
        const baseText = diffResult.baseFiles.get(s.path) ?? '';
        const compareText = diffResult.compareFiles.get(s.path) ?? '';
        return {
          id: s.path.replace(/\//g, '__'),
          path: s.path,
          base: baseText,
          compare: compareText,
          language: 'javascript' as const,
        };
      });
    if (files.length === 0) {
      MessagePlugin.info('流程代码节点无变更');
      return;
    }
    openComponentTemplateDiffWorkbench({
      returnTo: window.location.pathname + window.location.search,
      title: `组件 ${componentId} · 代码 Diff`,
      baseVersionLabel: `v${baseVersion}`,
      compareVersionLabel: `v${compareVersion}`,
      files,
    });
  };

  const handleRollback = (target: 'base' | 'compare') => {
    if (!componentId) {
      return;
    }
    const v = target === 'base' ? baseVersion : compareVersion;
    if (v == null) {
      return;
    }
    const label = target === 'base' ? '左侧（base）' : '右侧（compare）';
    const dialog = DialogPlugin.confirm({
      header: '恢复草稿',
      body: `确定用 ${label} 的 v${v} 快照覆盖当前服务端草稿？未发布的编辑将丢失。`,
      confirmBtn: '恢复',
      cancelBtn: '取消',
      onConfirm: async () => {
        dialog.hide();
        try {
          const res = await getComponentTemplateDetail(componentId, { version: v });
          const detail = res.data;
          if (!detail?.template) {
            MessagePlugin.error('加载该版本失败');
            return;
          }
          const payload = buildRollbackDraftPayload(detail);
          await updateComponentDraft(componentId, payload);
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
          <Button style={{ marginTop: 16 }} variant="outline" onClick={() => navigate(-1)}>
            返回
          </Button>
        </div>
      </div>
    );
  }

  const hasDiff = Boolean(baseTemplate && compareTemplate);

  return (
    <div className="cv-diff-page cv-diff-page--v2">
      <header className="cv-diff-page__hero">
        <div className="cv-diff-page__hero-left">
          <Button shape="circle" variant="outline" icon={<ArrowLeftIcon />} onClick={() => navigate(-1)} />
          <div>
            <Title level="h5" className="cv-diff-page__hero-title">
              组件版本对比
            </Title>
            <Text theme="secondary" className="cv-diff-page__hero-id">
              {componentId}
            </Text>
          </div>
        </div>
        <Space size={8}>
          <Button variant="outline" onClick={() => navigate(`/create-component?id=${encodeURIComponent(componentId)}`)}>
            打开编辑器
          </Button>
          <Button variant="outline" onClick={() => navigate(`/component-version-catalog?id=${encodeURIComponent(componentId)}`)}>
            版本目录
          </Button>
        </Space>
      </header>

      <section className="cv-diff-page__toolbar">
        <Form layout="inline" className="cv-diff-page__toolbar-form">
          <Form.FormItem label="Base">
            <Select
              clearable={false}
              style={{ width: 168 }}
              options={versionOptions}
              value={baseVersion ?? undefined}
              onChange={(v) => setBaseVersion(typeof v === 'number' ? v : null)}
              loading={listLoading}
            />
          </Form.FormItem>
          <Form.FormItem label="Compare">
            <Select
              clearable={false}
              style={{ width: 168 }}
              options={versionOptions}
              value={compareVersion ?? undefined}
              onChange={(v) => setCompareVersion(typeof v === 'number' ? v : null)}
              loading={listLoading}
            />
          </Form.FormItem>
          <Form.FormItem>
            <Button theme="primary" loading={diffLoading} onClick={() => void runDiff()}>
              加载对比
            </Button>
          </Form.FormItem>
          {hasDiff ? (
            <Form.FormItem label="对照布局">
              <Radio.Group
                variant="default-filled"
                value={comparePaneLayout}
                onChange={(v) => setComparePaneLayout(v as ComparePaneLayout)}
              >
                <Radio.Button value="unified">单页上下对照（推荐）</Radio.Button>
                <Radio.Button value="split">左右两栏</Radio.Button>
                <Radio.Button value="stack">上下两栏</Radio.Button>
              </Radio.Group>
            </Form.FormItem>
          ) : null}
        </Form>
        {diffError ? (
          <Text theme="error" className="cv-diff-page__toolbar-error">
            {diffError}
          </Text>
        ) : null}
      </section>

      {hasDiff && baseMeta && compareMeta ? (
        <section className="cv-diff-page__notes">
          <div className="cv-diff-page__note-card">
            <Text className="cv-diff-page__note-ver">v{baseVersion}</Text>
            <Text theme="secondary" className="cv-diff-page__note-meta">
              {baseMeta.publishedAt ? new Date(baseMeta.publishedAt).toLocaleString() : '—'}
            </Text>
            <Text className="cv-diff-page__note-body">{baseMeta.versionNote?.trim() || '（无版本说明）'}</Text>
          </div>
          <div className="cv-diff-page__note-card cv-diff-page__note-card--accent">
            <Text className="cv-diff-page__note-ver">v{compareVersion}</Text>
            <Text theme="secondary" className="cv-diff-page__note-meta">
              {compareMeta.publishedAt ? new Date(compareMeta.publishedAt).toLocaleString() : '—'}
            </Text>
            <Text className="cv-diff-page__note-body">{compareMeta.versionNote?.trim() || '（无版本说明）'}</Text>
          </div>
          <div className="cv-diff-page__note-actions">
            <Button size="small" variant="outline" onClick={() => handleRollback('compare')}>
              将 Compare 写入草稿
            </Button>
            <Button size="small" variant="outline" onClick={() => handleRollback('base')}>
              将 Base 写入草稿
            </Button>
          </div>
        </section>
      ) : null}

      {hasDiff && baseSlice && compareSlice && uiDiff && uiSummary ? (
        <Tabs defaultValue="ui" className="cv-diff-page__tabs" size="medium">
          <Tabs.TabPanel value="ui" label="界面（模拟器）">
            <div className="cv-diff-page__panel">
              <Text theme="secondary" className="cv-diff-page__panel-hint">
                按画布节点 <code>key</code> 对比：红删、绿增、蓝改；不展示底层 JSON。默认「单页上下对照」在同一滚动区内上旧下新同时可见（类似 VS Code 单页看旧/新）；删/增只分别出现在上/下段。
                {routeOptions.length > 1 ? ' 多路由时请切换「路由」以对比对应视图的 UI。' : ''}
              </Text>
              <div className="cv-diff-page__ui-toolbar">
                {routeOptions.length > 1 ? (
                  <div className="cv-diff-page__ui-toolbar-row">
                    <Text theme="secondary" className="cv-diff-page__ui-toolbar-label">
                      路由
                    </Text>
                    <Select
                      clearable={false}
                      style={{ minWidth: 200, maxWidth: 360 }}
                      options={routeOptions}
                      value={compareRouteId ?? undefined}
                      onChange={(v) => setCompareRouteId(typeof v === 'string' ? v : null)}
                    />
                  </div>
                ) : null}
                <div className="cv-diff-page__ui-toolbar-row cv-diff-page__ui-toolbar-row--stats">
                  <Text>
                    新增 <strong>{uiSummary.added}</strong>
                  </Text>
                  <Text>
                    删除 <strong>{uiSummary.removed}</strong>
                  </Text>
                  <Text>
                    修改 <strong>{uiSummary.modified}</strong>
                  </Text>
                </div>
                {(uiSummary.modifiedKeys.length > 0 ||
                  uiSummary.addedKeys.length > 0 ||
                  uiSummary.removedKeys.length > 0) && (
                  <div className="cv-diff-page__ui-jump-wrap">
                    {uiSummary.modifiedKeys.length > 0 ? (
                      <div className="cv-diff-page__ui-jump-group">
                        <Text theme="secondary" className="cv-diff-page__ui-jump-title">
                          修改（点击跳转）
                        </Text>
                        <div className="cv-diff-page__ui-jump-tags">
                          {uiSummary.modifiedKeys.map((k) => (
                            <Tag
                              key={`jm-${k}`}
                              size="small"
                              theme="primary"
                              variant="light"
                              className="cv-diff-page__ui-jump-tag"
                              onClick={() => triggerUiJump(k)}
                            >
                              {k}
                            </Tag>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {uiSummary.addedKeys.length > 0 ? (
                      <div className="cv-diff-page__ui-jump-group">
                        <Text theme="secondary" className="cv-diff-page__ui-jump-title">
                          新增（点击跳转）
                        </Text>
                        <div className="cv-diff-page__ui-jump-tags">
                          {uiSummary.addedKeys.map((k) => (
                            <Tag
                              key={`ja-${k}`}
                              size="small"
                              theme="success"
                              variant="light"
                              className="cv-diff-page__ui-jump-tag"
                              onClick={() => triggerUiJump(k)}
                            >
                              {k}
                            </Tag>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {uiSummary.removedKeys.length > 0 ? (
                      <div className="cv-diff-page__ui-jump-group">
                        <Text theme="secondary" className="cv-diff-page__ui-jump-title">
                          删除（仅 Base 侧可定位）
                        </Text>
                        <div className="cv-diff-page__ui-jump-tags">
                          {uiSummary.removedKeys.map((k) => (
                            <Tag
                              key={`jr-${k}`}
                              size="small"
                              theme="danger"
                              variant="light"
                              className="cv-diff-page__ui-jump-tag"
                              onClick={() => triggerUiJump(k)}
                            >
                              {k}
                            </Tag>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
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
          </Tabs.TabPanel>
          <Tabs.TabPanel value="flow" label="流程图">
            <div className="cv-diff-page__panel">
              <Text theme="secondary" className="cv-diff-page__panel-hint">
                在流程画布上高亮节点描边与连线颜色。对照布局与「界面」页相同，默认单页上下对照。
              </Text>
              <VersionDiffFlow
                baseNodes={flowBase.nodes}
                baseEdges={flowBase.edges}
                compareNodes={flowCompare.nodes}
                compareEdges={flowCompare.edges}
                paneLayout={comparePaneLayout}
              />
            </div>
          </Tabs.TabPanel>
          <Tabs.TabPanel value="code" label="代码（流程节点）">
            <div className="cv-diff-page__panel cv-diff-page__panel--code">
              <Text theme="secondary" className="cv-diff-page__panel-hint">
                仅对比流程中 <strong>代码节点</strong> 源码（<code>flow/code/*.js</code>），可在代码工作台中 Merge 查看。
              </Text>
              <div className="cv-diff-page__code-actions">
                <Button theme="primary" variant="outline" size="small" onClick={handleOpenCodeWorkbench}>
                  在代码工作台打开
                </Button>
                <Space align="center" size={8}>
                  <Text theme="secondary" style={{ fontSize: 12 }}>
                    列表
                  </Text>
                  <Switch value={onlyChangedCode} onChange={setOnlyChangedCode} size="small" />
                  <Text theme="secondary" style={{ fontSize: 12 }}>
                    仅变更
                  </Text>
                </Space>
              </div>
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
          </Tabs.TabPanel>
        </Tabs>
      ) : (
        <Card bordered className="cv-diff-page__empty-card">
          <Text theme="secondary">选择版本后点击「加载对比」查看界面 / 流程 / 代码 三类差异。</Text>
        </Card>
      )}
    </div>
  );
};

export default ComponentVersionCompare;
