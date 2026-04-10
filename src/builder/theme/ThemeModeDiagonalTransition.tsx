import { useEffect, useRef } from 'react';
import { clipRectByDiagonalLess, toClipPath } from '../utils/simulatorViewTransition';
import { useBuilderThemeStore } from './builderThemeStore';

/** 全局主题对角线过渡（独立于模拟器组件库切换的 2s 节奏） */
export const THEME_MODE_VIEW_TRANSITION_MS = 1000;

const STYLE_ID = 'urpbuilder-vt-theme-diagonal-keyframes';

const HTML_ATTR_THEME_VT = 'data-urpbuilder-theme-vt';

/** 模拟器为组件库切换挂了 view-transition-name，全局换肤时必须并入 root，否则会单独叠化、与对角线不同步 */
const SIMULATOR_VT_SUPPRESS_CSS = `
html[${HTML_ATTR_THEME_VT}="active"] .urpbuilder-simulator-vt-surface--main,
html[${HTML_ATTR_THEME_VT}="active"] .urpbuilder-simulator-vt-surface--embedded {
  view-transition-name: none !important;
}
`;

function buildDiagonalRevealKeyframesCss(width: number, height: number, steps: number): string {
  const total = width + height;
  let keyframes = '@keyframes urpbuilder-diagonal-theme-reveal {\n';
  for (let i = 0; i <= steps; i += 1) {
    const pct = (i / steps) * 100;
    const t = (i / steps) * total;
    const clip =
      t < 0.5 ? 'polygon(0 0, 0 0, 0 0)' : toClipPath(clipRectByDiagonalLess(width, height, t), width, height);
    keyframes += `  ${pct.toFixed(4)}% { clip-path: ${clip}; }\n`;
  }
  keyframes += '}\n';
  return keyframes;
}

type DocumentWithViewTransition = Document & {
  startViewTransition?: (callback: () => void | Promise<void>) => {
    finished: Promise<void>;
    skipTransition?: () => void;
  };
};

/**
 * 全局亮暗：用 View Transitions 的快照 + 对角线 clip，使「前沿」经过处已是新主题，未经过处仍为旧主题。
 * 与组件库切换几何一致（x+y 阈值推进），但无双阶段盖白再揭开。
 */
export function ThemeModeDiagonalTransition(): null {
  const transition = useBuilderThemeStore((s) => s.themeDiagonalTransition);
  const setColorMode = useBuilderThemeStore((s) => s.setColorMode);
  const endThemeDiagonalTransition = useBuilderThemeStore((s) => s.endThemeDiagonalTransition);

  const genRef = useRef(0);

  useEffect(() => {
    if (!transition) {
      return;
    }

    const { to } = transition;
    const gen = ++genRef.current;
    const doc = document as DocumentWithViewTransition;

    const removeInjectedStyle = () => {
      document.getElementById(STYLE_ID)?.remove();
      document.documentElement.removeAttribute(HTML_ATTR_THEME_VT);
    };

    if (typeof doc.startViewTransition !== 'function') {
      setColorMode(to);
      removeInjectedStyle();
      endThemeDiagonalTransition();
      return;
    }

    const w = Math.max(1, window.innerWidth);
    const h = Math.max(1, window.innerHeight);

    removeInjectedStyle();
    const styleEl = document.createElement('style');
    styleEl.id = STYLE_ID;
    const steps = 64;
    styleEl.textContent =
      SIMULATOR_VT_SUPPRESS_CSS +
      buildDiagonalRevealKeyframesCss(w, h, steps) +
      `::view-transition-old(root) {
  animation: none !important;
  opacity: 1 !important;
}
::view-transition-new(root) {
  animation: urpbuilder-diagonal-theme-reveal ${THEME_MODE_VIEW_TRANSITION_MS}ms linear forwards !important;
}`;
    document.head.appendChild(styleEl);

    document.documentElement.setAttribute(HTML_ATTR_THEME_VT, 'active');

    const vt = doc.startViewTransition(() => {
      setColorMode(to);
    });

    let cancelled = false;

    vt.finished
      .then(() => {
        if (gen !== genRef.current || cancelled) {
          return;
        }
        removeInjectedStyle();
        endThemeDiagonalTransition();
      })
      .catch(() => {
        removeInjectedStyle();
        if (gen === genRef.current && !cancelled) {
          endThemeDiagonalTransition();
        }
      });

    return () => {
      cancelled = true;
      removeInjectedStyle();
      vt.skipTransition?.();
    };
  }, [transition, setColorMode, endThemeDiagonalTransition]);

  return null;
}
