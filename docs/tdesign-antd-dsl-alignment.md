# TDesign / Ant Design：同一套 DSL 下的对齐约定

本文档记录 **同一 `UiTreeNode` + `__style` / props** 在切换预览组件库（TDesign ↔ Ant Design）时，为减少观感与布局偏差而做的 **刻意对齐** 与 **禁止回退点**。

实现代码集中在：

- `src/utils/antdTdesignPropBridge.ts`（映射与样式拆分）
- `src/builder/renderer/registries/antdComponents.tsx`（搭建态 antd 注册）
- `src/pages/PreviewEngine/components/previewAntdNodes.tsx`（预览态 antd 分支）
- `src/builder/renderer/tdesignInputField.tsx`（TDesign `Input` 搭建/预览共用：字数统计与 DSL 对齐）

修改上述行为时，请 **同步更新本文档** 与 `antdTdesignPropBridge.ts` 内注释，避免后续「只改一处」把对齐改回去。

---

## 总原则

| 原则 | 说明 |
|------|------|
| DSL 语义一致 | 用户侧仍是一套 TDesign 命名空间 schema；antd 为**近似还原**，不要求像素级一致，但**布局语义**（宽高百分比、占行、是否铺满）应一致。 |
| 样式落点一致 | 若 TDesign 把某类样式打在**外层容器**上，antd 侧也应落在**对应外壳**（如 `styles.root`），而不是只打在内部 `<img>` 上，除非文档明确说明例外。 |
| 避免双重百分比 | 同一套 `mergeStyle()` **不要**同时叠在外壳与内层可替换元素上各算一遍 `width: 50%`，否则会出现「壳 50% × 内层再 50% ≈ 视觉 25%」。 |

---

## 图标（DSL，Lucide）

业务图标在 DSL 中统一为 **Lucide 图标名**，经 `renderNamedIcon` 渲染；TDesign 与 antd 仅插槽形状不同，字段与数据源一致。详见 [icon-dsl.md](./icon-dsl.md)。

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

## Input / Textarea（`Input` / `antd.Input` / `Textarea` / `antd.Textarea`）

### TDesign `Input`：「显示字数统计」为何不单独生效

TDesign 内部 `useLengthLimit` 仅在配置了 **`maxlength` 或 `maxcharacter` 之一** 时才会算出非空的 `limitNumber` 字符串；仅打开 `showLimitNumber` 而未设上限时，`limitNumber` 为空，**不会渲染**内置计数节点（见 `tdesign-react` 的 `useLengthLimit.js` / `Input.js`）。

为与 antd 侧「无上限也可显示当前长度」的体验对齐，项目在：

- `src/builder/renderer/tdesignInputField.tsx` 的 `BuilderTdesignInputField`

中约定：

- 若 **`showLimitNumber` 且已设上限**（`maxlength > 0` 或 `maxcharacter > 0`）：交给 TDesign 原生 `showLimitNumber` + 上限逻辑。
- 若 **`showLimitNumber` 且未设上限**：关闭原生 `showLimitNumber`，在 **`suffix`** 中显示当前字数（随输入更新）。

搭建态（`formComponents.tsx`）与 TDesign 预览态（`PreviewRenderer.tsx` 的 `Input` 分支）均使用该组件。

### Ant Design `Input`：DSL → antd props

同一套 DSL 字段名仍以 TDesign 物料为准；antd 侧通过 `mapTdesignInputPropsToAntd`（`antdTdesignPropBridge.ts`）映射，例如：

- `clearable` → `allowClear`
- `borderless` → `variant="borderless"`
- `align` → 通过 `styles` 落在输入层（避免只写在外层无效）
- `status`：`error` / `warning` 走 antd；`success` 用绿色描边/阴影模拟
- `autoWidth`：`fit-content` + `inline-flex` 等，避免外层仍占满一行
- `showLimitNumber` + `maxlength`/`maxcharacter` → `showCount` / `maxLength`

搭建：`antdComponents.tsx`；预览：`previewAntdNodes.tsx`。

### 受控模式（两套库共通）

