import React, { useEffect, useMemo, useState } from 'react';
import { Button, Drawer, Input, InputNumber, MessagePlugin, Select, Switch, Textarea } from 'tdesign-react';
import { ApiIcon, CodeIcon, UploadIcon } from 'tdesign-icons-react';
import { useLocation, useNavigate } from 'react-router-dom';
import FlowBody from './FlowBody';
import FlowAsideLeft from '../components/FlowAsideLeft';
import { BuilderAsideResizeHandle } from '../components/BuilderWorkbenchChrome';
import type { CodeEditorValue } from '../components/codeEditor/codeEditorTypes';
import DragableWrapper from '../../components/DragableWrapper';
import { applyBuilderDragPreview } from '../utils/dragPreview';
import RightPanelHeader, { type RightPanelMode } from '../components/RightPanelHeader';
import { useBuilderAccess, useBuilderContext } from '../context/BuilderContext';
import { useBuilderThemeStore } from '../theme/builderThemeStore';
import {
  BODY_TYPE_OPTIONS,
  CODE_LANGUAGE_OPTIONS,
  ERROR_OPTIONS,
  METHOD_OPTIONS,
} from '../../constants/flowBuilder';
import {
  clearCodeWorkbenchResult,
  createCodeWorkbenchSessionId,
  readCodeWorkbenchResult,
  writeCodeWorkbenchPayload,
} from '../components/codeEditor/workbenchSession';
import {
  buildFlowCodeNodeSourceTemplate,
  deriveCodeNodeDraftFields,
  FLOW_CODE_NODE_SHELL_REPAIRED_MESSAGE,
  isFlowCodeNodeWrappedSource,
  normalizeFlowCodeNodeSource,
  resolveCodeNodeNoteForPersist,
  setLeadingBlockComment,
} from '../components/codeEditor/flowCodeNodeSource';
import { buildDynamicCompletionContextFromUiTree } from '../components/codeEditor/dynamicCompletions';
import type {
  EventFilterFormState,
  LifecycleExposeNodeFormState,
  NetworkRequestFormState,
  PropExposeNodeFormState,
  TimerNodeFormState,
} from '../../types/flow';

interface CodeNodeFormState extends CodeEditorValue {}

const FlowLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { useStore } = useBuilderContext();
  const { readOnly, readOnlyReason } = useBuilderAccess();
  const colorMode = useBuilderThemeStore((s) => s.colorMode);
  const codeMirrorDefaultTheme = colorMode === 'dark' ? 'vscode-dark' : 'vscode-light';
  const activeFlowNode = useStore((state) => {
    const id = state.flowActiveNodeId;
    if (!id) {
      return null;
    }
    return state.flowNodes.find((item) => item.id === id) ?? null;
  });
  const inputEdgesCount = useStore((state) => {
    const id = state.flowActiveNodeId;
    if (!id) {
      return 0;
    }
    let count = 0;
    for (const edge of state.flowEdges) {
      if (edge.target === id) {
        count += 1;
      }
    }
    return count;
  });
  const outputEdgesCount = useStore((state) => {
    const id = state.flowActiveNodeId;
    if (!id) {
      return 0;
    }
    let count = 0;
    for (const edge of state.flowEdges) {
      if (edge.source === id) {
        count += 1;
      }
    }
    return count;
  });
  const updateFlowNodeData = useStore((state) => state.updateFlowNodeData);
  const flowNodes = useStore((state) => state.flowNodes);
  const uiPageData = useStore((state) => state.uiPageData);
  const builderRightAsideWidthPx = useStore((state) => state.builderFlowRightAsideWidthPx);
  const builderRightAsideCollapsed = useStore((state) => state.builderFlowRightAsideCollapsed);
  const nodeTypeLabelMap: Record<string, string> = {
    componentNode: '组件节点',
    eventFilterNode: '事件过滤节点',
    codeNode: '代码节点',
    networkRequestNode: '网络请求节点',
    timerNode: '定时器节点',
    propExposeNode: '属性暴露节点',
    lifecycleExposeNode: '生命周期暴露节点',
    annotationNode: '注释节点',
  };

  const activeNodeData = (activeFlowNode?.data ?? {}) as Record<string, unknown>;

  const [networkDraft, setNetworkDraft] = useState<NetworkRequestFormState | null>(null);
  const [networkEditorVisible, setNetworkEditorVisible] = useState(false);
  const [codeDraft, setCodeDraft] = useState<CodeNodeFormState | null>(null);
  const [eventFilterDraft, setEventFilterDraft] = useState<EventFilterFormState | null>(null);
  const [timerDraft, setTimerDraft] = useState<TimerNodeFormState | null>(null);
  const [propExposeDraft, setPropExposeDraft] = useState<PropExposeNodeFormState | null>(null);
  const [propAliasDrawerVisible, setPropAliasDrawerVisible] = useState(false);
  const [lifecycleExposeDraft, setLifecycleExposeDraft] = useState<LifecycleExposeNodeFormState | null>(null);
  const [lifecycleAliasDrawerVisible, setLifecycleAliasDrawerVisible] = useState(false);
  const [rightPanelMode, setRightPanelMode] = useState<RightPanelMode>('library');
  const [pendingWorkbenchSessionId, setPendingWorkbenchSessionId] = useState('');

  const dynamicCompletionContext = useMemo(() => {
    return buildDynamicCompletionContextFromUiTree(uiPageData, 'root');
  }, [uiPageData]);

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
    {
      nodeType: 'timerNode',
      label: '定时器节点',
      theme: 'timer',
      icon: <span>⏱</span>,
    },
    {
      nodeType: 'propExposeNode',
      label: '属性暴露节点',
      theme: 'event',
      icon: <span>🔌</span>,
    },
    {
      nodeType: 'lifecycleExposeNode',
      label: '生命周期暴露节点',
      theme: 'code',
      icon: <span>📤</span>,
    },
  ] as const;

  const handleBuiltinDragStart = (event: React.DragEvent<HTMLDivElement>, data: Record<string, unknown>) => {
    if (readOnly) {
      return;
    }

    applyBuilderDragPreview(event, {
      kind: 'flow-builtin',
      title: String(data.label ?? '节点'),
      flowBuiltinTheme: String(data.theme ?? 'event'),
      flowNodeType: String(data.nodeType ?? ''),
    });
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
    const rawCode = String(nodeData.code ?? '');
    const noteFromData = String(nodeData.note ?? '');
    const { note, code } = deriveCodeNodeDraftFields(rawCode, noteFromData);
    setCodeDraft({
      label: String(nodeData.label ?? '代码节点'),
      language: String(nodeData.language ?? 'javascript'),
      editorTheme:
        String(nodeData.editorTheme ?? codeMirrorDefaultTheme) === 'vscode-light' ? 'vscode-light' : 'vscode-dark',
      note,
      code,
    });
  }, [activeFlowNode, codeMirrorDefaultTheme]);

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
    if (!activeFlowNode || activeFlowNode.type !== 'timerNode') {
      setTimerDraft(null);
      return;
    }

    const nodeData = (activeFlowNode.data ?? {}) as Record<string, unknown>;
    setTimerDraft({
      label: String(nodeData.label ?? '定时器节点'),
      intervalMs: Math.max(100, Number(nodeData.intervalMs ?? 1000)),
    });
  }, [activeFlowNode]);

  useEffect(() => {
    if (!activeFlowNode || activeFlowNode.type !== 'propExposeNode') {
      setPropExposeDraft(null);
      return;
    }

    const nodeData = (activeFlowNode.data ?? {}) as Record<string, unknown>;
    const availablePropKeys = Array.isArray(nodeData.availablePropKeys)
      ? nodeData.availablePropKeys.map((item) => String(item)).filter(Boolean)
      : [];
    const selectedRaw = Array.isArray(nodeData.selectedPropKeys)
      ? nodeData.selectedPropKeys.map((item) => String(item)).filter(Boolean)
      : [];
    const selectedPropKeys = selectedRaw.filter((item) => availablePropKeys.includes(item));

    const selectedMappings = Array.isArray(nodeData.selectedMappings)
      ? (nodeData.selectedMappings as Array<Record<string, unknown>>).map((m) => ({
          sourcePropKey: String(m?.sourcePropKey ?? ''),
          alias: typeof m?.alias === 'string' ? String(m?.alias) : undefined,
          displayName: typeof m?.displayName === 'string' ? String(m?.displayName) : undefined,
        })).filter((m) => Boolean(m.sourcePropKey))
      : selectedPropKeys.map((k) => ({ sourcePropKey: k, alias: undefined, displayName: undefined }));

    setPropExposeDraft({
      label: String(nodeData.label ?? '属性暴露节点'),
      sourceLabel: String(nodeData.sourceLabel ?? '-'),
      availablePropKeys,
      selectedPropKeys,
      selectedMappings,
    });
  }, [activeFlowNode]);

  useEffect(() => {
    if (!activeFlowNode || activeFlowNode.type !== 'lifecycleExposeNode') {
      setLifecycleExposeDraft(null);
      return;
    }

    const nodeData = (activeFlowNode.data ?? {}) as Record<string, unknown>;
    const availableLifetimes = Array.isArray(nodeData.availableLifetimes)
      ? nodeData.availableLifetimes.map((item) => String(item)).filter(Boolean)
      : [];
    const selectedRaw = Array.isArray(nodeData.selectedLifetimes)
      ? nodeData.selectedLifetimes.map((item) => String(item)).filter(Boolean)
      : [];
    const selectedLifetimes = selectedRaw.filter((item) => availableLifetimes.includes(item));
    const selectedMappings = Array.isArray(nodeData.selectedMappings)
      ? (nodeData.selectedMappings as Array<Record<string, unknown>>)
        .map((item) => ({
          sourceLifetime: String(item.sourceLifetime ?? ''),
          alias: typeof item.alias === 'string' ? String(item.alias) : undefined,
        }))
        .filter((item) => Boolean(item.sourceLifetime))
      : selectedLifetimes.map((item) => ({ sourceLifetime: item, alias: undefined }));

    setLifecycleExposeDraft({
      label: String(nodeData.label ?? '生命周期暴露节点'),
      upstreamLabel: String(nodeData.upstreamLabel ?? '-'),
      availableLifetimes,
      selectedLifetimes,
      selectedMappings,
    });
  }, [activeFlowNode]);

  useEffect(() => {
    if (!activeFlowNode || activeFlowNode.type !== 'networkRequestNode') {
      setNetworkEditorVisible(false);
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
      editorTheme:
        String(nodeData.editorTheme ?? codeMirrorDefaultTheme) === 'vscode-light' ? 'vscode-light' : 'vscode-dark',
      note: String(nodeData.note ?? ''),
      code: String(nodeData.code ?? ''),
    };

    return JSON.stringify(currentComparable) !== JSON.stringify(codeDraft);
  }, [activeFlowNode, codeDraft, codeMirrorDefaultTheme]);

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

  const canApplyTimerDraft = useMemo(() => {
    if (!activeFlowNode || activeFlowNode.type !== 'timerNode' || !timerDraft) {
      return false;
    }

    const nodeData = (activeFlowNode.data ?? {}) as Record<string, unknown>;
    const currentComparable = {
      label: String(nodeData.label ?? '定时器节点'),
      intervalMs: Math.max(100, Number(nodeData.intervalMs ?? 1000)),
    };

    return JSON.stringify(currentComparable) !== JSON.stringify(timerDraft);
  }, [activeFlowNode, timerDraft]);

  const canApplyPropExposeDraft = useMemo(() => {
    if (!activeFlowNode || activeFlowNode.type !== 'propExposeNode' || !propExposeDraft) {
      return false;
    }

    const nodeData = (activeFlowNode.data ?? {}) as Record<string, unknown>;
    const availablePropKeys = Array.isArray(nodeData.availablePropKeys)
      ? nodeData.availablePropKeys.map((item) => String(item)).filter(Boolean)
      : [];
    const selectedRaw = Array.isArray(nodeData.selectedPropKeys)
      ? nodeData.selectedPropKeys.map((item) => String(item)).filter(Boolean)
      : [];
    const selectedPropKeys = selectedRaw.filter((item) => availablePropKeys.includes(item));

    const currentComparable = {
      label: String(nodeData.label ?? '属性暴露节点'),
      selectedPropKeys,
      selectedMappings: Array.isArray(nodeData.selectedMappings) ? nodeData.selectedMappings : undefined,
    };

    const draftComparable = {
      label: propExposeDraft.label,
      selectedPropKeys: propExposeDraft.selectedPropKeys,
      selectedMappings: propExposeDraft.selectedMappings,
    };

    return JSON.stringify(currentComparable) !== JSON.stringify(draftComparable);
  }, [activeFlowNode, propExposeDraft]);

  const canApplyLifecycleExposeDraft = useMemo(() => {
    if (!activeFlowNode || activeFlowNode.type !== 'lifecycleExposeNode' || !lifecycleExposeDraft) {
      return false;
    }

    const nodeData = (activeFlowNode.data ?? {}) as Record<string, unknown>;
    const availableLifetimes = Array.isArray(nodeData.availableLifetimes)
      ? nodeData.availableLifetimes.map((item) => String(item)).filter(Boolean)
      : [];
    const selectedRaw = Array.isArray(nodeData.selectedLifetimes)
      ? nodeData.selectedLifetimes.map((item) => String(item)).filter(Boolean)
      : [];
    const selectedLifetimes = selectedRaw.filter((item) => availableLifetimes.includes(item));

    const currentComparable = {
      label: String(nodeData.label ?? '生命周期暴露节点'),
      selectedLifetimes,
    };

    const draftComparable = {
      label: lifecycleExposeDraft.label,
      selectedLifetimes: lifecycleExposeDraft.selectedLifetimes,
      selectedMappings: lifecycleExposeDraft.selectedMappings,
    };

    return JSON.stringify(currentComparable) !== JSON.stringify(draftComparable);
  }, [activeFlowNode, lifecycleExposeDraft]);

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

    const normalized = normalizeFlowCodeNodeSource(resolvedDraft.code, resolvedDraft.note);
    if (normalized.fatal) {
      MessagePlugin.error(normalized.fatalReason ?? '代码校验失败');
      return;
    }
    if (normalized.repaired) {
      MessagePlugin.error(FLOW_CODE_NODE_SHELL_REPAIRED_MESSAGE);
    }

    const finalCode = normalized.code;
    const notePersisted = resolveCodeNodeNoteForPersist(finalCode, resolvedDraft.note);

    updateFlowNodeData(
      activeFlowNode.id,
      (previous) => ({
        ...previous,
        label: resolvedDraft.label,
        language: resolvedDraft.language,
        editorTheme: resolvedDraft.editorTheme,
        note: notePersisted,
        code: finalCode,
      }),
      '更新代码节点配置',
    );

    setCodeDraft({
      ...resolvedDraft,
      note: notePersisted,
      code: finalCode,
    });
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

  const handleApplyTimerDraft = () => {
    if (!activeFlowNode || activeFlowNode.type !== 'timerNode' || !timerDraft) {
      return;
    }

    updateFlowNodeData(
      activeFlowNode.id,
      (previous) => ({
        ...previous,
        label: timerDraft.label,
        intervalMs: Math.max(100, Math.round(timerDraft.intervalMs)),
      }),
      '更新定时器节点配置',
    );
  };

  const handleApplyPropExposeDraft = () => {
    if (!activeFlowNode || activeFlowNode.type !== 'propExposeNode' || !propExposeDraft) {
      return;
    }

    updateFlowNodeData(
      activeFlowNode.id,
      (previous) => ({
        ...previous,
        label: propExposeDraft.label,
        selectedPropKeys: propExposeDraft.selectedPropKeys,
        selectedMappings: propExposeDraft.selectedMappings,
      }),
      '更新属性暴露节点配置',
    );
  };

  const handleApplyLifecycleExposeDraft = () => {
    if (!activeFlowNode || activeFlowNode.type !== 'lifecycleExposeNode' || !lifecycleExposeDraft) {
      return;
    }

    updateFlowNodeData(
      activeFlowNode.id,
      (previous) => ({
        ...previous,
        label: lifecycleExposeDraft.label,
        selectedLifetimes: lifecycleExposeDraft.selectedLifetimes,
        selectedMappings: lifecycleExposeDraft.selectedMappings,
      }),
      '更新生命周期暴露节点配置',
    );
  };

  const applyWorkbenchResult = React.useCallback((sessionId: string) => {
    const normalizedSessionId = String(sessionId ?? '').trim();
    if (!normalizedSessionId) {
      return;
    }
    const result = readCodeWorkbenchResult(normalizedSessionId);
    if (!result || !result.applied || !Array.isArray(result.files)) {
      return;
    }

    const codeById = new Map(result.files.map((item) => [item.id, item]));
    let activeUpdatedDraft: CodeNodeFormState | null = null;
    let anyRepaired = false;
    let touchedNodes = 0;

    for (const node of flowNodes) {
      if (node.type !== 'codeNode') {
        continue;
      }
      const nextFile = codeById.get(node.id);
      if (!nextFile) {
        continue;
      }
      touchedNodes += 1;
      const prevNote = String((node.data as Record<string, unknown> | undefined)?.note ?? '');
      const normalized = normalizeFlowCodeNodeSource(nextFile.code, prevNote);
      if (normalized.fatal) {
        MessagePlugin.error(normalized.fatalReason ?? '代码校验失败');
        clearCodeWorkbenchResult(normalizedSessionId);
        if (pendingWorkbenchSessionId === normalizedSessionId) {
          setPendingWorkbenchSessionId('');
        }
        return;
      }
      if (normalized.repaired) {
        anyRepaired = true;
      }
      const finalCode = normalized.code;
      updateFlowNodeData(
        node.id,
        (previous) => {
          const prev = previous as Record<string, unknown>;
          const noteFromCode = resolveCodeNodeNoteForPersist(finalCode, String(prev.note ?? ''));
          return {
            ...previous,
            code: finalCode,
            note: noteFromCode,
            editorTheme: nextFile.editorTheme || prev.editorTheme,
          };
        },
        '应用工作台代码改动',
      );

      if (activeFlowNode?.id === node.id && codeDraft) {
        const mergedNote = resolveCodeNodeNoteForPersist(finalCode, codeDraft.note);
        activeUpdatedDraft = {
          ...codeDraft,
          code: finalCode,
          note: mergedNote,
          editorTheme:
            (nextFile.editorTheme === 'vscode-light' || nextFile.editorTheme === 'vscode-dark')
              ? nextFile.editorTheme
              : codeDraft.editorTheme,
        };
      }
    }

    if (anyRepaired) {
      MessagePlugin.error(FLOW_CODE_NODE_SHELL_REPAIRED_MESSAGE);
    }
    if (touchedNodes > 0) {
      MessagePlugin.success('应用成功');
    }

    if (activeUpdatedDraft) {
      setCodeDraft(activeUpdatedDraft);
    }

    clearCodeWorkbenchResult(normalizedSessionId);
    if (pendingWorkbenchSessionId === normalizedSessionId) {
      setPendingWorkbenchSessionId('');
    }
  }, [activeFlowNode?.id, codeDraft, flowNodes, pendingWorkbenchSessionId, updateFlowNodeData]);

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

  const handleOpenFlowWorkbench = (draftValue: Pick<CodeEditorValue, 'label' | 'language'> & {
    code: string;
    editorTheme: CodeEditorValue['editorTheme'];
  }) => {
    if (!activeFlowNode || activeFlowNode.type !== 'codeNode') {
      return;
    }

    const sessionId = createCodeWorkbenchSessionId();
    const returnTo = `${location.pathname}${location.search}`;
    const files = flowNodes
      .filter((node) => node.type === 'codeNode')
      .map((node) => {
        const data = (node.data ?? {}) as Record<string, unknown>;
        const nodeLabel = String(data.label ?? '').trim();
        const language = String(data.language ?? 'javascript').trim();
        const normalizedLanguage = language || 'javascript';
        const suffix = normalizedLanguage === 'typescript' ? 'ts' : normalizedLanguage === 'json' ? 'json' : 'js';
        const editorTheme: 'vscode-light' | 'vscode-dark' =
          String(data.editorTheme ?? codeMirrorDefaultTheme) === 'vscode-light'
            ? 'vscode-light'
            : 'vscode-dark';
        const baseCode =
          node.id === activeFlowNode.id ? draftValue.code : String(data.code ?? '');
        const nodeNote =
          node.id === activeFlowNode.id ? String(codeDraft?.note ?? '') : String(data.note ?? '');
        const code =
          baseCode.trim() === ''
            ? buildFlowCodeNodeSourceTemplate(nodeNote)
            : baseCode;
        return {
          id: node.id,
          path: nodeLabel || `code-${node.id}.${suffix}`,
          code,
          language: normalizedLanguage,
          editorTheme,
        };
      });

    writeCodeWorkbenchPayload({
      sessionId,
      returnTo,
      title: '流程图代码工作台',
      context: 'flow',
      completionContext: dynamicCompletionContext,
      files,
      activeFileId: activeFlowNode.id,
    });
    setPendingWorkbenchSessionId(sessionId);
    const workbenchUrl = `${window.location.origin}/code-workbench?sid=${encodeURIComponent(sessionId)}`;
    const opened = window.open(workbenchUrl, '_blank');
    if (!opened) {
      MessagePlugin.warning('无法打开新窗口，请在浏览器中允许本站弹窗后重试');
    }
  };

  const flowRightAsideStyle = useMemo((): React.CSSProperties => {
    if (builderRightAsideCollapsed) {
      return { width: 0, minWidth: 0, flexShrink: 0, flexBasis: 0 };
    }
    return {
      width: builderRightAsideWidthPx,
      minWidth: 0,
      maxWidth: 300,
      flexBasis: builderRightAsideWidthPx,
      flexShrink: 0,
    };
  }, [builderRightAsideCollapsed, builderRightAsideWidthPx]);

  return (
    <div className="create-body">
      <FlowAsideLeft />

      <BuilderAsideResizeHandle edge="after-left" mode="flow" />

      <main className="main-body">
        <div className="main-inner">
          <FlowBody />
        </div>
      </main>

      <BuilderAsideResizeHandle edge="before-right" mode="flow" />

      <aside
        className={`aside-right${builderRightAsideCollapsed ? ' aside-right--collapsed' : ''}`}
        style={flowRightAsideStyle}
      >
        <RightPanelHeader
          mode={rightPanelMode}
          onChange={setRightPanelMode}
          libraryLabel="内置节点"
          configLabel="节点配置"
          libraryPanel={
            <div className={`right-panel-body${readOnly ? ' builder-readonly-surface' : ''}`}>
              <div className="flow-builtins-panel">
                <div className="flow-builtins-header">
                  {/* <div className="flow-builtins-title">内置节点</div> */}
                </div>
                {builtinNodes.map((item) => (
                  <DragableWrapper
                    key={item.nodeType}
                    data={{ kind: 'builtin-node', nodeType: item.nodeType, label: item.label, theme: item.theme }}
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
          }
          configPanel={
            <div className="right-panel-body flow-config-panel">
              {readOnly ? (
                <div style={{ marginBottom: 12, padding: '10px 12px', borderRadius: 8, background: '#fff7e8', color: '#8d5c0d', fontSize: 12 }}>
                  当前为只读模式。{readOnlyReason || '你可以查看流程信息，但不能修改。'}
                </div>
              ) : null}
              <div className={readOnly ? 'builder-readonly-surface' : ''}>
              {/* <div className="flow-config-panel__title">节点配置</div> */}

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
                    <Button size="small" theme="primary" variant="outline" disabled={readOnly} onClick={() => setNetworkEditorVisible(true)}>
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
                      disabled={readOnly || !canApplyEventFilterDraft}
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
                      onChange={(value) => {
                        const nextNote = String(value ?? '');
                        setCodeDraft((previous) => {
                          if (!previous) {
                            return previous;
                          }
                          if (isFlowCodeNodeWrappedSource(previous.code)) {
                            return {
                              ...previous,
                              note: nextNote,
                              code: setLeadingBlockComment(previous.code, nextNote),
                            };
                          }
                          return { ...previous, note: nextNote };
                        });
                      }}
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
                      disabled={readOnly || !canApplyCodeDraft}
                      onClick={() => handleApplyCodeDraft()}
                    >
                      应用配置
                    </Button>
                    <Button
                      size="small"
                      theme="primary"
                      variant="outline"
                      disabled={readOnly || !codeDraft}
                      onClick={() => {
                        if (!codeDraft) {
                          return;
                        }
                        handleOpenFlowWorkbench({
                          label: codeDraft.label,
                          language: codeDraft.language,
                          code: codeDraft.code,
                          editorTheme: codeDraft.editorTheme,
                        });
                      }}
                    >
                      在工作台编辑代码
                    </Button>
                  </div>
                </div>
              ) : null}

              {activeFlowNode.type === 'timerNode' && timerDraft ? (
                <div className="flow-config-panel__group">
                  <div className="flow-config-panel__group-title">定时器节点配置</div>

                  <div className="flow-config-field">
                    <div className="flow-config-field__label">节点名称</div>
                    <Input
                      size="small"
                      value={timerDraft.label}
                      onChange={(value) =>
                        setTimerDraft((previous) => (previous ? { ...previous, label: String(value ?? '') } : previous))
                      }
                    />
                  </div>

                  <div className="flow-config-field">
                    <div className="flow-config-field__label">触发间隔(ms)</div>
                    <InputNumber
                      size="small"
                      min={100}
                      max={86400000}
                      value={timerDraft.intervalMs}
                      onChange={(value) =>
                        setTimerDraft((previous) => (previous ? { ...previous, intervalMs: Math.max(100, Number(value ?? 1000)) } : previous))
                      }
                    />
                  </div>

                  <div className="config-row">
                    <span className="config-label">说明</span>
                    <span className="config-value">预览时会按设定间隔自动触发下游链路</span>
                  </div>

                  <div className="flow-config-panel__actions">
                    <Button
                      size="small"
                      theme="primary"
                      variant="outline"
                      disabled={readOnly || !canApplyTimerDraft}
                      onClick={handleApplyTimerDraft}
                    >
                      应用配置
                    </Button>
                  </div>
                </div>
              ) : null}

              {activeFlowNode.type === 'propExposeNode' && propExposeDraft ? (
                <div className="flow-config-panel__group">
                  <div className="flow-config-panel__group-title">属性暴露节点配置</div>

                  <div className="config-row">
                    <span className="config-label">来源组件</span>
                    <span className="config-value" title={propExposeDraft.sourceLabel}>{propExposeDraft.sourceLabel}</span>
                  </div>

                  <div className="flow-config-field">
                    <div className="flow-config-field__label">节点名称</div>
                    <Input
                      size="small"
                      value={propExposeDraft.label}
                      onChange={(value) =>
                        setPropExposeDraft((previous) => (previous ? { ...previous, label: String(value ?? '') } : previous))
                      }
                    />
                  </div>

                  <div className="config-row">
                    <div className="flow-config-field__label">对外暴露属性</div>
                    <Button
                      size="small"
                      theme="default"
                      variant="outline"
                      disabled={readOnly || propExposeDraft.availablePropKeys.length === 0}
                      onClick={() => setPropAliasDrawerVisible(true)}
                    >
                      {propExposeDraft.selectedPropKeys && propExposeDraft.selectedPropKeys.length > 0
                        ? `已选择 ${propExposeDraft.selectedPropKeys.length} 项`
                        : '选择要暴露的属性'}
                    </Button>
                  </div>

                  <div className="flow-config-panel__actions">
                    <Button
                      size="small"
                      theme="primary"
                      variant="outline"
                      disabled={readOnly || !canApplyPropExposeDraft}
                      onClick={handleApplyPropExposeDraft}
                    >
                      应用配置
                    </Button>
                  </div>
                </div>
              ) : null}

              {activeFlowNode.type === 'lifecycleExposeNode' && lifecycleExposeDraft ? (
                <div className="flow-config-panel__group">
                  <div className="flow-config-panel__group-title">生命周期暴露节点配置</div>

                  <div className="config-row">
                    <span className="config-label">上游节点</span>
                    <span className="config-value" title={lifecycleExposeDraft.upstreamLabel}>{lifecycleExposeDraft.upstreamLabel}</span>
                  </div>

                  <div className="flow-config-field">
                    <div className="flow-config-field__label">节点名称</div>
                    <Input
                      size="small"
                      value={lifecycleExposeDraft.label}
                      onChange={(value) =>
                        setLifecycleExposeDraft((previous) => (previous ? { ...previous, label: String(value ?? '') } : previous))
                      }
                    />
                  </div>

                  <div className="flow-config-field">
                    <div className="flow-config-field__label">对外输出生命周期</div>
                    <Button
                      size="small"
                      theme="default"
                      variant="outline"
                      disabled={readOnly || lifecycleExposeDraft.availableLifetimes.length === 0}
                      onClick={() => setLifecycleAliasDrawerVisible(true)}
                    >
                      {lifecycleExposeDraft.selectedLifetimes.length > 0
                        ? `已选择 ${lifecycleExposeDraft.selectedLifetimes.length} 项`
                        : '选择并设置别名'}
                    </Button>
                  </div>

                  <div className="flow-config-panel__actions">
                    <Button
                      size="small"
                      theme="primary"
                      variant="outline"
                      disabled={readOnly || !canApplyLifecycleExposeDraft}
                      onClick={handleApplyLifecycleExposeDraft}
                    >
                      应用配置
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
            </div>
          }
        />

        <Drawer
          visible={lifecycleAliasDrawerVisible && !!activeFlowNode && activeFlowNode.type === 'lifecycleExposeNode' && !!lifecycleExposeDraft}
          header="生命周期别名配置"
          placement="right"
          size="480px"
          footer={false}
          onClose={() => setLifecycleAliasDrawerVisible(false)}
        >
          {lifecycleExposeDraft ? (
            <div className="flow-config-drawer-form">
              <div className="flow-config-drawer-subtitle">选择需要对外暴露的生命周期，并为每项设置别名。</div>

              <div className="flow-config-field">
                <div className="flow-config-field__label">选择生命周期</div>
                <Select
                  size="small"
                  multiple
                  clearable
                  disabled={lifecycleExposeDraft.availableLifetimes.length === 0}
                  placeholder={lifecycleExposeDraft.availableLifetimes.length === 0 ? '请先连接组件节点或事件过滤节点' : '请选择要暴露的生命周期'}
                  options={lifecycleExposeDraft.availableLifetimes.map((item) => ({ label: item, value: item }))}
                  value={lifecycleExposeDraft.selectedLifetimes}
                  onChange={(value) => {
                    const nextValues = Array.isArray(value)
                      ? value.map((item) => String(item))
                      : (value ? [String(value)] : []);

                    setLifecycleExposeDraft((previous) =>
                      previous
                        ? {
                            ...previous,
                            selectedLifetimes: nextValues,
                            selectedMappings: nextValues.map((k) => {
                              const exists = previous.selectedMappings?.find((m) => m.sourceLifetime === k);
                              return exists ? { ...exists } : { sourceLifetime: k, alias: undefined };
                            }),
                          }
                        : previous,
                    );
                  }}
                />
              </div>

              <div className="flow-config-field">
                <div className="flow-config-field__label">别名（可选）</div>
                <div className="flow-config-expose-mappings">
                  {lifecycleExposeDraft.selectedMappings && lifecycleExposeDraft.selectedMappings.length > 0 ? (
                    lifecycleExposeDraft.selectedMappings.map((item, idx) => (
                      <div key={`${item.sourceLifetime}-${idx}`} className="flow-config-expose-mapping-row">
                        <div className="flow-config-expose-mapping-name">{item.sourceLifetime}</div>
                        <Input
                          size="small"
                          placeholder="对外名称（不填则使用来源名称）"
                          value={item.alias ?? ''}
                          onChange={(value) => {
                            setLifecycleExposeDraft((previous) => {
                              if (!previous) return previous;
                              const next = (previous.selectedMappings ?? []).map((mapping) =>
                                mapping.sourceLifetime === item.sourceLifetime
                                  ? { ...mapping, alias: String(value ?? '') || undefined }
                                  : mapping,
                              );
                              return { ...previous, selectedMappings: next };
                            });
                          }}
                        />
                      </div>
                    ))
                  ) : (
                    <div className="flow-config-field__hint">请先从上方选择要暴露的生命周期</div>
                  )}
                </div>
              </div>

              <div className="flow-config-drawer-actions">
                <Button size="small" theme="default" variant="outline" onClick={() => setLifecycleAliasDrawerVisible(false)}>
                  取消
                </Button>
                <Button
                  size="small"
                  theme="primary"
                  variant="outline"
                  disabled={!lifecycleExposeDraft.selectedLifetimes || lifecycleExposeDraft.selectedLifetimes.length === 0}
                  onClick={() => {
                    handleApplyLifecycleExposeDraft();
                    setLifecycleAliasDrawerVisible(false);
                  }}
                >
                  应用配置
                </Button>
              </div>
            </div>
          ) : null}
        </Drawer>

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

        <Drawer
          visible={propAliasDrawerVisible && !!activeFlowNode && activeFlowNode.type === 'propExposeNode' && !!propExposeDraft}
          header="属性别名配置"
          placement="right"
          size="480px"
          footer={false}
          onClose={() => setPropAliasDrawerVisible(false)}
        >
          {propExposeDraft ? (
            <div className="flow-config-drawer-form">
              <div className="flow-config-drawer-subtitle">
              选择要暴露的属性；「对外标识」为实例上的属性 key（建议英文），「面板展示名」为右侧配置区显示的中文标题（不填则沿用内部属性名）。
            </div>

              <div className="flow-config-field">
                <div className="flow-config-field__label">选择属性</div>
                <Select
                  size="small"
                  multiple
                  clearable
                  disabled={propExposeDraft.availablePropKeys.length === 0}
                  placeholder={propExposeDraft.availablePropKeys.length === 0 ? '请先连接组件节点' : '请选择要暴露的属性'}
                  options={propExposeDraft.availablePropKeys.map((item) => ({ label: item, value: item }))}
                  value={propExposeDraft.selectedPropKeys}
                  onChange={(value) => {
                    const nextValues = Array.isArray(value)
                      ? value.map((item) => String(item))
                      : (value ? [String(value)] : []);
                    setPropExposeDraft((previous) =>
                      previous
                        ? {
                            ...previous,
                            selectedPropKeys: nextValues,
                            selectedMappings: nextValues.map((k) => {
                              const exists = previous.selectedMappings?.find((m) => m.sourcePropKey === k);
                              return exists ? { ...exists } : { sourcePropKey: k, alias: undefined, displayName: undefined };
                            }),
                          }
                        : previous,
                    );
                  }}
                />
              </div>

              <div className="flow-config-field">
                <div className="flow-config-field__label">对外标识与展示名</div>
                <div className="flow-config-expose-mappings">
                  {propExposeDraft.selectedMappings && propExposeDraft.selectedMappings.length > 0 ? (
                    propExposeDraft.selectedMappings.map((m, idx) => (
                      <div key={`${m.sourcePropKey}-${idx}`} className="flow-config-expose-mapping-row">
                        <div className="flow-config-expose-mapping-name">{m.sourcePropKey}</div>
                        <Input
                          size="small"
                          placeholder="对外标识（唯一，如 btnColor；不填则用来源 key）"
                          value={m.alias ?? ''}
                          onChange={(value) => {
                            setPropExposeDraft((previous) => {
                              if (!previous) return previous;
                              const next = (previous.selectedMappings ?? []).map((item) =>
                                item.sourcePropKey === m.sourcePropKey ? { ...item, alias: String(value ?? '') || undefined } : item,
                              );
                              return { ...previous, selectedMappings: next };
                            });
                          }}
                        />
                        <Input
                          size="small"
                          style={{ marginTop: 6 }}
                          placeholder="面板展示名（如：块级元素；不填则用内部属性名）"
                          value={m.displayName ?? ''}
                          onChange={(value) => {
                            setPropExposeDraft((previous) => {
                              if (!previous) return previous;
                              const next = (previous.selectedMappings ?? []).map((item) =>
                                item.sourcePropKey === m.sourcePropKey
                                  ? { ...item, displayName: String(value ?? '') || undefined }
                                  : item,
                              );
                              return { ...previous, selectedMappings: next };
                            });
                          }}
                        />
                      </div>
                    ))
                  ) : (
                    <div className="flow-config-field__hint">请先从上方选择要暴露的属性</div>
                  )}
                </div>
              </div>

              <div className="flow-config-drawer-actions">
                <Button
                  size="small"
                  theme="default"
                  variant="outline"
                  onClick={() => setPropAliasDrawerVisible(false)}
                >
                  取消
                </Button>
                <Button
                  size="small"
                  theme="primary"
                  variant="outline"
                  disabled={!propExposeDraft || !propExposeDraft.selectedPropKeys || propExposeDraft.selectedPropKeys.length === 0}
                  onClick={() => {
                    handleApplyPropExposeDraft();
                    setPropAliasDrawerVisible(false);
                  }}
                >
                  应用配置
                </Button>
              </div>
            </div>
          ) : null}
        </Drawer>

      </aside>
    </div>
  );
};

export default FlowLayout;
