import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AutoComplete } from 'tdesign-react';
import type { AutoCompleteOption } from 'tdesign-react';
import type { AutoCompleteRef } from 'tdesign-react/es/auto-complete/AutoComplete';
import { SearchIcon } from 'tdesign-icons-react';
import { useBuilderContext } from '../context/BuilderContext';
import type { PageRouteRecord, UiTreeNode } from '../store/types';
import type { Node } from '@xyflow/react';
import { getFlowNodeStructureSourceKey } from '../utils/flowNodeSourceKey';

type Mode = 'component' | 'flow';

type UiMatch = { kind: 'ui'; key: string };
type FlowMatch = { kind: 'flow'; id: string; structureKey: string | null };
type RouteMatch = { kind: 'route'; routeId: string };
type FindMatch = UiMatch | FlowMatch | RouteMatch;

const flattenUiNodes = (node: UiTreeNode, out: Array<{ key: string; label: string; type: string }> = []) => {
  out.push({
    key: node.key,
    label: String(node.label ?? ''),
    type: String(node.type ?? ''),
  });
  (node.children ?? []).forEach((child) => flattenUiNodes(child, out));
  return out;
};

const textMatches = (query: string, ...parts: string[]) => {
  const q = query.trim().toLowerCase();
  if (!q) {
    return false;
  }
  return parts.some((p) => String(p).toLowerCase().includes(q));
};

const collectFlowMatches = (flowNodes: Node[], query: string): FlowMatch[] => {
  const q = query.trim();
  if (!q) {
    return [];
  }
  const list: FlowMatch[] = [];
  for (const n of flowNodes) {
    const data = (n.data ?? {}) as { label?: unknown };
    const label = String(data.label ?? '');
    const sk = getFlowNodeStructureSourceKey(n);
    if (textMatches(q, n.id, label, sk ?? '')) {
      list.push({ kind: 'flow', id: n.id, structureKey: sk });
    }
  }
  return list;
};

const collectUiMatches = (uiPageData: UiTreeNode, query: string): UiMatch[] => {
  const q = query.trim();
  if (!q) {
    return [];
  }
  const flat = flattenUiNodes(uiPageData);
  return flat
    .filter((row) => textMatches(q, row.key, row.label, row.type))
    .map((row) => ({ kind: 'ui' as const, key: row.key }));
};

const collectRouteMatches = (pageRoutes: PageRouteRecord[], query: string): RouteMatch[] => {
  if (pageRoutes.length <= 1) {
    return [];
  }
  const q = query.trim();
  if (!q) {
    return [];
  }
  const list: RouteMatch[] = [];
  for (const r of pageRoutes) {
    const c = r.routeConfig;
    if (textMatches(q, r.routeId, c.routeName, c.pageTitle, c.menuTitle, c.routePath)) {
      list.push({ kind: 'route', routeId: r.routeId });
    }
  }
  return list;
};

/** 选项 text 与 FindMatch 一一对应；用于 onSelect / onChange 识别 */
const optionTextForUi = (label: string, type: string, key: string) =>
  `[组件] ${label || '(无标题)'} · ${type || '?'} — ${key}`;

const optionTextForFlow = (label: string, id: string) => `[流程] ${label || '(无标题)'} — ${id}`;

const optionTextForRoute = (name: string, routeId: string, path: string) =>
  `[路由] ${name || routeId} — ${path || routeId}`;

const renderOptionRow = (variant: 'route' | 'ui' | 'flow', badge: string, title: string, sub: string) => (
  <div className="builder-quick-find__option">
    <span className={`builder-quick-find__option-badge builder-quick-find__option-badge--${variant}`}>{badge}</span>
    <div className="builder-quick-find__option-main">
      <div className="builder-quick-find__option-title">{title}</div>
      {sub ? <div className="builder-quick-find__option-sub">{sub}</div> : null}
    </div>
  </div>
);

