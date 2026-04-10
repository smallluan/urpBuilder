import { useCallback, useEffect, useSyncExternalStore } from 'react';

type DocWithFs = Document & {
  webkitFullscreenElement?: Element | null;
  mozFullScreenElement?: Element | null;
  msFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void>;
  mozCancelFullScreen?: () => Promise<void>;
  msExitFullscreen?: () => Promise<void>;
};

type ElWithFs = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void>;
  mozRequestFullScreen?: () => Promise<void>;
  msRequestFullscreen?: () => Promise<void>;
};

export function getFullscreenElement(): Element | null {
  const d = document as DocWithFs;
  return (
    d.fullscreenElement ?? d.webkitFullscreenElement ?? d.mozFullScreenElement ?? d.msFullscreenElement ?? null
  );
}

function getFullscreenSnapshot(): boolean {
  return getFullscreenElement() != null;
}

const fullscreenListeners = new Set<() => void>();
let fullscreenEventsBound = false;

function emitFullscreen() {
  fullscreenListeners.forEach((fn) => {
    fn();
  });
}

function ensureFullscreenEvents() {
  if (fullscreenEventsBound) {
    return;
  }
  fullscreenEventsBound = true;
  const onChange = () => emitFullscreen();
  document.addEventListener('fullscreenchange', onChange);
  document.addEventListener('webkitfullscreenchange', onChange as EventListener);
}

function subscribeFullscreen(onStoreChange: () => void) {
  ensureFullscreenEvents();
  fullscreenListeners.add(onStoreChange);
  return () => {
    fullscreenListeners.delete(onStoreChange);
  };
}

let f11Bound = false;

function ensureF11Toggle() {
  if (f11Bound) {
    return;
  }
  f11Bound = true;
  window.addEventListener(
    'keydown',
    (e: KeyboardEvent) => {
      if (e.key !== 'F11') {
        return;
      }
      e.preventDefault();
      void toggleDocumentFullscreen();
    },
    true
  );
}

async function requestRootFullscreen() {
  const el = document.documentElement as ElWithFs;
  if (el.requestFullscreen) {
    await el.requestFullscreen();
    return;
  }
  if (el.webkitRequestFullscreen) {
    await el.webkitRequestFullscreen();
    return;
  }
  if (el.mozRequestFullScreen) {
    await el.mozRequestFullScreen();
    return;
  }
  if (el.msRequestFullscreen) {
    await el.msRequestFullscreen();
  }
}

async function exitRootFullscreen() {
  const d = document as DocWithFs;
  if (d.exitFullscreen) {
    await d.exitFullscreen();
    return;
  }
  if (d.webkitExitFullscreen) {
    await d.webkitExitFullscreen();
    return;
  }
  if (d.mozCancelFullScreen) {
    await d.mozCancelFullScreen();
    return;
  }
  if (d.msExitFullscreen) {
    await d.msExitFullscreen();
  }
}

/** 与工具栏、F11 共用同一套逻辑，便于状态一致 */
export async function toggleDocumentFullscreen() {
  try {
    if (getFullscreenElement()) {
      await exitRootFullscreen();
    } else {
      await requestRootFullscreen();
    }
  } catch {
    // 部分环境无全屏权限或不可用
  }
}

/**
 * 全屏状态与 document 同步；F11 在捕获阶段拦截并走同一 toggle，避免与按钮状态脱节。
 * 浏览器原生 F11（未拦截时）不触发 Fullscreen API，故用统一拦截保证双向一致。
 */
export function useFullscreenControl() {
  const isFullscreen = useSyncExternalStore(subscribeFullscreen, getFullscreenSnapshot, () => false);

  useEffect(() => {
    ensureF11Toggle();
  }, []);

  const toggle = useCallback(() => {
    void toggleDocumentFullscreen();
  }, []);

  return { isFullscreen, toggle };
}
