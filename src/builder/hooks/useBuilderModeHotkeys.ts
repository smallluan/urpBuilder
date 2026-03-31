import { useEffect } from 'react';
import { markModeSwitchStart } from '../utils/perf';

export const isEditableTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tag = target.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || target.isContentEditable;
};

/**
 * Ctrl/Cmd+Shift+U → 搭建 UI；Ctrl/Cmd+Shift+F → 搭建流程。
 * 需在 QuickFind 中将「查找」限定为无 Shift 的 Ctrl/Cmd+F，避免与 Shift+F 冲突。
 */
export function useBuilderModeHotkeys(
  mode: 'component' | 'flow',
  setMode: (next: 'component' | 'flow') => void,
): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) {
        return;
      }
      const withMeta = event.ctrlKey || event.metaKey;
      if (!withMeta || !event.shiftKey) {
        return;
      }
      const key = event.key.toLowerCase();
      if (key === 'u') {
        if (mode === 'component') {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        markModeSwitchStart('component');
        setMode('component');
        return;
      }
      if (key === 'f') {
        if (mode === 'flow') {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        markModeSwitchStart('flow');
        setMode('flow');
      }
    };

    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [mode, setMode]);
}
