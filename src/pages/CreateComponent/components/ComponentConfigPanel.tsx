import React, { useEffect, useState } from 'react';
import { Button, Dialog, Empty, Input, InputNumber, Select, Space, Switch, Table, Typography } from 'tdesign-react';
import { useCreateComponentStore } from '../store';
import NodeStyleDrawer from './NodeStyleDrawer';
import { isSlotNode } from '../utils/slot';
import CodeEditorDialog, { type CodeEditorValue } from './CodeEditorDialog';

type EditType = 'switch' | 'input' | 'inputNumber' | 'select' | 'swiperImages' | 'jsonCode';

interface SwiperImageRow {
  id: string;
  src: string;
  fallback: string;
  lazy: boolean;
  objectFit: string;
  objectPosition: string;
}

const SWIPER_FIT_OPTIONS = ['contain', 'cover', 'fill', 'none', 'scale-down'].map((item) => ({
  label: item,
  value: item,
}));

const SWIPER_POSITION_OPTIONS = ['left', 'center', 'right', 'top', 'bottom'].map((item) => ({
  label: item,
  value: item,
}));

const createSwiperImageRow = (seed?: Partial<SwiperImageRow>): SwiperImageRow => ({
  id: `swiper-image-${Date.now()}-${Math.round(Math.random() * 10000)}`,
  src: String(seed?.src ?? ''),
  fallback: String(seed?.fallback ?? ''),
  lazy: typeof seed?.lazy === 'boolean' ? seed.lazy : true,
  objectFit: String(seed?.objectFit ?? 'cover'),
  objectPosition: String(seed?.objectPosition ?? 'center'),
});

const normalizeSwiperImageRows = (value: unknown): SwiperImageRow[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item) => !!item && typeof item === 'object')
    .map((item) => createSwiperImageRow(item as Partial<SwiperImageRow>));
};

interface ComponentPropSchema {
  name?: string;
  value?: unknown;
  editType?: EditType | string;
  editInput?: EditType | string;
  payload?: {
    options?: Array<string | number>;
  };
}

const LIST_BINDABLE_PROP_OPTIONS: Record<string, Array<{ label: string; value: string }>> = {
  Image: [
    { label: 'src', value: 'src' },
    { label: 'alt', value: 'alt' },
  ],
  Avatar: [
    { label: 'image', value: 'image' },
    { label: 'content', value: 'content' },
    { label: 'alt', value: 'alt' },
  ],
  Button: [
    { label: 'content', value: 'content' },
  ],
  'Typography.Title': [
    { label: 'content', value: 'content' },
  ],
  'Typography.Paragraph': [
    { label: 'content', value: 'content' },
  ],
  'Typography.Text': [
    { label: 'content', value: 'content' },
  ],
};

const LIST_META_PROP_KEYS = new Set([
  'titleField',
  'descriptionField',
  'imageField',
  'actionField',
]);

const LIST_ITEM_META_PROP_KEYS = new Set([
  'showImage',
  'showDescription',
  'showAction',
  'actionTheme',
  'actionVariant',
  'actionSize',
]);

const findNodePathByKey = (node: any, targetKey: string, path: any[] = []): any[] | null => {
  const nextPath = [...path, node];
  if (node.key === targetKey) {
    return nextPath;
  }

  if (!node.children?.length) {
    return null;
  }

  for (const child of node.children) {
    const found = findNodePathByKey(child, targetKey, nextPath);
    if (found) {
      return found;
    }
  }

  return null;
};

const resolveEditType = (schema: ComponentPropSchema): EditType => {
  const type = (schema.editType ?? schema.editInput) as EditType | string | undefined;
  if (type === 'switch' || type === 'input' || type === 'inputNumber' || type === 'select' || type === 'swiperImages' || type === 'jsonCode') {
    return type;
  }

  return typeof schema.value === 'number' ? 'inputNumber' : 'input';
};

