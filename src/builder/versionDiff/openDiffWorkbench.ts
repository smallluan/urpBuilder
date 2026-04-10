import {
  createCodeWorkbenchSessionId,
  writeCodeWorkbenchPayload,
  type CodeWorkbenchFile,
} from '../components/codeEditor/workbenchSession';

export type DiffWorkbenchFileInput = {
  id: string;
  path: string;
  base: string;
  compare: string;
  language?: string;
};

/**
 * 打开代码工作台（仅 diff 模式），在新标签页展示多文件左右对比。
 */
export function openComponentTemplateDiffWorkbench(options: {
  returnTo: string;
  title: string;
  baseVersionLabel: string;
  compareVersionLabel: string;
  files: DiffWorkbenchFileInput[];
  editorTheme?: 'vscode-dark' | 'vscode-light';
}): string {
  const sessionId = createCodeWorkbenchSessionId();
  const theme = options.editorTheme ?? 'vscode-dark';

  const files: CodeWorkbenchFile[] = options.files.map((f) => ({
    id: f.id,
    path: f.path,
    code: f.compare,
    baseCode: f.base,
    language: f.language,
    editorTheme: theme,
  }));

  writeCodeWorkbenchPayload({
    sessionId,
    returnTo: options.returnTo,
    title: options.title,
    context: 'diff',
    diffBaseLabel: options.baseVersionLabel,
    diffCompareLabel: options.compareVersionLabel,
    files,
    activeFileId: files[0]?.id ?? '',
  });

  const url = `/code-workbench?sid=${encodeURIComponent(sessionId)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
  return sessionId;
}
