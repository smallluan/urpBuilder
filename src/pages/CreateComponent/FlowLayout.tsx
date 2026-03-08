import React, { useEffect, useMemo, useState } from 'react';
import { Button, Drawer, Input, InputNumber, Select, Switch, Textarea } from 'tdesign-react';
import FlowBody from './FlowBody';
import FlowAsideLeft from './components/FlowAsideLeft';
import CodeEditorDialog, { type CodeEditorValue } from './components/CodeEditorDialog';
import { useCreateComponentStore } from './store';
import './style.less';

interface NetworkRequestFormState {
  label: string;
  method: string;
  endpoint: string;
  timeoutMs: number;
  responsePath: string;
  bodyType: string;
  body: string;
  onError: string;
  mockEnabled: boolean;
}

interface CodeNodeFormState extends CodeEditorValue {}

const METHOD_OPTIONS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((item) => ({
  label: item,
  value: item,
}));

const BODY_TYPE_OPTIONS = [
  { label: 'none', value: 'none' },
  { label: 'json', value: 'json' },
  { label: 'form-data', value: 'form-data' },
  { label: 'x-www-form-urlencoded', value: 'x-www-form-urlencoded' },
  { label: 'raw', value: 'raw' },
];

const ERROR_OPTIONS = [
  { label: 'throw', value: 'throw' },
  { label: 'continue', value: 'continue' },
  { label: 'useFallback', value: 'useFallback' },
];

const CODE_LANGUAGE_OPTIONS = [
  { label: 'javascript', value: 'javascript' },
  { label: 'typescript', value: 'typescript' },
  { label: 'json', value: 'json' },
  { label: 'css', value: 'css' },
];

