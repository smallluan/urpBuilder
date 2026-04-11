import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  Dialog,
  Drawer,
  Empty,
  Form,
  Input,
  InputNumber,
  MessagePlugin,
  Pagination,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Textarea,
} from 'tdesign-react';
import { AddIcon, DeleteIcon, EditIcon, RefreshIcon } from 'tdesign-icons-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTeam } from '../../team/context';
import WorkspaceModePanel from '../../components/WorkspaceModePanel';
import {
  clearCodeWorkbenchResult,
  createCodeWorkbenchSessionId,
  readCodeWorkbenchResult,
  writeCodeWorkbenchPayload,
} from '../../builder/components/codeEditor/workbenchSession';
import {
  createCloudFunction,
  deployCloudFunction,
  getCloudFunctionDetail,
  getCloudFunctionList,
  updateCloudFunction,
  type CloudFunctionRecord,
  type CloudFunctionStatus,
} from '../../api/cloudFunction';
import {
  createDataTable,
  createDataTableField,
  createDataTableRecord,
  deleteDataTable,
  deleteDataTableField,
  deleteDataTableRecord,
  getDataTableDetail,
  getDataTableList,
  getDataTableRecords,
  updateDataTable,
  updateDataTableField,
  updateDataTableRecord,
  type DataTableFieldRecord,
  type DataTableFieldType,
  type DataTableRecord,
  type DataTableRuntimeRecord,
} from '../../api/dataTable';
import type { ResourceOwnerType } from '../../api/types';
import './style.less';

type ConsoleTab = 'table' | 'function';
type FunctionCodeTarget = 'detail' | 'create';

interface TableDraft {
  name: string;
  description: string;
}

interface FieldDraft {
  id?: string;
  name: string;
  type: DataTableFieldType;
  required: boolean;
  description: string;
  defaultValueText: string;
}

interface CreateTableFieldDraft extends FieldDraft {
  tempId: string;
}

interface RecordDraft {
  id?: number;
  jsonText: string;
}

interface FunctionDraft {
  description: string;
  timeoutSeconds: number;
  memorySize: number;
  code: string;
}

const FIELD_TYPE_OPTIONS: Array<{ label: string; value: DataTableFieldType }> = [
  { label: '字符串', value: 'string' },
  { label: '数字', value: 'number' },
  { label: '布尔', value: 'boolean' },
  { label: '对象', value: 'object' },
  { label: '数组', value: 'array' },
  { label: '日期', value: 'date' },
];

const FUNCTION_STATUS_OPTIONS: Array<{ label: string; value: CloudFunctionStatus | '' }> = [
  { label: '全部状态', value: '' },
  { label: '草稿', value: 'draft' },
  { label: '已部署', value: 'deployed' },
  { label: '部署中', value: 'deploying' },
  { label: '部署失败', value: 'failed' },
];

const DEFAULT_FUNCTION_CODE = `exports.main = async (event, context) => {
  // 在这里编写你的业务逻辑
  return {
    success: true,
    message: 'hello cloud',
    event,
    requestId: context?.requestId,
  };
};
`;

const createInitialTableDraft = (): TableDraft => ({ name: '', description: '' });

const createInitialFieldDraft = (): FieldDraft => ({
  name: '',
  type: 'string',
  required: false,
  description: '',
  defaultValueText: '',
});

const createTableFieldDraft = (): CreateTableFieldDraft => ({
  ...createInitialFieldDraft(),
  tempId: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
});

const createTableFieldDraftFromRecord = (field: DataTableFieldRecord): CreateTableFieldDraft => ({
  tempId: `${field.id}_${Date.now()}`,
  id: field.id,
  name: field.name,
  type: field.type,
  required: Boolean(field.required),
  description: field.description || '',
  defaultValueText: stringifyValue(field.defaultValue),
});

const createInitialFunctionCreateDraft = () => ({
  name: '',
  description: '',
  timeoutSeconds: 5,
  memorySize: 256,
  code: DEFAULT_FUNCTION_CODE,
});

const formatDateTime = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

const getFunctionStatusTheme = (status: CloudFunctionStatus) => {
  if (status === 'deployed') return 'success';
  if (status === 'deploying') return 'primary';
  if (status === 'failed') return 'danger';
  return 'warning';
};

const parseFieldDefaultValue = (type: DataTableFieldType, text: string): unknown => {
  const normalized = text.trim();
  if (!normalized) return undefined;
  if (type === 'string' || type === 'date') return normalized;
  if (type === 'number') {
    const parsed = Number(normalized);
    if (!Number.isFinite(parsed)) throw new Error('数字类型默认值不合法');
    return parsed;
  }
  if (type === 'boolean') {
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
    throw new Error('布尔类型默认值仅支持 true 或 false');
  }
  const parsed = JSON.parse(normalized);
  if (type === 'object' && (!parsed || Array.isArray(parsed) || typeof parsed !== 'object')) {
    throw new Error('对象类型默认值必须是 JSON 对象');
  }
  if (type === 'array' && !Array.isArray(parsed)) {
    throw new Error('数组类型默认值必须是 JSON 数组');
  }
  return parsed;
};

const stringifyValue = (value: unknown): string => {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return '';
  }
};

