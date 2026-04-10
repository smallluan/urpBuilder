import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ComponentTemplateContent } from '../../api/types';
import ComponentBody from '../../builder/renderer/ComponentBody';
import { BuilderProvider } from '../../builder/context/BuilderContext';
import { AntdRuntimeRoot } from '../../builder/antd/AntdRuntimeRoot';
import { createCompareBuilderStore } from '../../builder/versionDiff/createCompareBuilderStore';
import { revealUiNodePath } from '../../builder/versionDiff/revealUiNodeForDiff';
import type { UiNodeDiffStatus } from '../../builder/versionDiff/uiTreeDiff';
import type { UiTreeNode } from '../../builder/store/types';
import type { ComparePaneLayout } from './comparePaneLayout';

type Props = {
  baseTemplate: ComponentTemplateContent;
  compareTemplate: ComponentTemplateContent;
  baseStatus: Map<string, UiNodeDiffStatus>;
  compareStatus: Map<string, UiNodeDiffStatus>;
  jumpTargetKey: string;
  jumpNonce: number;
  paneLayout?: ComparePaneLayout;
};

/** 左右列滚动条互相同步 */
function useSyncedColumnScrollPair(a: HTMLDivElement | null, b: HTMLDivElement | null) {
  useEffect(() => {
    if (!a || !b) {
      return;
    }
    let lock = false;
    const sync = (from: HTMLElement, to: HTMLElement) => {
      if (lock) {
        return;
      }
      lock = true;
      to.scrollTop = from.scrollTop;
      to.scrollLeft = from.scrollLeft;
      requestAnimationFrame(() => {
        lock = false;
      });
    };
    const onA = () => sync(a, b);
    const onB = () => sync(b, a);
    a.addEventListener('scroll', onA, { passive: true });
    b.addEventListener('scroll', onB, { passive: true });
    return () => {
      a.removeEventListener('scroll', onA);
      b.removeEventListener('scroll', onB);
    };
  }, [a, b]);
}

function shouldShowBadge(side: 'base' | 'compare', st: UiNodeDiffStatus | undefined): boolean {
  if (!st || st === 'unchanged') {
    return false;
  }
  if (side === 'base') {
    return st === 'removed' || st === 'modified';
  }
  return st === 'added' || st === 'modified';
}

const DiffSimColumn: React.FC<{
  useStore: ReturnType<typeof createCompareBuilderStore>;
  side: 'base' | 'compare';
  statusMap: Map<string, UiNodeDiffStatus>;
  label: string;
  shellRef: React.RefObject<HTMLDivElement | null>;
  scrollRef?: (el: HTMLDivElement | null) => void;
  /** unified：嵌入单页滚动区，无独立列高 */
  mode?: 'column' | 'unifiedPane';
}> = ({ useStore, side, statusMap, label, shellRef, scrollRef, mode = 'column' }) => {
  const applyBadges = React.useCallback(() => {
    const root = shellRef.current;
    if (!root) {
      return;
    }
    root.querySelectorAll('[data-builder-node-key]').forEach((el) => {
      const html = el as HTMLElement;
      const key = html.getAttribute('data-builder-node-key');
      html.classList.remove('cv-diff-ui-host', 'cv-diff-ui--removed', 'cv-diff-ui--added', 'cv-diff-ui--modified');
      if (!key) {
        return;
      }
      const st = statusMap.get(key);
      if (!shouldShowBadge(side, st)) {
        return;
      }
      html.classList.add('cv-diff-ui-host', `cv-diff-ui--${st}`);
    });
  }, [side, statusMap, shellRef]);

  useEffect(() => {
    applyBadges();
    const unsub = useStore.subscribe(() => {
      window.requestAnimationFrame(applyBadges);
    });
    const ro = new ResizeObserver(() => window.requestAnimationFrame(applyBadges));
    if (shellRef.current) {
      ro.observe(shellRef.current);
    }
    return () => {
      unsub();
      ro.disconnect();
    };
  }, [applyBadges, useStore, shellRef]);

  const inner = (
    <BuilderProvider useStore={useStore} readOnly entityType="component">
      <div ref={shellRef as React.Ref<HTMLDivElement>} className="cv-diff-sim-embed create-page">
        <div className="create-body">
          <main className="main-body">
            <div className="main-inner">
              <ComponentBody />
            </div>
          </main>
        </div>
      </div>
    </BuilderProvider>
  );

  if (mode === 'unifiedPane') {
    return (
      <div className={`cv-diff-ui__unified-pane cv-diff-ui__unified-pane--${side}`}>
        <div className="cv-diff-ui__unified-pane-head">{label}</div>
        <div className="cv-diff-ui__unified-pane-body">{inner}</div>
      </div>
    );
  }

  return (
    <div className="cv-diff-ui__column">
      <div className="cv-diff-ui__column-head">{label}</div>
      <div ref={scrollRef!} className="cv-diff-ui__column-scroll">
        {inner}
      </div>
    </div>
  );
};

