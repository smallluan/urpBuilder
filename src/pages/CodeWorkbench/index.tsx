import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button, MessagePlugin, Select, Space } from 'tdesign-react';
import { CopyIcon } from 'tdesign-icons-react';
import { undo, redo } from '@codemirror/commands';
import type { EditorView } from '@codemirror/view';
import { useNavigate, useSearchParams } from 'react-router-dom';
import CodeMirrorEditor, { type CodeEditorThemeMode } from '../../builder/components/codeEditor/CodeMirrorEditor';
import { buildCodeMirrorExtensions } from '../../builder/components/codeEditor/buildCodeMirrorExtensions';
import {
  clearCodeWorkbenchPayload,
  readCodeWorkbenchPayload,
  writeCodeWorkbenchResult,
  type CodeWorkbenchFile,
  type CodeWorkbenchPayload,
} from '../../builder/components/codeEditor/workbenchSession';
import { CODE_EDITOR_THEME_OPTIONS } from '../../constants/codeEditor';
import {
  FLOW_CODE_NODE_SHELL_REPAIRED_MESSAGE,
  normalizeFlowCodeNodeSource,
} from '../../builder/components/codeEditor/flowCodeNodeSource';
import './style.less';

const FALLBACK_THEME: CodeEditorThemeMode = 'vscode-dark';

const toCodeMap = (files: CodeWorkbenchFile[]) => {
  return files.reduce<Record<string, string>>((acc, item) => {
    acc[item.id] = item.code;
    return acc;
  }, {});
};

