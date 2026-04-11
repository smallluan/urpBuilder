import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Button, Card, Dialog, DialogPlugin, Drawer, Input, InputNumber, MessagePlugin, Pagination, Radio, Select, Space, Table, Tag, Textarea } from 'tdesign-react';
import { AddIcon, SearchIcon } from 'tdesign-icons-react';
import CodeMirrorEditor from '../../builder/components/codeEditor/CodeMirrorEditor';
import { buildCodeMirrorExtensions } from '../../builder/components/codeEditor/buildCodeMirrorExtensions';
import { useTeam } from '../../team/context';
import WorkspaceModePanel from '../../components/WorkspaceModePanel';
import {
  coerceApiDataConstantRecord,
  createDataConstant,
  deleteDataConstant,
  getDataConstantList,
  updateDataConstant,
  type CreateDataConstantPayload,
  type DataConstantRecord,
  type DataConstantValueType,
} from '../../api/dataConstant';
import './style.less';

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

const resolveScope = (ownerType: DataConstantRecord['ownerType']) => (ownerType === 'team' ? 'team' : 'personal');

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

/** 弹窗内完整展示（Object/Array 带缩进） */
const formatFullValuePreview = (record: DataConstantRecord) => {
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
    return JSON.stringify(value, null, 2);
  } catch {
    return '[无法序列化]';
  }
};

const recordToDraft = (record: DataConstantRecord): DrawerDraftState => {
  const base = createInitialDraft();
  base.name = String(record.name ?? '');
  base.description = record.description != null ? String(record.description) : '';
  base.valueType = record.valueType;
  const v = record.value;
  if (record.valueType === 'string') {
    return { ...base, stringValue: typeof v === 'string' ? v : String(v ?? '') };
  }
  if (record.valueType === 'number') {
    return { ...base, numberValue: typeof v === 'number' && Number.isFinite(v) ? v : 0 };
  }
  if (record.valueType === 'boolean') {
    return { ...base, booleanValue: Boolean(v) };
  }
  try {
    const fallback = record.valueType === 'array' ? [] : {};
    return { ...base, jsonValue: JSON.stringify(v ?? fallback, null, 2) };
  } catch {
    return { ...base, jsonValue: record.valueType === 'array' ? '[\n]' : '{\n}' };
  }
};