const BuilderQuickFind: React.FC<{ mode: Mode }> = ({ mode }) => {
  const { useStore } = useBuilderContext();
  const uiPageData = useStore((state) => state.uiPageData);
  const flowNodes = useStore((state) => state.flowNodes);
  const pageRoutes = useStore((state) => state.pageRoutes);
  const setActiveNode = useStore((state) => state.setActiveNode);
  const switchPageRoute = useStore((state) => state.switchPageRoute);
  const requestFlowViewportFocus = useStore((state) => state.requestFlowViewportFocus);
  const flowStructureTreeInstance = useStore((state) => state.flowStructureTreeInstance);

  const acRef = useRef<AutoCompleteRef>(null);
  const matchByOptionTextRef = useRef<Map<string, FindMatch>>(new Map());
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const flatUi = useMemo(() => flattenUiNodes(uiPageData), [uiPageData]);

  const matches = useMemo(() => {
    const routeMatches = collectRouteMatches(pageRoutes, query);
    if (mode === 'flow') {
      return [...routeMatches, ...collectFlowMatches(flowNodes, query)];
    }
    return [...routeMatches, ...collectUiMatches(uiPageData, query)];
  }, [flowNodes, mode, pageRoutes, query, uiPageData]);

  const { options, optionTexts } = useMemo(() => {
    const map = new Map<string, FindMatch>();
    const texts: string[] = [];
    const opts: AutoCompleteOption[] = [];

    const uiByKey = new Map(flatUi.map((row) => [row.key, row]));

    for (const m of matches) {
      let text = '';
      let label: React.ReactNode = null;
      if (m.kind === 'route') {
        const r = pageRoutes.find((x) => x.routeId === m.routeId);
        const c = r?.routeConfig;
        const name = c?.routeName ?? c?.pageTitle ?? m.routeId;
        const path = c?.routePath ?? '';
        text = optionTextForRoute(name, m.routeId, path);
        label = renderOptionRow('route', '路由', name, [m.routeId, path].filter(Boolean).join(' · '));
      } else if (m.kind === 'ui') {
        const row = uiByKey.get(m.key);
        const labelStr = row?.label ?? '';
        const typeStr = row?.type ?? '';
        text = optionTextForUi(labelStr, typeStr, m.key);
        label = renderOptionRow('ui', '组件', labelStr || m.key, [typeStr, m.key].filter(Boolean).join(' · '));
      } else {
        const n = flowNodes.find((x) => x.id === m.id);
        const data = (n?.data ?? {}) as { label?: unknown };
        const labelStr = String(data.label ?? '');
        text = optionTextForFlow(labelStr, m.id);
        label = renderOptionRow('flow', '流程', labelStr || m.id, m.structureKey ? `结构 ${m.structureKey}` : m.id);
      }
      map.set(text, m);
      texts.push(text);
      opts.push({ text, label });
    }
    matchByOptionTextRef.current = map;
    return { options: opts, optionTexts: texts };
  }, [flatUi, flowNodes, matches, pageRoutes]);

  const applyMatch = useCallback(
    (match: FindMatch) => {
      if (match.kind === 'route') {
        switchPageRoute(match.routeId);
        return;
      }
      if (match.kind === 'ui') {
        setActiveNode(match.key);
        return;
      }
      requestFlowViewportFocus(match.id);
      if (match.structureKey) {
        flowStructureTreeInstance?.scrollTo?.({ key: match.structureKey });
      }
    },
    [flowStructureTreeInstance, requestFlowViewportFocus, setActiveNode, switchPageRoute],
  );

  const closeAndReset = useCallback(() => {
    setOpen(false);
    setQuery('');
  }, []);

  const resolveAndApply = useCallback(
    (value: string) => {
      const match = matchByOptionTextRef.current.get(value);
      if (!match) {
        return false;
      }
      applyMatch(match);
      closeAndReset();
      return true;
    },
    [applyMatch, closeAndReset],
  );

  const handleSelect = useCallback(
    (value: string) => {
      resolveAndApply(String(value ?? ''));
    },
    [resolveAndApply],
  );

  const handleChange = useCallback(
    (value: string) => {
      const s = String(value ?? '');
      if (matchByOptionTextRef.current.has(s)) {
        return;
      }
      setQuery(s);
    },
    [],
  );

  const handleEnter = useCallback(() => {
    if (matches.length === 0) {
      return;
    }
    const first = optionTexts[0];
    if (first) {
      resolveAndApply(first);
    }
  }, [matches.length, optionTexts, resolveAndApply]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const inEditable = tag === 'input' || tag === 'textarea' || Boolean(target?.isContentEditable);
      const inOurFindBar = Boolean(target?.closest?.('.builder-quick-find'));

      if (event.key === 'Escape' && open) {
        event.preventDefault();
        event.stopPropagation();
        closeAndReset();
        return;
      }

      // 无 Shift：避免与 Ctrl/Cmd+Shift+F（切换到流程搭建）冲突
      const isFindShortcut =
        (event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === 'f';
      if (!isFindShortcut) {
        return;
      }

      if (inEditable && !inOurFindBar) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      setOpen(true);
      window.requestAnimationFrame(() => {
        const input = acRef.current?.inputRef;
        input?.focus?.();
        input?.select?.();
      });
    };

    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [closeAndReset, open]);

  const statusText =
    matches.length === 0
      ? query.trim()
        ? '无匹配项'
        : ''
      : `共 ${matches.length} 条 · Enter 打开第一项`;

  const placeholder =
    mode === 'flow'
      ? '搜索路由 / 流程节点 id、标题、结构 key'
      : '搜索路由 / 组件 label、key、type';

  const panel = open ? (
    <div className="builder-quick-find" role="search">
      <div className="builder-quick-find__inner">
        <div className="builder-quick-find__ac-wrap">
          <AutoComplete
            // TDesign 类型将 ref 标成 Props；运行时 ref 为 AutoCompleteRef（含 inputRef）
            ref={acRef as never}
            className="builder-quick-find__ac"
            value={query}
            onChange={handleChange}
            onSelect={handleSelect}
            onEnter={handleEnter}
            options={query.trim() ? options : undefined}
            filterable={false}
            highlightKeyword={false}
            clearable
            autofocus
            placeholder={placeholder}
            inputProps={{
              className: 'builder-quick-find__input',
              suffix: <SearchIcon />,
            }}
            popupProps={{
              overlayClassName: 'builder-quick-find__popup',
              overlayInnerClassName: 'builder-quick-find__popup-inner',
              zIndex: 9500,
            }}
            empty="无匹配项"
          />
        </div>
        <span className="builder-quick-find__meta">{statusText}</span>
        <button type="button" className="builder-quick-find__close" onClick={closeAndReset}>
          Esc
        </button>
      </div>
    </div>
  ) : null;

  if (typeof document === 'undefined' || !panel) {
    return null;
  }

  return createPortal(panel, document.body);
};

export default React.memo(BuilderQuickFind);
