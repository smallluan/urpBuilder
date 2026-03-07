import React from 'react';
import { Empty, Form, Input, Switch, Typography } from 'tdesign-react';

const { Text } = Typography;

interface ComponentConfigPanelProps {
  selectedName: string | null;
}

const ComponentConfigPanel: React.FC<ComponentConfigPanelProps> = ({ selectedName }) => {
  if (!selectedName) {
    return (
      <div className="right-panel-body right-panel-empty">
        <Empty description="请先从组件库选择一个组件" />
      </div>
    );
  }

  return (
    <div className="right-panel-body">
      <Form layout="vertical" className="config-form">
        <Text className="config-title">当前组件：{selectedName}</Text>
        <Form.FormItem label="组件标题">
          <Input value={selectedName} placeholder="请输入组件标题" />
        </Form.FormItem>
        <Form.FormItem label="字段标识">
          <Input placeholder="例如：fieldName" />
        </Form.FormItem>
        <Form.FormItem label="是否必填">
          <Switch />
        </Form.FormItem>
      </Form>
    </div>
  );
};

export default React.memo(ComponentConfigPanel);
