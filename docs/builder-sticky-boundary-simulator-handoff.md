# 搭建器：吸顶容器（StickyBoundary）与模拟器相关 CSS 说明

> 本文记录 **吸顶** 在「独立预览」与「搭建模拟器」中行为对齐所需的约束，以及 **灵动岛状态栏** 背景等与本次迭代相关的改动。后续若调整模拟器布局、`contain`、`overflow` 或组件库过渡层样式，请先对照本文，避免把吸顶再次改坏。

---

## 1. 吸顶：产品形态与实现选型

### 1.1 组件职责

- 画布中的 **「吸附边界 / StickyBoundary」** 由 `StickyBoundaryHost`（`src/builder/components/StickyBoundaryHost.tsx`）渲染。
- 使用 **原生 `position: sticky`**（配合 `top`、`z-index` 等），**不使用** TDesign `Affix`。

### 1.2 为何不用 TDesign Affix

- `Affix` 内部依赖 **`position: fixed`** 相对视口或指定 `container` 计算位置。
- 模拟器历史上为隔离 Drawer 等，曾对滚动层使用较强的 **`contain`**；在 `contain: layout` 等环境下，`fixed` 的包含块会落在模拟器内部，`Affix` 的表现会退化为类似 **`absolute` 相对错误祖先**，与独立预览页（整页滚动、无该 contain）不一致。
- 因此统一采用 **`position: sticky`**：粘附边界由 **最近的 `overflow` 滚动祖先** 决定，与预览页语义一致。

### 1.3 若将来改回 Affix 或自研 fixed 定位

必须先确认：  
（1）滚动容器与 portal 叠层结构未变；  
（2）下方 **2.2、2.3** 中的约束仍满足；  
否则极易在搭建态复现「预览好用、搭建不吸顶」或「吸一下又被顶走」。

---

## 2. 吸顶在搭建模拟器里必须满足的条件（重点）

以下三条是 **搭建态与预览态行为一致** 的关键。**任意一条被改回错误写法，都可能导致吸顶失效或表现异常。**

### 2.1 `.simulator-scroll` 的 `contain`：不要用 `layout` / `paint` 去挡 sticky

- **文件**：`src/builder/style.less`（`.simulator-scroll` 规则块）。
- **现状**：使用 **`contain: style`**（仅样式隔离），**不要** 在 `.simulator-scroll` 上恢复 **`contain: layout paint`**（或等价组合）。
- **原因**：在 Chromium 系浏览器中，滚动层上的 **`layout` / `paint` 级 containment** 会与 **`position: sticky`** 的滚动祖先计算冲突，导致搭建态 sticky **不生效或表现异常**。
- **Drawer / 蒙层**：仍通过 **`SimulatorOverlayContainerContext`** 挂载到 **` .simulator-overlay-root`**；该节点可保留 **`contain: layout paint style`**，与滚动层分离，见 `docs/builder-simulator-overlay-tree-scroll-handoff.md`。

### 2.2 `.simulator-library-brush-root` 的 `overflow`：必须是 `clip`，不能是 `hidden`（搭建态关键）

- **文件**：`src/builder/components/SimulatorLibraryBrushOverlay.less`（`.simulator-library-brush-root`）。
- **现状**：**`overflow: clip`**（不是 `hidden`）。
- **原因**：在 CSS 中，`overflow: hidden` 会在该元素上建立 **scroll container**。  
  `.simulator-library-brush-root` 位于 **`.simulator-scroll` 与页面内容之间**。若使用 `hidden`，则 **`position: sticky` 的「最近滚动祖先」会变成这个不滚动的根节点**，而不是真正滚动的 `.simulator-scroll`，表现为 **搭建态吸顶完全无效**；独立预览页没有这一层，因此 **只有搭建态坏、预览正常**。
- **`overflow: clip`**：同样可以裁剪溢出（组件库切换过渡时裁掉流光硬边），但 **不创建 scroll container**，sticky 仍能向上找到 **`.simulator-scroll`**。
- **请勿** 为「裁剪」把此处改回 **`overflow: hidden`**，除非同时用其它方式消除多余的 scroll container（一般不如保持 `clip`）。

### 2.3 `StickyBoundaryHost` 必须渲染子节点

- **文件**：`src/builder/components/StickyBoundaryHost.tsx`。
- 内层容器 **必须** 渲染 **`{children}`**（由外层 `DropArea` 注入）。若写成自闭合 `div`，会出现 **拖入子组件后画布上看不见** 的问题。

### 2.4 与预览引擎的一致性

- **预览**：`src/pages/PreviewEngine/components/PreviewRenderer.tsx` 中 `StickyBoundary` 分支使用 **`StickyBoundaryPreview`**（与 Host 同源实现）。
- 属性侧已去掉与 CSS sticky 语义不符的 **`offsetBottom`**（仅保留顶吸相关配置），以 `componentCatalog` / registry 为准。

---

## 3. 灵动岛状态栏背景（主题色实底）

- **文件**：`src/builder/style.less`（`.simulator-device-chrome--dynamic-island`）。
- **目的**：灵动岛条在 **浮于滚动内容之上**（`position: absolute`）；若背景 **透明**，吸顶等内容从下方滚过时 **会透出**，观感脏。
- **做法**：背景使用 **`var(--builder-simulator-device-bg)`**（亮色约白、暗色与 `builder-tokens` 中模拟器屏底色一致），并在 **`theme-mode='dark'`** 下将栏内文字与图标（含 `.simulator-device-chrome__time`）改为浅色，保证对比度。
- **请勿** 改回 **`background: transparent`**，除非同时接受吸顶/滚动时的透底问题。

---

## 4. 相关文件清单（便于 code review / 回归）

| 区域 | 路径 |
|------|------|
| Sticky 宿主组件 | `src/builder/components/StickyBoundaryHost.tsx` |
| 搭建 registry | `src/builder/renderer/registries/layoutComponents.tsx`（`StickyBoundary`） |
| 预览渲染 | `src/pages/PreviewEngine/components/PreviewRenderer.tsx`（`StickyBoundary`） |
| 模拟器滚动层样式 | `src/builder/style.less`（`.simulator-scroll`、`.simulator-device-chrome--dynamic-island`） |
| 组件库过渡根（overflow clip） | `src/builder/components/SimulatorLibraryBrushOverlay.less` |
| 主题令牌（屏底色） | `src/builder/styles/builder-tokens.less`（`--builder-simulator-device-bg`） |

---

## 5. 回归检查（改模拟器样式前建议跑一遍）

1. **搭建态**：页面纵向内容明显超过模拟器高度；放入 **吸附边界**，内部再放块级内容；向下滚动，吸顶条应 **粘在 `.simulator-scroll` 视口顶**（扣除 `top`），且 **与独立预览行为一致**。
2. **Drawer**：仍固定在模拟器叠层内、不随正文滚动条「整块滚走」（见叠层文档）。
3. **灵动岛**：滚动时状态栏区域为 **实色底**，无透明叠在内容上的「发花」感。

---

## 6. 关联文档

- `docs/builder-simulator-overlay-tree-scroll-handoff.md`：模拟器 **叠层挂载**、树滚动、Drawer 等，与本文 **2.1** 中的 `.simulator-overlay-root` 分工互补。
