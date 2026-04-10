# 预览 DataHub：存储 API 与流程代码节点沙箱

本文说明预览运行时 `dataHub` 在**流程代码节点**中的能力：**按作用域隔离的存储**、以及**受限执行环境（黑盒）**。实现主要位于 `src/pages/PreviewEngine/runtime/dataHub.ts`、`flowCodeSandbox.ts`、`flowRuntime.ts`。

## 1. 背景与目标

- **存储**：原先无法在「只通过 `dataHub`」的前提下安全地做会话缓存或 `localStorage` 持久化（例如登录态）。现通过 **`dataHub.storage`** 暴露带前缀、按 **`scopeId`** 隔离的 API。
- **沙箱**：流程代码节点通过 `new Function('dataHub', 'ctx', …)` 执行，用户脚本与页面共享同一 JS 全局环境，存在直接访问 `window` / `fetch` / `localStorage` 等风险。现通过**词法遮蔽**与 **`dataHub.runtime` 白名单**，引导仅使用受控 API；并拦截部分危险源码模式。

> **说明**：浏览器主线程内无法达到与 Web Worker 或 iframe 完全等同的隔离；若未来需要强隔离，需将代码执行迁到 Worker 或独立文档环境。

## 2. `dataHub.storage`（`DataHubStorageContext`）

在 **`createCodeContext()`** 返回的 `dataHub` 上提供三类存储，键名均会按当前 **`scopeId`** 做命名空间，避免多预览实例互相覆盖。

| 分区 | 含义 | 典型用途 |
|------|------|----------|
| **`storage.memory`** | 进程内 `Map`，刷新页面即丢失 | 同一会话内临时状态 |
| **`storage.session`** | 封装 `sessionStorage` | 同标签页会话内有效 |
| **`storage.local`** | 封装 `localStorage` | 需跨刷新保留的数据（如登录态标记，仍建议与后端鉴权配合） |

每类均提供：**`get(key)`**、**`set(key, value)`**、**`remove(key)`**、**`clear()`**。

- **字符串**可原样存取；非字符串会经 **`JSON.stringify`** 写入，读取时尝试 **`JSON.parse`**，失败则返回原始字符串。
- Web Storage 在隐私模式或配额不足时可能静默失败，调用方需注意。

内部键前缀形如：`urpbuilder:dh:{scopeId}:sess:` / `loc:` 等（详见源码）。

## 3. `dataHub.runtime`（`DataHubRuntimeContext`）

沙箱内对若干**全局宿主 API** 做了遮蔽（见下节），网络与定时器应通过此处访问：

| 成员 | 说明 |
|------|------|
| **`runtime.fetch`** | 与原生 `fetch` 行为一致 |
| **`runtime.console`** | 提供 `log` / `info` / `warn` / `error` / `debug` |
| **`setTimeout` / `clearTimeout` / `setInterval` / `clearInterval`** | 与原生定时器一致 |

## 4. 流程代码节点沙箱行为（`flowCodeSandbox.ts`）

### 4.1 函数包装

用户可编辑的函数体（或从 `async function urpCodeNode(dataHub, ctx){…}` 抽取的体）会被包进：

```text
'use strict';
return (async () => {
  const window = undefined;
  const document = undefined;
  // … 见源码完整列表
  // 用户函数体
})();
```

从而在用户代码块内**直接**写 `window`、`document`、`fetch`、`localStorage` 等会得到**未定义或运行时报错**，迫使使用 `dataHub` 上 API。

### 4.2 源码级禁止

若函数体匹配以下模式，**构建执行器时会抛错**，并由运行时上报 `runtime:error`：

- `eval(`
- `new Function`
- 动态 `import('…')` 形式（简单正则，勿依赖其覆盖所有变体）

### 4.3 版本与缓存

常量 **`FLOW_CODE_SANDBOX_VERSION`** 变更时，流程运行时对代码节点的 **Function 缓存键**会包含该版本，避免旧缓存继续使用旧包装方式。

## 5. 相关文件

| 文件 | 职责 |
|------|------|
| `src/pages/PreviewEngine/runtime/dataHub.ts` | `PreviewDataHub`、`createCodeContext`、`storage` / `runtime` 实现 |
| `src/pages/PreviewEngine/runtime/flowCodeSandbox.ts` | 沙箱包装源码、禁止规则、版本号 |
| `src/pages/PreviewEngine/runtime/flowRuntime.ts` | 正式预览流程运行时执行代码节点 |
| `src/pages/PreviewEngine/debug/InstrumentedFlowRuntime.ts` | 调试版运行时，逻辑与上保持一致 |
| `src/constants/codeEditor.ts` | 代码编辑器补全：推荐 `dataHub.storage` / `dataHub.runtime` |

## 6. 与全局 `window.dataHub` 的关系

搭建/预览调试时可能仍把 **`PreviewDataHub` 实例**挂在 **`window.dataHub`** 上，便于在控制台检查。流程代码节点**入参**中的 `dataHub` 来自 **`createCodeContext()`**，为**精简上下文**（含 `storage`、`runtime` 等），与是否挂载 `window` 无关；沙箱内用户脚本**不应**依赖 `window.dataHub`。

## 7. 迁移建议（写给已有流程代码）

- 将 **`fetch(...)`** 改为 **`dataHub.runtime.fetch(...)`**。
- 将 **`localStorage` / `sessionStorage`** 改为 **`dataHub.storage.local` / `storage.session`**。
- 临时变量改用 **`dataHub.storage.memory`**。
- 避免使用 **`eval` / `new Function` / 动态 import**。

---

*文档版本与实现：`FLOW_CODE_SANDBOX_VERSION` 及 `DataHubCodeContext` 字段以源码为准。*
