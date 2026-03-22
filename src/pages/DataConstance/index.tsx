import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Card, Drawer, Form, Input, InputNumber, MessagePlugin, Radio, Select, Space, Table, Tag, Textarea } from 'tdesign-react';
import CodeMirror from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';
import { vscodeLight } from '@uiw/codemirror-theme-vscode';
import { useTeam } from '../../team/context';
import WorkspaceModePanel from '../../components/WorkspaceModePanel';
import {
  createDataConstant,
  getDataConstantList,
  type CreateDataConstantPayload,
  type DataConstantRecord,
  type DataConstantValueType,
} from '../../api/dataConstant';
import './style.less';

type ConstantScope = 'personal' | 'team';

interface DrawerDraftState {
  name: string;
  description: string;
  valueType: DataConstantValueType;
  stringValue: string;
  numberValue: number | null;
  booleanValue: boolean;
  jsonValue: string;
}

const VALUE_TYPE_OPTIONS: Array<{ label: string; value: DataConstantValueType }> = [
  { label: 'String', value: 'string' },
  { label: 'Number', value: 'number' },
  { label: 'Boolean', value: 'boolean' },
  { label: 'Object', value: 'object' },
  { label: 'Array', value: 'array' },
];

const createInitialDraft = (): DrawerDraftState => ({
  name: '',
  description: '',
  valueType: 'string',
  stringValue: '',
  numberValue: 0,
  booleanValue: false,
  jsonValue: '{\n  \n}',
});

const resolveScope = (ownerType: DataConstantRecord['ownerType']): ConstantScope => (ownerType === 'team' ? 'team' : 'personal');

