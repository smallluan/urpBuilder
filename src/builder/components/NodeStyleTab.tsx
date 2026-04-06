import React, { useCallback, useLayoutEffect, useState } from 'react';
import { collectComputedLayoutHints } from '../utils/computedLayoutHints';
import { patchStyle } from '../utils/nodeStyleCodec';
import BoxModelStyleEditor from './styleTab/BoxModelStyleEditor';
import BoxShadowStyleEditor from './styleTab/BoxShadowStyleEditor';
import './NodeStyleTab.less';

export interface NodeStyleTabProps {
  value?: Record<string, unknown>;
  onChange: (nextStyle: Record<string, unknown>) => void;
  targetKey?: string;
  readOnly?: boolean;
}

const NodeStyleTab: React.FC<NodeStyleTabProps> = ({ value, onChange, readOnly, targetKey }) => {
  const [computedHints, setComputedHints] = useState<Record<string, string>>({});

  useLayoutEffect(() => {
    if (!targetKey) {
      setComputedHints({});
      return;
    }
    let alive = true;
    const run = () => {
      if (!alive) {
        return;
      }
      const safeKey =
        typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
          ? CSS.escape(targetKey)
          : targetKey.replace(/"/g, '\\"');
      const el = document.querySelector<HTMLElement>(`[data-builder-node-key="${safeKey}"]`);
      if (!alive) {
        return;
      }
      setComputedHints(el ? collectComputedLayoutHints(el) : {});
    };
    run();
    const id1 = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (alive) {
          run();
        }
      });
    });
    return () => {
      alive = false;
      cancelAnimationFrame(id1);
    };
  }, [targetKey, value]);

  const handlePatch = useCallback(
    (patch: Record<string, string | undefined>) => {
      if (readOnly) {
        return;
      }
      onChange(patchStyle(value, patch));
    },
    [onChange, readOnly, value],
  );

  return (
    <div className="node-style-tab config-form config-panel-style-tab">
      <BoxModelStyleEditor
        key={targetKey ?? '__style__'}
        value={value}
        onPatch={handlePatch}
        readOnly={readOnly}
        computedHints={computedHints}
      />
      <BoxShadowStyleEditor
        key={`${targetKey ?? '__style__'}__shadow`}
        value={value}
        onPatch={handlePatch}
        readOnly={readOnly}
        computedHints={computedHints}
      />
    </div>
  );
};

export default React.memo(NodeStyleTab);