const FlowLayout: React.FC = () => {
  const flowNodes = useCreateComponentStore((state) => state.flowNodes);
  const flowEdges = useCreateComponentStore((state) => state.flowEdges);
  const flowActiveNodeId = useCreateComponentStore((state) => state.flowActiveNodeId);
  const updateFlowNodeData = useCreateComponentStore((state) => state.updateFlowNodeData);

  const activeFlowNode = flowNodes.find((item) => item.id === flowActiveNodeId) ?? null;
  const nodeTypeLabelMap: Record<string, string> = {
    componentNode: '组件节点',
    eventFilterNode: '事件过滤节点',
    codeNode: '代码节点',
    networkRequestNode: '网络请求节点',
    annotationNode: '注释节点',
  };

  const activeNodeData = (activeFlowNode?.data ?? {}) as Record<string, unknown>;
  const inputEdgesCount = activeFlowNode
    ? flowEdges.filter((edge) => edge.target === activeFlowNode.id).length
    : 0;
  const outputEdgesCount = activeFlowNode
    ? flowEdges.filter((edge) => edge.source === activeFlowNode.id).length
    : 0;

  const [networkDraft, setNetworkDraft] = useState<NetworkRequestFormState | null>(null);
  const [networkEditorVisible, setNetworkEditorVisible] = useState(false);
  const [codeDraft, setCodeDraft] = useState<CodeNodeFormState | null>(null);
  const [codeEditorVisible, setCodeEditorVisible] = useState(false);

  useEffect(() => {
    if (!activeFlowNode || activeFlowNode.type !== 'networkRequestNode') {
      setNetworkDraft(null);
      return;
    }

    const nodeData = (activeFlowNode.data ?? {}) as Record<string, unknown>;
    setNetworkDraft({
      label: String(nodeData.label ?? '网络请求节点'),
      method: String(nodeData.method ?? 'GET'),
      endpoint: String(nodeData.endpoint ?? '/api/example'),
      timeoutMs: Number(nodeData.timeoutMs ?? 5000),
      responsePath: String(nodeData.responsePath ?? 'ctx.response'),
      bodyType: String(nodeData.bodyType ?? 'none'),
      body: String(nodeData.body ?? ''),
      onError: String(nodeData.onError ?? 'throw'),
      mockEnabled: Boolean(nodeData.mockEnabled),
    });
  }, [activeFlowNode]);

  useEffect(() => {
    if (!activeFlowNode || activeFlowNode.type !== 'codeNode') {
      setCodeDraft(null);
      return;
    }

    const nodeData = (activeFlowNode.data ?? {}) as Record<string, unknown>;
    setCodeDraft({
      label: String(nodeData.label ?? '代码节点'),
      language: String(nodeData.language ?? 'javascript'),
      editorTheme: (String(nodeData.editorTheme ?? 'vscode-dark') === 'vscode-light' ? 'vscode-light' : 'vscode-dark'),
      note: String(nodeData.note ?? ''),
      code: String(nodeData.code ?? ''),
    });
  }, [activeFlowNode]);

  useEffect(() => {
    if (!activeFlowNode || activeFlowNode.type !== 'networkRequestNode') {
      setNetworkEditorVisible(false);
    }
  }, [activeFlowNode]);

  useEffect(() => {
    if (!activeFlowNode || activeFlowNode.type !== 'codeNode') {
      setCodeEditorVisible(false);
    }
  }, [activeFlowNode]);

  const canApplyNetworkDraft = useMemo(() => {
    if (!activeFlowNode || activeFlowNode.type !== 'networkRequestNode' || !networkDraft) {
      return false;
    }

    const nodeData = (activeFlowNode.data ?? {}) as Record<string, unknown>;
    const currentComparable = {
      label: String(nodeData.label ?? '网络请求节点'),
      method: String(nodeData.method ?? 'GET'),
      endpoint: String(nodeData.endpoint ?? '/api/example'),
      timeoutMs: Number(nodeData.timeoutMs ?? 5000),
      responsePath: String(nodeData.responsePath ?? 'ctx.response'),
      bodyType: String(nodeData.bodyType ?? 'none'),
      body: String(nodeData.body ?? ''),
      onError: String(nodeData.onError ?? 'throw'),
      mockEnabled: Boolean(nodeData.mockEnabled),
    };

    return JSON.stringify(currentComparable) !== JSON.stringify(networkDraft);
  }, [activeFlowNode, networkDraft]);

  const canApplyCodeDraft = useMemo(() => {
    if (!activeFlowNode || activeFlowNode.type !== 'codeNode' || !codeDraft) {
      return false;
    }

    const nodeData = (activeFlowNode.data ?? {}) as Record<string, unknown>;
    const currentComparable = {
      label: String(nodeData.label ?? '代码节点'),
      language: String(nodeData.language ?? 'javascript'),
      editorTheme: (String(nodeData.editorTheme ?? 'vscode-dark') === 'vscode-light' ? 'vscode-light' : 'vscode-dark'),
      note: String(nodeData.note ?? ''),
      code: String(nodeData.code ?? ''),
    };

    return JSON.stringify(currentComparable) !== JSON.stringify(codeDraft);
  }, [activeFlowNode, codeDraft]);

  const handleApplyNetworkDraft = () => {
    if (!activeFlowNode || activeFlowNode.type !== 'networkRequestNode' || !networkDraft) {
      return;
    }

    updateFlowNodeData(
      activeFlowNode.id,
      (previous) => ({
        ...previous,
        label: networkDraft.label,
        method: networkDraft.method,
        endpoint: networkDraft.endpoint,
        timeoutMs: networkDraft.timeoutMs,
        responsePath: networkDraft.responsePath,
        bodyType: networkDraft.bodyType,
        body: networkDraft.body,
        onError: networkDraft.onError,
        mockEnabled: networkDraft.mockEnabled,
      }),
      '更新网络请求节点配置',
    );
  };

  const handleApplyCodeDraft = (nextDraft?: CodeNodeFormState) => {
    if (!activeFlowNode || activeFlowNode.type !== 'codeNode') {
      return;
    }

    const resolvedDraft = nextDraft ?? codeDraft;
    if (!resolvedDraft) {
      return;
    }

    updateFlowNodeData(
      activeFlowNode.id,
      (previous) => ({
        ...previous,
        label: resolvedDraft.label,
        language: resolvedDraft.language,
        editorTheme: resolvedDraft.editorTheme,
        note: resolvedDraft.note,
        code: resolvedDraft.code,
      }),
      '更新代码节点配置',
    );

    setCodeDraft(resolvedDraft);
  };

  return (
    <div className="create-body">
      <FlowAsideLeft />

      <main className="main-body">
        <div className="main-inner">
          <FlowBody />
        </div>
      </main>

      <aside className="aside-right">
        <div className="right-panel-body flow-config-panel">
          <div className="flow-config-panel__title">节点配置</div>

          {activeFlowNode ? (
            <div className="config-form">
              <div className="config-row">
                <span className="config-label">节点类型</span>
                <span className="config-value">
                  {nodeTypeLabelMap[activeFlowNode.type ?? ''] ?? activeFlowNode.type ?? '未知'}
                </span>
              </div>

              <div className="config-row">
                <span className="config-label">节点ID</span>
                <span className="config-value" title={activeFlowNode.id}>{activeFlowNode.id}</span>
              </div>

              <div className="config-row">
                <span className="config-label">显示名称</span>
                <span className="config-value">{String(activeNodeData.label ?? activeNodeData.text ?? '-')}</span>
              </div>

              <div className="config-row">
                <span className="config-label">输入连线</span>
                <span className="config-value">{inputEdgesCount}</span>
              </div>

              <div className="config-row">
                <span className="config-label">输出连线</span>
                <span className="config-value">{outputEdgesCount}</span>
              </div>

              {activeFlowNode.type === 'componentNode' ? (
                <div className="flow-config-panel__group">
                  <div className="flow-config-panel__group-title">组件节点信息（只展示）</div>
                  <div className="config-row">
                    <span className="config-label">组件类型</span>
                    <span className="config-value">{String(activeNodeData.componentType ?? '-')}</span>
                  </div>
                  <div className="config-row">
                    <span className="config-label">来源Key</span>
                    <span className="config-value" title={String(activeNodeData.sourceKey ?? '-')}>{String(activeNodeData.sourceKey ?? '-')}</span>
                  </div>
                </div>
              ) : null}

              {activeFlowNode.type === 'networkRequestNode' && networkDraft ? (
                <div className="flow-config-panel__group">
                  <div className="flow-config-panel__group-title">网络请求摘要</div>
                  <div className="config-row">
                    <span className="config-label">Method</span>
                    <span className="config-value">{networkDraft.method}</span>
                  </div>
                  <div className="config-row">
                    <span className="config-label">URL</span>
                    <span className="config-value" title={networkDraft.endpoint}>{networkDraft.endpoint}</span>
                  </div>
                  <div className="config-row">
                    <span className="config-label">超时</span>
                    <span className="config-value">{networkDraft.timeoutMs} ms</span>
                  </div>

                  <div className="flow-config-panel__actions">
                    <Button size="small" theme="primary" variant="outline" onClick={() => setNetworkEditorVisible(true)}>
                      编辑配置
                    </Button>
                  </div>
                </div>
              ) : null}

              {activeFlowNode.type === 'codeNode' && codeDraft ? (
                <div className="flow-config-panel__group">
                  <div className="flow-config-panel__group-title">代码节点配置</div>

                  <div className="flow-config-field">
                    <div className="flow-config-field__label">节点名称</div>
                    <Input
                      size="small"
                      value={codeDraft.label}
                      onChange={(value) =>
                        setCodeDraft((previous) => (previous ? { ...previous, label: String(value ?? '') } : previous))
                      }
                    />
                  </div>

                  <div className="flow-config-field">
                    <div className="flow-config-field__label">语言</div>
                    <Select
                      size="small"
                      options={CODE_LANGUAGE_OPTIONS}
                      value={codeDraft.language}
                      onChange={(value) =>
                        setCodeDraft((previous) => (previous ? { ...previous, language: String(value ?? 'javascript') } : previous))
                      }
                    />
                  </div>

                  <div className="flow-config-field">
                    <div className="flow-config-field__label">备注</div>
                    <Input
                      size="small"
                      value={codeDraft.note}
                      onChange={(value) =>
                        setCodeDraft((previous) => (previous ? { ...previous, note: String(value ?? '') } : previous))
                      }
                    />
                  </div>

                  <div className="config-row">
                    <span className="config-label">代码长度</span>
                    <span className="config-value">{codeDraft.code.length} chars</span>
                  </div>

                  <div className="flow-config-panel__actions">
                    <Button
                      size="small"
                      theme="default"
                      variant="outline"
                      disabled={!canApplyCodeDraft}
                      onClick={() => handleApplyCodeDraft()}
                    >
                      应用配置
                    </Button>
                    <Button size="small" theme="primary" variant="outline" onClick={() => setCodeEditorVisible(true)}>
                      编辑代码
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="right-panel-empty flow-config-panel__empty">
              点击流程节点后，在此展示对应的基础配置。
            </div>
          )}
        </div>

        <Drawer
          visible={networkEditorVisible && !!activeFlowNode && activeFlowNode.type === 'networkRequestNode' && !!networkDraft}
          header="网络请求节点配置"
          placement="right"
          size="440px"
          footer={false}
          onClose={() => setNetworkEditorVisible(false)}
        >
          {networkDraft ? (
            <div className="flow-config-drawer-form">
              <div className="flow-config-drawer-subtitle">配置请求参数、请求体和失败策略。修改后点击“应用配置”生效。</div>

              <div className="flow-config-section">
                <div className="flow-config-section__title">基础信息</div>

                <div className="flow-config-field">
                  <div className="flow-config-field__label">节点名称</div>
                  <Input
                    size="small"
                    value={networkDraft.label}
                    onChange={(value) =>
                      setNetworkDraft((previous) => (previous ? { ...previous, label: String(value ?? '') } : previous))
                    }
                  />
                </div>

                <div className="flow-config-field flow-config-field--inline">
                  <div className="flow-config-field__item">
                    <div className="flow-config-field__label">Method</div>
                    <Select
                      size="small"
                      options={METHOD_OPTIONS}
                      value={networkDraft.method}
                      onChange={(value) =>
                        setNetworkDraft((previous) => (previous ? { ...previous, method: String(value ?? 'GET') } : previous))
                      }
                    />
                  </div>

                  <div className="flow-config-field__item">
                    <div className="flow-config-field__label">超时(ms)</div>
                    <InputNumber
                      size="small"
                      min={100}
                      max={120000}
                      value={networkDraft.timeoutMs}
                      onChange={(value) =>
                        setNetworkDraft((previous) => (previous ? { ...previous, timeoutMs: Number(value ?? 5000) } : previous))
                      }
                    />
                  </div>
                </div>

                <div className="flow-config-field">
                  <div className="flow-config-field__label">URL</div>
                  <Input
                    size="small"
                    value={networkDraft.endpoint}
                    onChange={(value) =>
                      setNetworkDraft((previous) => (previous ? { ...previous, endpoint: String(value ?? '') } : previous))
                    }
                  />
                </div>

                <div className="flow-config-field">
                  <div className="flow-config-field__label">响应路径</div>
                  <Input
                    size="small"
                    value={networkDraft.responsePath}
                    onChange={(value) =>
                      setNetworkDraft((previous) => (previous ? { ...previous, responsePath: String(value ?? '') } : previous))
                    }
                  />
                </div>
              </div>

              <div className="flow-config-section">
                <div className="flow-config-section__title">请求体</div>

                <div className="flow-config-field">
                  <div className="flow-config-field__label">Body类型</div>
                  <Select
                    size="small"
                    options={BODY_TYPE_OPTIONS}
                    value={networkDraft.bodyType}
                    onChange={(value) =>
                      setNetworkDraft((previous) => (previous ? { ...previous, bodyType: String(value ?? 'none') } : previous))
                    }
                  />
                </div>

                <div className="flow-config-field">
                  <div className="flow-config-field__label">Body内容</div>
                  <Textarea
                    value={networkDraft.body}
                    autosize={{ minRows: 3, maxRows: 8 }}
                    disabled={networkDraft.bodyType === 'none'}
                    placeholder={networkDraft.bodyType === 'none' ? '当前 Body 类型不需要内容' : '请输入请求体内容'}
                    onChange={(value) =>
                      setNetworkDraft((previous) => (previous ? { ...previous, body: String(value ?? '') } : previous))
                    }
                  />
                </div>
              </div>

              <div className="flow-config-section">
                <div className="flow-config-section__title">错误处理</div>

                <div className="flow-config-field">
                  <div className="flow-config-field__label">失败策略</div>
                  <Select
                    size="small"
                    options={ERROR_OPTIONS}
                    value={networkDraft.onError}
                    onChange={(value) =>
                      setNetworkDraft((previous) => (previous ? { ...previous, onError: String(value ?? 'throw') } : previous))
                    }
                  />
                </div>

                <div className="flow-config-field flow-config-field--switch">
                  <div className="flow-config-field__label">启用Mock</div>
                  <Switch
                    size="small"
                    value={networkDraft.mockEnabled}
                    onChange={(value) =>
                      setNetworkDraft((previous) => (previous ? { ...previous, mockEnabled: Boolean(value) } : previous))
                    }
                  />
                </div>
              </div>

              <div className="flow-config-drawer-actions">
                <Button
                  size="small"
                  theme="default"
                  variant="outline"
                  onClick={() => setNetworkEditorVisible(false)}
                >
                  取消
                </Button>
                <Button
                  size="small"
                  theme="primary"
                  disabled={!canApplyNetworkDraft}
                  onClick={() => {
                    handleApplyNetworkDraft();
                    setNetworkEditorVisible(false);
                  }}
                >
                  应用配置
                </Button>
              </div>
            </div>
          ) : null}
        </Drawer>

        <CodeEditorDialog
          visible={codeEditorVisible && !!activeFlowNode && activeFlowNode.type === 'codeNode' && !!codeDraft}
          value={
            codeDraft ?? {
              label: '代码节点',
              language: 'javascript',
              editorTheme: 'vscode-dark',
              note: '',
              code: '',
            }
          }
          onClose={() => setCodeEditorVisible(false)}
          onApply={(nextCode) => {
            if (!codeDraft) {
              return;
            }

            const nextDraft = {
              ...codeDraft,
              code: nextCode.code,
              editorTheme: nextCode.editorTheme,
            };

            handleApplyCodeDraft(nextDraft);
            setCodeEditorVisible(false);
          }}
        />
      </aside>
    </div>
  );
};

export default FlowLayout;
