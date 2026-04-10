/**
 * 流程「代码节点」执行沙箱：仅注入 dataHub / ctx，遮蔽常见宿主全局，避免直接访问 window。
 * 网络与持久化请使用 dataHub.runtime / dataHub.storage（白名单）。
 */

export const FLOW_CODE_SANDBOX_VERSION = 2;

const FORBIDDEN_SOURCE = /\beval\s*\(|\bnew\s+Function\b|\bimport\s*\(\s*['"]/;

/**
 * 生成 new Function('dataHub','ctx', body) 的函数体源码（返回 Promise）。
 * executableBody 为用户函数体（可含 await）。
 */
export function buildFlowCodeNodeFunctionSource(executableBody: string): string {
  const trimmed = executableBody.trim();
  if (FORBIDDEN_SOURCE.test(trimmed)) {
    throw new Error('代码包含禁止的语法：eval()、new Function(...) 或动态 import()');
  }

  /* 严格模式下不能声明 const eval = …，故不对 eval 做遮蔽；由正则拦截 eval( */
  return `'use strict';
return (async () => {
    const window = undefined;
    const document = undefined;
    const globalThis = undefined;
    const top = undefined;
    const parent = undefined;
    const self = undefined;
    const frames = undefined;
    const location = undefined;
    const localStorage = undefined;
    const sessionStorage = undefined;
    const indexedDB = undefined;
    const fetch = undefined;
    const Function = undefined;
    const navigator = undefined;
    const XMLHttpRequest = undefined;
    const WebSocket = undefined;

${trimmed}
})();`;
}
