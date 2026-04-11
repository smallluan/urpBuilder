# 搭建器：模拟器叠层挂载、左侧树滚动与相关改动说明

> **说明**：撰写本文时仓库 **暂存区为空**（`git add` 尚未执行）。以下内容依据 `urpBuilder` 目录下 **工作区相对 `HEAD` 的改动**（`git diff` + 未跟踪文件）整理；若你已将同一批文件 `git add` 进暂存区，可直接把本文当作该次提交的变更说明。

---

## 1. 背景与目标

1. **Drawer / 蒙层**：搭建与嵌入式预览中，抽屉与遮罩应固定在 **模拟器视口** 内，不随页面滚动位移，且蒙层应覆盖模拟器区域而非整页主窗口。
2. **左侧组件树**：取消「激活节点即自动滚到树节点」的默认行为，改为 **手动「定位」按钮**；快捷查找等仍可通过既有 `requestUiStructureTreeScrollToKey` 流程滚动。
3. **树激活 vs 模拟器滚动**：在左侧树选中 **抽屉** 等类型时，模拟器 **不自动滚到占位 DOM**（层级与展示无关、portal 到叠层）；其他组件保持原有「视口外则滚入」逻辑。
4. **结构树虚拟滚动**：行高与样式对齐，避免虚拟列表滚动错位。

---

## 2. 新增文件

| 文件 | 作用 |
|------|------|
| `src/builder/context/SimulatorOverlayContainerContext.tsx` | 提供「叠层根」DOM 的 getter（`() => HTMLElement`），供 Drawer / Dialog / Popup 等 **portal 挂载**，与滚动层 `SimulatorScrollContainerContext` 分离。 |
| `src/builder/utils/simulatorTreeActivationScroll.ts` | `SIMULATOR_SKIP_SCROLL_ON_TREE_ACTIVATION_TYPES`（`Set<string>`）与 `shouldSkipSimulatorScrollOnTreeActivation(node)`；在树激活时跳过模拟器自动滚动的组件类型（当前含 `Drawer`、`antd.Drawer`），后续扩展只需往 Set 追加 `node.type`。 |

---

## 3. 修改文件摘要

### 3.1 模拟器与挂载

- **`src/builder/renderer/ComponentBody.tsx`**
  - 增加 `simulatorOverlayRef` / `mainSimulatorOverlayEl`、`simulatorOverlayMountFn`。
  - 在 `.simulator-container` 内：`.simulator-scroll` 与 **兄弟节点** `.simulator-overlay-root`（`data-builder-overlay-container="main"`）并列；外层包 `SimulatorOverlayContainerContext.Provider`。
  - `activeNodeKey` 变化触发的模拟器滚动：在隐藏提示逻辑之后，若 `shouldSkipSimulatorScrollOnTreeActivation(activeNode)` 为真则 **不执行** `scrollIntoView`。
  - 上述 `useEffect` 依赖由 `[activeNodeKey]` 调整为 **`[activeNodeKey, uiPageData]`**。

- **`src/builder/renderer/CommonComponent.tsx`**
  - `getBuilderDrawerAttach` 改为指向 **叠层根**（`getSimulatorOverlayEl`），通过 `SimulatorOverlayContainerContext`；回退顺序含 `[data-builder-overlay-container]`，再回退滚动容器 / `document.body`。
  - 移除未使用的 `SimulatorScrollContainerContext` 导入（原用于旧 `getSimulatorMountEl`）。

- **`src/builder/renderer/propAccessors.tsx`**
  - `getBuilderDrawerAttach` 回退：优先 `[data-builder-overlay-container]`，再 `[data-builder-scroll-container="true"]`，最后 `document.body`。

- **`src/builder/components/BuilderEmbeddedPreview.tsx`**
  - 嵌入式预览的 **预览 portal 挂载**（`embeddedPreviewPortalMount`）改为指向 **`data-builder-overlay-container="embedded"`** 的叠层节点，而非滚动层。
  - 增加 `simulator-overlay-root` 兄弟节点与对应 ref；去掉仅用于旧逻辑的 `embeddedSimulatorScrollEl` state。

