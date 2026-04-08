export interface CodeEditorValue {
  label: string;
  language: string;
  editorTheme: 'vscode-dark' | 'vscode-light';
  note: string;
  code: string;
}
