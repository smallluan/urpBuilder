import type { Completion } from '@codemirror/autocomplete';

export const CODE_EDITOR_THEME_OPTIONS = [
  { label: 'VSCode Dark', value: 'vscode-dark' },
  { label: 'VSCode Light', value: 'vscode-light' },
];

export const CODE_EDITOR_THEME_LABEL_MAP: Record<'vscode-dark' | 'vscode-light', string> = {
  'vscode-dark': 'VSCode Dark',
  'vscode-light': 'VSCode Light',
};

export const CODE_EDITOR_JS_GLOBAL_COMPLETIONS: Completion[] = [
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
    label: 'ctx.response',
    type: 'property',
    detail: '网络请求响应数据',
    info: '当上游为网络请求节点时，按 responsePath 注入的响应数据。',
  },
  {
    label: 'ctx.request',
    type: 'property',
    detail: '网络请求元信息',
    info: '包含 method/endpoint/status/ok/durationMs 等请求结果信息。',
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