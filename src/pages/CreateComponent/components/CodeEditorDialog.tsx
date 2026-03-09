import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Dialog, Select, Space } from 'tdesign-react';
import CodeMirror from '@uiw/react-codemirror';
import { undo, redo } from '@codemirror/commands';
import { autocompletion, completeFromList, type Completion } from '@codemirror/autocomplete';
import { javascript, javascriptLanguage } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { css } from '@codemirror/lang-css';
import { vscodeDark, vscodeLight } from '@uiw/codemirror-theme-vscode';
import type { Extension } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';

export interface CodeEditorValue {
  label: string;
  language: string;
  editorTheme: 'vscode-dark' | 'vscode-light';
  note: string;
  code: string;
}

interface CodeEditorDialogProps {
  visible: boolean;
  value: CodeEditorValue;
  onClose: () => void;
  onApply: (nextValue: Pick<CodeEditorValue, 'code' | 'editorTheme'>) => void;
}

const MIN_FONT_SIZE = 12;
const MAX_FONT_SIZE = 20;

const THEME_OPTIONS = [
  { label: 'VSCode Dark', value: 'vscode-dark' },
  { label: 'VSCode Light', value: 'vscode-light' },
];

const JS_GLOBAL_COMPLETIONS: Completion[] = [
  { label: 'console', type: 'variable' },
  { label: 'console.log', type: 'function' },
  { label: 'console.error', type: 'function' },
  { label: 'console.warn', type: 'function' },
  { label: 'window', type: 'variable' },
  { label: 'document', type: 'variable' },
  { label: 'localStorage', type: 'variable' },
  { label: 'sessionStorage', type: 'variable' },
  { label: 'setTimeout', type: 'function' },
  { label: 'setInterval', type: 'function' },
  { label: 'Promise', type: 'class' },
  { label: 'fetch', type: 'function' },
  { label: 'JSON.stringify', type: 'function' },
  { label: 'JSON.parse', type: 'function' },
  { label: 'Math', type: 'class' },
  { label: 'Array', type: 'class' },
  { label: 'Object', type: 'class' },
  { label: 'String', type: 'class' },
  { label: 'Number', type: 'class' },
  { label: 'Boolean', type: 'class' },
  {
    label: 'dataHub',
    type: 'variable',
    detail: '代码节点只读上下文',
    info: '预览运行时注入：可读取组件状态，不能直接写入组件。',
  },
  {
    label: 'dataHub.getComponentState',
    type: 'function',
    detail: '(componentKey) => ComponentState | undefined',
    info: '读取某个组件的完整状态对象（含 props/lifetimes）。',
  },
  {
    label: 'dataHub.getComponentProp',
    type: 'function',
    detail: '(componentKey, propKey) => unknown',
    info: '读取某个组件的单个属性值。',
  },
  {
    label: 'dataHub.getAllComponentStates',
    type: 'function',
    detail: '() => ComponentState[]',
    info: '读取当前页面全部组件状态快照。',
  },
  {
    label: 'ctx',
    type: 'variable',
    detail: '当前触发上下文',
    info: '包含 event/upstreamNodeId/currentNodeId。',
  },
  {
    label: 'ctx.event',
    type: 'property',
    detail: '触发事件对象',
    info: '可能是生命周期事件或上游 patch 事件。',
  },
  {
    label: 'ctx.upstreamNodeId',
    type: 'property',
    detail: '上游节点 id',
    info: '当前代码节点的直接上游流程节点 id。',
  },
  {
    label: 'ctx.currentNodeId',
    type: 'property',
    detail: '当前代码节点 id',
    info: '当前正在执行的代码节点 id。',
  },
  {
    label: 'return { visible: true }',
    type: 'snippet',
    detail: '声明式返回 patch',
    info: '返回对象会被作为 patch 下发到下游组件节点。',
  },
];

