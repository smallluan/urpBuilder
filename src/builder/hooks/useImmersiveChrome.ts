import { useCallback, useEffect, useState } from 'react';

/** 检测浏览器「整窗贴满物理屏」类 F11（与 Fullscreen API 无关，仅用于 UI 同步） */
function detectBrowserChromeFullscreen(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  const { outerWidth, outerHeight, innerWidth, innerHeight, screen } = window;
  const tol = 14;
  const sw = screen.width;
  const sh = screen.height;
  if (Math.abs(outerWidth - sw) <= tol && Math.abs(outerHeight - sh) <= tol) {
    return true;
  }
  if (innerWidth >= sw - tol && innerHeight >= sh - tol) {
    return true;
  }
  return false;
}

function computeImmersive(): boolean {
  if (typeof document === 'undefined') {
    return false;
  }
  return document.fullscreenElement != null || detectBrowserChromeFullscreen();
}

/**
 * 全屏/类全屏状态（F11 与 Fullscreen API 都会尽量同步）及切换。
 * 说明：F11 无法被脚本关闭，仅能提示用户按 F11 / Esc。
 */
export function useImmersiveChrome() {
  const [immersive, setImmersive] = useState(computeImmersive);

  const sync = useCallback(() => {
    setImmersive(computeImmersive());
  }, []);

  useEffect(() => {
    sync();
    const onFs = () => sync();
    const onResize = () => sync();
    document.addEventListener('fullscreenchange', onFs);
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onFs);
    return () => {
      document.removeEventListener('fullscreenchange', onFs);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onFs);
    };
  }, [sync]);

  const toggle = useCallback(async () => {
    const { MessagePlugin } = await import('tdesign-react');

    if (document.fullscreenElement != null) {
      try {
        await document.exitFullscreen();
      } catch {
        void MessagePlugin.warning({ content: '无法退出全屏', duration: 2200, placement: 'top' });
      }
      return;
    }

    if (detectBrowserChromeFullscreen() && document.fullscreenElement == null) {
      void MessagePlugin.info({
        content: '当前为浏览器全屏（如 F11），请按 F11 或 Esc 退出',
        duration: 2600,
        placement: 'top',
      });
      return;
    }

    try {
      await document.documentElement.requestFullscreen({ navigationUI: 'hide' } as FullscreenOptions);
    } catch {
      void MessagePlugin.warning({
        content: '无法进入全屏，请确认未嵌入受限 iframe 且浏览器允许全屏',
        duration: 3200,
        placement: 'top',
      });
    }
  }, []);

  return { immersive, toggle };
}