const DataConstance: React.FC = () => {
  const { workspaceMode, currentTeamId } = useTeam();
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
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewRecord, setPreviewRecord] = useState<DataConstantRecord | null>(null);
  const [drawerFormKey, setDrawerFormKey] = useState(0);
  const hydratedEditSessionRef = useRef<string | null>(null);

  const ownerType = workspaceMode === 'team' ? 'team' : 'user';
  const canQuery = ownerType === 'user' || Boolean(currentTeamId);
  const jsonEditorExtensions = useMemo(() => buildCodeMirrorExtensions({ language: 'json' }), []);

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

  /** 抽屉内表单在部分环境下首帧拿不到 batch 后的 draft；打开编辑时再从列表强制灌入一层 */
  useLayoutEffect(() => {
    if (!drawerVisible) {
      hydratedEditSessionRef.current = null;
      return;
    }
    if (drawerMode !== 'edit' || !editingId) {
      return;
    }
    if (hydratedEditSessionRef.current === editingId) {
      return;
    }
    const row = records.find((r) => r.id === editingId);
    if (!row) {
      return;
    }
    hydratedEditSessionRef.current = editingId;
    setDraft(recordToDraft(coerceApiDataConstantRecord(row)));
  }, [drawerVisible, drawerMode, editingId, records]);

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
          MessagePlugin.warning('Array 类型最外层须为 JSON 数组，例如 [] 或 [{"a":1}]');
          return null;
        }
        value = parsed;
      } catch {
        MessagePlugin.warning(
          '不是合法 JSON。此处使用 JSON.parse，须为标准 JSON：键和字符串都用英文双引号，例如 [{"name":"耳机","prise":300}]；不能写 name: 或 \'单引号\'（那是 JS 对象写法）。',
        );
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

  const handleSave = async () => {
    if (ownerType === 'team' && !currentTeamId) {
      MessagePlugin.warning('当前未选择团队，无法保存团队常量');
      return;
    }

    const payload = buildPayload();
    if (!payload) {
      return;
    }

    setCreating(true);
    try {
      if (drawerMode === 'edit' && editingId) {
        await updateDataConstant(
          editingId,
          {
            name: payload.name,
            description: payload.description,
            valueType: payload.valueType,
            value: payload.value,
          },
          {
            ownerType,
            ownerTeamId: ownerType === 'team' ? currentTeamId || undefined : undefined,
          },
        );
        MessagePlugin.success('常量已保存');
        setDrawerVisible(false);
        setDraft(createInitialDraft());
        setDrawerMode('create');
        setEditingId(null);
        void loadData(page, pageSize);
      } else {
        await createDataConstant(payload);
        MessagePlugin.success('常量新增成功');
        setDrawerVisible(false);
        setDraft(createInitialDraft());
        setDrawerMode('create');
        setEditingId(null);
        if (page !== 1) {
          setPage(1);
        }
        void loadData(1, pageSize);
      }
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = useCallback(
    (row: DataConstantRecord) => {
      if (ownerType === 'team' && !currentTeamId) {
        MessagePlugin.warning('当前未选择团队，无法删除团队常量');
        return;
      }
      const record = coerceApiDataConstantRecord(row);
      const dialog = DialogPlugin.confirm({
        header: '删除常量',
        body: `确定删除常量「${record.name || record.id}」吗？删除后不可恢复。`,
        confirmBtn: { content: '删除', theme: 'danger' },
        cancelBtn: '取消',
        onConfirm: () => {
          dialog.hide();
          void (async () => {
            try {
              await deleteDataConstant(record.id, {
                ownerType,
                ownerTeamId: ownerType === 'team' ? currentTeamId || undefined : undefined,
              });
              MessagePlugin.success('已删除');
              void loadData(page, pageSize);
            } catch {
              /* 错误已由 request 拦截器提示 */
            }
          })();
        },
        onClose: () => {
          dialog.hide();
        },
      });
    },
    [ownerType, currentTeamId, page, pageSize, loadData],
  );

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
    {
      colKey: 'ops',
      title: '操作',
      width: 220,
      fixed: 'right',
      cell: ({ row }: { row: DataConstantRecord }) => (
        <Space size="small">
          <Button
            variant="text"
            size="small"
            theme="primary"
            onClick={() => {
              setPreviewRecord(coerceApiDataConstantRecord(row));
              setPreviewVisible(true);
            }}
          >
            预览
          </Button>
          <Button
            variant="text"
            size="small"
            onClick={() => {
              const full = records.find((r) => r.id === row.id);
              const record = coerceApiDataConstantRecord(full ?? row);
              hydratedEditSessionRef.current = null;
              setDrawerMode('edit');
              setEditingId(record.id);
              setDraft(recordToDraft(record));
              setDrawerFormKey((k) => k + 1);
              setDrawerVisible(true);
            }}
          >
            编辑
          </Button>
          <Button variant="text" size="small" theme="danger" onClick={() => handleDelete(row)}>
            删除
          </Button>
        </Space>
      ),
    },
  ]), [handleDelete, records]);

  if (workspaceMode === 'team' && !currentTeamId) {
    return (
      <WorkspaceModePanel
        title="数据常量"
        description="当前未选择团队，请先在侧边栏空间切换器中选择团队。"
      />
    );
  }

  return (
    <div className="data-constance-page app-shell-page">
      <Card className="data-constance-page__card" bordered={false}>
        <div className="data-constance-page__toolbar toolbar app-shell-page__query">
          <div className="app-shell-page__query-inner app-shell-page__query-inner--stack">
            <div className="toolbar-row toolbar-row--primary">
              <Space align="center">
                <Input
                  style={{ width: 260 }}
                  clearable
                  value={keyword}
                  placeholder="按名称或描述搜索"
                  suffix={<SearchIcon />}
                  onChange={(value) => setKeyword(String(value ?? ''))}
                  onEnter={() => {
                    setPage(1);
                    void loadData(1, pageSize);
                  }}
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
              </Space>
              <div className="primary-actions">
                <Button
                  theme="primary"
                  icon={<AddIcon />}
                  onClick={() => {
                    hydratedEditSessionRef.current = null;
                    setDrawerMode('create');
                    setEditingId(null);
                    setDraft(createInitialDraft());
                    setDrawerFormKey((k) => k + 1);
                    setDrawerVisible(true);
                  }}
                >
                  新增常量
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="data-constance-page__table-panel">
          <div className="data-constance-page__table-scroll">
            <Table
              rowKey="id"
              loading={loading}
              data={records}
              columns={columns}
              size="small"
              bordered={false}
              empty="暂无常量，点击右上角“新增常量”开始创建。"
            />
          </div>
          <div className="data-constance-page__pagination-wrap">
            <Pagination
              current={page}
              pageSize={pageSize}
              total={total}
              showJumper
              showPageSize
              pageSizeOptions={[10, 20, 50]}
              onCurrentChange={(nextPage: number) => {
                setPage(nextPage);
                void loadData(nextPage, pageSize);
              }}
              onPageSizeChange={(nextPageSize: number) => {
                setPage(1);
                setPageSize(nextPageSize);
                void loadData(1, nextPageSize);
              }}
            />
          </div>
        </div>
      </Card>

      <Drawer
        visible={drawerVisible}
        size="600px"
        header={drawerMode === 'edit' ? '编辑常量' : '新增常量'}
        destroyOnClose
        closeOnOverlayClick={false}
        onClose={() => {
          setDrawerVisible(false);
          setDrawerMode('create');
          setEditingId(null);
          setDraft(createInitialDraft());
        }}
        footer={
          <Space>
            <Button
              variant="outline"
              onClick={() => {
                setDrawerVisible(false);
                setDrawerMode('create');
                setEditingId(null);
                setDraft(createInitialDraft());
              }}
            >
              取消
            </Button>
            <Button theme="primary" loading={creating} onClick={handleSave}>
              保存
            </Button>
          </Space>
        }
      >
        {/*
          勿使用 TDesign Form.FormItem 包裹受控 Input/Select：未设置 name 时 FormItem 仍会用内部 formValue
          覆盖子组件的 value（见 FormItem.js cloneElement），导致编辑时名称/类型不回显，而 CodeMirror 不受影响。
        */}
        <div key={drawerFormKey} className="data-constance-page__drawer-form">
          <div className="data-constance-page__field">
            <div className="data-constance-page__field-label">
              <span className="data-constance-page__field-required">*</span>
              常量名称
            </div>
            <div className="data-constance-page__field-body">
              <Input
                value={draft.name}
                placeholder="例如：table_mock_users"
                onChange={(value) => setDraft((previous) => ({ ...previous, name: String(value ?? '') }))}
              />
            </div>
          </div>
          <div className="data-constance-page__field">
            <div className="data-constance-page__field-label">描述</div>
            <div className="data-constance-page__field-body">
              <Textarea
                autosize={{ minRows: 2, maxRows: 4 }}
                value={draft.description}
                placeholder="描述常量用途（选填）"
                onChange={(value) => setDraft((previous) => ({ ...previous, description: String(value ?? '') }))}
              />
            </div>
          </div>
          <div className="data-constance-page__field">
            <div className="data-constance-page__field-label">
              <span className="data-constance-page__field-required">*</span>
              常量类型
            </div>
            <div className="data-constance-page__field-body">
              <Select
                value={draft.valueType}
                options={VALUE_TYPE_OPTIONS}
                popupProps={{ overlayInnerStyle: { zIndex: 6000 } }}
                onChange={(value) => {
                  const vt = String(value || 'string') as DataConstantValueType;
                  setDraft((previous) => {
                    let jsonValue = previous.jsonValue;
                    if (vt === 'array' && previous.valueType !== 'array') {
                      jsonValue = '[\n  \n]';
                    } else if (vt === 'object' && previous.valueType !== 'object') {
                      jsonValue = '{\n  \n}';
                    }
                    return { ...previous, valueType: vt, jsonValue };
                  });
                }}
              />
            </div>
          </div>

          {draft.valueType === 'string' ? (
            <div className="data-constance-page__field">
              <div className="data-constance-page__field-label">
                <span className="data-constance-page__field-required">*</span>
                字符串值
              </div>
              <div className="data-constance-page__field-body">
                <Textarea
                  autosize={{ minRows: 4, maxRows: 8 }}
                  value={draft.stringValue}
                  placeholder="请输入字符串"
                  onChange={(value) => setDraft((previous) => ({ ...previous, stringValue: String(value ?? '') }))}
                />
              </div>
            </div>
          ) : null}

          {draft.valueType === 'number' ? (
            <div className="data-constance-page__field">
              <div className="data-constance-page__field-label">
                <span className="data-constance-page__field-required">*</span>
                数字值
              </div>
              <div className="data-constance-page__field-body">
                <InputNumber
                  value={draft.numberValue ?? undefined}
                  onChange={(value) => setDraft((previous) => ({ ...previous, numberValue: typeof value === 'number' ? value : null }))}
                />
              </div>
            </div>
          ) : null}

          {draft.valueType === 'boolean' ? (
            <div className="data-constance-page__field">
              <div className="data-constance-page__field-label">
                <span className="data-constance-page__field-required">*</span>
                布尔值
              </div>
              <div className="data-constance-page__field-body">
                <Radio.Group
                  value={draft.booleanValue ? 'true' : 'false'}
                  onChange={(value) => setDraft((previous) => ({ ...previous, booleanValue: value === 'true' }))}
                >
                  <Radio value="true">true</Radio>
                  <Radio value="false">false</Radio>
                </Radio.Group>
              </div>
            </div>
          ) : null}

          {draft.valueType === 'object' || draft.valueType === 'array' ? (
            <div className="data-constance-page__field">
              <div className="data-constance-page__field-label">
                <span className="data-constance-page__field-required">*</span>
                JSON 值
              </div>
              <div className="data-constance-page__field-body">
                <div className="data-constance-page__json-editor">
                  <CodeMirrorEditor
                    key={`json-${drawerFormKey}-${editingId ?? 'new'}`}
                    value={draft.jsonValue}
                    height="260px"
                    editorTheme="vscode-light"
                    extensions={jsonEditorExtensions}
                    onChange={(value) => setDraft((previous) => ({ ...previous, jsonValue: value }))}
                  />
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </Drawer>

      <Dialog
        visible={previewVisible}
        header={previewRecord ? `常量值预览 · ${previewRecord.name}` : '常量值预览'}
        width={720}
        destroyOnClose
        footer={(
          <Button
            theme="primary"
            onClick={() => {
              setPreviewVisible(false);
              setPreviewRecord(null);
            }}
          >
            关闭
          </Button>
        )}
        onClose={() => {
          setPreviewVisible(false);
          setPreviewRecord(null);
        }}
      >
        <pre className="data-constance-page__preview-pre">
          {previewRecord ? formatFullValuePreview(previewRecord) : ''}
        </pre>
      </Dialog>
    </div>
  );
};

export default DataConstance;