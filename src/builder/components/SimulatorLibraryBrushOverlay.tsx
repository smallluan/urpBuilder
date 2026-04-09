import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { UiPreviewLibrary } from '../../config/uiPreviewLibrary';
import { SimulatorPreviewLibraryOverrideContext } from '../context/SimulatorPreviewLibraryOverrideContext';
import { useBuilderContext } from '../context/BuilderContext';
import {
  BRUSH_DURATION_MS,
  BRUSH_PHASE_SPLIT,
  clipRectByDiagonalLess,
  diagonalCutEdgeSegment,
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
  const committedLayerRef = useRef<HTMLDivElement | null>(null);
  const whiteMaskRef = useRef<HTMLDivElement | null>(null);
  const edgeGlintRef = useRef<HTMLDivElement | null>(null);
  const targetLayerRef = useRef<HTMLDivElement | null>(null);
  const animationFrameRef = useRef(0);
  const runGenerationRef = useRef(0);
  const revealGateRef = useRef(false);
  const [revealNewLayer, setRevealNewLayer] = useState(false);

  const vtClass =
    variant === 'embedded'
      ? 'urpbuilder-simulator-vt-surface urpbuilder-simulator-vt-surface--embedded'
      : 'urpbuilder-simulator-vt-surface urpbuilder-simulator-vt-surface--main';

  const showDual = Boolean(transition);

  useLayoutEffect(() => {
    if (!transition) {
      revealGateRef.current = false;
      setRevealNewLayer(false);
      return;
    }
    revealGateRef.current = false;
    setRevealNewLayer(false);
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

      const st = stackRef.current;
      const whiteEl = whiteMaskRef.current;
      const glintEl = edgeGlintRef.current;
      if (!whiteEl || !st) {
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

      /* 前半：白遮罩沿对角线扩大，盖住旧画布（不挂载新库） */
      const wipeRaw = Math.min(raw / BRUSH_PHASE_SPLIT, 1);
      const wipeThreshold = totalDistance * wipeRaw;
      if (wipeThreshold < 0.5) {
        whiteEl.style.clipPath = 'polygon(0 0, 0 0, 0 0)';
      } else {
        whiteEl.style.clipPath = toClipPath(clipRectByDiagonalLess(w, h, wipeThreshold), w, h);
      }

      const committedEl = committedLayerRef.current;
      if (committedEl) {
        committedEl.style.visibility = raw >= BRUSH_PHASE_SPLIT ? 'hidden' : 'visible';
      }

      /* 过半：挂载新库层，第二次斜线揭示 */
      if (raw >= BRUSH_PHASE_SPLIT && !revealGateRef.current) {
        revealGateRef.current = true;
        setRevealNewLayer(true);
      }

      const revealRaw =
        raw >= BRUSH_PHASE_SPLIT ? Math.min((raw - BRUSH_PHASE_SPLIT) / (1 - BRUSH_PHASE_SPLIT), 1) : 0;
      const revealThreshold = totalDistance * revealRaw;

      const nl = targetLayerRef.current;
      if (raw >= BRUSH_PHASE_SPLIT && nl) {
        if (revealThreshold < 0.5) {
          nl.style.clipPath = 'polygon(0 0, 0 0, 0 0)';
        } else {
          nl.style.clipPath = toClipPath(clipRectByDiagonalLess(w, h, revealThreshold), w, h);
        }
      }

      /* 刀光：与当前推进边（白遮罩边 或 新层揭示边）重合 */
      const edgeT = raw < BRUSH_PHASE_SPLIT ? wipeThreshold : revealThreshold;
      if (glintEl) {
        const seg = diagonalCutEdgeSegment(w, h, edgeT);
        if (!seg) {
          glintEl.style.opacity = '0';
        } else {
          glintEl.style.opacity = '1';
          glintEl.style.width = `${seg.length}px`;
          glintEl.style.left = `${seg.cx}px`;
          glintEl.style.top = `${seg.cy}px`;
          glintEl.style.transform = `translate(-50%, -50%) rotate(${seg.angleDeg}deg)`;
        }
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
      const wm = whiteMaskRef.current;
      if (wm) {
        wm.style.clipPath = '';
      }
      const nl = targetLayerRef.current;
      if (nl) {
        nl.style.clipPath = '';
      }
      const ce = committedLayerRef.current;
      if (ce) {
        ce.style.visibility = '';
      }
      const ge = edgeGlintRef.current;
      if (ge) {
        ge.style.opacity = '';
        ge.style.width = '';
        ge.style.left = '';
        ge.style.top = '';
        ge.style.transform = '';
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
         * 底层「已提交」库（过渡前半仍为 from）；前半仅叠白遮罩盖住旧画面，过半后再挂载目标库 + 第二次 clip 揭示。
         */}
        <div
          key="urpbuilder-sim-layer-committed"
          ref={committedLayerRef}
          className="simulator-library-transition-layer simulator-library-transition-layer--committed"
          data-urpbuilder-simulator-preview-layer="old"
        >
          <SimulatorPreviewLibraryOverrideContext.Provider value={previewUiLibrary}>
            {children(previewUiLibrary)}
          </SimulatorPreviewLibraryOverrideContext.Provider>
        </div>
        {transition ? (
          <>
            <div
              key="urpbuilder-sim-layer-white"
              ref={whiteMaskRef}
              className="simulator-library-transition-layer simulator-library-transition-layer--white-mask"
              aria-hidden
            />
            <div
              key="urpbuilder-sim-edge-glint"
              ref={edgeGlintRef}
              className="simulator-library-transition-layer simulator-library-edge-glint"
              aria-hidden
            />
            {revealNewLayer ? (
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
          </>
        ) : null}
      </div>
    </div>
  );
};

export default SimulatorLibraryBrushOverlay;
