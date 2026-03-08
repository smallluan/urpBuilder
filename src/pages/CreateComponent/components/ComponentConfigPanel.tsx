import React, { useEffect, useState } from 'react';
import { Empty, Input, InputNumber, Select, Switch, Typography } from 'tdesign-react';
import { useCreateComponentStore } from '../store';

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
  const updateActiveNodeProp = useCreateComponentStore((state) => state.updateActiveNodeProp);
  const [labelDraft, setLabelDraft] = useState('');
  const [inputDrafts, setInputDrafts] = useState<Record<string, string>>({});
  const [numberDrafts, setNumberDrafts] = useState<Record<string, number | undefined>>({});

  const propsMap = (activeNode?.props ?? {}) as Record<string, ComponentPropSchema>;

  useEffect(() => {
    if (!activeNode) {
      setLabelDraft('');
      setInputDrafts({});
      setNumberDrafts({});
      return;
    }

    setLabelDraft(String(activeNode.label ?? ''));

    const nextInputDrafts: Record<string, string> = {};
    const nextNumberDrafts: Record<string, number | undefined> = {};

    Object.entries(propsMap).forEach(([propKey, schema]) => {
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

  return (
    <div className="right-panel-body">
      <div className="config-form">
        <Typography.Title level="h6" className="config-title">组件配置</Typography.Title>

        <div className="config-row">
          <span className="config-label">组件名称</span>
          <Input
            className="config-editor"
            value={labelDraft}
            placeholder="请输入组件名称"
            onChange={(value) => setLabelDraft(String(value ?? ''))}
            onBlur={() => updateActiveNodeLabel(labelDraft)}
          />
        </div>

        <div className="config-row">
          <span className="config-label">组件标识</span>
          <Input className="config-editor" value={activeNode.key} disabled />
        </div>

        {Object.entries(propsMap).map(([propKey, schema]) => (
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
