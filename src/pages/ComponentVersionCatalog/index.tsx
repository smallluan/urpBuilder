import React, { useCallback, useEffect, useState } from 'react';
import { Button, Card, MessagePlugin, Space, Tag, Timeline, Typography } from 'tdesign-react';
import { ArrowLeftIcon } from 'tdesign-icons-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getComponentVersionList } from '../../api/componentTemplate';
import type { ComponentVersionListItem } from '../../api/types';

const { Text, Title } = Typography;

const resolveComponentId = (params: URLSearchParams) => {
  const raw = (params.get('id') || params.get('pageId') || '').trim();
  if (!raw) {
    return '';
  }
  const normalized = raw.toLowerCase();
  if (normalized === 'undefined' || normalized === 'null') {
    return '';
  }
  return raw;
};

const ComponentVersionCatalog: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const componentId = resolveComponentId(searchParams);
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState<ComponentVersionListItem[]>([]);

  const load = useCallback(async () => {
    if (!componentId) {
      setList([]);
      return;
    }
    setLoading(true);
    try {
      const res = await getComponentVersionList(componentId);
      const raw = res.data?.list;
      setList(Array.isArray(raw) ? [...raw].sort((a, b) => a.version - b.version) : []);
    } catch {
      setList([]);
      MessagePlugin.warning('版本目录加载失败（后端可能尚未部署该接口）');
    } finally {
      setLoading(false);
    }
  }, [componentId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!componentId) {
    return (
      <div style={{ padding: 24, maxWidth: 720, margin: '0 auto' }}>
        <Title level="h5">缺少组件 ID</Title>
        <Text>请在 URL 中提供参数 <code>?id=组件ID</code></Text>
        <div style={{ marginTop: 16 }}>
          <Button variant="outline" onClick={() => navigate(-1)}>
            返回
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Space align="center">
          <Button shape="circle" variant="outline" icon={<ArrowLeftIcon />} onClick={() => navigate(-1)} />
          <div>
            <Title level="h5">组件版本目录（只读）</Title>
            <Text style={{ fontSize: 13, color: 'var(--td-text-color-secondary)' }}>ID：{componentId}</Text>
          </div>
        </Space>

        <Card title="已发布版本" bordered>
          {loading ? (
            <Text>加载中…</Text>
          ) : list.length === 0 ? (
            <Text theme="warning">暂无数据。请确认后端已实现 GET /page-template/&#123;id&#125;/versions?entityType=component</Text>
          ) : (
            <Timeline mode="same" layout="vertical" labelAlign="left">
              {list.map((item) => (
                <Timeline.Item
                  key={item.version}
                  label={
                    <Space size={4}>
                      <Text strong>v{item.version}</Text>
                      <Tag size="small" theme="primary">
                        {item.status}
                      </Tag>
                    </Space>
                  }
                >
                  <Text style={{ fontSize: 12, color: 'var(--td-text-color-secondary)', display: 'block' }}>
                    {item.publishedAt ? new Date(item.publishedAt).toLocaleString() : '—'}
                  </Text>
                  <Text style={{ marginTop: 4, display: 'block' }}>
                    {item.versionNote && String(item.versionNote).trim()
                      ? String(item.versionNote)
                      : '（无版本说明）'}
                  </Text>
                </Timeline.Item>
              ))}
            </Timeline>
          )}
        </Card>
      </Space>
    </div>
  );
};

export default ComponentVersionCatalog;
