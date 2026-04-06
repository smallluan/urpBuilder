import React, { useCallback } from 'react';
import { patchStyle } from '../utils/nodeStyleCodec';
import BoxModelStyleEditor from './styleTab/BoxModelStyleEditor';
import './NodeStyleTab.less';

export interface NodeStyleTabProps {
  value?: Record<string, unknown>;
  onChange: (nextStyle: Record<string, unknown>) => void;
  targetKey?: string;
  readOnly?: boolean;
}

const NodeStyleTab: React.FC<NodeStyleTabProps> = ({ value, onChange, readOnly, targetKey }) => {
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
      />
    </div>
  );
};

export default React.memo(NodeStyleTab);
