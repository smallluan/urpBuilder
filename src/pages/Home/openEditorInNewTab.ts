/** 从首页进入搭建页：新标签打开，保留首页标签 */
export function openEditorInNewTab(path: string) {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  window.open(normalized, '_blank', 'noopener,noreferrer');
}
