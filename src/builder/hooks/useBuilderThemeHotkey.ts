import { useEffect } from 'react';
import { useBuilderThemeStore } from '../theme/builderThemeStore';
import { isEditableTarget } from './useBuilderModeHotkeys';

/**
 * 全局：Ctrl/Cmd+Shift+D 切换浅色 / 深色（D = Dark，与明暗语义一致）。
 * 在输入框、文本域或可编辑区域内不触发，避免与正文输入冲突。
 */
export function useBuilderThemeHotkey(): void {
  const beginThemeDiagonalToggle = useBuilderThemeStore((s) => s.beginThemeDiagonalToggle);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) {
        return;
      }
      const withMeta = event.ctrlKey || event.metaKey;
      if (!withMeta || !event.shiftKey || event.altKey) {
        return;
      }
      if (event.key.toLowerCase() !== 'd') {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      beginThemeDiagonalToggle();
    };

    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [beginThemeDiagonalToggle]);
}
