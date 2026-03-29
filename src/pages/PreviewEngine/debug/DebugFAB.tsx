import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Bug } from 'lucide-react';
import { useDebugStore } from './debugStore';

const DRAG_THRESHOLD_PX = 4;

const DebugFAB: React.FC = () => {
  const panelOpen = useDebugStore((s) => s.panelOpen);
  const paused = useDebugStore((s) => s.paused);
  const errorCount = useDebugStore((s) => s.errors.length);
  const togglePanel = useDebugStore((s) => s.togglePanel);
  const panelHeight = useDebugStore((s) => s.panelHeight);
  const fabRight = useDebugStore((s) => s.fabRight);
  const fabBottom = useDebugStore((s) => s.fabBottom);
  const setFabPosition = useDebugStore((s) => s.setFabPosition);

  const showBadge = paused || errorCount > 0;
  const [dragging, setDragging] = useState(false);

  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startR: number;
    startB: number;
    moved: boolean;
  } | null>(null);

  useEffect(() => {
    const isDebugChord = (e: KeyboardEvent): boolean => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod || e.repeat) return false;
      // Ctrl+Alt+D：一般能稳定传到页面（避开 Chrome Ctrl+Shift+D 等与调试无关的快捷键）
      if (e.altKey && !e.shiftKey && (e.key === 'd' || e.key === 'D')) return true;
      // Ctrl+F12：很多浏览器会在页面收到 keydown 之前拦截 F12 打开 DevTools，故常无效
      if (!e.altKey && !e.shiftKey && (e.code === 'F12' || e.key === 'F12')) return true;
      return false;
    };

    const onKey = (e: KeyboardEvent) => {
      if (!isDebugChord(e)) return;
      const t = e.target;
      if (t instanceof HTMLElement) {
        const tag = t.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || t.isContentEditable) return;
      }
      e.preventDefault();
      e.stopPropagation();
      togglePanel();
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [togglePanel]);

  useEffect(() => {
    const onResize = () => {
      const { fabRight: fr, fabBottom: fb, setFabPosition: sp } = useDebugStore.getState();
      sp(fr, fb);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const { fabRight: fr, fabBottom: fb, setFabPosition: sp } = useDebugStore.getState();
    sp(fr, fb);
  }, [panelOpen, panelHeight]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      if (e.button !== 0) return;
      dragRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        startR: fabRight,
        startB: fabBottom,
        moved: false,
      };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [fabRight, fabBottom],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      const d = dragRef.current;
      if (!d || e.pointerId !== d.pointerId) return;
      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;
      if (Math.abs(dx) + Math.abs(dy) > DRAG_THRESHOLD_PX) {
        if (!d.moved) {
          d.moved = true;
          setDragging(true);
        }
      }
      if (!d.moved) return;
      // right/bottom 为距视口右、下边的距离：鼠标上移应增大 bottom，故 Y 与 dy 相减
      setFabPosition(d.startR - dx, d.startB - dy);
    },
    [setFabPosition],
  );

  const endPointer = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      const d = dragRef.current;
      if (!d || e.pointerId !== d.pointerId) return;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* already released */
      }
      const didDrag = d.moved;
      dragRef.current = null;
      setDragging(false);
      if (!didDrag) {
        togglePanel();
      }
    },
    [togglePanel],
  );

  return (
    <button
      type="button"
      className={`debug-fab${panelOpen ? ' is-panel-open' : ''}${dragging ? ' is-dragging' : ''}`}
      style={{ right: fabRight, bottom: fabBottom }}
      title='Ctrl+Alt+D'
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPointer}
      onPointerCancel={endPointer}
    >
      <Bug />
      {showBadge && <span className="debug-fab__badge" />}
    </button>
  );
};

export default DebugFAB;
