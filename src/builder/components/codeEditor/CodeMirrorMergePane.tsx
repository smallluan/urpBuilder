import React, { useEffect, useMemo, useRef } from 'react';
import { MergeView } from '@codemirror/merge';
import { EditorState, type Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { vscodeDark, vscodeLight } from '@uiw/codemirror-theme-vscode';
import type { CodeEditorThemeMode } from './CodeMirrorEditor';

export type CodeMirrorMergePaneProps = {
  path: string;
  baseText: string;
  compareText: string;
  editorTheme: CodeEditorThemeMode;
  className?: string;
  height?: string;
};

function languageExtensionForPath(filePath: string): Extension {
  const p = filePath.toLowerCase();
  if (p.endsWith('.json')) {
    return json();
  }
  return javascript();
}

const CodeMirrorMergePane: React.FC<CodeMirrorMergePaneProps> = ({
  path,
  baseText,
  compareText,
  editorTheme,
  className,
  height = '100%',
}) => {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const mergeRef = useRef<MergeView | null>(null);

  const themeExt = useMemo(
    () => (editorTheme === 'vscode-light' ? vscodeLight : vscodeDark),
    [editorTheme],
  );

  const langExt = useMemo(() => languageExtensionForPath(path), [path]);

  const readOnly = useMemo(() => EditorState.readOnly.of(true), []);

  useEffect(() => {
    const parent = parentRef.current;
    if (!parent) {
      return;
    }

    mergeRef.current?.destroy();
    mergeRef.current = null;

    const extensions: Extension[] = [langExt, themeExt, readOnly, EditorView.lineWrapping];

    const mv = new MergeView({
      parent,
      a: { doc: baseText, extensions },
      b: { doc: compareText, extensions },
    });
    mergeRef.current = mv;

    return () => {
      mv.destroy();
      if (mergeRef.current === mv) {
        mergeRef.current = null;
      }
    };
  }, [baseText, compareText, langExt, path, readOnly, themeExt]);

  return <div ref={parentRef} className={className} style={{ height, overflow: 'auto' }} />;
};

export default React.memo(CodeMirrorMergePane);
