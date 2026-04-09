import React, { useEffect, useLayoutEffect, useRef } from 'react';
import type { UiPreviewLibrary } from '../../config/uiPreviewLibrary';
import { SimulatorPreviewLibraryOverrideContext } from '../context/SimulatorPreviewLibraryOverrideContext';
import { useBuilderContext } from '../context/BuilderContext';
import {
  BRUSH_DURATION_MS,
  clipRectByDiagonalLess,
  endSimulatorLibraryTransitionRun,
  toClipPath,
} from '../utils/simulatorViewTransition';
import './SimulatorLibraryBrushOverlay.less';

export type SimulatorLibraryBrushRender = (library: UiPreviewLibrary) => React.ReactNode;

type Props = {
  /** 与 store.previewUiLibrary 同步；过渡中仍为 from */
  activeLibrary: UiPreviewLibrary;
  variant?: 'main' | 'embedded';
  children: SimulatorLibraryBrushRender;
};

const SimulatorLibraryBrushOverlay: React.FC<Props> = ({
  activeLibrary: _activeLibraryFromParent,
  variant = 'main',
  children,
}) => {
  const { useStore } = useBuilderContext();
  const transition = useStore((s) => s.simulatorLibraryTransition);
  const previewUiLibrary = useStore((s) => s.previewUiLibrary);
  const commitSimulatorLibraryTransition = useStore((s) => s.commitSimulatorLibraryTransition);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const stackRef = useRef<HTMLDivElement | null>(null);
  const targetLayerRef = useRef<HTMLDivElement | null>(null);
  const animationFrameRef = useRef(0);
  const runGenerationRef = useRef(0);

  const vtClass =
    variant === 'embedded'
      ? 'urpbuilder-simulator-vt-surface urpbuilder-simulator-vt-surface--embedded'
      : 'urpbuilder-simulator-vt-surface urpbuilder-simulator-vt-surface--main';

  const showDual = Boolean(transition);

  useLayoutEffect(() => {
    if (!transition) {
      return;
    }
    const root = rootRef.current;
    const scrollHost = root?.closest('.simulator-scroll') as HTMLElement | null;
    if (scrollHost && (scrollHost.scrollTop !== 0 || scrollHost.scrollLeft !== 0)) {
      scrollHost.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }
  }, [transition]);

  useEffect(() => {
    if (!transition) {
      return;
    }

    const tr = transition;
    const gen = ++runGenerationRef.current;
    const getState = useStore.getState;

    const reduced =
      typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (reduced) {
      commitSimulatorLibraryTransition();
      endSimulatorLibraryTransitionRun('completed');
      return;
    }

    let rafId = 0;
    const startedAt = performance.now();

    const finishIfCurrent = () => {
      const cur = getState().simulatorLibraryTransition;
      if (!cur || cur.from !== tr.from || cur.to !== tr.to) {
        return;
      }
      commitSimulatorLibraryTransition();
      endSimulatorLibraryTransitionRun('completed');
    };

    const tick = (now: number) => {
      if (gen !== runGenerationRef.current) {
        return;
      }

      const nl = targetLayerRef.current;
      const st = stackRef.current;
      if (!nl || !st) {
        rafId = requestAnimationFrame(tick);
        return;
      }

      const w = st.clientWidth;
      const h = st.clientHeight;
      if (w < 1 || h < 1) {
        rafId = requestAnimationFrame(tick);
        return;
      }

      const raw = Math.min((now - startedAt) / BRUSH_DURATION_MS, 1);
      const totalDistance = w + h;
      /* 与 raw 线性一致，避免 ease-out 末端「几乎不动」导致画面已铺满却迟迟不触发 commit/切换成功 */
      const threshold = totalDistance * raw;

      if (threshold < 0.5) {
        nl.style.clipPath = 'polygon(0 0, 0 0, 0 0)';
      } else {
        nl.style.clipPath = toClipPath(clipRectByDiagonalLess(w, h, threshold), w, h);
      }

      if (raw < 1) {
        animationFrameRef.current = requestAnimationFrame(tick);
      } else {
        finishIfCurrent();
      }
    };

    rafId = requestAnimationFrame(() => {
      requestAnimationFrame(tick);
    });

    return () => {
      cancelAnimationFrame(rafId);
      cancelAnimationFrame(animationFrameRef.current);
      const nl = targetLayerRef.current;
      if (nl) {
        nl.style.clipPath = '';
      }
    };
  }, [transition, commitSimulatorLibraryTransition]);

  return (
    <div
      ref={rootRef}
      className={[
        'simulator-library-brush-root',
        vtClass,
        showDual ? 'simulator-library-brush-root--transitioning' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div
        className={[
          'simulator-library-transition-stack',
          showDual
            ? 'simulator-library-transition-stack--dual'
            : 'simulator-library-transition-stack--idle',
        ].join(' ')}
        ref={stackRef}
      >
        {/*
         * 底层始终渲染「已提交」组件库（过渡中仍为 from），避免再挂一份 from 导致整树 remount 闪屏。
         * 过渡时仅在上方叠目标库 + clip-path。
         */}
        <div
          key="urpbuilder-sim-layer-committed"
          className="simulator-library-transition-layer simulator-library-transition-layer--committed"
          data-urpbuilder-simulator-preview-layer="old"
        >
          <SimulatorPreviewLibraryOverrideContext.Provider value={previewUiLibrary}>
            {children(previewUiLibrary)}
          </SimulatorPreviewLibraryOverrideContext.Provider>
        </div>
        {transition ? (
          <div
            key="urpbuilder-sim-layer-target"
            ref={targetLayerRef}
            className="simulator-library-transition-layer simulator-library-transition-layer--new"
            data-urpbuilder-simulator-preview-layer="new"
          >
            <SimulatorPreviewLibraryOverrideContext.Provider value={transition.to}>
              {children(transition.to)}
            </SimulatorPreviewLibraryOverrideContext.Provider>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default SimulatorLibraryBrushOverlay;
