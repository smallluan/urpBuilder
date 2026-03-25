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
 * 坐标相对于 scrollContainerRef（须为 position: relative 且与画布内容同步滚动）。
 */
const SimulatorSelectionOverlay: React.FC<SimulatorSelectionOverlayProps> = ({ scrollContainerRef }) => {
  const { useStore } = useBuilderContext();
  const activeNodeKey = useStore((state) => state.activeNodeKey);
  const uiPageData = useStore((state) => state.uiPageData);
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

    const update = () => {
      const el = container.querySelector<HTMLElement>(`[data-builder-node-key="${safeKey}"]`);
      if (!el) {
        setRect(null);
        return;
      }
      const cRect = container.getBoundingClientRect();
      const eRect = getEffectiveBoundingRect(el);
      setRect({
        left: eRect.left - cRect.left + container.scrollLeft,
        top: eRect.top - cRect.top + container.scrollTop,
        width: eRect.width,
        height: eRect.height,
      });
    };

    update();
    const rafId = window.requestAnimationFrame(() => update());

    const ro = new ResizeObserver(() => update());
    const observed = container.querySelector<HTMLElement>(`[data-builder-node-key="${safeKey}"]`);
    if (observed) {
      ro.observe(getScrollTargetForBuilderNode(observed));
    }

    container.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);

    return () => {
      window.cancelAnimationFrame(rafId);
      ro.disconnect();
      container.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [activeNodeKey, scrollContainerRef, uiPageData]);

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