const formatDateTime = (value?: string) => {
  if (!value) {
    return '-';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

const stringifyValuePreview = (record: DataConstantRecord) => {
  const { value, valueType } = record;
  if (valueType === 'string') {
    return typeof value === 'string' ? value : String(value ?? '');
  }
  if (valueType === 'number') {
    return typeof value === 'number' ? String(value) : String(Number(value) || 0);
  }
  if (valueType === 'boolean') {
    return value ? 'true' : 'false';
  }

  try {
    return JSON.stringify(value);
  } catch {
    return '[无法序列化]';
  }
};

const DataConstance: React.FC = () => {
  const { workspaceMode, currentTeamId, currentTeam } = useTeam();
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [valueTypeFilter, setValueTypeFilter] = useState<DataConstantValueType | ''>('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [records, setRecords] = useState<DataConstantRecord[]>([]);
  const [draft, setDraft] = useState<DrawerDraftState>(createInitialDraft());

  const ownerType = workspaceMode === 'team' ? 'team' : 'user';
  const scopeLabel = workspaceMode === 'team' ? `团队空间（${currentTeam?.name || currentTeamId}）` : '个人空间';
  const canQuery = ownerType === 'user' || Boolean(currentTeamId);

  const loadData = useCallback(async (nextPage?: number, nextPageSize?: number) => {
    if (!canQuery) {
      setRecords([]);
      setTotal(0);
      return;
    }

    const resolvedPage = nextPage ?? page;
    const resolvedPageSize = nextPageSize ?? pageSize;
    setLoading(true);
    try {
      const result = await getDataConstantList({
        ownerType,
        ownerTeamId: ownerType === 'team' ? currentTeamId || undefined : undefined,
        keyword: keyword.trim() || undefined,
        valueType: valueTypeFilter || undefined,
        page: resolvedPage,
        pageSize: resolvedPageSize,
      });
      setRecords(Array.isArray(result.list) ? result.list : []);
      setTotal(typeof result.total === 'number' ? result.total : 0);
    } finally {
      setLoading(false);
    }
  }, [canQuery, currentTeamId, keyword, ownerType, page, pageSize, valueTypeFilter]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const currentScope = useMemo<ConstantScope>(() => (workspaceMode === 'team' ? 'team' : 'personal'), [workspaceMode]);

  const buildPayload = (): CreateDataConstantPayload | null => {
    const name = draft.name.trim();
    if (!name) {
      MessagePlugin.warning('请先填写常量名称');
      return null;
    }
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
      MessagePlugin.warning('常量名称仅支持字母/数字/下划线，且需以字母或下划线开头');
      return null;
    }

    let value: unknown;
    if (draft.valueType === 'string') {
      value = draft.stringValue;
    } else if (draft.valueType === 'number') {
      if (typeof draft.numberValue !== 'number' || !Number.isFinite(draft.numberValue)) {
        MessagePlugin.warning('Number 类型请输入有效数字');
        return null;
      }
      value = draft.numberValue;
    } else if (draft.valueType === 'boolean') {
      value = draft.booleanValue;
    } else {
      try {
        const parsed = JSON.parse(draft.jsonValue || '');
        if (draft.valueType === 'object') {
          if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
            MessagePlugin.warning('Object 类型请输入 JSON 对象');
            return null;
          }
        }
        if (draft.valueType === 'array' && !Array.isArray(parsed)) {
          MessagePlugin.warning('Array 类型请输入 JSON 数组');
          return null;
        }
        value = parsed;
      } catch {
        MessagePlugin.warning('JSON 格式不正确，请先修正');
        return null;
      }
    }

    return {
      name,
      description: draft.description.trim() || undefined,
      valueType: draft.valueType,
      value,
      ownerType,
      ownerTeamId: ownerType === 'team' ? currentTeamId || undefined : undefined,
    };
  };

  const handleCreate = async () => {
    if (ownerType === 'team' && !currentTeamId) {
      MessagePlugin.warning('当前未选择团队，无法新增团队常量');
      return;
    }

    const payload = buildPayload();
    if (!payload) {
      return;
    }

    setCreating(true);
    try {
      await createDataConstant(payload);
      MessagePlugin.success('常量新增成功');
      setDrawerVisible(false);
      setDraft(createInitialDraft());
      if (page !== 1) {
        setPage(1);
      }
      void loadData(1, pageSize);
    } finally {
      setCreating(false);
    }
  };

  const columns = useMemo(() => ([
    {
      colKey: 'name',
      title: '名称',
      width: 220,
      cell: ({ row }: { row: DataConstantRecord }) => <span className="data-constance-page__name-cell">{row.name}</span>,
    },
    {
      colKey: 'valueType',
      title: '类型',
      width: 120,
      cell: ({ row }: { row: DataConstantRecord }) => (
        <Tag size="small" theme="primary" variant="light-outline">
          {row.valueType}
        </Tag>
      ),
    },
    {
      colKey: 'ownerType',
      title: '空间',
      width: 120,
      cell: ({ row }: { row: DataConstantRecord }) => (
        <Tag size="small" theme={resolveScope(row.ownerType) === 'team' ? 'success' : 'default'} variant="light-outline">
          {resolveScope(row.ownerType) === 'team' ? '团队' : '个人'}
        </Tag>
      ),
    },
    {
      colKey: 'value',
      title: '值预览',
      ellipsis: true,
      cell: ({ row }: { row: DataConstantRecord }) => (
        <span title={stringifyValuePreview(row)}>{stringifyValuePreview(row)}</span>
      ),
    },
    {
      colKey: 'description',
      title: '描述',
      width: 260,
      ellipsis: true,
      cell: ({ row }: { row: DataConstantRecord }) => row.description || '-',
    },
    {
      colKey: 'updatedAt',
      title: '更新时间',
      width: 180,
      cell: ({ row }: { row: DataConstantRecord }) => formatDateTime(row.updatedAt || row.createdAt),
    },
  ]), []);

  if (workspaceMode === 'team' && !currentTeamId) {
    return (
      <WorkspaceModePanel
        title="数据常量"
        description="当前未选择团队，请先在侧边栏空间切换器中选择团队。"
      />
    );
  }

  return (
    <div className="data-constance-page">
      <Card title="常量管理" bordered={false}>
        <div className="data-constance-page__toolbar">
          <Space size={8}>
            <Tag theme={currentScope === 'team' ? 'success' : 'primary'} variant="light-outline">
              {scopeLabel}
            </Tag>
          </Space>

          <Space size={8}>
            <Input
              style={{ width: 240 }}
              clearable
              value={keyword}
              placeholder="按名称或描述搜索"
              onChange={(value) => setKeyword(String(value ?? ''))}
            />
            <Select
              style={{ width: 160 }}
              clearable
              placeholder="类型筛选"
              value={valueTypeFilter || undefined}
              options={VALUE_TYPE_OPTIONS}
              onChange={(value) => setValueTypeFilter((value ? String(value) : '') as DataConstantValueType | '')}
            />
            <Button
              variant="outline"
              onClick={() => {
                setPage(1);
                void loadData(1, pageSize);
              }}
            >
              查询
            </Button>
            <Button
              theme="primary"
              onClick={() => {
                setDraft(createInitialDraft());
                setDrawerVisible(true);
              }}
            >
              新增常量
            </Button>
          </Space>
        </div>

        <Table
          rowKey="id"
          loading={loading}
          data={records}
          columns={columns}
          pagination={{
            current: page,
            pageSize,
            total,
            showJumper: true,
            showPageSize: true,
            pageSizeOptions: [10, 20, 50],
            onCurrentChange: (nextPage: number) => {
              setPage(nextPage);
              void loadData(nextPage, pageSize);
            },
            onPageSizeChange: (nextPageSize: number) => {
              setPage(1);
              setPageSize(nextPageSize);
              void loadData(1, nextPageSize);
            },
          }}
          empty="暂无常量，点击右上角“新增常量”开始创建。"
        />
      </Card>

      <Drawer
        visible={drawerVisible}
        size="600px"
        header="新增常量"
        destroyOnClose
        closeOnOverlayClick={false}
        onClose={() => setDrawerVisible(false)}
        footer={
          <Space>
            <Button variant="outline" onClick={() => setDrawerVisible(false)}>
              取消
            </Button>
            <Button theme="primary" loading={creating} onClick={handleCreate}>
              保存
            </Button>
          </Space>
        }
      >
        <Form labelWidth={96} className="data-constance-page__drawer-form">
          <Form.FormItem label="常量名称" requiredMark>
            <Input
              value={draft.name}
              placeholder="例如：table_mock_users"
              onChange={(value) => setDraft((previous) => ({ ...previous, name: String(value ?? '') }))}
            />
          </Form.FormItem>
          <Form.FormItem label="描述">
            <Textarea
              autosize={{ minRows: 2, maxRows: 4 }}
              value={draft.description}
              placeholder="描述常量用途（选填）"
              onChange={(value) => setDraft((previous) => ({ ...previous, description: String(value ?? '') }))}
            />
          </Form.FormItem>
          <Form.FormItem label="常量类型" requiredMark>
            <Select
              value={draft.valueType}
              options={VALUE_TYPE_OPTIONS}
              onChange={(value) => setDraft((previous) => ({ ...previous, valueType: String(value || 'string') as DataConstantValueType }))}
            />
          </Form.FormItem>

          {draft.valueType === 'string' ? (
            <Form.FormItem label="字符串值" requiredMark>
              <Textarea
                autosize={{ minRows: 4, maxRows: 8 }}
                value={draft.stringValue}
                placeholder="请输入字符串"
                onChange={(value) => setDraft((previous) => ({ ...previous, stringValue: String(value ?? '') }))}
              />
            </Form.FormItem>
          ) : null}

          {draft.valueType === 'number' ? (
            <Form.FormItem label="数字值" requiredMark>
              <InputNumber
                value={draft.numberValue ?? undefined}
                onChange={(value) => setDraft((previous) => ({ ...previous, numberValue: typeof value === 'number' ? value : null }))}
              />
            </Form.FormItem>
          ) : null}

          {draft.valueType === 'boolean' ? (
            <Form.FormItem label="布尔值" requiredMark>
              <Radio.Group
                value={draft.booleanValue ? 'true' : 'false'}
                onChange={(value) => setDraft((previous) => ({ ...previous, booleanValue: value === 'true' }))}
              >
                <Radio value="true">true</Radio>
                <Radio value="false">false</Radio>
              </Radio.Group>
            </Form.FormItem>
          ) : null}

          {draft.valueType === 'object' || draft.valueType === 'array' ? (
            <Form.FormItem label="JSON 值" requiredMark>
              <div className="data-constance-page__json-editor">
                <CodeMirror
                  value={draft.jsonValue}
                  height="260px"
                  theme={vscodeLight}
                  extensions={[json()]}
                  basicSetup={{
                    lineNumbers: true,
                    foldGutter: true,
                    highlightActiveLine: true,
                  }}
                  onChange={(value) => setDraft((previous) => ({ ...previous, jsonValue: value }))}
                />
              </div>
            </Form.FormItem>
          ) : null}
        </Form>
      </Drawer>
    </div>
  );
};

export default DataConstance;