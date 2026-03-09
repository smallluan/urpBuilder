import React, { useEffect, useMemo, useState } from 'react';
import { Button, ColorPicker, Drawer, Input, Select, Space, Switch, Typography } from 'tdesign-react';
import CodeMirror from '@uiw/react-codemirror';
import { css } from '@codemirror/lang-css';

interface NodeStyleDrawerProps {
  value?: Record<string, unknown>;
  onChange: (nextStyle: Record<string, unknown>) => void;
  targetKey?: string;
  triggerRenderer?: (openDrawer: () => void) => React.ReactNode;
}

type StyleValue = Record<string, string>;

const QUICK_INSERT_PROPERTIES = [
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

const toPayload = (draft: StyleValue): Record<string, unknown> => {
  const nextStyle: Record<string, unknown> = {};
  Object.entries(draft).forEach(([key, value]) => {
    const text = String(value ?? '').trim();
    if (!text) {
      return;
    }
    nextStyle[key] = text;
  });
  return nextStyle;
};

const NodeStyleDrawer: React.FC<NodeStyleDrawerProps> = ({
  value,
  onChange,
  targetKey,
  triggerRenderer,
}) => {
  const [visible, setVisible] = useState(false);
  const [cssDraft, setCssDraft] = useState('');
  const [autoApply, setAutoApply] = useState(true);
  const [hasUserEdited, setHasUserEdited] = useState(false);
  const [activeTab, setActiveTab] = useState<'visual' | 'code'>('visual');
  const [selectedColorProperty, setSelectedColorProperty] = useState('background-color');
  const [selectedColor, setSelectedColor] = useState('#0052d9');
  const [selectedSnippet, setSelectedSnippet] = useState('');

  const normalized = useMemo(() => normalizeStyleValue(value), [value]);
  const parseResult = useMemo(() => parseCssText(cssDraft), [cssDraft]);
  const visualDraft = useMemo(() => normalizeStyleValue(parseResult.style), [parseResult.style]);

  const resetFromCurrentValue = () => {
    const nextText = styleToCssText(normalized);
    setCssDraft(nextText);
    setHasUserEdited(false);
    setSelectedColorProperty('background-color');
    setSelectedColor('#0052d9');
    setSelectedSnippet('');
    setActiveTab('visual');
  };

  useEffect(() => {
    if (!visible) {
      resetFromCurrentValue();
    }
  }, [normalized, visible, targetKey]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    resetFromCurrentValue();
  }, [targetKey]);

  useEffect(() => {
    if (!visible || !autoApply || !hasUserEdited) {
      return;
    }

    const timeout = window.setTimeout(() => {
      const payload = toPayload(cssTextToPayload(cssDraft) as StyleValue);
      onChange(payload);
    }, 250);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [cssDraft, autoApply, hasUserEdited, onChange, visible]);

  const handleOpen = () => {
    resetFromCurrentValue();
    setVisible(true);
  };

  const handleApply = (closeAfterApply = false) => {
    const parsedStyle = cssTextToPayload(cssDraft);
    const payload = toPayload(parsedStyle as StyleValue);
    onChange(payload);
    if (closeAfterApply) {
      setVisible(false);
    }
  };

  const handleReset = () => {
    setHasUserEdited(true);
    setCssDraft('');
  };

  const handleQuickInsert = (line: string) => {
    setHasUserEdited(true);
    const splitIndex = line.indexOf(':');
    if (splitIndex <= 0) {
      setCssDraft((previous) => (previous.trim() ? `${previous.trim()}\n${line}` : line));
      return;
    }

    const property = line.slice(0, splitIndex).trim();
    const valueText = line.slice(splitIndex + 1).replace(';', '').trim();
    setCssDraft((previous) => upsertCssPropertyLine(previous, property, valueText));
  };

  const handleInsertColor = () => {
    const colorText = String(selectedColor ?? '').trim();
    if (!colorText) {
      return;
    }

    setHasUserEdited(true);
    setCssDraft((previous) => upsertCssPropertyLine(previous, selectedColorProperty, colorText));
  };

  const getVisualFieldValue = (property: string) => {
    const camelProperty = kebabToCamel(property);
    return visualDraft[camelProperty] ?? '';
  };

  const handleVisualFieldChange = (property: string, valueText: string) => {
    setHasUserEdited(true);
    const text = String(valueText ?? '').trim();
    const propertyRegex = new RegExp(`(^|\\n)\\s*${property}\\s*:[^;]*;?`, 'i');

    if (!text) {
      setCssDraft((previous) => previous.replace(propertyRegex, '').replace(/\n{3,}/g, '\n\n').trim());
      return;
    }

    setCssDraft((previous) => upsertCssPropertyLine(previous, property, text));
  };

  const handleInsertSnippet = () => {
    if (!selectedSnippet) {
      return;
    }

    const snippet = QUICK_SNIPPETS.find((item) => item.label === selectedSnippet);
    if (!snippet) {
      return;
    }

    setHasUserEdited(true);
    setCssDraft((previous) => {
      let nextText = previous;
      snippet.lines.forEach((line) => {
        const splitIndex = line.indexOf(':');
        if (splitIndex > 0) {
          const property = line.slice(0, splitIndex).trim();
          const lineValue = line.slice(splitIndex + 1).replace(';', '').trim();
          nextText = upsertCssPropertyLine(nextText, property, lineValue);
        }
      });

      return nextText;
    });
  };

  return (
    <>
      {triggerRenderer ? triggerRenderer(handleOpen) : (
        <Button size="small" variant="outline" onClick={handleOpen}>
          样式配置
        </Button>
      )}

      <Drawer
        header="通用样式"
        visible={visible}
        placement="right"
        size="560px"
        onClose={() => setVisible(false)}
        footer={(
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button variant="outline" onClick={handleReset}>重置</Button>
            <Button variant="outline" onClick={() => handleApply(false)}>应用</Button>
            <Button theme="primary" onClick={() => handleApply(true)}>应用并关闭</Button>
          </div>
        )}
      >
        <div className="style-drawer-form">
          <div className="style-drawer-toolbar">
            <Space size={8} align="center">
              <Typography.Text style={{ color: '#666' }}>自动预览</Typography.Text>
              <Switch value={autoApply} onChange={(value) => setAutoApply(Boolean(value))} />
            </Space>
            <Typography.Text style={{ color: '#999' }}>
              有效属性 {parseResult.validCount} 条，无法识别 {parseResult.invalidLines.length} 行
            </Typography.Text>
          </div>

          <div className="style-drawer-toolbar">
            <Space size={8}>
              <Button
                size="small"
                theme={activeTab === 'visual' ? 'primary' : 'default'}
                variant={activeTab === 'visual' ? 'base' : 'outline'}
                onClick={() => setActiveTab('visual')}
              >
                可视化编辑
              </Button>
              <Button
                size="small"
                theme={activeTab === 'code' ? 'primary' : 'default'}
                variant={activeTab === 'code' ? 'base' : 'outline'}
                onClick={() => setActiveTab('code')}
              >
                CSS 编辑器
              </Button>
            </Space>
          </div>

          {activeTab === 'visual' ? (
            <div className="style-drawer-section">
              <Typography.Text style={{ color: '#999' }}>常用项直接填写，自动同步到 CSS。</Typography.Text>
              <div className="style-drawer-visual-grid">
                {VISUAL_FIELDS.map((field) => (
                  <div key={field.key} className="style-drawer-row">
                    <span className="style-drawer-label">{field.label}</span>
                    <div className="style-drawer-editor">
                      {field.type === 'color' ? (
                        <ColorPicker
                          clearable
                          enableAlpha
                          colorModes={['monochrome']}
                          value={getVisualFieldValue(field.key)}
                          onChange={(nextValue) => handleVisualFieldChange(field.key, String(nextValue ?? ''))}
                          onClear={() => handleVisualFieldChange(field.key, '')}
                        />
                      ) : field.type === 'select' ? (
                        <Select
                          clearable
                          options={field.options ?? []}
                          value={getVisualFieldValue(field.key) || undefined}
                          onChange={(nextValue) => handleVisualFieldChange(field.key, String(nextValue ?? ''))}
                          onClear={() => handleVisualFieldChange(field.key, '')}
                        />
                      ) : (
                        <Input
                          clearable
                          value={getVisualFieldValue(field.key)}
                          onChange={(nextValue) => handleVisualFieldChange(field.key, String(nextValue ?? ''))}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {activeTab === 'code' ? (
            <div className="style-drawer-section">
              <div className="style-drawer-toolbar">
                <Select
                  className="style-drawer-color-prop"
                  value={selectedColorProperty}
                  options={COLOR_PROPERTIES}
                  onChange={(value) => setSelectedColorProperty(String(value ?? 'background-color'))}
                />
                <ColorPicker
                  enableAlpha
                  colorModes={['monochrome']}
                  value={selectedColor}
                  onChange={(nextValue) => setSelectedColor(String(nextValue ?? ''))}
                />
                <Button size="small" onClick={handleInsertColor}>插入颜色属性</Button>
              </div>

              <div className="style-drawer-toolbar">
                <Select
                  className="style-drawer-snippet"
                  value={selectedSnippet || undefined}
                  placeholder="选择常用样式片段"
                  options={QUICK_SNIPPETS.map((item) => ({ label: item.label, value: item.label }))}
                  onChange={(value) => setSelectedSnippet(String(value ?? ''))}
                  clearable
                />
                <Button size="small" variant="outline" onClick={handleInsertSnippet}>插入片段</Button>
              </div>

              <div className="style-drawer-toolbar">
                <Space size={8} breakLine>
                  {QUICK_INSERT_PROPERTIES.map((item) => (
                    <Button key={item.label} size="small" variant="outline" onClick={() => handleQuickInsert(item.line)}>
                      {item.label}
                    </Button>
                  ))}
                </Space>
              </div>

              <Typography.Text style={{ color: '#999' }}>
                每行写法示例：`background-color: #ffffff;`。支持粘贴 `{}` 块，保存时会自动提取属性。
              </Typography.Text>
              <CodeMirror
                value={cssDraft}
                height="560px"
                theme="light"
                extensions={[css()]}
                basicSetup={{
                  lineNumbers: true,
                  foldGutter: true,
                  autocompletion: true,
                }}
                onChange={(nextValue) => {
                  setHasUserEdited(true);
                  setCssDraft(nextValue);
                }}
              />
            </div>
          ) : null}

          {parseResult.invalidLines.length > 0 ? (
            <div className="style-drawer-invalid">
              <Typography.Text style={{ color: '#d54941' }}>
                以下行未被识别（需满足 property: value;）：
              </Typography.Text>
              <Typography.Text style={{ color: '#d54941' }}>
                {parseResult.invalidLines.slice(0, 4).join(' | ')}
              </Typography.Text>
            </div>
          ) : null}
        </div>
      </Drawer>
    </>
  );
};

export default React.memo(NodeStyleDrawer);
