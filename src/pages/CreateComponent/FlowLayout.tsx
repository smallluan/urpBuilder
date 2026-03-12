import React, { useEffect, useMemo, useState } from 'react';
import { Button, Drawer, Input, InputNumber, Select, Switch, Textarea } from 'tdesign-react';
import { ApiIcon, CodeIcon, UploadIcon } from 'tdesign-icons-react';
import FlowBody from './FlowBody';
import FlowAsideLeft from './components/FlowAsideLeft';
import CodeEditorDialog, { type CodeEditorValue } from './components/CodeEditorDialog';
import DragableWrapper from '../../components/DragableWrapper';
import RightPanelHeader, { type RightPanelMode } from './components/RightPanelHeader';
import { useCreateComponentStore } from './store';
import {
  BODY_TYPE_OPTIONS,
  CODE_LANGUAGE_OPTIONS,
  ERROR_OPTIONS,
  METHOD_OPTIONS,
} from '../../constants/flowBuilder';
import type { EventFilterFormState, NetworkRequestFormState } from '../../types/flow';
import './style.less';

interface CodeNodeFormState extends CodeEditorValue {}

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
  const [eventFilterDraft, setEventFilterDraft] = useState<EventFilterFormState | null>(null);
  const [rightPanelMode, setRightPanelMode] = useState<RightPanelMode>('library');

  const builtinNodes = [
    {
      nodeType: 'eventFilterNode',
      label: '事件过滤节点',
      theme: 'event',
      icon: <ApiIcon />,
    },
    {
      nodeType: 'codeNode',
      label: '代码节点',
      theme: 'code',
      icon: <CodeIcon />,
    },
    {
      nodeType: 'networkRequestNode',
      label: '网络请求节点',
      theme: 'request',
      icon: <UploadIcon />,
    },
  ] as const;

  const handleBuiltinDragStart = (event: React.DragEvent<HTMLDivElement>, data: Record<string, unknown>) => {
    event.dataTransfer?.setData('drag-component-data', JSON.stringify(data));
    event.dataTransfer.effectAllowed = 'copy';
  };

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
    if (!activeFlowNode || activeFlowNode.type !== 'eventFilterNode') {
      setEventFilterDraft(null);
      return;
    }

    const nodeData = (activeFlowNode.data ?? {}) as Record<string, unknown>;
    const availableLifetimes = Array.isArray(nodeData.availableLifetimes)
      ? nodeData.availableLifetimes.map((item) => String(item))
      : [];
    const selectedRaw = Array.isArray(nodeData.selectedLifetimes)
      ? nodeData.selectedLifetimes.map((item) => String(item))
      : [];
    const selectedLifetimes = selectedRaw.filter((item) => availableLifetimes.includes(item));

    setEventFilterDraft({
      label: String(nodeData.label ?? '事件过滤节点'),
      upstreamLabel: String(nodeData.upstreamLabel ?? '-'),
      availableLifetimes,
      selectedLifetimes,
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

  useEffect(() => {
    if (activeFlowNode) {
      setRightPanelMode('config');
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

  const canApplyEventFilterDraft = useMemo(() => {
    if (!activeFlowNode || activeFlowNode.type !== 'eventFilterNode' || !eventFilterDraft) {
      return false;
    }

    const nodeData = (activeFlowNode.data ?? {}) as Record<string, unknown>;
    const availableLifetimes = Array.isArray(nodeData.availableLifetimes)
      ? nodeData.availableLifetimes.map((item) => String(item))
      : [];
    const selectedRaw = Array.isArray(nodeData.selectedLifetimes)
      ? nodeData.selectedLifetimes.map((item) => String(item))
      : [];
    const selectedLifetimes = selectedRaw.filter((item) => availableLifetimes.includes(item));

    const currentComparable = {
      selectedLifetimes,
    };

    const draftComparable = {
      selectedLifetimes: eventFilterDraft.selectedLifetimes,
    };

    return JSON.stringify(currentComparable) !== JSON.stringify(draftComparable);
  }, [activeFlowNode, eventFilterDraft]);

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

  const handleApplyEventFilterDraft = () => {
    if (!activeFlowNode || activeFlowNode.type !== 'eventFilterNode' || !eventFilterDraft) {
      return;
    }

    updateFlowNodeData(
      activeFlowNode.id,
      (previous) => ({
        ...previous,
        selectedLifetimes: eventFilterDraft.selectedLifetimes,
      }),
      '更新事件过滤节点配置',
    );
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
        <RightPanelHeader
          mode={rightPanelMode}
          onChange={setRightPanelMode}
          libraryLabel="内置节点"
          configLabel="节点配置"
        />

        <div className="right-panel-content">
          {rightPanelMode === 'library' ? (
            <div className="right-panel-body">
              <div className="flow-builtins-panel">
                <div className="flow-builtins-header">
                  <div className="flow-builtins-title">内置节点</div>
                </div>
                {builtinNodes.map((item) => (
                  <DragableWrapper
                    key={item.nodeType}
                    data={{ kind: 'builtin-node', nodeType: item.nodeType, label: item.label }}
                    onDragStart={handleBuiltinDragStart}
                  >
                    <div className={`flow-builtins-item flow-builtins-item--${item.theme}`}>
                      <span className="flow-builtins-item__left">
                        <span className={`flow-builtins-item__icon flow-builtins-item__icon--${item.theme}`}>
                          {item.icon}
                        </span>
                        <span className="flow-builtins-item__name">{item.label}</span>
                      </span>
                    </div>
                  </DragableWrapper>
                ))}
              </div>
            </div>
          ) : (
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

              {activeFlowNode.type === 'eventFilterNode' && eventFilterDraft ? (
                <div className="flow-config-panel__group">
                  <div className="flow-config-panel__group-title">事件过滤节点配置</div>

                  <div className="config-row">
                    <span className="config-label">上游节点</span>
                    <span className="config-value" title={eventFilterDraft.upstreamLabel}>{eventFilterDraft.upstreamLabel}</span>
                  </div>

                  <div className="flow-config-field">
                    <div className="flow-config-field__label">监听事件</div>
                    <Select
                      size="small"
                      multiple
                      clearable
                      disabled={eventFilterDraft.availableLifetimes.length === 0}
                      placeholder={eventFilterDraft.availableLifetimes.length === 0 ? '请先连接上游组件节点' : '请选择要监听的事件'}
                      options={eventFilterDraft.availableLifetimes.map((item) => ({
                        label: item,
                        value: item,
                      }))}
                      value={eventFilterDraft.selectedLifetimes}
                      onChange={(value) => {
                        const nextValues = Array.isArray(value)
                          ? value.map((item) => String(item))
                          : (value ? [String(value)] : []);
                        setEventFilterDraft((previous) =>
                          previous
                            ? {
                                ...previous,
                                selectedLifetimes: nextValues,
                              }
                            : previous,
                        );
                      }}
                    />
                  </div>

                  <div className="flow-config-panel__actions">
                    <Button
                      size="small"
                      theme="primary"
                      variant="outline"
                      disabled={!canApplyEventFilterDraft}
                      onClick={handleApplyEventFilterDraft}
                    >
                      应用配置
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
