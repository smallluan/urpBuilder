import React, { useCallback, useEffect, useState } from 'react';
import { Button, Form, Input, Table, Textarea, MessagePlugin } from 'tdesign-react';
import type { PrimaryTableCol } from 'tdesign-react/es/table/type';
import { createPlatformBroadcast, listPlatformBroadcasts, type PlatformBroadcastDTO } from '../../api/platformBroadcast';
import { emitApiAlert } from '../../api/alertBus';
import { useAuth } from '../../auth/context';
import '../../styles/app-shell-page.less';
import './style.less';

const isPlatformAdmin = (roles?: string[]) => {
  const roleSet = new Set((roles ?? []).map((item) => item.toLowerCase()));
  return roleSet.has('admin') || roleSet.has('super_admin') || roleSet.has('platform_admin') || roleSet.has('root');
};

const formatTime = (value?: string) => {
  if (!value) return '-';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString('zh-CN', { hour12: false });
};

const AdminBroadcastPage: React.FC = () => {
  const { user } = useAuth();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [rows, setRows] = useState<PlatformBroadcastDTO[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const items = await listPlatformBroadcasts();
      setRows(items);
    } catch {
      emitApiAlert('加载失败', '无法获取广播列表', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSubmit = async () => {
    const valid = await form.validate();
    if (valid !== true) {
      return;
    }
    const values = form.getFieldsValue(true) as { title: string; body: string };
    setSubmitting(true);
    try {
      await createPlatformBroadcast({ title: values.title.trim(), body: values.body.trim() });
      MessagePlugin.success('已发送给全体用户');
      form.reset();
      await load();
    } catch {
      emitApiAlert('发送失败', '请检查权限与网络', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const columns: PrimaryTableCol<PlatformBroadcastDTO>[] = [
    { colKey: 'title', title: '标题', ellipsis: true },
    {
      colKey: 'body',
      title: '摘要',
      ellipsis: true,
      cell: ({ row }) => (row.body.length > 80 ? `${row.body.slice(0, 80)}…` : row.body),
    },
    { colKey: 'createdByName', title: '发送人', width: 120, cell: ({ row }) => row.createdByName || row.createdBy },
    { colKey: 'createdAt', title: '时间', width: 180, cell: ({ row }) => formatTime(row.createdAt) },
  ];

  if (!isPlatformAdmin(user?.roles)) {
    return (
      <div className="app-shell-page admin-broadcast-page">
        <h1 className="app-shell-page__title">系统广播</h1>
        <p className="app-shell-page__lead">仅管理员可访问此页面。</p>
      </div>
    );
  }

  return (
    <div className="app-shell-page admin-broadcast-page">
      <h1 className="app-shell-page__title">系统广播</h1>
      <p className="app-shell-page__lead">向所有登录用户发送一条系统通知，将出现在用户消息中心（未读）。</p>

      <div className="admin-broadcast-page__composer">
        <Form form={form} layout="vertical" className="admin-broadcast-page__form">
          <Form.FormItem label="标题" name="title" rules={[{ required: true, message: '请输入标题' }]}>
            <Input placeholder="简短标题" maxlength={255} showLimitNumber />
          </Form.FormItem>
          <Form.FormItem label="正文" name="body" rules={[{ required: true, message: '请输入正文' }]}>
            <Textarea placeholder="支持多行，用户可在消息中心查看全文" autosize={{ minRows: 5, maxRows: 16 }} />
          </Form.FormItem>
          <Form.FormItem>
            <Button theme="primary" loading={submitting} onClick={() => { void handleSubmit(); }}>
              发送给全体用户
            </Button>
          </Form.FormItem>
        </Form>
      </div>

      <div className="admin-broadcast-page__history">
        <div className="admin-broadcast-page__history-title">已发送记录</div>
        <Table
          rowKey="id"
          loading={loading}
          data={rows}
          columns={columns}
          stripe
          hover
        />
      </div>
    </div>
  );
};

export default AdminBroadcastPage;
