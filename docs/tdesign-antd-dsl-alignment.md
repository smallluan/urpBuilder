# TDesign / Ant Design：同一套 DSL 下的对齐约定

本文档记录 **同一 `UiTreeNode` + `__style` / props** 在切换预览组件库（TDesign ↔ Ant Design）时，为减少观感与布局偏差而做的 **刻意对齐** 与 **禁止回退点**。

实现代码集中在：

- `src/utils/antdTdesignPropBridge.ts`（映射与样式拆分）
- `src/builder/renderer/registries/antdComponents.tsx`（搭建态 antd 注册）
- `src/pages/PreviewEngine/components/previewAntdNodes.tsx`（预览态 antd 分支）

修改上述行为时，请 **同步更新本文档** 与 `antdTdesignPropBridge.ts` 内注释，避免后续「只改一处」把对齐改回去。

---

## 总原则

| 原则 | 说明 |
|------|------|
| DSL 语义一致 | 用户侧仍是一套 TDesign 命名空间 schema；antd 为**近似还原**，不要求像素级一致，但**布局语义**（宽高百分比、占行、是否铺满）应一致。 |
| 样式落点一致 | 若 TDesign 把某类样式打在**外层容器**上，antd 侧也应落在**对应外壳**（如 `styles.root`），而不是只打在内部 `<img>` 上，除非文档明确说明例外。 |
| 避免双重百分比 | 同一套 `mergeStyle()` **不要**同时叠在外壳与内层可替换元素上各算一遍 `width: 50%`，否则会出现「壳 50% × 内层再 50% ≈ 视觉 25%」。 |

---

## Image（`Image` / `antd.Image`）

### 现象与根因

- **TDesign**：`style`（含 `__style` 合并结果）作用在组件 **外层 wrapper** 上，整颗图片区域（壳）与 DSL 宽度一致。
- **Ant Design（`@rc-component/image`）**：若把 DSL 只通过 **`style` 属性** 传给组件，会叠在 **`<img>`** 上；外层 `.ant-image` 仍可能为 `inline-block` 或单独占满一行，易出现「壳宽与图宽不一致」。
- 若再给 **外层** 固定 `width: 100%`、同时 **`<img>`** 上又有 DSL 的 `width: 50%`，则会出现 **壳 100%、图 50%**，与 TDesign 的「整颗 50%」不一致。

### 约定（请勿改回去）

1. **antd 搭建与预览**（`antdComponents` / `previewAntdNodes` 中 `antd.Image`）  
   - 使用 **antd 5 语义 API**：`styles.root` + `styles.image`。  
   - **整段 DSL 合并样式**（`mergeStyle()`）放进 **`styles.root`**，与 TDesign `Image` 的**外层 wrapper** 语义一致。  
   - **`styles.image`** 只负责在壳内铺满：`width: 100%`、`height: 100%`、`objectFit`（来自 DSL，默认 `cover`）、`verticalAlign: middle`。  
   - **不要**再对 antd `Image` 传入 **`style={merged}`**（或等价地经 `ActivateWrapper` 把 `mergeStyle` 叠到 `style` 上），否则 rc-image 仍会叠到 `<img>`，与 `styles.root` 重复计算宽高，或再次出现「壳/图宽度不一致」。

2. **实现入口**  
   - 辅助函数：`antdImageStylesFromMergeStyle(merged)`（`antdTdesignPropBridge.ts` 内注释与实现一致）。

3. **TDesign 搭建态 `Image`**（`displayComponents.tsx`）  
   - **不要**再包一层 `div` 且对 **外壳与 `Image` 各写一遍** `mergeStyle()`。  
   - 仅通过 **`ActivateWrapper` 的 `style={mergeStyle()}`** 合并到 **单个** `Image` 子节点，拖拽事件绑在 `Image` 上，避免「壳 50% × 内层再 50%」。

### 回归自检（改代码后建议看一眼）

- DSL：`__style.width: '50%'` 时，TDesign / antd 下**整块图片区域**是否均为父宽度的约一半（而非「壳满宽、图仅一半」）。  
- 无 `width` 仅 `height` 的 Banner 场景：仍应铺满父级可用宽度（历史问题曾通过「只给 img 设宽」与「根节点 inline-block」导致铺不满，见 `styles.root` 与语义 API 方案）。

---

## 其他桥接（索引）

以下逻辑以 `antdTdesignPropBridge.ts` 为准，此处仅作索引，便于搜到：

| 主题 | 说明 |
|------|------|
| Card / CardBody | `BUILDER_CARD_BODY_STYLE`：统一两套 Card 内容区内边距。 |
| Statistic | `antStatisticRootStyleMerge`、`statisticColorStyle`：根节点与颜色 token。 |
| Divider | `dividerOrientationFromAlign` |
| Typography.Title | `antTitleLevelFromTdesign` |
| Button | `mapTdesignButtonToAntd` |
| Space | `antdSpaceSizeFromTdesign` |
| Table | `tdesignTableColumnsToAntd`、`resolveAntdTableDataSource` |
| Drawer 尺寸 | `drawerWidthPxFromTdesignSize` |

---

## 相关文档

- [预览组件库总览](./preview-component-library.md)（分发、镜像表、预览壳）  
- [画布 block/inline 布局](./builder-component-layout.md)（与 `ActivateWrapper`、`display: contents` 相关，勿与 Image 双写 `mergeStyle` 混为一谈）
