import React, { useEffect, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { openEditorInNewTab } from './openEditorInNewTab';

export type RecentEditItem = {
  pageId: string;
  pageName: string;
  entityType: 'page' | 'component';
  updatedAt: string;
};

type Props = {
  items: RecentEditItem[];
  loading: boolean;
};

/** 单行高度；视口固定展示 3 行 */
const LINE_PX = 38;
const VISIBLE = 3;
const INTERVAL_MS = 3000;

function RecentEditRow({
  row,
  onGo,
}: {
  row: RecentEditItem;
  onGo: () => void;
}) {
  return (
    <div className="home-page__recent-edits-line">
      <div className="home-page__recent-edits-row">
        <span className="home-page__recent-edits-badge">{row.entityType === 'page' ? '应用' : '组件'}</span>
        <span className="home-page__recent-edits-name">{row.pageName || '未命名'}</span>
        <span className="home-page__recent-edits-time">{formatTime(row.updatedAt)}</span>
        <button type="button" className="home-page__recent-edits-go" onClick={onGo}>
          前往
        </button>
      </div>
    </div>
  );
}

export const RecentEditsTicker: React.FC<Props> = ({ items, loading }) => {
  const [scrollIndex, setScrollIndex] = useState(0);
  const [noTransition, setNoTransition] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const prevScroll = useRef(-1);

  const maxScroll = Math.max(0, items.length - VISIBLE);
  const useAutoScroll = items.length > VISIBLE && !reducedMotion;

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReducedMotion(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  useEffect(() => {
    if (maxScroll <= 0) {
      prevScroll.current = scrollIndex;
      return;
    }
    if (scrollIndex === 0 && prevScroll.current === maxScroll) {
      setNoTransition(true);
      requestAnimationFrame(() => setNoTransition(false));
    }
    prevScroll.current = scrollIndex;
  }, [scrollIndex, maxScroll]);

  useEffect(() => {
    if (!useAutoScroll) {
      return;
    }
    const id = window.setInterval(() => {
      setScrollIndex((i) => {
        if (i >= maxScroll) {
          return 0;
        }
        return i + 1;
      });
    }, INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [useAutoScroll, maxScroll]);

  useEffect(() => {
    setScrollIndex(0);
    prevScroll.current = -1;
  }, [items]);

  const open = (row: RecentEditItem) => {
    const path = row.entityType === 'page' ? '/create-page' : '/create-component';
    openEditorInNewTab(`${path}?id=${encodeURIComponent(row.pageId)}`);
  };

  if (loading) {
    return (
      <div className="home-page__recent-edits home-page__recent-edits--loading" role="status">
        <span className="home-page__recent-edits-placeholder">加载中…</span>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="home-page__recent-edits home-page__recent-edits--empty" role="status">
        <span className="home-page__recent-edits-placeholder">暂无最近编辑</span>
        <span className="home-page__recent-edits-hint">新建或打开应用/组件后会出现在这里</span>
      </div>
    );
  }

  const viewportH = VISIBLE * LINE_PX;

  if (!useAutoScroll) {
    const listClass =
      reducedMotion && items.length > VISIBLE
        ? 'home-page__recent-edits-list home-page__recent-edits-list--clip'
        : 'home-page__recent-edits-list';

    return (
      <div className="home-page__recent-edits home-page__recent-edits--static">
        <div className={listClass} style={reducedMotion && items.length > VISIBLE ? { maxHeight: viewportH } : undefined}>
          {items.map((row) => (
            <RecentEditRow key={`${row.entityType}-${row.pageId}`} row={row} onGo={() => open(row)} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="home-page__recent-edits">
      <div className="home-page__recent-edits-window" style={{ height: viewportH }}>
        <div
          className="home-page__recent-edits-track"
          style={{
            transform: `translateY(-${scrollIndex * LINE_PX}px)`,
            transition: noTransition ? 'none' : 'transform 0.45s cubic-bezier(0.33, 1, 0.68, 1)',
          }}
        >
          {items.map((row) => (
            <RecentEditRow key={`${row.entityType}-${row.pageId}`} row={row} onGo={() => open(row)} />
          ))}
        </div>
      </div>
    </div>
  );
};

function formatTime(iso: string): string {
  const d = dayjs(iso);
  if (!d.isValid()) {
    return '—';
  }
  return d.format('M月D日 HH:mm');
}
