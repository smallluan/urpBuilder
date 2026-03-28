import React, { useCallback, useEffect } from 'react';
import { Play, StepForward } from 'lucide-react';
import { useDebugStore } from './debugStore';

const DebugPauseOverlay: React.FC = () => {
  const paused = useDebugStore((s) => s.paused);
  const pausedAtNodeId = useDebugStore((s) => s.pausedAtNodeId);
  const resume = useDebugStore((s) => s.resume);
  const stepOver = useDebugStore((s) => s.stepOver);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!paused) return;
    if (e.key === 'F8') {
      e.preventDefault();
      resume();
    } else if (e.key === 'F10') {
      e.preventDefault();
      stepOver();
    }
  }, [paused, resume, stepOver]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!paused) return null;

  return (
    <>
      <div className="debug-pause-overlay" />
      <div className="debug-pause-toolbar">
        <button type="button" className="debug-pause-toolbar__btn" onClick={resume}>
          <Play /> 继续 <kbd>F8</kbd>
        </button>
        <button type="button" className="debug-pause-toolbar__btn" onClick={stepOver}>
          <StepForward /> 单步执行 <kbd>F10</kbd>
        </button>
        {pausedAtNodeId && (
          <span className="debug-pause-toolbar__info">
            已断在节点：{pausedAtNodeId}
          </span>
        )}
      </div>
    </>
  );
};

export default DebugPauseOverlay;