const CodeWorkbench: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = String(searchParams.get('sid') ?? '').trim();
  const [payload, setPayload] = useState<CodeWorkbenchPayload | null>(null);
  const [activeFileId, setActiveFileId] = useState('');
  const [codeMap, setCodeMap] = useState<Record<string, string>>({});
  const [editorTheme, setEditorTheme] = useState<CodeEditorThemeMode>(FALLBACK_THEME);
  const editorViewRef = useRef<EditorView | null>(null);

  useEffect(() => {
    if (!sessionId) {
      return;
    }

    const nextPayload = readCodeWorkbenchPayload(sessionId);
    if (!nextPayload || !Array.isArray(nextPayload.files) || nextPayload.files.length === 0) {
      return;
    }

    setPayload(nextPayload);
    setActiveFileId(nextPayload.activeFileId || nextPayload.files[0].id);
    setCodeMap(toCodeMap(nextPayload.files));
    const initialTheme = nextPayload.files.find((item) => item.id === (nextPayload.activeFileId || nextPayload.files[0].id))?.editorTheme;
    setEditorTheme(initialTheme === 'vscode-light' ? 'vscode-light' : FALLBACK_THEME);
  }, [sessionId]);

  const activeFile = useMemo(() => payload?.files.find((item) => item.id === activeFileId) ?? null, [activeFileId, payload?.files]);
  const activeCode = activeFile ? (codeMap[activeFile.id] ?? '') : '';

  const dirtyFileIdSet = useMemo(() => {
    const dirty = new Set<string>();
    if (!payload) {
      return dirty;
    }
    payload.files.forEach((file) => {
      if ((codeMap[file.id] ?? '') !== file.code) {
        dirty.add(file.id);
      }
    });
    return dirty;
  }, [codeMap, payload]);

  const activeExtensions = useMemo(
    () =>
      buildCodeMirrorExtensions({
        language: activeFile?.language || 'javascript',
        dynamicCompletionContext: payload?.completionContext,
      }),
    [activeFile?.language, payload?.completionContext],
  );

  /**
   * 应用成功后只关闭本标签页，不在本页做路由跳转（父页通过 localStorage + storage 事件或同页 state 消费结果）。
   * 取消时：优先关闭脚本打开的窗口；否则回到打开工作台前的路由。
   */
  const handleBack = (applied: boolean) => {
    if (!payload) {
      navigate(-1);
      return;
    }
    if (applied) {
      window.close();
      // 非脚本打开的新标签时 close 可能无效，退回历史记录而非跳转到 returnTo
      window.setTimeout(() => {
        if (document.visibilityState === 'visible') {
          navigate(-1);
        }
      }, 200);
      return;
    }
    const hasOpener = typeof window !== 'undefined' && window.opener && !window.opener.closed;
    if (hasOpener) {
      window.close();
      return;
    }
    navigate(payload.returnTo, {
      replace: true,
      state: {
        codeWorkbenchSessionId: payload.sessionId,
        codeWorkbenchApplied: false,
        codeWorkbenchAt: Date.now(),
      },
    });
  };

  const handleApply = () => {
    if (!payload) {
      return;
    }

    let files = payload.files.map((item) => ({
      ...item,
      code: codeMap[item.id] ?? '',
      editorTheme,
    }));

    if (payload.context === 'flow') {
      let anyRepaired = false;
      const next: typeof files = [];
      for (const item of files) {
        const normalized = normalizeFlowCodeNodeSource(item.code, '');
        if (normalized.fatal) {
          MessagePlugin.error(normalized.fatalReason ?? '代码校验失败');
          return;
        }
        if (normalized.repaired) {
          anyRepaired = true;
        }
        next.push({ ...item, code: normalized.code });
      }
      files = next;
      if (anyRepaired) {
        MessagePlugin.error(FLOW_CODE_NODE_SHELL_REPAIRED_MESSAGE);
      }
    }

    writeCodeWorkbenchResult({
      sessionId: payload.sessionId,
      applied: true,
      files,
    });
    clearCodeWorkbenchPayload(payload.sessionId);
    handleBack(true);
  };

  const handleCancel = () => {
    if (payload) {
      clearCodeWorkbenchPayload(payload.sessionId);
    }
    handleBack(false);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(activeCode || '');
      MessagePlugin.success('代码已复制');
    } catch {
      MessagePlugin.warning('复制失败');
    }
  };

  if (!sessionId || !payload || !activeFile) {
    return (
      <div className="code-workbench-page">
        <div className="code-workbench-page__empty">
          <div className="code-workbench-page__empty-title">无法打开代码工作台</div>
          <div className="code-workbench-page__empty-desc">会话不存在或已失效，请从原页面重新打开。</div>
          <Button theme="primary" onClick={() => navigate(-1)}>返回</Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`code-workbench-page ${editorTheme === 'vscode-light' ? 'is-light' : ''}`}>
      <header className="code-workbench-page__header">
        <div className="code-workbench-page__header-main">
          <div className="code-workbench-page__title">{payload.title || 'Code Workbench'}</div>
          <div className="code-workbench-page__subtitle">{payload.context} · {payload.files.length} file(s)</div>
        </div>
        <Space size={8}>
          <Button size="small" variant="outline" onClick={() => editorViewRef.current && undo(editorViewRef.current)}>撤销</Button>
          <Button size="small" variant="outline" onClick={() => editorViewRef.current && redo(editorViewRef.current)}>重做</Button>
          <Button size="small" variant="outline" icon={<CopyIcon />} onClick={handleCopy}>复制</Button>
          <Select
            size="small"
            style={{ width: 150 }}
            options={CODE_EDITOR_THEME_OPTIONS}
            value={editorTheme}
            onChange={(nextValue) => setEditorTheme(String(nextValue ?? FALLBACK_THEME) === 'vscode-light' ? 'vscode-light' : 'vscode-dark')}
          />
          <Button size="small" variant="outline" onClick={handleCancel}>取消</Button>
          <Button size="small" theme="primary" onClick={handleApply}>应用</Button>
        </Space>
      </header>

      <div className="code-workbench-page__body">
        <aside className="code-workbench-page__sidebar">
          <div className="code-workbench-page__sidebar-title">Explorer</div>
          <div className="code-workbench-page__file-list">
            {payload.files.map((file) => {
              const isActive = file.id === activeFileId;
              const isDirty = dirtyFileIdSet.has(file.id);
              return (
                <button
                  key={file.id}
                  type="button"
                  className={`code-workbench-page__file-item ${isActive ? 'is-active' : ''}`}
                  onClick={() => {
                    setActiveFileId(file.id);
                    const nextTheme = file.editorTheme;
                    if (nextTheme === 'vscode-light' || nextTheme === 'vscode-dark') {
                      setEditorTheme(nextTheme);
                    }
                  }}
                >
                  <span className="code-workbench-page__file-name">{file.path || file.id}</span>
                  {isDirty ? <span className="code-workbench-page__file-dirty">●</span> : null}
                </button>
              );
            })}
          </div>
        </aside>

        <main className="code-workbench-page__editor-main">
          <div className="code-workbench-page__editor-meta">
            <span>{activeFile.path || activeFile.id}</span>
            <span>{activeFile.language || 'javascript'}</span>
            <span>{activeCode.length} chars</span>
          </div>
          <div className="code-workbench-page__editor-wrap">
            <CodeMirrorEditor
              value={activeCode}
              editorTheme={editorTheme}
              language={activeFile.language || 'javascript'}
              extensions={activeExtensions}
              className="code-workbench-page__editor-shell"
              onCreateEditor={(view) => {
                editorViewRef.current = view;
              }}
              onChange={(nextCode) => {
                setCodeMap((previous) => ({
                  ...previous,
                  [activeFile.id]: nextCode,
                }));
              }}
            />
          </div>
        </main>
      </div>
    </div>
  );
};

export default CodeWorkbench;

