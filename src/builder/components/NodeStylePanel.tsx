import React, { useEffect, useMemo, useState } from 'react';
import { Button, ColorPicker, Input, Select, Space, Switch, Typography } from 'tdesign-react';
import CodeMirror from '@uiw/react-codemirror';
import { css } from '@codemirror/lang-css';
import './NodeStylePanel.less';

export interface NodeStylePanelProps {
  value?: Record<string, unknown>;
  onChange: (nextStyle: Record<string, unknown>) => void;
  targetKey?: string;
  /** 嵌入侧栏时略紧凑 */
  compact?: boolean;
}

type StyleValue = Record<string, string>;

const QUICK_INSERT_PROPERTIES = [
  { label: '插入宽度', line: 'width: 100%;' },
  { label: '插入高度', line: 'height: 240px;' },
  { label: '插入背景色', line: 'background-color: #ffffff;' },
  { label: '插入文字色', line: 'color: #333333;' },
  { label: '插入内边距', line: 'padding: 8px 12px;' },
  { label: '插入圆角', line: 'border-radius: 6px;' },
  { label: '插入边框', line: 'border: 1px solid #d9d9d9;' },
  { label: '插入过渡', line: 'transition: all .2s ease;' },
];

const COLOR_PROPERTIES = [
  { label: '背景色', value: 'background-color' },
  { label: '文字颜色', value: 'color' },
  { label: '边框颜色', value: 'border-color' },
];

const QUICK_SNIPPETS = [
  {
    label: '卡片基础样式',
    lines: [
      'background-color: #ffffff;',
      'border: 1px solid #e7e7e7;',
      'border-radius: 8px;',
      'padding: 12px;',
      'transition: all .2s ease;',
    ],
  },
  {
    label: 'Flex 居中',
    lines: [
      'display: flex;',
      'justify-content: center;',
      'align-items: center;',
    ],
  },
  {
    label: '标题文本',
    lines: [
      'font-size: 18px;',
      'font-weight: 600;',
      'line-height: 1.4;',
      'color: #1f2329;',
    ],
  },
];

interface VisualField {
  key: string;
  label: string;
  type: 'input' | 'color' | 'select';
  options?: Array<{ label: string; value: string }>;
}

const VISUAL_FIELDS: VisualField[] = [
  { key: 'width', label: '宽度', type: 'input' },
  { key: 'height', label: '高度', type: 'input' },
  { key: 'min-width', label: '最小宽度', type: 'input' },
  { key: 'min-height', label: '最小高度', type: 'input' },
  { key: 'max-width', label: '最大宽度', type: 'input' },
  { key: 'max-height', label: '最大高度', type: 'input' },
  { key: 'background-color', label: '背景色', type: 'color' },
  { key: 'color', label: '文字色', type: 'color' },
  { key: 'border-color', label: '边框色', type: 'color' },
  { key: 'font-size', label: '字号', type: 'input' },
  { key: 'padding', label: '内边距', type: 'input' },
  { key: 'margin', label: '外边距', type: 'input' },
  { key: 'border-radius', label: '圆角', type: 'input' },
  { key: 'transition', label: '过渡', type: 'input' },
  {
    key: 'display',
    label: '显示',
    type: 'select',
    options: [
      { label: 'block', value: 'block' },
      { label: 'inline-block', value: 'inline-block' },
      { label: 'flex', value: 'flex' },
      { label: 'grid', value: 'grid' },
      { label: 'none', value: 'none' },
    ],
  },
  {
    key: 'text-align',
    label: '文本对齐',
    type: 'select',
    options: [
      { label: 'left', value: 'left' },
      { label: 'center', value: 'center' },
      { label: 'right', value: 'right' },
      { label: 'justify', value: 'justify' },
    ],
  },
];

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

