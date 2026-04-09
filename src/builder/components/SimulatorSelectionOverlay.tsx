import React, { useLayoutEffect, useState } from 'react';
import { useBuilderContext } from '../context/BuilderContext';
import { getEffectiveBoundingRect, getScrollTargetForBuilderNode } from '../utils/builderNodeDomRect';

export interface SimulatorSelectionOverlayProps {
  scrollContainerRef: React.RefObject<HTMLElement | null>;
}

type OverlayRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

/**
 * 模拟器内选区蒙层：脱离文档流绘制虚线框，不修改组件本体样式。
 * 须与 `position: absolute` 的包含块一致：蒙层在 `.simulator-library-brush-root` 内时，坐标相对该根节点
 *（勿用 scroll 内容坐标 + scrollTop，否则在 scroll 有 padding-top / 刘海内边距时框会整体偏下）。
 */
const SimulatorSelectionOverlay: React.FC<SimulatorSelectionOverlayProps> = ({ scrollContainerRef }) => {
  const { useStore } = useBuilderContext();
  const activeNodeKey = useStore((state) => state.activeNodeKey);
  const uiPageData = useStore((state) => state.uiPageData);
  /** 切换预览组件库时 DOM 重挂载但 DSL 引用常不变，须参与依赖以重算选区 */
  const previewUiLibrary = useStore((state) => state.previewUiLibrary);
  const [rect, setRect] = useState<OverlayRect | null>(null);

  useLayoutEffect(() => {
    const container = scrollContainerRef.current;
    if (!activeNodeKey || !container) {
      setRect(null);
      return undefined;
    }

    const safeKey =
      typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
        ? CSS.escape(activeNodeKey)
        : activeNodeKey.replace(/"/g, '\\"');

    let cancelled = false;
    const update = () => {
      if (cancelled) {
        return;
      }
      const el = container.querySelector<HTMLElement>(`[data-builder-node-key="${safeKey}"]`);
      if (!el) {
        setRect(null);
        return;
      }
      const eRect = getEffectiveBoundingRect(el);
      const brushRoot = container.querySelector<HTMLElement>('.simulator-library-brush-root');
      if (brushRoot) {
        const oRect = brushRoot.getBoundingClientRect();
        setRect({
          left: eRect.left - oRect.left,
          top: eRect.top - oRect.top,
          width: eRect.width,
          height: eRect.height,
        });
        return;
      }
      const cRect = container.getBoundingClientRect();
      setRect({
        left: eRect.left - cRect.left + container.scrollLeft,
        top: eRect.top - cRect.top + container.scrollTop,
        width: eRect.width,
        height: eRect.height,
      });
    };

    update();
    const rafId1 = window.requestAnimationFrame(() => {
      if (!cancelled) {
        update();
      }
    });

    const ro = new ResizeObserver(() => {
      if (!cancelled) {
        update();
      }
    });
    const observed = container.querySelector<HTMLElement>(`[data-builder-node-key="${safeKey}"]`);
    if (observed) {
      ro.observe(getScrollTargetForBuilderNode(observed));
    }

    container.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(rafId1);
      ro.disconnect();
      container.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [activeNodeKey, scrollContainerRef, uiPageData, previewUiLibrary]);

  if (!rect || rect.width <= 0 || rect.height <= 0) {
    return null;
  }

  return (
    <div
      className="simulator-selection-overlay"
      aria-hidden
      style={{
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      }}
    />
  );
};

export default SimulatorSelectionOverlay;