const ComponentConfigPanel: React.FC = () => {
  const activeNode = useCreateComponentStore((state) => state.activeNode);
  const uiPageData = useCreateComponentStore((state) => state.uiPageData);
  const updateActiveNodeLabel = useCreateComponentStore((state) => state.updateActiveNodeLabel);
  const updateActiveNodeKey = useCreateComponentStore((state) => state.updateActiveNodeKey);
  const updateActiveNodeProp = useCreateComponentStore((state) => state.updateActiveNodeProp);
  const [labelDraft, setLabelDraft] = useState('');
  const [keyDraft, setKeyDraft] = useState('');
  const [keyError, setKeyError] = useState('');
  const [swiperDialogVisible, setSwiperDialogVisible] = useState(false);
  const [swiperImageDraft, setSwiperImageDraft] = useState<SwiperImageRow[]>([]);
  const [inputDrafts, setInputDrafts] = useState<Record<string, string>>({});
  const [numberDrafts, setNumberDrafts] = useState<Record<string, number | undefined>>({});
  const [jsonCodeDialogVisible, setJsonCodeDialogVisible] = useState(false);
  const [jsonCodeTargetPropKey, setJsonCodeTargetPropKey] = useState<string | null>(null);
  const [jsonCodeValue, setJsonCodeValue] = useState<CodeEditorValue>({
    label: 'JSON示例数据',
    language: 'json',
    editorTheme: 'vscode-dark',
    note: '',
    code: '[]',
  });

  const propsMap = (activeNode?.props ?? {}) as Record<string, ComponentPropSchema>;
  const styleValue = (propsMap.__style?.value ?? {}) as Record<string, unknown>;
  const switchControlled = activeNode?.type === 'Switch'
    ? Boolean((propsMap.controlled?.value ?? true))
    : undefined;

  const activePath = activeNode?.key ? findNodePathByKey(uiPageData, activeNode.key) : null;
  const listItemAncestor = activePath?.slice().reverse().find((node) => node.type === 'List.Item');
  const listAncestor = activePath?.slice().reverse().find((node) => node.type === 'List');
  const isListCustomTemplateEnabled = Boolean(
    (listAncestor?.props?.customTemplateEnabled as { value?: unknown } | undefined)?.value,
  );

  const editableProps = Object.entries(propsMap).filter(([propKey]) => {
    if (propKey.startsWith('__')) {
      return false;
    }

    if (activeNode?.type === 'Switch') {
      if (propKey === 'value' && switchControlled === false) {
        return false;
      }
      if (propKey === 'defaultValue' && switchControlled === true) {
        return false;
      }
    }

    if (
      activeNode?.type === 'List'
      && Boolean((propsMap.customTemplateEnabled?.value as boolean | undefined) ?? false)
      && LIST_META_PROP_KEYS.has(propKey)
    ) {
      return false;
    }

    if (activeNode?.type === 'List.Item' && isListCustomTemplateEnabled && LIST_ITEM_META_PROP_KEYS.has(propKey)) {
      return false;
    }

    return true;
  });

  const isNodeInsideListTemplate = Boolean(listItemAncestor && activeNode && activeNode.type !== 'List.Item');
  const bindableProps = activeNode?.type ? (LIST_BINDABLE_PROP_OPTIONS[activeNode.type] ?? []) : [];
  const listBindingSchema = propsMap.__listBinding;
  const listBindingValue = (listBindingSchema?.value ?? {}) as { prop?: string; field?: string };
  const bindingPropValue = typeof listBindingValue.prop === 'string' ? listBindingValue.prop : '';
  const bindingFieldValue = typeof listBindingValue.field === 'string' ? listBindingValue.field : '';

  useEffect(() => {
    if (!activeNode) {
      setLabelDraft('');
      setInputDrafts({});
      setNumberDrafts({});
      return;
    }

    setLabelDraft(String(activeNode.label ?? ''));
    setKeyDraft(String(activeNode.key ?? ''));
    setKeyError('');

    const nextInputDrafts: Record<string, string> = {};
    const nextNumberDrafts: Record<string, number | undefined> = {};

    editableProps.forEach(([propKey, schema]) => {
      const editType = resolveEditType(schema);
      if (editType === 'input') {
        nextInputDrafts[propKey] = typeof schema.value === 'string' ? schema.value : String(schema.value ?? '');
      }
      if (editType === 'inputNumber') {
        nextNumberDrafts[propKey] = typeof schema.value === 'number' ? schema.value : undefined;
      }
    });

    setInputDrafts(nextInputDrafts);
    setNumberDrafts(nextNumberDrafts);
  }, [activeNode?.key, activeNode?.label, activeNode?.props]);

  if (!activeNode) {
    return (
      <div className="right-panel-body right-panel-empty">
        <Empty description="请先在画布或组件树中选择一个组件" />
      </div>
    );
  }

  if (isSlotNode(activeNode)) {
    return (
      <div className="right-panel-body right-panel-empty">
        <Empty description="插槽节点仅用于承载拖拽，不支持单独配置" />
      </div>
    );
  }

  const renderEditor = (propKey: string, schema: ComponentPropSchema) => {
    const editType = resolveEditType(schema);
    const currentValue = schema.value;

    if (editType === 'switch') {
      return (
        <Switch
          value={Boolean(currentValue)}
          onChange={(value) => updateActiveNodeProp(propKey, Boolean(value))}
        />
      );
    }

    if (editType === 'inputNumber') {
      const draftValue = numberDrafts[propKey];
      return (
        <InputNumber
          size='small'
          value={typeof draftValue === 'number' ? draftValue : undefined}
          onChange={(value) => {
            const nextNumber = typeof value === 'number' && !Number.isNaN(value) ? value : undefined;
            setNumberDrafts((previous) => ({
              ...previous,
              [propKey]: nextNumber,
            }));
            if (typeof nextNumber === 'number') {
              updateActiveNodeProp(propKey, nextNumber);
            }
          }}
        />
      );
    }

    if (editType === 'select') {
      const options = (schema.payload?.options ?? []).map((item) => ({
        label: String(item),
        value: item,
      }));

      return (
        <Select
          options={options}
          value={currentValue as string | number | undefined}
          onChange={(value) => updateActiveNodeProp(propKey, value)}
        />
      );
    }

    if (editType === 'swiperImages') {
      return (
        <Button
          size="small"
          variant="outline"
          onClick={() => {
            const rows = normalizeSwiperImageRows(currentValue);
            setSwiperImageDraft(rows.length > 0 ? rows : [createSwiperImageRow(), createSwiperImageRow()]);
            setSwiperDialogVisible(true);
          }}
        >
          配置图片
        </Button>
      );
    }

    if (editType === 'jsonCode') {
      const toJsonCode = (value: unknown) => {
        if (typeof value === 'string') {
          if (!value.trim()) {
            return '[]';
          }

          try {
            return JSON.stringify(JSON.parse(value), null, 2);
          } catch {
            return value;
          }
        }

        if (Array.isArray(value) || (value && typeof value === 'object')) {
          try {
            return JSON.stringify(value, null, 2);
          } catch {
            return '[]';
          }
        }

        return '[]';
      };

      return (
        <Button
          size="small"
          variant="outline"
          onClick={() => {
            setJsonCodeTargetPropKey(propKey);
            setJsonCodeValue((previous) => ({
              ...previous,
              label: schema.name ?? propKey,
              code: toJsonCode(currentValue),
            }));
            setJsonCodeDialogVisible(true);
          }}
        >
          编辑示例数据
        </Button>
      );
    }

    return (
      <Input
        clearable
        value={inputDrafts[propKey] ?? (typeof currentValue === 'string' ? currentValue : String(currentValue ?? ''))}
        onChange={(value) => {
          setInputDrafts((previous) => ({
            ...previous,
            [propKey]: String(value ?? ''),
          }));
        }}
        onBlur={() => updateActiveNodeProp(propKey, inputDrafts[propKey] ?? '')}
      />
    );
  };

  const handleApplyNodeKey = () => {
    const result = updateActiveNodeKey(keyDraft);
    setKeyError(result.success ? '' : String(result.message ?? '组件标识重复'));
    if (result.success && activeNode) {
      setKeyDraft(String(keyDraft.trim()));
    }
  };

  const keyHintText = keyError || '仅支持字母、数字、下划线(_)和中划线(-)';

  const applySwiperImageDraft = () => {
    updateActiveNodeProp(
      'images',
      swiperImageDraft.map((item) => ({
        src: item.src,
        fallback: item.fallback,
        lazy: item.lazy,
        objectFit: item.objectFit,
        objectPosition: item.objectPosition,
      })),
    );
    setSwiperDialogVisible(false);
  };

  const applyJsonCodeDraft = (nextValue: Pick<CodeEditorValue, 'code' | 'editorTheme'>) => {
    setJsonCodeValue((previous) => ({
      ...previous,
      code: nextValue.code,
      editorTheme: nextValue.editorTheme,
    }));

    if (jsonCodeTargetPropKey) {
      updateActiveNodeProp(jsonCodeTargetPropKey, nextValue.code);
    }

    setJsonCodeDialogVisible(false);
    setJsonCodeTargetPropKey(null);
  };

  return (
    <div className="right-panel-body">
      <div className="config-form">
        <Typography.Title level="h6" className="config-title">组件配置</Typography.Title>

        <div className="config-row">
          <span className="config-label">组件名称</span>
          <Input
            className="config-editor"
            clearable
            value={labelDraft}
            placeholder="请输入组件名称"
            onChange={(value) => setLabelDraft(String(value ?? ''))}
            onBlur={() => updateActiveNodeLabel(labelDraft)}
          />
        </div>

        <div className="config-row">
          <span className="config-label">组件标识</span>
          <Input
            className="config-editor"
            clearable
            value={keyDraft}
            status={keyError ? 'error' : 'default'}
            onChange={(value) => {
              setKeyDraft(String(value ?? ''));
              if (keyError) {
                setKeyError('');
              }
            }}
            onBlur={handleApplyNodeKey}
            onEnter={handleApplyNodeKey}
          />
        </div>
        <div className="config-row">
          <span className="config-label" style={{ color: keyError ? '#d54941' : '#8b92a1' }}>{keyHintText}</span>
        </div>

        <div className="config-row">
          <span className="config-label">通用样式</span>
          <div className="config-editor">
            <NodeStyleDrawer
              targetKey={activeNode.key}
              value={styleValue}
              onChange={(nextStyle) => updateActiveNodeProp('__style', nextStyle)}
            />
          </div>
        </div>

        {editableProps.map(([propKey, schema]) => (
          <div key={propKey} className="config-row">
            <span className="config-label">{schema.name ?? propKey}</span>
            <div className="config-editor">{renderEditor(propKey, schema)}</div>
          </div>
        ))}

        {isListCustomTemplateEnabled && isNodeInsideListTemplate && bindableProps.length > 0 ? (
          <>
            <div className="config-row">
              <span className="config-label">绑定属性</span>
              <div className="config-editor">
                <Select
                  options={bindableProps}
                  value={bindingPropValue || undefined}
                  placeholder="选择组件属性"
                  onChange={(value) => {
                    const nextProp = String(value ?? '');
                    updateActiveNodeProp('__listBinding', {
                      prop: nextProp,
                      field: bindingFieldValue,
                    });
                  }}
                />
              </div>
            </div>
            <div className="config-row">
              <span className="config-label">数据字段</span>
              <div className="config-editor">
                <Input
                  clearable
                  placeholder="例如：title 或 cover.url"
                  value={bindingFieldValue}
                  onChange={(value) => {
                    const nextField = String(value ?? '');
                    updateActiveNodeProp('__listBinding', {
                      prop: bindingPropValue,
                      field: nextField,
                    });
                  }}
                />
              </div>
            </div>
          </>
        ) : null}
      </div>

      <Dialog
        visible={swiperDialogVisible}
        width="980px"
        header="配置轮播图片"
        closeOnOverlayClick={false}
        confirmBtn="应用"
        cancelBtn="取消"
        onConfirm={applySwiperImageDraft}
        onClose={() => setSwiperDialogVisible(false)}
      >
        <div style={{ marginBottom: 12 }}>
          <Button
            size="small"
            variant="outline"
            onClick={() => setSwiperImageDraft((previous) => [...previous, createSwiperImageRow()])}
          >
            增加一行
          </Button>
        </div>

        <Table
          rowKey="id"
          data={swiperImageDraft}
          columns={[
            {
              colKey: 'src',
              title: 'src',
              cell: ({ row }: { row: SwiperImageRow }) => (
                <Input
                  clearable
                  value={row.src}
                  onChange={(value) =>
                    setSwiperImageDraft((previous) =>
                      previous.map((item) => (item.id === row.id ? { ...item, src: String(value ?? '') } : item)),
                    )
                  }
                />
              ),
            },
            {
              colKey: 'fallback',
              title: 'fallback',
              cell: ({ row }: { row: SwiperImageRow }) => (
                <Input
                  clearable
                  value={row.fallback}
                  onChange={(value) =>
                    setSwiperImageDraft((previous) =>
                      previous.map((item) => (item.id === row.id ? { ...item, fallback: String(value ?? '') } : item)),
                    )
                  }
                />
              ),
            },
            {
              colKey: 'lazy',
              title: 'lazy',
              width: 88,
              cell: ({ row }: { row: SwiperImageRow }) => (
                <Switch
                  size="small"
                  value={row.lazy}
                  onChange={(value) =>
                    setSwiperImageDraft((previous) =>
                      previous.map((item) => (item.id === row.id ? { ...item, lazy: Boolean(value) } : item)),
                    )
                  }
                />
              ),
            },
            {
              colKey: 'objectFit',
              title: 'objectFit',
              width: 140,
              cell: ({ row }: { row: SwiperImageRow }) => (
                <Select
                  size="small"
                  options={SWIPER_FIT_OPTIONS}
                  value={row.objectFit}
                  onChange={(value) =>
                    setSwiperImageDraft((previous) =>
                      previous.map((item) => (item.id === row.id ? { ...item, objectFit: String(value ?? 'cover') } : item)),
                    )
                  }
                />
              ),
            },
            {
              colKey: 'objectPosition',
              title: 'objectPosition',
              width: 140,
              cell: ({ row }: { row: SwiperImageRow }) => (
                <Select
                  size="small"
                  options={SWIPER_POSITION_OPTIONS}
                  value={row.objectPosition}
                  onChange={(value) =>
                    setSwiperImageDraft((previous) =>
                      previous.map((item) => (item.id === row.id ? { ...item, objectPosition: String(value ?? 'center') } : item)),
                    )
                  }
                />
              ),
            },
            {
              colKey: 'action',
              title: '操作',
              width: 90,
              cell: ({ row }: { row: SwiperImageRow }) => (
                <Space>
                  <Button
                    size="small"
                    variant="text"
                    theme="danger"
                    onClick={() =>
                      setSwiperImageDraft((previous) => previous.filter((item) => item.id !== row.id))
                    }
                  >
                    删除
                  </Button>
                </Space>
              ),
            },
          ]}
        />
      </Dialog>

      <CodeEditorDialog
        visible={jsonCodeDialogVisible}
        value={jsonCodeValue}
        onClose={() => {
          setJsonCodeDialogVisible(false);
          setJsonCodeTargetPropKey(null);
        }}
        onApply={applyJsonCodeDraft}
      />
    </div>
  );
};

export default React.memo(ComponentConfigPanel);
