import React, { useEffect, useMemo, useState } from 'react';
import { Button, ColorPicker, Drawer, Input, Select } from 'tdesign-react';

type StyleValue = Record<string, string>;

interface StyleField {
  key: string;
  label: string;
  placeholder?: string;
  editType?: 'input' | 'select';
  options?: string[];
  isColor?: boolean;
}

interface NodeStyleDrawerProps {
  value?: Record<string, unknown>;
  onChange: (nextStyle: Record<string, unknown>) => void;
}

const STYLE_FIELDS: StyleField[] = [
  { key: 'width', label: '宽度', placeholder: '例如：100%, 240px' },
  { key: 'height', label: '高度', placeholder: '例如：56px, auto' },
  { key: 'minWidth', label: '最小宽度', placeholder: '例如：120px' },
  { key: 'minHeight', label: '最小高度', placeholder: '例如：40px' },
  { key: 'maxWidth', label: '最大宽度', placeholder: '例如：100%' },
  { key: 'maxHeight', label: '最大高度', placeholder: '例如：80vh' },
  { key: 'margin', label: '外边距', placeholder: '例如：8px 12px' },
  { key: 'padding', label: '内边距', placeholder: '例如：8px 12px' },
  { key: 'backgroundColor', label: '背景色', placeholder: '例如：#ffffff', isColor: true },
  { key: 'color', label: '文字颜色', placeholder: '例如：#333333', isColor: true },
  { key: 'fontSize', label: '字号', placeholder: '例如：14px' },
  { key: 'fontWeight', label: '字重', placeholder: '例如：400/600/bold' },
  { key: 'lineHeight', label: '行高', placeholder: '例如：1.6 / 24px' },
  {
    key: 'textAlign',
    label: '文字对齐',
    editType: 'select',
    options: ['left', 'center', 'right', 'justify'],
  },
  { key: 'borderRadius', label: '圆角', placeholder: '例如：8px' },
  { key: 'borderWidth', label: '边框宽度', placeholder: '例如：1px' },
  {
    key: 'borderStyle',
    label: '边框样式',
    editType: 'select',
    options: ['solid', 'dashed', 'dotted', 'double', 'none'],
  },
  { key: 'borderColor', label: '边框颜色', placeholder: '例如：#d9d9d9', isColor: true },
  { key: 'opacity', label: '透明度', placeholder: '例如：0.8' },
  {
    key: 'display',
    label: '显示模式',
    editType: 'select',
    options: ['block', 'inline-block', 'inline', 'flex', 'grid', 'none'],
  },
  {
    key: 'flexDirection',
    label: '主轴方向',
    editType: 'select',
    options: ['row', 'column', 'row-reverse', 'column-reverse'],
  },
  {
    key: 'justifyContent',
    label: '主轴对齐',
    editType: 'select',
    options: ['flex-start', 'center', 'flex-end', 'space-between', 'space-around', 'space-evenly'],
  },
  {
    key: 'alignItems',
    label: '交叉轴对齐',
    editType: 'select',
    options: ['stretch', 'flex-start', 'center', 'flex-end', 'baseline'],
  },
  { key: 'gap', label: '间距', placeholder: '例如：8px' },
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

const NodeStyleDrawer: React.FC<NodeStyleDrawerProps> = ({ value, onChange }) => {
  const [visible, setVisible] = useState(false);
  const [draft, setDraft] = useState<StyleValue>({});

  const normalized = useMemo(() => normalizeStyleValue(value), [value]);

  useEffect(() => {
    if (!visible) {
      setDraft(normalized);
    }
  }, [normalized, visible]);

  const handleOpen = () => {
    setDraft(normalized);
    setVisible(true);
  };

  const handleApply = () => {
    onChange(toPayload(draft));
    setVisible(false);
  };

  const handleReset = () => {
    setDraft({});
  };

  return (
    <>
      <Button size="small" variant="outline" onClick={handleOpen}>
        样式配置
      </Button>

      <Drawer
        header="通用样式"
        visible={visible}
        placement="right"
        size="420px"
        onClose={() => setVisible(false)}
        footer={(
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button variant="outline" onClick={handleReset}>重置</Button>
            <Button theme="primary" onClick={handleApply}>应用</Button>
          </div>
        )}
      >
        <div className="style-drawer-form">
          {STYLE_FIELDS.map((field) => (
            <div key={field.key} className="style-drawer-row">
              <span className="style-drawer-label">{field.label}</span>
              <div className="style-drawer-editor">
                {field.editType === 'select' ? (
                  <Select
                    clearable
                    options={(field.options ?? []).map((item) => ({ label: item, value: item }))}
                    value={draft[field.key] || undefined}
                    onChange={(nextValue) => {
                      setDraft((previous) => ({
                        ...previous,
                        [field.key]: nextValue ? String(nextValue) : '',
                      }));
                    }}
                  />
                ) : field.isColor ? (
                  <ColorPicker
                    clearable
                    colorModes={['monochrome']}
                    value={draft[field.key] || ''}
                    onChange={(nextValue) => {
                      setDraft((previous) => ({
                        ...previous,
                        [field.key]: String(nextValue ?? ''),
                      }));
                    }}
                    onClear={() => {
                      setDraft((previous) => ({
                        ...previous,
                        [field.key]: '',
                      }));
                    }}
                  />
                ) : (
                  <Input
                    clearable
                    value={draft[field.key] ?? ''}
                    placeholder={field.placeholder}
                    onChange={(nextValue) => {
                      setDraft((previous) => ({
                        ...previous,
                        [field.key]: String(nextValue ?? ''),
                      }));
                    }}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </Drawer>
    </>
  );
};

export default React.memo(NodeStyleDrawer);