当 DSL **`controlled` 为 true**（默认）：画布/预览中 **不再把输入结果写回** 节点的 `value`，输入框表现为「只展示当前 DSL 中的值」。需要改文案请在右侧属性面板编辑 **`value`**。非受控模式下输入仍会同步到 DSL。

### 已从 `Input` 物料移除的属性（面板 + 渲染不再使用）

以下字段已从 `componentCatalog` 的 `Input` 定义中移除，旧模板里若仍存在将被忽略：

- `className`、`style`（组件级内联样式/类名）
- `autocomplete`（自动填充）
- `allowInputOverMax`（超长继续输入）
- `spellCheck`（拼写检查）

更完整的变更说明见：[输入框 DSL 与双库行为说明](./input-field-dsl.md)。

### `InputNumber`（数字输入框）

- **受控**：与 `Input` 相同，`controlled === true` 时不把修改写回 DSL `value`（搭建与 TDesign/antd 预览均已对齐）。
- **已从物料移除**：`allowInputOverLimit`、`autoWidth`、`largeNumber`（见 `componentCatalog`）。
- **antd 映射**：`mapTdesignInputNumberPropsToAntd`（`decimalPlaces`→`precision`、`theme: normal`→`controls: false`、`align`/`status: success` 等），详见 [input-field-dsl.md](./input-field-dsl.md)。

---

## Switch（`Switch` / `antd.Switch`）

### 现象与根因

- **TDesign**：`Switch` 支持三档尺寸 `small`/`medium`/`large`，默认 `medium`（高约 22px）。`mergeStyle()` 落在 `ActivateWrapper` 上，不会直接约束 Switch 的 `<button>` 元素。
- **Ant Design**：`Switch` 仅支持 `default` 与 `small` 两档。若将 `mergeStyle()`（含用户设置的 `__style`）直接放在 `<Switch style={...}>` 上，外部 `width`/`height` 等属性会扭曲开关形状（表现为变窄、变扁）。

### 约定（请勿改回去）

1. **antd 预览**（`previewAntdNodes.tsx` 的 `antd.Switch`）  
   - `mergeStyle()` 放在 **外层 `<span>`** 上，**不要**传给 `<Switch style={...}>`，与搭建态 `ActivateWrapper` 的样式落点一致。  
   - `size` 映射：TDesign `small` → antd `size="small"`；TDesign `medium`/`large` → antd 默认（不传 `size`）。  

2. **antd 搭建**（`antdComponents.tsx` 的 `antd.Switch`）  
   - `mergeStyle()` 仍在 `ActivateWrapper` 上（已有行为），Switch 本身不额外传 `style`。  
   - `size` 同样映射。

### 回归自检

- 默认 `size: medium` 时，TDesign 预览与 antd 预览的开关高度应接近（均为 ~22px）；antd 稍有差异可接受，但不应出现明显变窄/变扁。
- 若用户在样式面板设置了 `__style`（如 `margin`、`opacity`），antd Switch 的外壳应响应，但 Switch 控件本身不被拉伸或压缩。

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
| Input / Textarea | `mapTdesignInputPropsToAntd`、`mapTdesignTextareaPropsToAntd`、`parseDslAutosizeValue`；TDesign 专用 `BuilderTdesignInputField` |
| InputNumber | `mapTdesignInputNumberPropsToAntd` |
| Switch | 尺寸映射（`small`→`small`，其余→默认）；`mergeStyle()` 放外层 `<span>`，不放 Switch `style` |
| DSL 图标（Lucide） | `renderNamedIcon`、`resolveIconName`（`iconRegistry.ts`）；见 [icon-dsl.md](./icon-dsl.md) |

---

## 相关文档

- [DSL 图标契约（Lucide）](./icon-dsl.md)  
- [预览组件库总览](./preview-component-library.md)（分发、镜像表、预览壳）  
- [画布 block/inline 布局](./builder-component-layout.md)（与 `ActivateWrapper`、`display: contents` 相关，勿与 Image 双写 `mergeStyle` 混为一谈）
- [输入框 DSL 与双库行为说明](./input-field-dsl.md)（受控、字数统计、已移除属性、相关文件）
