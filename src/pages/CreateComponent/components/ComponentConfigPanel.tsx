import React, { useEffect, useState } from 'react';
import { Empty, Input, InputNumber, Select, Switch, Typography } from 'tdesign-react';
import { useCreateComponentStore } from '../store';
import NodeStyleDrawer from './NodeStyleDrawer';

type EditType = 'switch' | 'input' | 'inputNumber' | 'select';

interface ComponentPropSchema {
  name?: string;
  value?: unknown;
  editType?: EditType | string;
  editInput?: EditType | string;
  payload?: {
    options?: Array<string | number>;
  };
}

const resolveEditType = (schema: ComponentPropSchema): EditType => {
  const type = (schema.editType ?? schema.editInput) as EditType | string | undefined;
  if (type === 'switch' || type === 'input' || type === 'inputNumber' || type === 'select') {
    return type;
  }

  return typeof schema.value === 'number' ? 'inputNumber' : 'input';
};

const ComponentConfigPanel: React.FC = () => {
  const activeNode = useCreateComponentStore((state) => state.activeNode);
  const updateActiveNodeLabel = useCreateComponentStore((state) => state.updateActiveNodeLabel);
  const updateActiveNodeKey = useCreateComponentStore((state) => state.updateActiveNodeKey);
  const updateActiveNodeProp = useCreateComponentStore((state) => state.updateActiveNodeProp);
  const [labelDraft, setLabelDraft] = useState('');
  const [keyDraft, setKeyDraft] = useState('');
  const [keyError, setKeyError] = useState('');
  const [inputDrafts, setInputDrafts] = useState<Record<string, string>>({});
  const [numberDrafts, setNumberDrafts] = useState<Record<string, number | undefined>>({});

  const propsMap = (activeNode?.props ?? {}) as Record<string, ComponentPropSchema>;
  const styleValue = (propsMap.__style?.value ?? {}) as Record<string, unknown>;
  const editableProps = Object.entries(propsMap).filter(([propKey]) => propKey !== '__style');

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
            setNumberDrafts((previous) => ({
              ...previous,
              [propKey]: typeof value === 'number' ? value : undefined,
            }));
          }}
          onBlur={() => {
            const value = numberDrafts[propKey];
            if (typeof value === 'number' && !Number.isNaN(value)) {
              updateActiveNodeProp(propKey, value);
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
      </div>
    </div>
  );
};

export default React.memo(ComponentConfigPanel);
