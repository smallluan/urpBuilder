import React, { useCallback, useEffect, useRef } from 'react';
import { PanelLeft, PanelLeftOpen, PanelRight, PanelRightOpen, PanelTop, PanelTopOpen } from 'lucide-react';
import { useBuilderContext } from '../context/BuilderContext';
import type { BuilderWorkbenchAsideMode } from '../store/types';
import {
  BUILDER_ASIDE_MAX_PX,
  BUILDER_ASIDE_MIN_PX,
  clampBuilderAsideWidth,
} from '../constants/builderWorkbenchChrome';
import { isEditableTarget } from '../hooks/useBuilderModeHotkeys';
import { TopbarGroup, TopbarIconButton } from './UnifiedBuilderTopbar';

const SIDEBAR_ICON_SIZE = 16;

/**
 * 左/右侧栏 + 页面顶栏（保存/预览）快捷键：Ctrl/Cmd+Shift+1/2/3（需在可编辑区域外）。
 * 仅当前视图与 workbenchMode 一致时生效（搭建 UI / 流程画布互不干扰）。
 */
export function useBuilderWorkbenchLayoutHotkeys(workbenchMode: BuilderWorkbenchAsideMode): void {
  const { useStore, builderViewMode } = useBuilderContext();
  const toggleAside = useStore((s) => s.toggleBuilderAsideCollapsed);
  const toggleShellHeader = useStore((s) => s.toggleBuilderShellHeaderCollapsed);

  useEffect(() => {
    const wantView = workbenchMode === 'component' ? 'component' : 'flow';
    const onKey = (e: KeyboardEvent) => {
      if (builderViewMode !== wantView) {
        return;
      }
      if (isEditableTarget(e.target)) {
        return;
      }
      if (!(e.ctrlKey || e.metaKey) || !e.shiftKey) {
        return;
      }
      if (e.key === '1') {
        e.preventDefault();
        toggleAside(workbenchMode, 'left');
        return;
      }
      if (e.key === '2') {
        e.preventDefault();
        toggleAside(workbenchMode, 'right');
        return;
      }
      if (e.key === '3') {
        e.preventDefault();
        toggleShellHeader();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [builderViewMode, workbenchMode, toggleAside, toggleShellHeader]);
}

/** 侧栏显隐：图标 + 文案，与「画布」等一致；展开态高亮（搭建 UI / 流程各自独立） */
export const BuilderSidebarToggles: React.FC<{ mode: BuilderWorkbenchAsideMode }> = ({ mode }) => {
  const { useStore } = useBuilderContext();
  const leftCollapsed = useStore((s) =>
    mode === 'component' ? s.builderComponentLeftAsideCollapsed : s.builderFlowLeftAsideCollapsed,
  );
  const rightCollapsed = useStore((s) =>
    mode === 'component' ? s.builderComponentRightAsideCollapsed : s.builderFlowRightAsideCollapsed,
  );
  const shellHeaderCollapsed = useStore((s) => s.builderShellHeaderCollapsed);
  const toggleAside = useStore((s) => s.toggleBuilderAsideCollapsed);
  const toggleShellHeader = useStore((s) => s.toggleBuilderShellHeaderCollapsed);

  return (
    <TopbarGroup className="builder-sidebar-toolbar-group">
      <TopbarIconButton
        tip={leftCollapsed ? '展开左侧面板（Ctrl/Cmd+Shift+1）' : '收起左侧面板（Ctrl/Cmd+Shift+1）'}
        label="左栏"
        icon={
          leftCollapsed ? (
            <PanelLeftOpen size={SIDEBAR_ICON_SIZE} strokeWidth={2} />
          ) : (
            <PanelLeft size={SIDEBAR_ICON_SIZE} strokeWidth={2} />
          )
        }
        active={!leftCollapsed}
        onClick={() => toggleAside(mode, 'left')}
      />
      <TopbarIconButton
        tip={rightCollapsed ? '展开右侧面板（Ctrl/Cmd+Shift+2）' : '收起右侧面板（Ctrl/Cmd+Shift+2）'}
        label="右栏"
        icon={
          rightCollapsed ? (
            <PanelRightOpen size={SIDEBAR_ICON_SIZE} strokeWidth={2} />
          ) : (
            <PanelRight size={SIDEBAR_ICON_SIZE} strokeWidth={2} />
          )
        }
        active={!rightCollapsed}
        onClick={() => toggleAside(mode, 'right')}
      />
      <TopbarIconButton
        tip={
          shellHeaderCollapsed
            ? '展开页面顶栏（保存/预览等）（Ctrl/Cmd+Shift+3）'
            : '收起页面顶栏（保存/预览等）（Ctrl/Cmd+Shift+3）'
        }
        label="页头"
        icon={
          shellHeaderCollapsed ? (
            <PanelTopOpen size={SIDEBAR_ICON_SIZE} strokeWidth={2} />
          ) : (
            <PanelTop size={SIDEBAR_ICON_SIZE} strokeWidth={2} />
          )
        }
        active={!shellHeaderCollapsed}
        onClick={toggleShellHeader}
      />
    </TopbarGroup>
  );
};

type ResizeEdge = 'after-left' | 'before-right';

interface BuilderAsideResizeHandleProps {
  edge: ResizeEdge;
  mode: BuilderWorkbenchAsideMode;
}

/** 拖拽调节左/右侧栏宽度（受 BUILDER_ASIDE_MIN/MAX 约束） */
export const BuilderAsideResizeHandle: React.FC<BuilderAsideResizeHandleProps> = ({ edge, mode }) => {
  const { useStore } = useBuilderContext();
  const leftCollapsed = useStore((s) =>
    mode === 'component' ? s.builderComponentLeftAsideCollapsed : s.builderFlowLeftAsideCollapsed,
  );
  const rightCollapsed = useStore((s) =>
    mode === 'component' ? s.builderComponentRightAsideCollapsed : s.builderFlowRightAsideCollapsed,
  );
  const leftW = useStore((s) =>
    mode === 'component' ? s.builderComponentLeftAsideWidthPx : s.builderFlowLeftAsideWidthPx,
  );
  const rightW = useStore((s) =>
    mode === 'component' ? s.builderComponentRightAsideWidthPx : s.builderFlowRightAsideWidthPx,
  );
  const setAsideWidth = useStore((s) => s.setBuilderAsideWidthPx);

  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);

  const hidden = edge === 'after-left' ? leftCollapsed : rightCollapsed;

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      const el = event.currentTarget;
      el.setPointerCapture(event.pointerId);
      const side = edge === 'after-left' ? 'left' : 'right';
      dragRef.current = {
        startX: event.clientX,
        startWidth: edge === 'after-left' ? leftW : rightW,
      };

      const onMove = (ev: PointerEvent) => {
        const state = dragRef.current;
        if (!state) {
          return;
        }
        const dx = ev.clientX - state.startX;
        const next =
          edge === 'after-left'
            ? clampBuilderAsideWidth(state.startWidth + dx)
            : clampBuilderAsideWidth(state.startWidth - dx);
        setAsideWidth(mode, side, next);
      };

      const onUp = (ev: PointerEvent) => {
        if (el.hasPointerCapture(ev.pointerId)) {
          el.releasePointerCapture(ev.pointerId);
        }
        dragRef.current = null;
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };

      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onUp);
    },
    [edge, mode, leftW, rightW, setAsideWidth],
  );

  if (hidden) {
    return null;
  }

  return (
    <div
      className={`builder-aside-resize-handle builder-aside-resize-handle--${edge}`}
      role="separator"
      aria-orientation="vertical"
      aria-valuemin={BUILDER_ASIDE_MIN_PX}
      aria-valuemax={BUILDER_ASIDE_MAX_PX}
      aria-valuenow={edge === 'after-left' ? leftW : rightW}
      onPointerDown={onPointerDown}
    />
  );
};
