import React, { useMemo } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { vscodeDark, vscodeLight } from '@uiw/codemirror-theme-vscode';
import type { Extension } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';

export type CodeEditorThemeMode = 'vscode-dark' | 'vscode-light';

interface CodeMirrorEditorProps {
  value: string;
  language?: string;
  height?: string;
  editorTheme: CodeEditorThemeMode;
  extensions: Extension[];
  className?: string;
  fontSize?: number;
  onChange: (nextValue: string) => void;
  onCreateEditor?: (view: EditorView) => void;
}

const CodeMirrorEditor: React.FC<CodeMirrorEditorProps> = ({
  value,
  height = '100%',
  editorTheme,
  extensions,
  className,
  fontSize = 14,
  onChange,
  onCreateEditor,
}) => {
  const theme = useMemo(() => (editorTheme === 'vscode-light' ? vscodeLight : vscodeDark), [editorTheme]);

  return (
    <div className={className} style={{ fontSize, height }}>
      <CodeMirror
        value={value}
        height="100%"
        theme={theme}
        extensions={extensions}
        basicSetup={{
          lineNumbers: true,
          foldGutter: true,
          highlightActiveLine: true,
          autocompletion: true,
        }}
        onCreateEditor={onCreateEditor}
        onChange={onChange}
      />
    </div>
  );
};

export default React.memo(CodeMirrorEditor);

