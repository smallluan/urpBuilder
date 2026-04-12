const BRAND = 'URP Builder';

/**
 * 浏览器标签页标题：按路由区分，避免多开标签时全是同一名称。
 */
export function resolveDocumentTitle(pathname: string, _search: string): string {
  const path = pathname || '/';

  if (path.startsWith('/site-preview')) {
    const routeBit = path.slice('/site-preview'.length) || '/';
    return `站点预览 ${routeBit} · ${BRAND}`;
  }

  if (path === '/preview-engine') {
    return `页面预览 · ${BRAND}`;
  }

  const exact: Record<string, string> = {
    '/': '首页',
    '/build-component': '构建组件',
    '/build-page': '构建应用',
    '/data-api': 'API 管理',
    '/data-constance': '常量管理',
    '/data-cloud-function': '云函数',
    '/data-assets': '素材管理',
    '/teams': '团队看板',
    '/user-admin': '用户管理',
    '/team-admin': '团队管理',
    '/admin-broadcasts': '系统广播',
    '/login': '登录',
    '/register': '注册',
    '/create-component': '新建组件',
    '/create-page': '新建应用',
    '/component-version-catalog': '组件版本',
    '/code-workbench': '代码工作台',
  };

  if (exact[path]) {
    return `${exact[path]} · ${BRAND}`;
  }

  for (const [prefix, title] of Object.entries(exact)) {
    if (prefix !== '/' && path.startsWith(`${prefix}/`)) {
      return `${title} · ${BRAND}`;
    }
  }

  return BRAND;
}
