import type { CodeEditorDynamicCompletionContext } from './dynamicCompletions';

export type CodeWorkbenchContext = 'flow' | 'single' | 'json' | 'cloud-function';

export interface CodeWorkbenchFile {
  id: string;
  path: string;
  code: string;
  language?: string;
  editorTheme?: 'vscode-dark' | 'vscode-light';
}

export interface CodeWorkbenchPayload {
  sessionId: string;
  returnTo: string;
  title?: string;
  context: CodeWorkbenchContext;
  completionContext?: CodeEditorDynamicCompletionContext;
  files: CodeWorkbenchFile[];
  activeFileId: string;
}

export interface CodeWorkbenchResult {
  sessionId: string;
  applied: boolean;
  files: CodeWorkbenchFile[];
}

const SESSION_PREFIX = 'codeWorkbench:';
const RESULT_PREFIX = 'codeWorkbenchResult:';

const safeParseJson = <T>(raw: string | null): T | null => {
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

export const createCodeWorkbenchSessionId = () => {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

export const writeCodeWorkbenchPayload = (payload: CodeWorkbenchPayload) => {
  const key = `${SESSION_PREFIX}${payload.sessionId}`;
  localStorage.setItem(key, JSON.stringify(payload));
};

export const readCodeWorkbenchPayload = (sessionId: string): CodeWorkbenchPayload | null => {
  return safeParseJson<CodeWorkbenchPayload>(localStorage.getItem(`${SESSION_PREFIX}${sessionId}`));
};

export const clearCodeWorkbenchPayload = (sessionId: string) => {
  localStorage.removeItem(`${SESSION_PREFIX}${sessionId}`);
};

export const writeCodeWorkbenchResult = (result: CodeWorkbenchResult) => {
  const key = `${RESULT_PREFIX}${result.sessionId}`;
  localStorage.setItem(key, JSON.stringify(result));
};

export const readCodeWorkbenchResult = (sessionId: string): CodeWorkbenchResult | null => {
  return safeParseJson<CodeWorkbenchResult>(localStorage.getItem(`${RESULT_PREFIX}${sessionId}`));
};

export const clearCodeWorkbenchResult = (sessionId: string) => {
  localStorage.removeItem(`${RESULT_PREFIX}${sessionId}`);
};

