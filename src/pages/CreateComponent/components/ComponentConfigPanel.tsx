import React from 'react';
import { Empty, Form, Input, Switch, Typography } from 'tdesign-react';
import { useCreateComponentStore } from '../store';

const ComponentConfigPanel: React.FC = () => {
  const activeNode = useCreateComponentStore((state) => state.activeNode);
  const selectedName = activeNode?.label;

  if (!activeNode) {
    return (
      <div className="right-panel-body right-panel-empty">
        <Empty description="请先在画布或组件树中选择一个组件" />
      </div>
    );
  }

  return (
    <div className="right-panel-body">
      <Form layout="vertical" className="config-form">
        <Typography.Title level="h6" className="config-title">组件配置</Typography.Title>
        <Form.FormItem label="组件名称">
          <Input value={String(selectedName ?? '')} placeholder="请输入组件名称" />
        </Form.FormItem>
        <Form.FormItem label="组件标题">
          <Input value={String(selectedName ?? '')} placeholder="请输入组件标题" />
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
