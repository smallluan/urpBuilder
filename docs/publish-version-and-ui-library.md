# 发布版本与预览组件库（TDesign / Ant Design）

本文说明：**草稿保存与版本号的关系**、**页面与自定义组件在「预览库」上的不同约定**，以及**历史数据默认行为**。

## 版本号语义

- **仅保存草稿**（`PUT /page-template/:id` 等草稿更新路径）**不会**递增 `current_version`。草稿阶段版本可视为 **0**（未产生发布版本）。
- **仅发布**会递增版本：从当前已发布版本（或草稿基线）`+1`，第一次从纯草稿发布一般为 **v1**。
- **修改可见性**（公开/私有）、**撤回为草稿**等操作**不**为「新版本」，不递增版本号。

业务含义：**版本号只对应「已发布快照」**，而不是每次 Ctrl+S。

## 预览组件库：仅页面锁定；组件跟随宿主

| 资源类型 | 发布时 | 持久化 | 运行时 |
|----------|--------|--------|--------|
| **页面**（`entityType: page`） | 必选 **TDesign** 或 **Ant Design**，请求体带 `previewUiLibrary` | 写入 `template.pageConfig.previewUiLibrary` 与 `page_templates.published_ui_library` | 独立预览 / 站点预览按页面快照解析 |
| **自定义组件**（`entityType: component`） | **不**选库、**不**传 `previewUiLibrary` | **不**写入上述字段（草稿保存时也会去掉 `pageConfig.previewUiLibrary`） | 被页面或其它组件引用时，**跟随宿主**的 `PreviewUiLibraryContext`（与搭建器内嵌预览一致） |

组件在编辑器里切换顶栏「预览库」仅影响**当前编辑会话**的画布/预览，**不会**作为组件模板的发布属性落库。

### 页面：字段位置

| 位置 | 说明 |
|------|------|
| 请求体 `previewUiLibrary` | 页面发布（`POST /page-template/publish`）携带；缺省或非法值时后端按 **`tdesign`** 处理。 |
| 模板 JSON `pageConfig.previewUiLibrary` | 仅页面实体的已发布模板写入。 |
| 表 `page_templates.published_ui_library` | 仅页面行有意义；组件发布时写入 **NULL**。 |

### 兼容旧数据

- 无 `previewUiLibrary`、无 `published_ui_library` 的历史**页面**：**一律按 TDesign** 解析与预览。
- 历史组件 JSON 里若曾带有 `previewUiLibrary`，GET 详情时会**去掉**该字段，避免误以为是组件自身属性。

## 前端入口

1. **搭建页面**顶栏（保存并发布）：对话框内必选「发布为」TDesign 或 Ant Design，随 `publishPage` 发送 `previewUiLibrary`。
2. **搭建组件**顶栏（保存并发布）：**无**库选择；`publishComponent` 仅传 `pageId`。
3. **页面列表**（`BuildPage`）：发布对话框必选库，调用 `publishPage({ pageId, previewUiLibrary })`。
4. **组件列表**（`BuildComponent`）：直接发布，调用 `publishComponent({ pageId })`。

## 运行时 / 解析引擎

页面预览从 **`pageConfig.previewUiLibrary`**（及后端合并后的快照）读取；非 `antd` 时按 **TDesign** 处理。详见 `preview-component-library.md`。

自定义组件在 `PreviewRenderer` 内由**外层** `PreviewUiLibraryContext` 包裹，与宿主页面一致。

通过 **`?pageId=`** 拉取**页面**模板打开独立预览时，须把接口返回的 `template.pageConfig.previewUiLibrary` 写入快照（见 `PreviewEngine/index.tsx` 的 `remoteSnapshot`）。

单独打开 **组件**预览（`entityType=component`）且无快照时，默认按 **TDesign**；嵌入页面后则由页面上下文覆盖。

## 相关代码（索引）

- 后端：`urpBuilder-backend/src/services/page-template.service.ts`（`mergePreviewUiLibraryIntoTemplate`、`normalizeDraftPayload` 对 component 去掉 `previewUiLibrary`、`composeTemplateDetail` 对 component 不回填库）。
- 前端：`HeaderControls.tsx`、`BuildPage/index.tsx`、`BuildComponent/index.tsx`。
- 类型：`urpBuilder/src/api/types.ts`（`PublishPagePayload.previewUiLibrary`；`PublishComponentPayload` 可不传）。
