import React, { useCallback, useMemo, useState } from 'react';
import { Collapse, Typography } from 'tdesign-react';
import { patchStyle } from '../utils/nodeStyleCodec';
import { hintTextOnBackgroundContrast } from '../utils/nodeStyleContrast';
import { collectUnknownVarUsages } from '../utils/nodeStyleVarLint';
import AppearanceStyleSection from './styleTab/AppearanceStyleSection';
import BorderStyleSection from './styleTab/BorderStyleSection';
import LayoutStyleSection from './styleTab/LayoutStyleSection';
import NodeStyleCodePanel from './styleTab/NodeStyleCodePanel';
import SpacingStyleSection from './styleTab/SpacingStyleSection';
import TypographyStyleSection from './styleTab/TypographyStyleSection';
import './NodeStyleTab.less';

export interface NodeStyleTabProps {
  value?: Record<string, unknown>;
  onChange: (nextStyle: Record<string, unknown>) => void;
  targetKey?: string;
  readOnly?: boolean;
}

const gv = (style: Record<string, unknown> | undefined, key: string): string => {
  if (!style || typeof style !== 'object') {
    return '';
  }
  const v = (style as Record<string, unknown>)[key];
  return v === null || v === undefined ? '' : String(v).trim();
};

const NodeStyleTab: React.FC<NodeStyleTabProps> = ({ value, onChange, targetKey, readOnly }) => {
  const [syncRevision, setSyncRevision] = useState(0);

  const handlePatch = useCallback(
    (patch: Record<string, string | undefined>) => {
      if (readOnly) {
        return;
      }
      onChange(patchStyle(value, patch));
      setSyncRevision((n) => n + 1);
    },
    [onChange, readOnly, value],
  );

  const contrastHint = useMemo(
    () => hintTextOnBackgroundContrast(gv(value, 'color'), gv(value, 'backgroundColor')),
    [value],
  );

  const unknownVars = useMemo(() => collectUnknownVarUsages(value ?? {}), [value]);

  return (
    <div className="node-style-tab config-form config-panel-style-tab">
      {contrastHint && contrastHint.level === 'warn' ? (
        <Typography.Text theme="warning" style={{ display: 'block', marginBottom: 8, fontSize: 12 }}>
          {contrastHint.message}
        </Typography.Text>
      ) : null}

      {unknownVars.length > 0 ? (
        <Typography.Text theme="warning" style={{ display: 'block', marginBottom: 8, fontSize: 12 }}>
          非常规 CSS 变量（非 --td- / --builder-）：{unknownVars.join('； ')}
        </Typography.Text>
      ) : null}

      <Collapse
        className="node-style-tab__collapse"
        borderless
        expandIconPlacement="right"
        expandOnRowClick
        defaultValue={['layout', 'spacing']}
      >
        <Collapse.Panel header="布局与尺寸" value="layout">
          <LayoutStyleSection value={value} onPatch={handlePatch} readOnly={readOnly} />
        </Collapse.Panel>
        <Collapse.Panel header="间距" value="spacing">
          <SpacingStyleSection value={value} onPatch={handlePatch} readOnly={readOnly} />
        </Collapse.Panel>
        <Collapse.Panel header="外观" value="appearance">
          <AppearanceStyleSection value={value} onPatch={handlePatch} readOnly={readOnly} />
        </Collapse.Panel>
        <Collapse.Panel header="边框与圆角" value="border">
          <BorderStyleSection value={value} onPatch={handlePatch} readOnly={readOnly} />
        </Collapse.Panel>
        <Collapse.Panel header="文字" value="text">
          <TypographyStyleSection value={value} onPatch={handlePatch} readOnly={readOnly} />
        </Collapse.Panel>
        <Collapse.Panel header="高级 CSS" value="advanced">
          <Typography.Text theme="secondary" style={{ display: 'block', marginBottom: 8, fontSize: 12 }}>
            与上方表单共用同一份样式；应用代码时会与当前对象合并。修改表单会重置此处草稿以便与画布一致。
          </Typography.Text>
          <NodeStyleCodePanel
            value={value}
            onChange={onChange}
            targetKey={targetKey}
            compact
            readOnly={readOnly}
            syncRevision={syncRevision}
          />
        </Collapse.Panel>
      </Collapse>
    </div>
  );
};

export default React.memo(NodeStyleTab);
