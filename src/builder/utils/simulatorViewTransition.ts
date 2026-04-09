import { flushSync } from 'react-dom';

type ViewTransitionResult = {
  finished: Promise<void>;
  ready: Promise<void>;
  updateCallbackDone: Promise<void>;
  domUpdated: Promise<void>;
};

function getStartViewTransition(): ((cb: () => void) => ViewTransitionResult) | undefined {
  if (typeof document === 'undefined') {
    return undefined;
  }
  const doc = document as Document & { startViewTransition?: (cb: () => void) => ViewTransitionResult };
  return typeof doc.startViewTransition === 'function' ? doc.startViewTransition.bind(document) : undefined;
}

/**
 * 组件库切换：用 View Transitions 在「旧帧纹理 → 新 DOM」之间做一次 GPU 合成，避免双 React 实例。
 * 不支持时退化为同步 flush（无动画、无额外层）。
 */
export function runSimulatorViewTransition(update: () => void): void {
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    flushSync(update);
    return;
  }

  const startVT = getStartViewTransition();
  if (startVT) {
    startVT(() => {
      flushSync(update);
    });
    return;
  }

  flushSync(update);
}
