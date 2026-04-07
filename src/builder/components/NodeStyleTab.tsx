import React, { useCallback, useLayoutEffect, useState } from 'react';
import { collectComputedLayoutHints } from '../utils/computedLayoutHints';
import { patchStyle } from '../utils/nodeStyleCodec';
import { resolveStyleTargetElement } from '../utils/resolveStyleTargetElement';
import StyleTabShell from './styleTab/StyleTabShell';
import './NodeStyleTab.less';

export interface NodeStyleTabProps {
  value?: Record<string, unknown>;
  onChange: (nextStyle: Record<string, unknown>) => void;
  targetKey?: string;
  /** 当前选中节点类型，用于解析样式采样 DOM（如 Button → .t-button） */
  nodeType?: string;
  readOnly?: boolean;
}

const NodeStyleTab: React.FC<NodeStyleTabProps> = ({
  value,
  onChange,
  readOnly,
  targetKey,
  nodeType,
}) => {
  const [computedHints, setComputedHints] = useState<Record<string, string>>({});

  useLayoutEffect(() => {
    if (!targetKey) {
      setComputedHints({});
      return;
    }
    let alive = true;
    let ro: ResizeObserver | null = null;
    const disconnectRo = () => { ro?.disconnect(); ro = null; };
    const run = () => {
      if (!alive) return;
      disconnectRo();
      const el = resolveStyleTargetElement(nodeType, targetKey);
      if (!alive) return;
      setComputedHints(el ? collectComputedLayoutHints(el) : {});
      if (el && typeof ResizeObserver !== 'undefined') {
        ro = new ResizeObserver(() => {
          if (!alive) return;
          const el2 = resolveStyleTargetElement(nodeType, targetKey);
          setComputedHints(el2 ? collectComputedLayoutHints(el2) : {});
        });
        ro.observe(el);
      }
    };
    run();
    const id1 = requestAnimationFrame(() => {
      requestAnimationFrame(() => { if (alive) run(); });
    });
    return () => {
      alive = false;
      cancelAnimationFrame(id1);
      disconnectRo();
    };
  }, [targetKey, nodeType, value]);

  const handlePatchStyle = useCallback(
    (patch: Record<string, string | undefined>) => {
      if (readOnly) {
        return;
      }
      onChange(patchStyle(value, patch));
    },
    [onChange, readOnly, value],
  );

  return (
    <StyleTabShell
      value={value}
      onPatchStyle={handlePatchStyle}
      readOnly={readOnly}
      targetKey={targetKey}
      computedHints={computedHints}
    />
  );
};

export default React.memo(NodeStyleTab);
