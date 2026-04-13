# 搭建器画布：组件「整行宽 / 内容宽」布局体系

本文档说明 **为什么** 需要 `data-builder-display` 与 `componentLayoutType`，以及 **以后改代码时不能随意改回去** 的原因与维护方式。

## 背景与问题

画布根节点（`.drop-area-root`）里，子节点在 **纵向 flex + `align-items: stretch`** 下排布，这样 **Card、Tabs、Table、折叠面板** 等块级容器会自然占满一行。

但 **按钮、开关、时间选择器、颜色选择器** 等控件若也被 `stretch` 拉满，在模拟器里会「占一整行」，与真实页面中「按内容宽度」的观感不一致。

历史上曾用 **`DropArea/index.less` 里一长串直接子选择器**（例如 `.drop-area__body > .ant-btn`）给这些控件加 `align-self: flex-start`。这在 **`ActivateWrapper` 改为外层 `div` + `display: contents`** 之后 **失效**：

- `display: contents` 的节点在 **布局上不参与**，控件的真实 DOM 根节点变成 **孙辈**，不再是 `.drop-area__body` 的 **直接子元素**。
- 选择器里的 **`>`（直接子）** 对不上，整段「按 class 白名单」的规则会悄悄失效，表现为控件又全部拉满一行。

因此：**不能** 指望「只改 CSS、按 class 列控件」长期可靠，除非同时改掉 `ActivateWrapper` 的 DOM 结构。

## 当前方案（请勿无说明地回退）

采用 **显式布局类型 + 数据属性 + 少量统一 CSS**，与 DOM 结构解耦。

| 环节 | 文件 | 作用 |
|------|------|------|
| 类型表与默认值 | `src/builder/renderer/componentLayoutType.ts` | `INLINE_TYPES`：哪些 **registry 类型名** 视为「内容宽」；未列入则 **block（整行宽）**。 |
| 上下文 | 同上文件的 `ComponentLayoutContext` | 把当前节点的布局类型传给子树。 |
| 注入点 | `src/builder/renderer/CommonComponent.tsx` | 用 `getComponentLayoutType(registryLookupType)` 包住 `renderer(ctx)`，**无需改每个 registry**。 |
| 属性 | `src/builder/renderer/componentHelpers.tsx` 的 `ActivateWrapper` | 在 **带 `display: contents` 的外层 div** 上写 `data-builder-display="block" \| "inline"`。 |
| 样式 | `src/components/DropArea/index.less` | 用 `[data-builder-display="inline"] > * { align-self: flex-start; }`（根画布与路由出口各一处），**不再维护按组件 class 的长列表**。 |

### 为什么用 `data-builder-display` 挂在 ActivateWrapper 上

- 该 div 虽为 `display: contents`，在 **DOM 树** 上仍是父节点；其 **直接子元素** 就是画布 flex 里的真实子项，`align-self` 作用在子项上正确。
- 布局语义与 **registry 类型名** 一一对应，不依赖第三方组件根节点的 class 是否变化。

## 新增或调整组件时怎么做

1. **在 `componentLayoutType.ts` 的 `INLINE_TYPES` 里登记类型字符串**（与 `registry.set('xxx', …)` 的 key 完全一致）。
2. **默认策略**：未登记 → **block**（偏安全：避免把本该整行的容器缩成一条）。
3. **典型 inline**：按钮、链接、图标、开关、各类输入/选择/上传触发器等 **单行控件**。
4. **典型 block**：Card、Tabs、Collapse、Table、List、Divider、图表、整页级布局容器等。

若某控件需要 **整行**（例如 `Textarea`、`Slider`），**不要** 放进 `INLINE_TYPES`（当前即为 block）。

### 库差异示例：`Progress`

- **`Progress`（TDesign）** 未列入 `INLINE_TYPES`，使用 **block**：其根节点在 `inline` + `align-self: flex-start` 时条形容器宽度会塌缩，与 **antd.Progress** 在画布上的观感不一致；antd 侧仍可为 `inline` 因其内部样式仍能撑满。
- 若以后 TDesign 与 antd 表现对齐，可再统一两边的布局类型。

## 若有人想「改回旧写法」请先读这段

- **仅恢复** `DropArea` 里对 `.ant-btn`、`.t-button` 等的长列表 **而不恢复** 旧的 `ActivateWrapper` 结构 → **问题会再次出现**（直接子选择器仍对不上）。
- **若改 `ActivateWrapper`**（例如去掉 `display: contents` 或改成 `cloneElement` 把事件绑在子节点上）→ 需同时评估 **TDesign 等库对 `onClick` / 透传** 的行为，避免再次引入「点不中 / 激活错位」类问题；并与本布局体系 **一起** 验收。

## 相关文件清单（修改布局行为时请同步更新本文档）

- `src/builder/renderer/componentLayoutType.ts`
- `src/builder/renderer/CommonComponent.tsx`
- `src/builder/renderer/componentHelpers.tsx`（`ActivateWrapper`）
- `src/components/DropArea/index.less`
- `src/components/DropArea/index.tsx`（非根 `DropArea` 使用 `drop-area--nested-host`，避免 `display: contents` 导致拖拽命中落到根画布；详见 [radio-group-dsl.md](./radio-group-dsl.md) 风险与注意点）

---

*文档对应实现：画布子项在 flex column 下区分 block/inline，避免控件被错误拉满整行，同时保持块级容器默认整行宽。*