const CodeEditorDialog: React.FC<CodeEditorDialogProps> = ({ visible, value, onClose, onApply }) => {
  const [draftCode, setDraftCode] = useState(value.code);
  const [draftTheme, setDraftTheme] = useState<CodeEditorValue['editorTheme']>(value.editorTheme);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fontSize, setFontSize] = useState(14);
  const editorViewRef = useRef<EditorView | null>(null);

  useEffect(() => {
    if (visible) {
      setDraftCode(value.code);
      setDraftTheme(value.editorTheme);
      setIsFullscreen(false);
      setFontSize(14);
    }
  }, [value, visible]);


  const canApply = useMemo(
    () => draftCode !== value.code || draftTheme !== value.editorTheme,
    [draftCode, draftTheme, value.code, value.editorTheme],
  );

  const editorExtensions = useMemo<Extension[]>(() => {
    const lang = String(value.language || 'javascript').toLowerCase();

    const jsCompletion = javascriptLanguage.data.of({
      autocomplete: completeFromList(JS_GLOBAL_COMPLETIONS),
    });

    if (lang === 'typescript') {
      return [javascript({ typescript: true }), jsCompletion, autocompletion({ activateOnTyping: true })];
    }

    if (lang === 'json') {
      return [json(), autocompletion({ activateOnTyping: true })];
    }

    if (lang === 'css') {
      return [css(), autocompletion({ activateOnTyping: true })];
    }

    return [javascript(), jsCompletion, autocompletion({ activateOnTyping: true })];
  }, [value.language]);

  const editorTheme = useMemo(() => {
    return draftTheme === 'vscode-light' ? vscodeLight : vscodeDark;
  }, [draftTheme]);

  const handleUndo = () => {
    if (!editorViewRef.current) {
      return;
    }

    undo(editorViewRef.current);
  };

  const handleRedo = () => {
    if (!editorViewRef.current) {
      return;
    }

    redo(editorViewRef.current);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(draftCode || '');
    } catch {
      // ignore
    }
  };

  const handleClear = () => {
    setDraftCode('');
  };

  const contentHeight = isFullscreen ? '72vh' : '520px';

  return (
    <Dialog
      visible={visible}
      header="代码节点编辑"
      draggable
      width={isFullscreen ? '96vw' : '880px'}
      top={isFullscreen ? '2vh' : '64px'}
      closeOnEscKeydown
      closeOnOverlayClick={false}
      destroyOnClose
      className={`code-editor-dialog${isFullscreen ? ' is-fullscreen' : ''}${draftTheme === 'vscode-light' ? ' code-editor-dialog--light' : ''}`}
      dialogClassName="code-editor-dialog__panel"
      onClose={onClose}
      onConfirm={() =>
        onApply({
          code: draftCode,
          editorTheme: draftTheme,
        })
      }
      confirmBtn={{
        content: '应用代码',
        disabled: !canApply,
      }}
      cancelBtn="取消"
    >
      <div className="code-editor-dialog__form" style={{ height: contentHeight }}>
        <div className="code-editor-dialog__meta">
          <span className="code-editor-dialog__meta-item">语言：{value.language || 'javascript'}</span>
          <span className="code-editor-dialog__meta-item">主题：{draftTheme === 'vscode-light' ? 'VSCode Light' : 'VSCode Dark'}</span>
          <span className="code-editor-dialog__meta-item">长度：{draftCode.length} chars</span>
        </div>

        <div className="code-editor-dialog__editor-wrap">
          <div className="code-editor-dialog__toolbar">
            <Space size={8}>
              <Button size="small" variant="outline" onClick={handleUndo}>撤销</Button>
              <Button size="small" variant="outline" onClick={handleRedo}>重做</Button>
              <Button size="small" variant="outline" onClick={handleCopy}>复制</Button>
              <Button size="small" variant="outline" theme="danger" onClick={handleClear}>清空</Button>
            </Space>

            <Space size={8}>
              <Select
                size="small"
                style={{ width: 150 }}
                options={THEME_OPTIONS}
                value={draftTheme}
                onChange={(nextValue) =>
                  setDraftTheme(String(nextValue ?? 'vscode-dark') === 'vscode-light' ? 'vscode-light' : 'vscode-dark')
                }
              />
              <Button
                size="small"
                variant="outline"
                disabled={fontSize <= MIN_FONT_SIZE}
                onClick={() => setFontSize((previous) => Math.max(MIN_FONT_SIZE, previous - 1))}
              >
                A-
              </Button>
              <Button
                size="small"
                variant="outline"
                disabled={fontSize >= MAX_FONT_SIZE}
                onClick={() => setFontSize((previous) => Math.min(MAX_FONT_SIZE, previous + 1))}
              >
                A+
              </Button>
              <Button size="small" variant="outline" onClick={() => setIsFullscreen((previous) => !previous)}>
                {isFullscreen ? '退出全屏' : '全屏'}
              </Button>
            </Space>
          </div>

          <div className="code-editor-dialog__editor" style={{ fontSize }}>
            <CodeMirror
              value={draftCode}
              height="100%"
              theme={editorTheme}
              extensions={editorExtensions}
              basicSetup={{
                lineNumbers: true,
                foldGutter: true,
                highlightActiveLine: true,
                autocompletion: true,
              }}
              onCreateEditor={(view) => {
                editorViewRef.current = view;
              }}
              onChange={(nextValue) => setDraftCode(nextValue)}
            />
          </div>
        </div>

      </div>
    </Dialog>
  );
};

export default React.memo(CodeEditorDialog);