const DataCloudFunction: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { workspaceMode, currentTeamId } = useTeam();
  const ownerType: ResourceOwnerType = workspaceMode === 'team' ? 'team' : 'user';
  const canQuery = ownerType === 'user' || Boolean(currentTeamId);
  const accessContext = useMemo(
    () => ({
      ownerType,
      ownerTeamId: ownerType === 'team' ? currentTeamId || undefined : undefined,
    }),
    [currentTeamId, ownerType],
  );

  const [activeTab, setActiveTab] = useState<ConsoleTab>('table');

  // 一级：数据表列表
  const [tableLoading, setTableLoading] = useState(false);
  const [tableKeyword, setTableKeyword] = useState('');
  const [tablePage, setTablePage] = useState(1);
  const [tablePageSize, setTablePageSize] = useState(12);
  const [tableTotal, setTableTotal] = useState(0);
  const [tables, setTables] = useState<DataTableRecord[]>([]);
  const [activeTableId, setActiveTableId] = useState<string | null>(null);
  const [activeTableDetail, setActiveTableDetail] = useState<DataTableRecord | null>(null);
  const [deletingTable, setDeletingTable] = useState(false);
  const [tableEditVisible, setTableEditVisible] = useState(false);
  const [tableEditing, setTableEditing] = useState(false);
  const [tableEditDraft, setTableEditDraft] = useState<TableDraft>(createInitialTableDraft());
  const [tableEditFields, setTableEditFields] = useState<CreateTableFieldDraft[]>([]);

  // 新建表（一次性建表+字段）
  const [tableCreateVisible, setTableCreateVisible] = useState(false);
  const [creatingTable, setCreatingTable] = useState(false);
  const [tableCreateDraft, setTableCreateDraft] = useState<TableDraft>(createInitialTableDraft());
  const [tableCreateFields, setTableCreateFields] = useState<CreateTableFieldDraft[]>([createTableFieldDraft()]);

  // 二级：当前表内部模块（仅数据记录）
  const [recordLoading, setRecordLoading] = useState(false);
  const [records, setRecords] = useState<DataTableRuntimeRecord[]>([]);
  const [recordPage, setRecordPage] = useState(1);
  const [recordPageSize, setRecordPageSize] = useState(20);
  const [recordTotal, setRecordTotal] = useState(0);
  const [recordDialogVisible, setRecordDialogVisible] = useState(false);
  const [recordSaving, setRecordSaving] = useState(false);
  const [recordDeletingId, setRecordDeletingId] = useState<number | null>(null);
  const [recordDraft, setRecordDraft] = useState<RecordDraft>({ jsonText: '{\n  \n}' });

  // 云函数
  const [functionLoading, setFunctionLoading] = useState(false);
  const [functionKeyword, setFunctionKeyword] = useState('');
  const [functionStatus, setFunctionStatus] = useState<CloudFunctionStatus | ''>('');
  const [functionPage, setFunctionPage] = useState(1);
  const [functionPageSize, setFunctionPageSize] = useState(12);
  const [functionTotal, setFunctionTotal] = useState(0);
  const [functions, setFunctions] = useState<CloudFunctionRecord[]>([]);
  const [activeFunctionId, setActiveFunctionId] = useState<string | null>(null);
  const [activeFunctionDetail, setActiveFunctionDetail] = useState<CloudFunctionRecord | null>(null);
  const [functionDraft, setFunctionDraft] = useState<FunctionDraft | null>(null);
  const [savingFunction, setSavingFunction] = useState(false);
  const [deployingFunction, setDeployingFunction] = useState(false);
  const [functionCreateDrawerVisible, setFunctionCreateDrawerVisible] = useState(false);
  const [creatingFunction, setCreatingFunction] = useState(false);
  const [functionCreateDraft, setFunctionCreateDraft] = useState(createInitialFunctionCreateDraft());

  const [detailEditorTheme, setDetailEditorTheme] = useState<'vscode-dark' | 'vscode-light'>('vscode-dark');
  const [createEditorTheme, setCreateEditorTheme] = useState<'vscode-dark' | 'vscode-light'>('vscode-dark');
  const [pendingWorkbenchSessionId, setPendingWorkbenchSessionId] = useState('');

  const loadTables = useCallback(async (nextPage?: number, nextPageSize?: number) => {
    if (!canQuery) {
      setTables([]);
      setTableTotal(0);
      setActiveTableId(null);
      return;
    }
    const resolvedPage = nextPage ?? tablePage;
    const resolvedPageSize = nextPageSize ?? tablePageSize;
    setTableLoading(true);
    try {
      const result = await getDataTableList({
        ownerType,
        ownerTeamId: ownerType === 'team' ? currentTeamId || undefined : undefined,
        keyword: tableKeyword.trim() || undefined,
        page: resolvedPage,
        pageSize: resolvedPageSize,
      });
      const list = Array.isArray(result.list) ? result.list : [];
      setTables(list);
      setTableTotal(typeof result.total === 'number' ? result.total : list.length);
      if (!list.length) {
        setActiveTableId(null);
      } else if (!activeTableId || !list.some((item) => item.id === activeTableId)) {
        setActiveTableId(list[0].id);
      }
    } finally {
      setTableLoading(false);
    }
  }, [activeTableId, canQuery, currentTeamId, ownerType, tableKeyword, tablePage, tablePageSize]);

  const loadTableDetail = useCallback(async (tableId: string) => {
    if (!tableId) {
      setActiveTableDetail(null);
      return;
    }
    const detail = await getDataTableDetail(tableId, accessContext);
    setActiveTableDetail(detail);
  }, [accessContext]);

  const loadRecords = useCallback(async (tableId: string, nextPage?: number, nextPageSize?: number) => {
    if (!tableId) {
      setRecords([]);
      setRecordTotal(0);
      return;
    }
    const resolvedPage = nextPage ?? recordPage;
    const resolvedPageSize = nextPageSize ?? recordPageSize;
    setRecordLoading(true);
    try {
      const result = await getDataTableRecords(tableId, {
        ...accessContext,
        page: resolvedPage,
        pageSize: resolvedPageSize,
      });
      setRecords(Array.isArray(result.list) ? result.list : []);
      setRecordTotal(typeof result.total === 'number' ? result.total : 0);
    } finally {
      setRecordLoading(false);
    }
  }, [accessContext, recordPage, recordPageSize]);

  useEffect(() => {
    void loadTables();
  }, [loadTables]);

  useEffect(() => {
    if (!activeTableId) {
      setActiveTableDetail(null);
      setRecords([]);
      setRecordTotal(0);
      return;
    }
    setRecordPage(1);
    void loadTableDetail(activeTableId);
    void loadRecords(activeTableId, 1, recordPageSize);
  }, [activeTableId, loadRecords, loadTableDetail, recordPageSize]);

  const loadFunctions = useCallback(async (nextPage?: number, nextPageSize?: number) => {
    if (!canQuery) {
      setFunctions([]);
      setFunctionTotal(0);
      setActiveFunctionId(null);
      return;
    }
    const resolvedPage = nextPage ?? functionPage;
    const resolvedPageSize = nextPageSize ?? functionPageSize;
    setFunctionLoading(true);
    try {
      const result = await getCloudFunctionList({
        ownerType,
        ownerTeamId: ownerType === 'team' ? currentTeamId || undefined : undefined,
        keyword: functionKeyword.trim() || undefined,
        status: functionStatus || undefined,
        page: resolvedPage,
        pageSize: resolvedPageSize,
      });
      const list = Array.isArray(result.list) ? result.list : [];
      setFunctions(list);
      setFunctionTotal(typeof result.total === 'number' ? result.total : list.length);
      if (!list.length) {
        setActiveFunctionId(null);
      } else if (!activeFunctionId || !list.some((item) => item.id === activeFunctionId)) {
        setActiveFunctionId(list[0].id);
      }
    } finally {
      setFunctionLoading(false);
    }
  }, [activeFunctionId, canQuery, currentTeamId, functionKeyword, functionPage, functionPageSize, functionStatus, ownerType]);

  const loadFunctionDetail = useCallback(async (functionId: string) => {
    if (!functionId) {
      setActiveFunctionDetail(null);
      setFunctionDraft(null);
      return;
    }
    const detail = await getCloudFunctionDetail(functionId, accessContext);
    setActiveFunctionDetail(detail);
    setFunctionDraft({
      description: detail.description || '',
      timeoutSeconds: typeof detail.timeoutSeconds === 'number' ? detail.timeoutSeconds : 5,
      memorySize: typeof detail.memorySize === 'number' ? detail.memorySize : 256,
      code: detail.code || DEFAULT_FUNCTION_CODE,
    });
  }, [accessContext]);

  useEffect(() => {
    void loadFunctions();
  }, [loadFunctions]);

  useEffect(() => {
    if (!activeFunctionId) {
      setActiveFunctionDetail(null);
      setFunctionDraft(null);
      return;
    }
    void loadFunctionDetail(activeFunctionId);
  }, [activeFunctionId, loadFunctionDetail]);

  const recordColumns = useMemo(() => {
    const schemaFields = Array.isArray(activeTableDetail?.fields) ? activeTableDetail.fields : [];
    return [
      { colKey: 'id', title: 'ID', width: 80 },
      ...schemaFields.map((field) => ({
        colKey: field.name,
        title: field.name,
        cell: ({ row }: { row: DataTableRuntimeRecord }) => stringifyValue(row.data?.[field.name]) || '-',
      })),
      {
        colKey: 'updatedAt',
        title: '更新时间',
        width: 170,
        cell: ({ row }: { row: DataTableRuntimeRecord }) => formatDateTime(row.updatedAt),
      },
      {
        colKey: 'actions',
        title: '操作',
        width: 140,
        fixed: 'right' as const,
        cell: ({ row }: { row: DataTableRuntimeRecord }) => (
          <Space size={4}>
            <Button
              size="small"
              variant="text"
              icon={<EditIcon />}
              onClick={() => {
                setRecordDraft({ id: row.id, jsonText: JSON.stringify(row.data ?? {}, null, 2) });
                setRecordDialogVisible(true);
              }}
            >
              编辑
            </Button>
            <Button
              size="small"
              variant="text"
              theme="danger"
              icon={<DeleteIcon />}
              loading={recordDeletingId === row.id}
              onClick={async () => {
                if (!activeTableDetail?.id) return;
                if (!window.confirm(`确认删除记录 #${row.id} 吗？`)) return;
                setRecordDeletingId(row.id);
                try {
                  await deleteDataTableRecord(activeTableDetail.id, row.id, accessContext);
                  MessagePlugin.success('记录已删除');
                  await loadRecords(activeTableDetail.id, recordPage, recordPageSize);
                  void loadTables();
                } finally {
                  setRecordDeletingId(null);
                }
              }}
            />
          </Space>
        ),
      },
    ];
  }, [accessContext, activeTableDetail?.fields, activeTableDetail?.id, loadRecords, loadTables, recordDeletingId, recordPage, recordPageSize]);

  const editTableFieldColumns = useMemo(() => ([
    {
      colKey: 'name',
      title: '字段名',
      width: 170,
      cell: ({ row }: { row: CreateTableFieldDraft }) => (
        <Input
          value={row.name}
          onChange={(value) =>
            setTableEditFields((previous) =>
              previous.map((item) => (item.tempId === row.tempId ? { ...item, name: String(value ?? '') } : item)),
            )
          }
        />
      ),
    },
    {
      colKey: 'type',
      title: '字段类型',
      width: 140,
      cell: ({ row }: { row: CreateTableFieldDraft }) => (
        <Select
          value={row.type}
          options={FIELD_TYPE_OPTIONS}
          onChange={(value) =>
            setTableEditFields((previous) =>
              previous.map((item) => (item.tempId === row.tempId ? { ...item, type: String(value || 'string') as DataTableFieldType } : item)),
            )
          }
        />
      ),
    },
    {
      colKey: 'required',
      title: '必填',
      width: 90,
      cell: ({ row }: { row: CreateTableFieldDraft }) => (
        <Switch
          value={row.required}
          onChange={(checked) =>
            setTableEditFields((previous) =>
              previous.map((item) => (item.tempId === row.tempId ? { ...item, required: Boolean(checked) } : item)),
            )
          }
        />
      ),
    },
    {
      colKey: 'defaultValueText',
      title: '默认值',
      width: 180,
      cell: ({ row }: { row: CreateTableFieldDraft }) => (
        <Input
          value={row.defaultValueText}
          onChange={(value) =>
            setTableEditFields((previous) =>
              previous.map((item) => (item.tempId === row.tempId ? { ...item, defaultValueText: String(value ?? '') } : item)),
            )
          }
        />
      ),
    },
    {
      colKey: 'description',
      title: '字段说明',
      cell: ({ row }: { row: CreateTableFieldDraft }) => (
        <Input
          value={row.description}
          onChange={(value) =>
            setTableEditFields((previous) =>
              previous.map((item) => (item.tempId === row.tempId ? { ...item, description: String(value ?? '') } : item)),
            )
          }
        />
      ),
    },
    {
      colKey: 'actions',
      title: '操作',
      width: 80,
      cell: ({ row }: { row: CreateTableFieldDraft }) => (
        <Button
          theme="danger"
          variant="text"
          onClick={() =>
            setTableEditFields((previous) => {
              if (previous.length <= 1) return previous;
              return previous.filter((item) => item.tempId !== row.tempId);
            })
          }
        >
          删除
        </Button>
      ),
    },
  ]), []);

  const createTableFieldColumns = useMemo(() => ([
    {
      colKey: 'name',
      title: '字段名',
      width: 180,
      cell: ({ row }: { row: CreateTableFieldDraft }) => (
        <Input
          value={row.name}
          placeholder="例如：username"
          onChange={(value) =>
            setTableCreateFields((previous) => previous.map((item) => (item.tempId === row.tempId ? { ...item, name: String(value ?? '') } : item)))
          }
        />
      ),
    },
    {
      colKey: 'type',
      title: '字段类型',
      width: 160,
      cell: ({ row }: { row: CreateTableFieldDraft }) => (
        <Select
          value={row.type}
          options={FIELD_TYPE_OPTIONS}
          onChange={(value) =>
            setTableCreateFields((previous) =>
              previous.map((item) => (item.tempId === row.tempId ? { ...item, type: String(value || 'string') as DataTableFieldType } : item)),
            )
          }
        />
      ),
    },
    {
      colKey: 'required',
      title: '必填',
      width: 90,
      cell: ({ row }: { row: CreateTableFieldDraft }) => (
        <Switch
          value={row.required}
          onChange={(checked) =>
            setTableCreateFields((previous) => previous.map((item) => (item.tempId === row.tempId ? { ...item, required: Boolean(checked) } : item)))
          }
        />
      ),
    },
    {
      colKey: 'defaultValueText',
      title: '默认值',
      cell: ({ row }: { row: CreateTableFieldDraft }) => (
        <Input
          value={row.defaultValueText}
          placeholder="true / 123 / JSON / 文本"
          onChange={(value) =>
            setTableCreateFields((previous) =>
              previous.map((item) => (item.tempId === row.tempId ? { ...item, defaultValueText: String(value ?? '') } : item)),
            )
          }
        />
      ),
    },
    {
      colKey: 'actions',
      title: '操作',
      width: 80,
      cell: ({ row }: { row: CreateTableFieldDraft }) => (
        <Button
          theme="danger"
          variant="text"
          onClick={() => {
            setTableCreateFields((previous) => {
              if (previous.length <= 1) return previous;
              return previous.filter((item) => item.tempId !== row.tempId);
            });
          }}
        >
          删除
        </Button>
      ),
    },
  ]), []);

  const openCreateTableDrawer = () => {
    setTableCreateDraft(createInitialTableDraft());
    setTableCreateFields([createTableFieldDraft()]);
    setTableCreateVisible(true);
  };

  const handleCreateTable = async () => {
    const tableName = tableCreateDraft.name.trim();
    if (!tableName) {
      MessagePlugin.warning('请填写数据表名称');
      return;
    }
    if (!/^[a-zA-Z][a-zA-Z0-9_]{1,63}$/.test(tableName)) {
      MessagePlugin.warning('数据表名称需以字母开头，仅支持字母/数字/下划线，长度 2-64');
      return;
    }
    const validRows = tableCreateFields.map((row) => ({ ...row, name: row.name.trim() })).filter((row) => Boolean(row.name));
    if (!validRows.length) {
      MessagePlugin.warning('请至少配置一个字段');
      return;
    }

    const parsedFields: Array<{
      name: string;
      type: DataTableFieldType;
      required: boolean;
      description?: string;
      defaultValue?: unknown;
    }> = [];

    try {
      for (const row of validRows) {
        if (!/^[a-zA-Z][a-zA-Z0-9_]{1,63}$/.test(row.name)) {
          throw new Error(`字段名「${row.name}」格式不合法`);
        }
        const parsedDefault = parseFieldDefaultValue(row.type, row.defaultValueText);
        parsedFields.push({
          name: row.name,
          type: row.type,
          required: row.required,
          description: row.description.trim() || undefined,
          defaultValue: parsedDefault,
        });
      }
    } catch (error) {
      MessagePlugin.warning((error as Error).message);
      return;
    }

    setCreatingTable(true);
    try {
      const created = await createDataTable({
        name: tableName,
        description: tableCreateDraft.description.trim() || undefined,
        ownerType,
        ownerTeamId: ownerType === 'team' ? currentTeamId || undefined : undefined,
      });

      for (const field of parsedFields) {
        await createDataTableField(
          created.id,
          {
            name: field.name,
            type: field.type,
            required: field.required,
            description: field.description,
            defaultValue: field.defaultValue,
          },
          accessContext,
        );
      }

      MessagePlugin.success('数据表创建成功');
      setTableCreateVisible(false);
      setTablePage(1);
      await loadTables(1, tablePageSize);
      setActiveTableId(created.id);
    } finally {
      setCreatingTable(false);
    }
  };

  const handleOpenTableEdit = () => {
    if (!activeTableDetail) return;
    setTableEditDraft({
      name: activeTableDetail.name || '',
      description: activeTableDetail.description || '',
    });
    const rows = (Array.isArray(activeTableDetail.fields) ? activeTableDetail.fields : []).map((field) => createTableFieldDraftFromRecord(field));
    setTableEditFields(rows.length ? rows : [createTableFieldDraft()]);
    setTableEditVisible(true);
  };

  const handleSaveTableEdit = async () => {
    if (!activeTableDetail?.id || tableEditing) return;
    const tableName = tableEditDraft.name.trim();
    if (!tableName) {
      MessagePlugin.warning('数据表名称不能为空');
      return;
    }
    if (!/^[a-zA-Z][a-zA-Z0-9_]{1,63}$/.test(tableName)) {
      MessagePlugin.warning('数据表名称需以字母开头，仅支持字母/数字/下划线，长度 2-64');
      return;
    }

    const validRows = tableEditFields.map((row) => ({ ...row, name: row.name.trim() })).filter((row) => Boolean(row.name));
    if (!validRows.length) {
      MessagePlugin.warning('请至少保留一个字段');
      return;
    }

    const parsedRows: Array<CreateTableFieldDraft & { parsedDefault: unknown }> = [];
    try {
      for (const row of validRows) {
        if (!/^[a-zA-Z][a-zA-Z0-9_]{1,63}$/.test(row.name)) {
          throw new Error(`字段名「${row.name}」格式不合法`);
        }
        parsedRows.push({
          ...row,
          parsedDefault: parseFieldDefaultValue(row.type, row.defaultValueText),
        });
      }
    } catch (error) {
      MessagePlugin.warning((error as Error).message);
      return;
    }

    setTableEditing(true);
    try {
      await updateDataTable(
        activeTableDetail.id,
        {
          name: tableName,
          description: tableEditDraft.description.trim() || undefined,
        },
        accessContext,
      );

      const existingFields = Array.isArray(activeTableDetail.fields) ? activeTableDetail.fields : [];
      const existingIds = new Set(existingFields.map((item) => item.id));
      const currentIds = new Set(parsedRows.filter((item) => item.id).map((item) => item.id as string));

      for (const oldField of existingFields) {
        if (!currentIds.has(oldField.id)) {
          await deleteDataTableField(activeTableDetail.id, oldField.id, accessContext);
        }
      }

      for (const row of parsedRows) {
        const payload = {
          name: row.name,
          type: row.type,
          required: row.required,
          description: row.description.trim() || undefined,
          defaultValue: row.parsedDefault,
        };
        if (row.id && existingIds.has(row.id)) {
          await updateDataTableField(activeTableDetail.id, row.id, payload, accessContext);
        } else {
          await createDataTableField(activeTableDetail.id, payload, accessContext);
        }
      }

      MessagePlugin.success('数据表已更新');
      setTableEditVisible(false);
      await loadTableDetail(activeTableDetail.id);
      void loadTables();
    } finally {
      setTableEditing(false);
    }
  };

  const handleDeleteTable = async () => {
    if (!activeTableDetail?.id || deletingTable) return;
    if (!window.confirm(`确认删除数据表「${activeTableDetail.name}」吗？`)) return;
    setDeletingTable(true);
    try {
      await deleteDataTable(activeTableDetail.id, accessContext);
      MessagePlugin.success('数据表已删除');
      await loadTables();
    } finally {
      setDeletingTable(false);
    }
  };


  const handleSaveRecord = async () => {
    if (!activeTableDetail?.id || recordSaving) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(recordDraft.jsonText);
    } catch {
      MessagePlugin.warning('记录数据必须是合法 JSON');
      return;
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      MessagePlugin.warning('记录数据必须是 JSON 对象');
      return;
    }
    setRecordSaving(true);
    try {
      if (recordDraft.id) {
        await updateDataTableRecord(
          activeTableDetail.id,
          recordDraft.id,
          { data: parsed as Record<string, unknown> },
          accessContext,
        );
        MessagePlugin.success('记录更新成功');
      } else {
        await createDataTableRecord(
          activeTableDetail.id,
          { data: parsed as Record<string, unknown> },
          accessContext,
        );
        MessagePlugin.success('记录创建成功');
      }
      setRecordDialogVisible(false);
      setRecordDraft({ jsonText: '{\n  \n}' });
      setRecordPage(1);
      await loadRecords(activeTableDetail.id, 1, recordPageSize);
      void loadTables();
    } finally {
      setRecordSaving(false);
    }
  };

  const openFunctionCodeWorkbench = (target: FunctionCodeTarget) => {
    const sessionId = createCodeWorkbenchSessionId();
    const targetFileId = target === 'create' ? 'create' : 'detail';
    const fallbackName = targetFileId === 'create'
      ? (functionCreateDraft.name.trim() || 'new-cloud-function')
      : (activeFunctionDetail?.name || 'cloud-function');
    const fileName = `${fallbackName}.js`;
    const code = target === 'create' ? functionCreateDraft.code : (functionDraft?.code ?? DEFAULT_FUNCTION_CODE);
    const editorTheme = target === 'create' ? createEditorTheme : detailEditorTheme;

    writeCodeWorkbenchPayload({
      sessionId,
      returnTo: `${location.pathname}${location.search}`,
      title: targetFileId === 'create' ? '初始化函数代码工作台' : '云函数代码工作台',
      context: 'cloud-function',
      files: [{
        id: targetFileId,
        path: fileName,
        code,
        language: 'javascript',
        editorTheme,
      }],
      activeFileId: targetFileId,
    });
    setPendingWorkbenchSessionId(sessionId);
    const workbenchUrl = `${window.location.origin}/code-workbench?sid=${encodeURIComponent(sessionId)}`;
    const opened = window.open(workbenchUrl, '_blank');
    if (!opened) {
      MessagePlugin.warning('无法打开新窗口，请在浏览器中允许本站弹窗后重试');
    }
  };

  const applyWorkbenchResult = React.useCallback((sessionId: string) => {
    const normalizedSessionId = String(sessionId ?? '').trim();
    if (!normalizedSessionId) {
      return;
    }
    const result = readCodeWorkbenchResult(normalizedSessionId);
    const file = result?.files?.[0];
    if (!result?.applied || !file) {
      return;
    }

    const nextTheme = file.editorTheme === 'vscode-light' ? 'vscode-light' : 'vscode-dark';
    if (file.id === 'create') {
      setFunctionCreateDraft((previous) => ({ ...previous, code: file.code }));
      setCreateEditorTheme(nextTheme);
    } else {
      setFunctionDraft((previous) => (previous ? { ...previous, code: file.code } : previous));
      setDetailEditorTheme(nextTheme);
    }

    MessagePlugin.success('应用成功');

    clearCodeWorkbenchResult(normalizedSessionId);
    if (pendingWorkbenchSessionId === normalizedSessionId) {
      setPendingWorkbenchSessionId('');
    }
  }, [pendingWorkbenchSessionId]);

  useEffect(() => {
    const navState = (location.state ?? {}) as {
      codeWorkbenchSessionId?: string;
      codeWorkbenchApplied?: boolean;
    };
    const sessionId = typeof navState.codeWorkbenchSessionId === 'string' ? navState.codeWorkbenchSessionId.trim() : '';
    if (sessionId && navState.codeWorkbenchApplied === true) {
      applyWorkbenchResult(sessionId);
    }
    if (sessionId) {
      navigate({ pathname: location.pathname, search: location.search }, { replace: true, state: null });
    }
  }, [applyWorkbenchResult, location.pathname, location.search, location.state, navigate]);

  useEffect(() => {
    if (!pendingWorkbenchSessionId) {
      return;
    }
    const onStorage = (event: StorageEvent) => {
      if (!event.key || !event.key.endsWith(pendingWorkbenchSessionId)) {
        return;
      }
      applyWorkbenchResult(pendingWorkbenchSessionId);
    };
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('storage', onStorage);
    };
  }, [applyWorkbenchResult, pendingWorkbenchSessionId]);

  const saveFunctionDraft = async (showSuccessMessage = true) => {
    if (!activeFunctionDetail?.id || !functionDraft || savingFunction) return null;
    setSavingFunction(true);
    try {
      const updated = await updateCloudFunction(
        activeFunctionDetail.id,
        {
          description: functionDraft.description.trim() || undefined,
          runtime: 'nodejs22',
          timeoutSeconds: functionDraft.timeoutSeconds,
          memorySize: functionDraft.memorySize,
          code: functionDraft.code,
        },
        accessContext,
      );
      setActiveFunctionDetail(updated);
      if (showSuccessMessage) {
        MessagePlugin.success('云函数已保存');
      }
      void loadFunctions();
      return updated;
    } finally {
      setSavingFunction(false);
    }
  };

  const handleSaveFunction = async () => {
    await saveFunctionDraft(true);
  };

  const handleDeployFunction = async () => {
    if (!activeFunctionDetail?.id || deployingFunction || savingFunction) return;
    setDeployingFunction(true);
    try {
      const saved = await saveFunctionDraft(false);
      if (!saved?.id) {
        return;
      }
      await deployCloudFunction(saved.id, accessContext);
      MessagePlugin.success('部署任务已提交');
      void loadFunctions();
      void loadFunctionDetail(saved.id);
    } finally {
      setDeployingFunction(false);
    }
  };

  const handleCreateFunction = async () => {
    if (creatingFunction) return;
    const functionName = functionCreateDraft.name.trim();
    if (!functionName) {
      MessagePlugin.warning('请填写云函数名称');
      return;
    }
    if (!/^[a-zA-Z][a-zA-Z0-9_-]{1,63}$/.test(functionName)) {
      MessagePlugin.warning('函数名称需以字母开头，支持字母/数字/-/_，长度 2-64');
      return;
    }
    setCreatingFunction(true);
    try {
      const created = await createCloudFunction({
        name: functionName,
        description: functionCreateDraft.description.trim() || undefined,
        runtime: 'nodejs22',
        timeoutSeconds: functionCreateDraft.timeoutSeconds,
        memorySize: functionCreateDraft.memorySize,
        code: functionCreateDraft.code,
        ownerType,
        ownerTeamId: ownerType === 'team' ? currentTeamId || undefined : undefined,
      });
      MessagePlugin.success('云函数创建成功');
      setFunctionCreateDrawerVisible(false);
      setFunctionCreateDraft(createInitialFunctionCreateDraft());
      setFunctionPage(1);
      await loadFunctions(1, functionPageSize);
      setActiveFunctionId(created.id);
    } finally {
      setCreatingFunction(false);
    }
  };

  if (workspaceMode === 'team' && !currentTeamId) {
    return (
      <WorkspaceModePanel
        title="云开发控制台"
        description="当前未选择团队，请先在侧边栏空间切换器中选择团队。"
      />
    );
  }

  return (
    <div className="data-cloud-function-page app-shell-page">
      <Tabs className="data-cloud-function-page__tabs" value={activeTab} onChange={(value) => setActiveTab(String(value) as ConsoleTab)}>
        <Tabs.TabPanel value="table" label="数据表管理" destroyOnHide={false}>
          <div className="data-cloud-function-page__workspace">
            <aside className="console-sider">
              <div className="console-sider__toolbar app-shell-page__query">
                <div className="app-shell-page__query-inner app-shell-page__query-inner--stack">
                  <Input
                    size="small"
                    clearable
                    value={tableKeyword}
                    placeholder="搜索数据表"
                    onChange={(value) => setTableKeyword(String(value ?? ''))}
                    onEnter={() => {
                      setTablePage(1);
                      void loadTables(1, tablePageSize);
                    }}
                  />
                  <Space size={8}>
                    <Button size="small" variant="outline" icon={<RefreshIcon />} onClick={() => void loadTables()}>
                      刷新
                    </Button>
                    <Button size="small" theme="primary" icon={<AddIcon />} onClick={openCreateTableDrawer}>
                      新建数据表
                    </Button>
                  </Space>
                </div>
              </div>

              <div
                className={`console-sider__list${!tableLoading && !tables.length ? ' console-sider__list--empty' : ''}`}
              >
                {!tableLoading && !tables.length ? <Empty description="当前空间暂无数据表" /> : null}
                {tables.map((item) => (
                  <div
                    key={item.id}
                    className={`console-list-item${item.id === activeTableId ? ' is-active' : ''}`}
                    onClick={() => setActiveTableId(item.id)}
                  >
                    <div className="console-list-item__title">{item.name}</div>
                    <div className="console-list-item__meta">
                      <span>字段 {item.fieldCount ?? 0}</span>
                      <span>记录 {item.recordCount ?? 0}</span>
                      <span>{formatDateTime(item.updatedAt)}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="console-sider__pagination">
                <Pagination
                  size="small"
                  current={tablePage}
                  pageSize={tablePageSize}
                  total={tableTotal}
                  // showJumper
                  // showPageSize
                  // pageSizeOptions={[12, 24, 48]}
                  onCurrentChange={(nextPage) => {
                    setTablePage(nextPage);
                    void loadTables(nextPage, tablePageSize);
                  }}
                  onPageSizeChange={(nextPageSize) => {
                    setTablePage(1);
                    setTablePageSize(nextPageSize);
                    void loadTables(1, nextPageSize);
                  }}
                />
              </div>
            </aside>

            <section className="console-main">
              {!activeTableDetail ? (
                <div className="console-main__empty">
                  <Empty description="请先在左侧选择一个数据表，或新建数据表" />
                </div>
              ) : (
                <>
                  <div className="console-main__header">
                    <h3>{activeTableDetail.name}</h3>
                    <Space>
                      <Button variant="outline" loading={tableEditing} onClick={handleOpenTableEdit}>修改表</Button>
                      <Button theme="danger" variant="outline" loading={deletingTable} onClick={handleDeleteTable}>删除数据表</Button>
                    </Space>
                  </div>
                  <div className="console-main__section-head">
                    <h4>数据记录</h4>
                    <Button
                      theme="primary"
                      size="small"
                      icon={<AddIcon />}
                      onClick={() => {
                        setRecordDraft({ jsonText: '{\n  \n}' });
                        setRecordDialogVisible(true);
                      }}
                    >
                      新增记录
                    </Button>
                  </div>

                  <div className="console-main__table-wrap">
                    <Table
                      rowKey="id"
                      loading={recordLoading}
                      data={records}
                      columns={recordColumns}
                      empty="当前数据表暂无记录"
                      maxHeight="100%"
                    />
                  </div>

                  <div className="console-main__pager">
                    <Pagination
                      size="small"
                      current={recordPage}
                      pageSize={recordPageSize}
                      total={recordTotal}
                      showJumper
                      showPageSize
                      pageSizeOptions={[20, 50, 100]}
                      onCurrentChange={(nextPage) => {
                        if (!activeTableDetail?.id) return;
                        setRecordPage(nextPage);
                        void loadRecords(activeTableDetail.id, nextPage, recordPageSize);
                      }}
                      onPageSizeChange={(nextPageSize) => {
                        if (!activeTableDetail?.id) return;
                        setRecordPage(1);
                        setRecordPageSize(nextPageSize);
                        void loadRecords(activeTableDetail.id, 1, nextPageSize);
                      }}
                    />
                  </div>
                </>
              )}
            </section>
          </div>
        </Tabs.TabPanel>

        <Tabs.TabPanel value="function" label="云函数管理" destroyOnHide={false}>
          <div className="data-cloud-function-page__workspace">
            <aside className="console-sider">
              <div className="console-sider__toolbar app-shell-page__query">
                <div className="app-shell-page__query-inner app-shell-page__query-inner--stack">
                  <Input
                    size="small"
                    clearable
                    value={functionKeyword}
                    placeholder="搜索云函数"
                    onChange={(value) => setFunctionKeyword(String(value ?? ''))}
                    onEnter={() => {
                      setFunctionPage(1);
                      void loadFunctions(1, functionPageSize);
                    }}
                  />
                  <Space>
                    <Select
                      size="small"
                      style={{ width: 140 }}
                      value={functionStatus || undefined}
                      options={FUNCTION_STATUS_OPTIONS}
                      onChange={(value) => setFunctionStatus((value ? String(value) : '') as CloudFunctionStatus | '')}
                    />
                    <Button size="small" variant="outline" icon={<RefreshIcon />} onClick={() => void loadFunctions()}>刷新</Button>
                    <Button
                      size="small"
                      theme="primary"
                      icon={<AddIcon />}
                      onClick={() => {
                        setFunctionCreateDraft(createInitialFunctionCreateDraft());
                        setFunctionCreateDrawerVisible(true);
                      }}
                    >
                      新建函数
                    </Button>
                  </Space>
                </div>
              </div>

              <div
                className={`console-sider__list${!functionLoading && !functions.length ? ' console-sider__list--empty' : ''}`}
              >
                {!functionLoading && !functions.length ? <Empty description="当前空间暂无云函数" /> : null}
                {functions.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    className={`console-list-item${item.id === activeFunctionId ? ' is-active' : ''}`}
                    onClick={() => setActiveFunctionId(item.id)}
                  >
                    <div className="console-list-item__title">{item.name}</div>
                    <div className="console-list-item__meta">
                      <Tag size="small" theme={getFunctionStatusTheme(item.status)} variant="light">{item.status}</Tag>
                      <span>Node.js 22</span>
                      <span>{formatDateTime(item.updatedAt)}</span>
                    </div>
                  </button>
                ))}
              </div>

              <div className="console-sider__pagination">
                <Pagination
                  size="small"
                  current={functionPage}
                  pageSize={functionPageSize}
                  total={functionTotal}
                  // showJumper
                  // showPageSize
                  // pageSizeOptions={[12, 24, 48]}
                  onCurrentChange={(nextPage) => {
                    setFunctionPage(nextPage);
                    void loadFunctions(nextPage, functionPageSize);
                  }}
                  onPageSizeChange={(nextPageSize) => {
                    setFunctionPage(1);
                    setFunctionPageSize(nextPageSize);
                    void loadFunctions(1, nextPageSize);
                  }}
                />
              </div>
            </aside>

            <section className="console-main">
              {!activeFunctionId || !activeFunctionDetail || !functionDraft ? (
                <div className="console-main__empty">
                  <Empty description="请选择一个云函数，或点击“新建函数”" />
                </div>
              ) : (
                <>
                  <div className="console-main__header">
                    <div>
                      <h3>{activeFunctionDetail.name}</h3>
                      <div className="console-main__sub">
                        <Tag size="small" theme={getFunctionStatusTheme(activeFunctionDetail.status)} variant="light">{activeFunctionDetail.status}</Tag>
                        <span>运行环境：Node.js 22</span>
                        <span>更新时间：{formatDateTime(activeFunctionDetail.updatedAt)}</span>
                      </div>
                    </div>
                    <Space>
                      <Button variant="outline" loading={savingFunction} onClick={handleSaveFunction}>保存配置</Button>
                      <Button theme="primary" loading={deployingFunction} onClick={handleDeployFunction}>发布上线</Button>
                    </Space>
                  </div>

                  <div className="console-main__meta">
                    <Form layout="inline">
                      <Form.FormItem label="超时(s)">
                        <InputNumber
                          value={functionDraft.timeoutSeconds}
                          min={1}
                          max={60}
                          onChange={(value) => setFunctionDraft((previous) => (previous ? { ...previous, timeoutSeconds: typeof value === 'number' ? value : 5 } : previous))}
                        />
                      </Form.FormItem>
                      <Form.FormItem label="内存(MB)">
                        <InputNumber
                          value={functionDraft.memorySize}
                          min={128}
                          max={3072}
                          step={128}
                          onChange={(value) => setFunctionDraft((previous) => (previous ? { ...previous, memorySize: typeof value === 'number' ? value : 256 } : previous))}
                        />
                      </Form.FormItem>
                      <Form.FormItem label="描述">
                        <Input
                          style={{ width: 360 }}
                          value={functionDraft.description}
                          onChange={(value) => setFunctionDraft((previous) => (previous ? { ...previous, description: String(value ?? '') } : previous))}
                        />
                      </Form.FormItem>
                    </Form>
                  </div>

                  <div className="console-main__code-panel">
                    <div className="console-main__code-panel-head">
                      <span>函数代码</span>
                      <Button onClick={() => openFunctionCodeWorkbench('detail')}>打开代码工作台</Button>
                    </div>
                    <div className="console-main__code-panel-meta">
                      <span>代码长度：{functionDraft.code.length} chars</span>
                      <span>复用代码节点编辑器，支持全屏、主题、自动补全、撤销重做</span>
                    </div>
                  </div>
                </>
              )}
            </section>
          </div>
        </Tabs.TabPanel>
      </Tabs>

      <Dialog
        visible={recordDialogVisible}
        width="760px"
        header={recordDraft.id ? `编辑记录 #${recordDraft.id}` : '新增记录'}
        closeOnOverlayClick={false}
        onClose={() => {
          setRecordDialogVisible(false);
          setRecordDraft({ jsonText: '{\n  \n}' });
        }}
        onConfirm={handleSaveRecord}
        confirmBtn={{
          content: recordDraft.id ? '保存记录' : '创建记录',
          loading: recordSaving,
        }}
        cancelBtn="取消"
      >
        <Form labelWidth={0}>
          <Form.FormItem>
            <Textarea
              className="record-json-editor"
              value={recordDraft.jsonText}
              autosize={{ minRows: 14, maxRows: 18 }}
              onChange={(value) => setRecordDraft((previous) => ({ ...previous, jsonText: String(value ?? '') }))}
            />
          </Form.FormItem>
        </Form>
      </Dialog>

      <Drawer
        visible={tableCreateVisible}
        size="980px"
        header="新建数据表"
        closeOnOverlayClick={false}
        onClose={() => setTableCreateVisible(false)}
        footer={(
          <Space>
            <Button variant="outline" onClick={() => setTableCreateVisible(false)}>取消</Button>
            <Button theme="primary" loading={creatingTable} onClick={handleCreateTable}>创建完整数据表</Button>
          </Space>
        )}
      >
        <Form className="create-table-form" labelWidth={98}>
          <Form.FormItem label="数据表名称" requiredMark>
            <Input
              value={tableCreateDraft.name}
              placeholder="例如：user_profile"
              onChange={(value) => setTableCreateDraft((previous) => ({ ...previous, name: String(value ?? '') }))}
            />
          </Form.FormItem>
          <Form.FormItem label="描述">
            <Textarea
              autosize={{ minRows: 2, maxRows: 4 }}
              value={tableCreateDraft.description}
              onChange={(value) => setTableCreateDraft((previous) => ({ ...previous, description: String(value ?? '') }))}
            />
          </Form.FormItem>
          <Form.FormItem label="字段列表" requiredMark>
            <div className="create-table-fields">
              <div className="create-table-fields__toolbar">
                <Button
                  size="small"
                  icon={<AddIcon />}
                  onClick={() => setTableCreateFields((previous) => [...previous, createTableFieldDraft()])}
                >
                  新增字段行
                </Button>
              </div>
              <Table
                rowKey="tempId"
                data={tableCreateFields}
                columns={createTableFieldColumns}
                maxHeight="360px"
              />
            </div>
          </Form.FormItem>
        </Form>
      </Drawer>

      <Dialog
        visible={tableEditVisible}
        width="1080px"
        header="修改数据表"
        closeOnOverlayClick={false}
        onClose={() => setTableEditVisible(false)}
        onConfirm={handleSaveTableEdit}
        confirmBtn={{
          content: '保存修改',
          loading: tableEditing,
        }}
        cancelBtn="取消"
      >
        <Form className="create-table-form" labelWidth={98}>
          <Form.FormItem label="数据表名称" requiredMark>
            <Input
              value={tableEditDraft.name}
              onChange={(value) => setTableEditDraft((previous) => ({ ...previous, name: String(value ?? '') }))}
            />
          </Form.FormItem>
          <Form.FormItem label="描述">
            <Textarea
              autosize={{ minRows: 2, maxRows: 4 }}
              value={tableEditDraft.description}
              onChange={(value) => setTableEditDraft((previous) => ({ ...previous, description: String(value ?? '') }))}
            />
          </Form.FormItem>
          <Form.FormItem label="字段配置" requiredMark>
            <div className="create-table-fields">
              <div className="create-table-fields__toolbar">
                <Button
                  size="small"
                  icon={<AddIcon />}
                  onClick={() => setTableEditFields((previous) => [...previous, createTableFieldDraft()])}
                >
                  新增字段行
                </Button>
              </div>
              <Table
                rowKey="tempId"
                data={tableEditFields}
                columns={editTableFieldColumns}
                maxHeight="360px"
              />
            </div>
          </Form.FormItem>
        </Form>
      </Dialog>

      <Drawer
        visible={functionCreateDrawerVisible}
        size="680px"
        header="新建云函数"
        closeOnOverlayClick={false}
        onClose={() => setFunctionCreateDrawerVisible(false)}
        footer={(
          <Space>
            <Button variant="outline" onClick={() => setFunctionCreateDrawerVisible(false)}>取消</Button>
            <Button theme="primary" loading={creatingFunction} onClick={handleCreateFunction}>创建函数</Button>
          </Space>
        )}
      >
        <Form labelWidth={110} className="console-create-form">
          <Form.FormItem label="函数名称" requiredMark>
            <Input
              value={functionCreateDraft.name}
              placeholder="例如：getUserProfile"
              onChange={(value) => setFunctionCreateDraft((previous) => ({ ...previous, name: String(value ?? '') }))}
            />
          </Form.FormItem>
          <Form.FormItem label="运行环境">
            <Tag theme="primary" variant="light-outline">Node.js 22</Tag>
          </Form.FormItem>
          <Form.FormItem label="超时(s)">
            <InputNumber
              value={functionCreateDraft.timeoutSeconds}
              min={1}
              max={60}
              onChange={(value) => setFunctionCreateDraft((previous) => ({ ...previous, timeoutSeconds: typeof value === 'number' ? value : 5 }))}
            />
          </Form.FormItem>
          <Form.FormItem label="内存(MB)">
            <InputNumber
              value={functionCreateDraft.memorySize}
              min={128}
              max={3072}
              step={128}
              onChange={(value) => setFunctionCreateDraft((previous) => ({ ...previous, memorySize: typeof value === 'number' ? value : 256 }))}
            />
          </Form.FormItem>
          <Form.FormItem label="描述">
            <Textarea
              autosize={{ minRows: 2, maxRows: 4 }}
              value={functionCreateDraft.description}
              onChange={(value) => setFunctionCreateDraft((previous) => ({ ...previous, description: String(value ?? '') }))}
            />
          </Form.FormItem>
          <Form.FormItem label="函数代码">
            <div className="console-create-form__code-brief">
              <span>当前代码长度：{functionCreateDraft.code.length} chars</span>
              <Button size="small" variant="outline" onClick={() => openFunctionCodeWorkbench('create')}>编辑初始化代码</Button>
            </div>
          </Form.FormItem>
        </Form>
      </Drawer>

    </div>
  );
};

export default DataCloudFunction;