const upsertCssPropertyLine = (cssText: string, property: string, value: string) => {
  const propertyRegex = new RegExp(`(^|\\n)\\s*${property}\\s*:[^;]*;?`, 'i');
  const normalizedLine = `${property}: ${value};`;

  if (propertyRegex.test(cssText)) {
    return cssText.replace(propertyRegex, (matched) => {
      const prefix = matched.startsWith('\n') ? '\n' : '';
      return `${prefix}${normalizedLine}`;
    });
  }

  const trimmed = cssText.trim();
  if (!trimmed) {
    return normalizedLine;
  }

  return `${trimmed}\n${normalizedLine}`;
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
  const [autoApply, setAutoApply] = useState(true);
  const [hasUserEdited, setHasUserEdited] = useState(false);
  const [activeTab, setActiveTab] = useState<'visual' | 'code'>('visual');
  const [selectedColorProperty, setSelectedColorProperty] = useState('background-color');
  const [selectedColor, setSelectedColor] = useState('#0052d9');
  const [selectedSnippet, setSelectedSnippet] = useState('');

  const normalized = useMemo(() => normalizeStyleValue(value), [value]);
  const parseResult = useMemo(() => parseCssText(cssDraft), [cssDraft]);
  const visualDraft = useMemo(() => normalizeStyleValue(parseResult.style), [parseResult.style]);

  useEffect(() => {
    setCssDraft(styleToCssText(normalizeStyleValue(value)));
    setHasUserEdited(false);
    setSelectedColorProperty('background-color');
    setSelectedColor('#0052d9');
    setSelectedSnippet('');
    setActiveTab('visual');
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

  const handleVisualFieldChange = (field: VisualField, nextValue: string) => {
    const draft = { ...visualDraft };
    if (!nextValue.trim()) {
      delete draft[field.key];
    } else {
      draft[field.key] = nextValue;
    }
    setCssDraft(styleToCssText(draft));
    setHasUserEdited(true);
  };

  const insertPropertyLine = (line: string) => {
    setCssDraft((previous) => {
      const next = previous.trim() ? `${previous.trim()}\n${line}` : line;
      return next;
    });
    setHasUserEdited(true);
  };

  const applyColorProperty = () => {
    setCssDraft((previous) => upsertCssPropertyLine(previous, selectedColorProperty, selectedColor));
    setHasUserEdited(true);
  };

  const applySnippet = (snippetValue: string) => {
    const snippet = QUICK_SNIPPETS.find((item) => item.label === snippetValue);
    if (!snippet) {
      return;
    }

    setCssDraft((previous) => {
      const base = previous.trim();
      const block = snippet.lines.join('\n');
      return base ? `${base}\n${block}` : block;
    });
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

        <Space size={6}>
          <Button size="small" variant={activeTab === 'visual' ? 'base' : 'outline'} onClick={() => setActiveTab('visual')}>
            可视化
          </Button>
          <Button size="small" variant={activeTab === 'code' ? 'base' : 'outline'} onClick={() => setActiveTab('code')}>
            CSS 代码
          </Button>
        </Space>
      </div>

      {activeTab === 'visual' ? (
        <div className="node-style-panel__section">
          <div className="node-style-panel__grid">
            {VISUAL_FIELDS.map((field) => {
              const fieldValue = String(visualDraft[field.key] ?? '');

              if (field.type === 'color') {
                return (
                  <div className="node-style-panel__field" key={field.key}>
                    <span className="node-style-panel__field-label">{field.label}</span>
                    <ColorPicker
                      value={fieldValue || '#ffffff'}
                      onChange={(v) => handleVisualFieldChange(field, String(v ?? ''))}
                    />
                  </div>
                );
              }

              if (field.type === 'select') {
                return (
                  <div className="node-style-panel__field" key={field.key}>
                    <span className="node-style-panel__field-label">{field.label}</span>
                    <Select
                      clearable
                      size="small"
                      options={field.options ?? []}
                      value={fieldValue || undefined}
                      onChange={(v) => handleVisualFieldChange(field, String(v ?? ''))}
                    />
                  </div>
                );
              }

              return (
                <div className="node-style-panel__field" key={field.key}>
                  <span className="node-style-panel__field-label">{field.label}</span>
                  <Input
                    size="small"
                    value={fieldValue}
                    placeholder="CSS 值"
                    onChange={(v) => handleVisualFieldChange(field, String(v ?? ''))}
                  />
                </div>
              );
            })}
          </div>

          <div className="node-style-panel__block">
            <Typography.Text className="node-style-panel__block-title">快速插入</Typography.Text>
            <Space size={6} breakLine>
              {QUICK_INSERT_PROPERTIES.map((item) => (
                <Button key={item.label} size="small" variant="outline" onClick={() => insertPropertyLine(item.line)}>
                  {item.label}
                </Button>
              ))}
            </Space>
          </div>

          <div className="node-style-panel__block">
            <Typography.Text className="node-style-panel__block-title">颜色快捷</Typography.Text>
            <Space size={6} breakLine align="center">
              <Select
                style={{ width: 160 }}
                size="small"
                options={COLOR_PROPERTIES}
                keys={{ value: 'value', label: 'label' }}
                value={selectedColorProperty}
                onChange={(v) => setSelectedColorProperty(String(v ?? 'background-color'))}
              />
              <ColorPicker value={selectedColor} onChange={(v) => setSelectedColor(String(v ?? '#0052d9'))} />
              <Button size="small" onClick={applyColorProperty}>
                应用
              </Button>
            </Space>
          </div>

          <div className="node-style-panel__block">
            <Typography.Text className="node-style-panel__block-title">样式片段</Typography.Text>
            <Select
              clearable
              size="small"
              style={{ width: '100%' }}
              placeholder="选择预设片段"
              options={QUICK_SNIPPETS.map((item) => ({ label: item.label, value: item.label }))}
              value={selectedSnippet || undefined}
              onChange={(v) => {
                const next = String(v ?? '');
                setSelectedSnippet(next);
                if (next) {
                  applySnippet(next);
                }
              }}
            />
          </div>
        </div>
      ) : (
        <div className="node-style-panel__section node-style-panel__section--code">
          <CodeMirror
            value={cssDraft}
            height={compact ? '280px' : '360px'}
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
      )}

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