const VersionDiffSimulator: React.FC<Props> = ({
  baseTemplate,
  compareTemplate,
  baseStatus,
  compareStatus,
  jumpTargetKey,
  jumpNonce,
  paneLayout = 'unified',
}) => {
  const baseStore = useMemo(() => createCompareBuilderStore(baseTemplate), [baseTemplate]);
  const compareStore = useMemo(() => createCompareBuilderStore(compareTemplate), [compareTemplate]);

  const baseShellRef = useRef<HTMLDivElement>(null);
  const compareShellRef = useRef<HTMLDivElement>(null);
  const unifiedScrollRef = useRef<HTMLDivElement>(null);
  const [baseScrollEl, setBaseScrollEl] = useState<HTMLDivElement | null>(null);
  const [compareScrollEl, setCompareScrollEl] = useState<HTMLDivElement | null>(null);
  const bindBaseScroll = useCallback((el: HTMLDivElement | null) => {
    setBaseScrollEl(el);
  }, []);
  const bindCompareScroll = useCallback((el: HTMLDivElement | null) => {
    setCompareScrollEl(el);
  }, []);

  const isDual = paneLayout === 'split' || paneLayout === 'stack';
  useSyncedColumnScrollPair(isDual ? baseScrollEl : null, isDual ? compareScrollEl : null);

  useEffect(() => {
    if (!jumpTargetKey.trim() || jumpNonce <= 0) {
      return;
    }

    const applyReveal = (store: ReturnType<typeof createCompareBuilderStore>) => {
      const tree = store.getState().uiPageData as UiTreeNode;
      const next = revealUiNodePath(tree, jumpTargetKey);
      store.setState({ uiPageData: next });
    };
    applyReveal(baseStore);
    applyReveal(compareStore);

    let raf1 = 0;
    let raf2 = 0;
    raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(() => {
        const esc =
          typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
            ? CSS.escape(jumpTargetKey)
            : jumpTargetKey.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        const sel = `[data-builder-node-key="${esc}"]`;
        if (paneLayout === 'unified') {
          const el = unifiedScrollRef.current?.querySelector(sel) as HTMLElement | null;
          el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        } else {
          [baseShellRef, compareShellRef].forEach((ref) => {
            const el = ref.current?.querySelector(sel) as HTMLElement | null;
            el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
          });
        }
      });
    });
    return () => {
      window.cancelAnimationFrame(raf1);
      window.cancelAnimationFrame(raf2);
    };
  }, [jumpNonce, jumpTargetKey, baseStore, compareStore, paneLayout]);

  return (
    <AntdRuntimeRoot>
      <div className="cv-diff-ui">
        <div className="cv-diff-ui__legend">
          <span className="cv-diff-ui__pill cv-diff-ui__pill--removed">删</span>
          <span>删除（仅出现在上方旧版预览）</span>
          <span className="cv-diff-ui__pill cv-diff-ui__pill--added">新</span>
          <span>新增（仅出现在下方新版预览）</span>
          <span className="cv-diff-ui__pill cv-diff-ui__pill--modified">改</span>
          <span>修改（两侧均有）</span>
          {isDual ? <span className="cv-diff-ui__legend-sync">· 双栏时滚动同步</span> : null}
          {paneLayout === 'unified' ? (
            <span className="cv-diff-ui__legend-sync">· 单页内上旧下新，同时可见</span>
          ) : null}
        </div>
        <div className={`cv-diff-ui__split cv-diff-ui__split--${paneLayout}`}>
          {paneLayout === 'unified' ? (
            <div ref={unifiedScrollRef} className="cv-diff-ui__unified-scroll">
              <DiffSimColumn
                mode="unifiedPane"
                useStore={baseStore}
                side="base"
                statusMap={baseStatus}
                label="旧版（Base）— 删除仅在此段出现"
                shellRef={baseShellRef}
              />
              <div className="cv-diff-ui__unified-sep" role="separator" aria-hidden />
              <DiffSimColumn
                mode="unifiedPane"
                useStore={compareStore}
                side="compare"
                statusMap={compareStatus}
                label="新版（Compare）— 新增仅在此段出现"
                shellRef={compareShellRef}
              />
            </div>
          ) : null}
          {paneLayout === 'split' || paneLayout === 'stack' ? (
            <>
              <DiffSimColumn
                useStore={baseStore}
                side="base"
                statusMap={baseStatus}
                label="Base（旧版）"
                shellRef={baseShellRef}
                scrollRef={bindBaseScroll}
              />
              <DiffSimColumn
                useStore={compareStore}
                side="compare"
                statusMap={compareStatus}
                label="Compare（新版）"
                shellRef={compareShellRef}
                scrollRef={bindCompareScroll}
              />
            </>
          ) : null}
        </div>
      </div>
    </AntdRuntimeRoot>
  );
};

export default React.memo(VersionDiffSimulator);
