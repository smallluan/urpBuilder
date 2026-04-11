# 动态列表 × 流程代码节点数据源

## 配置入口

- 仅 **动态列表** 组件的数据源类型中可选 **「流程代码节点」**（`type: 'flowCode'`）。
- 需在流程图中存在 **代码节点 → 组件节点** 的连线，且该组件节点的 `sourceKey` 与动态列表节点 `key` 一致。
- 在数据源对话框中选择上游 **代码节点 id**（`flowCodeNodeId`）。

## 输出契约（代码节点）

- 保存在流程代码节点的 `data.listOutputContract`：`{ fields: string[]; arrayPath?: string }`。
- **fields**：字段映射下拉的选项来源；在流程图右侧栏切换到 **「节点配置」**，选中该代码节点后，在 **「动态列表输出契约」** 中点击 **配置/编辑列表契约** 打开对话框，**粘贴 JSON** 或 **手填字段名** 生成。
- 未配置时画布节点仍会高亮提示，悬停说明指向右侧配置栏。
- **arrayPath**：当代码返回值是外层对象、数组在某一属性下时填写（点路径，与 `pickByPath` 一致）；若代码 **直接返回数组**，可留空。

## 与常量的关系

- `dataSourceConfig` 仅一种 `type`。选择 **常量** 时，流程连线不参与列表数据，也不会对代码节点提示缺契约。

## 预览行为

- 预览通过 `evaluateFlowCodeNodeForList` 直接执行代码节点（`dataHub` + `ctx`，生命周期占位事件），**取函数原始返回值**，再按 `arrayPath` 取数组并渲染。
- 代码宜返回 **对象数组**；若契约为「单条样本对象」且 `arrayPath` 为空，代码仍应返回 **数组**，否则行数可能不符合预期。

## 回归要点

- 常量数据源动态列表：映射与预览不变。
- `flowCode`：未配契约时代码节点高亮；配契约后映射可选字段；预览需页面级流程图上下文。

## 故障说明（历史问题）

- **红字 + 仍显示 3 条**：`dataHub` 在父组件 `useEffect` 中创建，子组件首次执行拉数时 `dataHubRef.current` 尚为 `null`，会误报「需要流程图」，且列表仍用设计态 `dataSource` 的 3 条演示数据。已通过 `PreviewRuntimeEpochContext` 在 hub 就绪后触发重试，并在 `flowCode` 失败时清空列表避免误导。
- **壳内「实时预览」失败、新标签页正常**：独立 `PreviewEngine` 页面已提供 `PreviewFlowGraphContext` / `PreviewRuntimeEpochContext`；搭建器内 `BuilderEmbeddedPreview` 曾未注入流程图 Context，导致 `flowCode` 无法解析代码节点。已在壳内与独立预览对齐 Provider。
