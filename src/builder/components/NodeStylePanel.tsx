import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Space, Switch, Typography } from 'tdesign-react';
import CodeMirror from '@uiw/react-codemirror';
import { vscodeDark, vscodeLight } from '@uiw/codemirror-theme-vscode';
import { css } from '@codemirror/lang-css';
import { useBuilderThemeStore } from '../theme/builderThemeStore';
import './NodeStylePanel.less';

export interface NodeStylePanelProps {
  value?: Record<string, unknown>;
  onChange: (nextStyle: Record<string, unknown>) => void;
  targetKey?: string;
  /** 嵌入侧栏时略紧凑 */
  compact?: boolean;
}

type StyleValue = Record<string, string>;

const normalizeStyleValue = (value?: Record<string, unknown>) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {} as StyleValue;
  }

  const styleMap: StyleValue = {};
  Object.entries(value).forEach(([key, val]) => {
    if (val === null || val === undefined) {
      return;
    }

    styleMap[key] = String(val);
  });

  return styleMap;
};

const kebabToCamel = (value: string) => value.replace(/-([a-z])/g, (_, character: string) => character.toUpperCase());

const camelToKebab = (value: string) => value.replace(/[A-Z]/g, (character) => `-${character.toLowerCase()}`);

const styleToCssText = (style: StyleValue) => {
  const lines = Object.entries(style)
    .filter(([, cssValue]) => String(cssValue ?? '').trim().length > 0)
    .map(([property, cssValue]) => `${camelToKebab(property)}: ${String(cssValue).trim()};`);

  return lines.join('\n');
};

const parseCssText = (cssText: string) => {
  const cleanedText = cssText
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/[{}]/g, '\n');

  const nextStyle: Record<string, unknown> = {};
  const invalidLines: string[] = [];

  const lines = cleanedText
    .split(/\n+/)
    .flatMap((row) => row.split(';'))
    .map((row) => row.trim())
    .filter(Boolean);

  lines.forEach((line) => {
    const splitIndex = line.indexOf(':');
    if (splitIndex <= 0) {
      invalidLines.push(line);
      return;
    }

    const rawProperty = line.slice(0, splitIndex).trim();
    const rawValue = line.slice(splitIndex + 1).trim();

    if (!rawProperty || !rawValue) {
      invalidLines.push(line);
      return;
    }

    const property = kebabToCamel(rawProperty);
    nextStyle[property] = rawValue;
  });

  return {
    style: nextStyle,
    invalidLines,
    validCount: Object.keys(nextStyle).length,
  };
};

const cssTextToPayload = (cssText: string): Record<string, unknown> => {
  const parsed = parseCssText(cssText);
  return parsed.style;
};

const normalizeComparableStyle = (value?: Record<string, unknown>) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {} as Record<string, string>;
  }

  const normalizedEntries = Object.entries(value)
    .map(([key, rawValue]) => [key, String(rawValue ?? '').trim()] as const)
    .filter(([, text]) => text.length > 0)
    .sort(([a], [b]) => a.localeCompare(b));

  return Object.fromEntries(normalizedEntries);
};

const isSameStylePayload = (left: Record<string, unknown>, right: Record<string, unknown>) => {
  const normalizedLeft = normalizeComparableStyle(left);
  const normalizedRight = normalizeComparableStyle(right);
  const leftKeys = Object.keys(normalizedLeft);
  const rightKeys = Object.keys(normalizedRight);

  if (leftKeys.length !== rightKeys.length) {
    return false;
  }

  return leftKeys.every((key) => normalizedLeft[key] === normalizedRight[key]);
};

export const NodeStylePanel: React.FC<NodeStylePanelProps> = ({ value, onChange, targetKey, compact }) => {
  const [cssDraft, setCssDraft] = useState(() => styleToCssText(normalizeStyleValue(value)));
  const [autoApply, setAutoApply] = useState(false);
  const [hasUserEdited, setHasUserEdited] = useState(false);
  const lastBoundTargetKeyRef = useRef<string | undefined>(targetKey);
  const colorMode = useBuilderThemeStore((s) => s.colorMode);
  const codeMirrorTheme = useMemo(
    () => (colorMode === 'dark' ? vscodeDark : vscodeLight),
    [colorMode],
  );

  const normalized = useMemo(() => normalizeStyleValue(value), [value]);
  const parseResult = useMemo(() => parseCssText(cssDraft), [cssDraft]);

  useEffect(() => {
    lastBoundTargetKeyRef.current = targetKey;
    setCssDraft(styleToCssText(normalizeStyleValue(value)));
    setHasUserEdited(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- 仅切换选中节点时同步外部 value
  }, [targetKey]);

  useEffect(() => {
    if (!autoApply || !hasUserEdited) {
      return;
    }

    const nextPayload = cssTextToPayload(cssDraft);
    if (isSameStylePayload(nextPayload, normalized)) {
      return;
    }

    onChange(nextPayload);
  }, [autoApply, hasUserEdited, cssDraft, normalized, onChange]);

  const handleApply = () => {
    if (targetKey && lastBoundTargetKeyRef.current !== targetKey) {
      return;
    }
    onChange(cssTextToPayload(cssDraft));
    setHasUserEdited(false);
  };

  const handleReset = () => {
    setCssDraft(styleToCssText(normalized));
    setHasUserEdited(true);
  };

  const handleClear = () => {
    setCssDraft('');
    setHasUserEdited(true);
  };

  const hasInvalidCssLines = parseResult.invalidLines.length > 0;

  return (
    <div className={`node-style-panel${compact ? ' node-style-panel--compact' : ''}`}>
      <div className="node-style-panel__toolbar">
        <Space size={8} align="center">
          <Typography.Text style={{ fontSize: 12 }}>实时应用</Typography.Text>
          <Switch value={autoApply} size="small" onChange={(next) => setAutoApply(Boolean(next))} />
        </Space>
      </div>

      <div className="node-style-panel__section node-style-panel__section--code">
        <CodeMirror
          value={cssDraft}
          height={compact ? '280px' : '360px'}
          theme={codeMirrorTheme}
          extensions={[css()]}
          basicSetup={{
            lineNumbers: true,
            foldGutter: true,
            highlightActiveLine: true,
          }}
          onChange={(v) => {
            setCssDraft(v);
            setHasUserEdited(true);
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
          <Button size="small" variant="outline" onClick={handleReset}>
            重置
          </Button>
          <Button size="small" variant="outline" theme="danger" onClick={handleClear}>
            清空
          </Button>
          <Button size="small" onClick={handleApply}>
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

export default React.memo(NodeStylePanel);
