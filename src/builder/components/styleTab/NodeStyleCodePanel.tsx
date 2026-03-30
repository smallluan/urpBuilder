import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Space, Switch, Typography } from 'tdesign-react';
import CodeMirror from '@uiw/react-codemirror';
import { vscodeDark, vscodeLight } from '@uiw/codemirror-theme-vscode';
import { css } from '@codemirror/lang-css';
import { useBuilderThemeStore } from '../../theme/builderThemeStore';
import {
  isSameStylePayload,
  mergeStyleFromParsedCss,
  normalizeComparableStyle,
  normalizeStyleValue,
  parseCssText,
  styleToCssText,
} from '../../utils/nodeStyleCodec';
import '../NodeStylePanel.less';

export interface NodeStyleCodePanelProps {
  value?: Record<string, unknown>;
  onChange: (nextStyle: Record<string, unknown>) => void;
  targetKey?: string;
  compact?: boolean;
  readOnly?: boolean;
  /** 可视化表单提交后递增，用于丢弃未应用代码草稿并与最新 __style 对齐 */
  syncRevision?: number;
  /** 代码草稿与已应用值不一致（未点应用且非实时） */
  onDirtyChange?: (dirty: boolean) => void;
}

export const NodeStyleCodePanel: React.FC<NodeStyleCodePanelProps> = ({
  value,
  onChange,
  targetKey,
  compact,
  readOnly,
  syncRevision = 0,
  onDirtyChange,
}) => {
  const [cssDraft, setCssDraft] = useState(() => styleToCssText(normalizeStyleValue(value)));
  const [autoApply, setAutoApply] = useState(false);
  const [codeDirty, setCodeDirty] = useState(false);
  const lastBoundTargetKeyRef = useRef<string | undefined>(targetKey);
  const colorMode = useBuilderThemeStore((s) => s.colorMode);
  const codeMirrorTheme = useMemo(() => (colorMode === 'dark' ? vscodeDark : vscodeLight), [colorMode]);

  const normalized = useMemo(() => normalizeStyleValue(value), [value]);
  const valueFingerprint = useMemo(() => JSON.stringify(normalizeComparableStyle(value)), [value]);
  const parseResult = useMemo(() => parseCssText(cssDraft), [cssDraft]);

  useEffect(() => {
    lastBoundTargetKeyRef.current = targetKey;
    setCssDraft(styleToCssText(normalizeStyleValue(value)));
    setCodeDirty(false);
    onDirtyChange?.(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 切换节点或表单提交后强制对齐草稿
  }, [targetKey, syncRevision]);

  useEffect(() => {
    if (codeDirty) {
      return;
    }
    setCssDraft(styleToCssText(normalizeStyleValue(value)));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 外部 value 同步，指纹已含内容
  }, [valueFingerprint]);

  useEffect(() => {
    onDirtyChange?.(codeDirty);
  }, [codeDirty, onDirtyChange]);

  useEffect(() => {
    if (!autoApply || !codeDirty || readOnly) {
      return;
    }

    const nextPayload = mergeStyleFromParsedCss(value, cssDraft);
    if (isSameStylePayload(nextPayload, normalized)) {
      return;
    }

    onChange(nextPayload);
    setCodeDirty(false);
  }, [autoApply, codeDirty, cssDraft, normalized, onChange, readOnly, value]);

  const handleApply = () => {
    if (readOnly) {
      return;
    }
    if (targetKey && lastBoundTargetKeyRef.current !== targetKey) {
      return;
    }
    onChange(mergeStyleFromParsedCss(value, cssDraft));
    setCodeDirty(false);
  };

  const handleReset = () => {
    setCssDraft(styleToCssText(normalized));
    setCodeDirty(false);
  };

  const handleClear = () => {
    if (readOnly) {
      return;
    }
    setCssDraft('');
    setCodeDirty(true);
  };

  const hasInvalidCssLines = parseResult.invalidLines.length > 0;

  return (
    <div className={`node-style-panel${compact ? ' node-style-panel--compact' : ''}`}>
      <div className="node-style-panel__toolbar">
        <Space size={8} align="center">
          <Typography.Text style={{ fontSize: 12 }}>实时应用</Typography.Text>
          <Switch
            value={autoApply}
            size="small"
            disabled={readOnly}
            onChange={(next) => setAutoApply(Boolean(next))}
          />
        </Space>
      </div>

      <div className="node-style-panel__section node-style-panel__section--code">
        <CodeMirror
          value={cssDraft}
          height={compact ? '200px' : '360px'}
          theme={codeMirrorTheme}
          extensions={[css()]}
          editable={!readOnly}
          basicSetup={{
            lineNumbers: true,
            foldGutter: true,
            highlightActiveLine: true,
          }}
          onChange={(v) => {
            setCssDraft(v);
            setCodeDirty(true);
          }}
        />

        <div className="node-style-panel__code-meta">
          <Typography.Text style={{ fontSize: 12 }}>已解析 {parseResult.validCount} 条</Typography.Text>
          {hasInvalidCssLines ? (
            <Typography.Text style={{ fontSize: 12 }} theme="warning">
              {parseResult.invalidLines.length} 行无法解析
            </Typography.Text>
          ) : null}
        </div>
      </div>

      <div className="node-style-panel__footer">
        <Space size={8}>
          <Button size="small" variant="outline" disabled={readOnly} onClick={handleReset}>
            重置
          </Button>
          <Button size="small" variant="outline" theme="danger" disabled={readOnly} onClick={handleClear}>
            清空
          </Button>
          <Button size="small" disabled={readOnly} onClick={handleApply}>
            应用
          </Button>
        </Space>
      </div>

      {hasInvalidCssLines ? (
        <div className="node-style-panel__invalid">
          <Typography.Text style={{ fontSize: 12 }} theme="warning">
            未解析行：{parseResult.invalidLines.join(' · ')}
          </Typography.Text>
        </div>
      ) : null}
    </div>
  );
};

export default React.memo(NodeStyleCodePanel);
