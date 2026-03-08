import React from 'react';
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

  if (!activeNode) {
    return (
      <div className="right-panel-body right-panel-empty">
        <Empty description="请先在画布或组件树中选择一个组件" />
      </div>
    );
  }

  const propsMap = (activeNode.props ?? {}) as Record<string, ComponentPropSchema>;

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
      return (
        <InputNumber
          size='small'
          value={typeof currentValue === 'number' ? currentValue : undefined}
          onChange={(value) => updateActiveNodeProp(propKey, Number(value ?? 0))}
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
        value={typeof currentValue === 'string' ? currentValue : String(currentValue ?? '')}
        onChange={(value) => updateActiveNodeProp(propKey, String(value ?? ''))}
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
            value={String(activeNode.label ?? '')}
            placeholder="请输入组件名称"
            onChange={(value) => updateActiveNodeLabel(String(value ?? ''))}
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