### 3.2 样式

- **`src/builder/style.less`**
  - **`.simulator-overlay-root`**：`position: absolute; inset: 0; z-index: 50; overflow: hidden; pointer-events: none`；子节点 `pointer-events: auto`。
  - **`contain: layout paint style`**：使内部 `position: fixed`（如 TDesign Drawer 蒙层）的包含块为叠层根，**限制在模拟器内**，避免铺满浏览器视口。
  - 左侧结构 **`.structure-locate-btn`**：定位按钮样式（与 `.search-row` 配合）。
  - 其他与结构树/搜索行相关的样式增量（以实际 diff 为准）。

### 3.3 左侧组件树与快捷查找

- **`src/builder/components/ComponentAsideLeft.tsx`**
  - 移除「`activeNodeKey` 变化即 `requestUiStructureTreeScrollToKey`」的 `useLayoutEffect`。
  - 增加 **`handleLocateActiveNode`** 与搜索行旁的 **定位按钮**（`LocateFixed` 图标），仅在用户点击时请求滚动到当前激活节点。

- **`src/builder/components/BuilderQuickFind.tsx`**
  - UI 匹配不再单独调用 `requestUiStructureTreeScrollToKey`（由侧栏在需要时统一处理或用户点击定位；以当前代码为准）。

### 3.4 结构树虚拟滚动配置

- **`src/builder/config/builderStructureTreeScroll.ts`**
  - 导出 `BUILDER_STRUCTURE_TREE_ROW_HEIGHT`（如 `30`），与样式中行高一致；`BUILDER_STRUCTURE_TREE_SCROLL.rowHeight` 使用该常量并补充注释。

### 3.5 右侧面板

- **`src/builder/components/ComponentAsideRight.tsx`**
  - 当 `activeNodeKey` 变为空时（例如删除选中节点），将模式从 `config` **切回 `library`**，避免停在空配置面板。

### 3.6 其他

- **`src/builder/context/SimulatorScrollContainerContext.tsx`**：若仅有换行符（CRLF）等无实质差异，以 `git diff` 为准；注释仍说明滚动层用于 BackTop 等与 Drawer 叠层区分。

---

## 4. 验证建议

1. 搭建页：打开 Drawer，蒙层与抽屉应 **仅在手机框内**，滚动页面内容时 **不随内容卷走**。
2. 左侧树：选中普通节点，模拟器仍在视口外时 **自动滚入**；选中 **Drawer**，模拟器 **不自动滚动**。
3. 点击左侧 **定位** 按钮，树应 **滚到当前激活节点**（含展开祖先 + `Tree.scrollTo`）。
4. 嵌入式预览：Drawer 仍应挂在 **嵌入式叠层根**，而非整页 `body`。

---

## 5. 文件列表（便于 `git add` / 审阅）

**新增**

- `src/builder/context/SimulatorOverlayContainerContext.tsx`
- `src/builder/utils/simulatorTreeActivationScroll.ts`

**修改**（工作区相对 HEAD，`git diff --stat` 约 9 个文件 + 上述新增）

- `src/builder/components/BuilderEmbeddedPreview.tsx`
- `src/builder/components/BuilderQuickFind.tsx`
- `src/builder/components/ComponentAsideLeft.tsx`
- `src/builder/components/ComponentAsideRight.tsx`
- `src/builder/config/builderStructureTreeScroll.ts`
- `src/builder/context/SimulatorScrollContainerContext.tsx`（若有实质 diff）
- `src/builder/renderer/CommonComponent.tsx`
- `src/builder/renderer/ComponentBody.tsx`
- `src/builder/renderer/propAccessors.tsx`
- `src/builder/style.less`

---

*文档生成环境：`urpBuilder` 仓库，`main` 分支，工作区有未提交改动。*
