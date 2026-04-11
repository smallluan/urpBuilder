# 单行输入（Input）与数字输入（InputNumber）DSL：TDesign / Ant Design 行为说明

本文记录搭建器与预览里 **`Input` / `antd.Input`**、**`InputNumber` / `antd.InputNumber`** 的 DSL 语义、双库映射、受控行为，以及近期对物料与实现的调整，便于排查「属性不生效」类问题。

---

## 1. 根因：TDesign「显示字数统计」为何曾表现为「不生效」

TDesign `Input` 内部通过 `useLengthLimit` 计算 `limitNumber`：

- 仅当配置了 **`maxlength` 或 `maxcharacter` 之一**（且与组件内部逻辑一致）时，`limitNumber` 才会是类似 `3/20` 的字符串；
- 若两者都未配置，`limitNumber` 为空字符串，即使 **`showLimitNumber={true}`**，也不会渲染内置计数节点（见 `node_modules/tdesign-react/es/input/useLengthLimit.js`）。

因此：只打开「显示字数统计」、不填「最大长度 / 最大字符数」时，**原生 TDesign 不会显示 x/y 计数**。

### 项目内处理方式

新增共用组件 **`BuilderTdesignInputField`**（`src/builder/renderer/tdesignInputField.tsx`）：

| 条件 | 行为 |
|------|------|
| `showLimitNumber` 且已设 `maxlength > 0` 或 `maxcharacter > 0` | 使用 TDesign 原生 `showLimitNumber` + 上限 |
| `showLimitNumber` 且未设上限 | 关闭原生 `showLimitNumber`，在 **`suffix`** 中显示当前字数（随输入更新） |

使用该组件的位置：

- 搭建：`src/builder/renderer/registries/formComponents.tsx`（`Input`）
- TDesign 预览：`src/pages/PreviewEngine/components/PreviewRenderer.tsx`（`case 'Input'`）

---

## 2. Ant Design 侧：DSL 如何映射

逻辑集中在 **`src/utils/antdTdesignPropBridge.ts`** 的 `mapTdesignInputPropsToAntd`：

- `clearable` → `allowClear`
- `borderless` → `variant="borderless"`
- `align` → 通过 `styles.input` / `styles.count` 等语义样式落在真实输入区域
- `status`：`error` / `warning` 使用 antd；`success` 用绿色边框 + 浅绿阴影模拟（antd Input 无 `success` status）
- `maxlength` / `maxcharacter` → `maxLength`（取其一；与 TDesign 物料一致）
- `showLimitNumber` → `showCount`（无上限时用 `formatter` 只显示当前长度）
- `autoWidth`：根样式 `fit-content`、`display: inline-flex` 等，减轻「外层仍 100% 宽」问题
- `tips`：antd 无同名 prop，用 **`Tooltip`** 包裹

搭建：`src/builder/renderer/registries/antdComponents.tsx`（`antd.Input`）  
预览：`src/pages/PreviewEngine/components/previewAntdNodes.tsx`（`antd.Input`）

---

## 3. 受控模式（`controlled`）

当 DSL **`controlled` 为 `true`**（物料默认）：

- 画布 / 预览中 **不会在输入时把结果写回** 节点的 `value`；
- 展示值以属性面板中的 **`value`** 为准；需在面板中改值才能看到变化。

当 **`controlled` 为 `false`**：

- 输入会同步更新 DSL（非受控路径仍向 `value` 写入，与历史行为一致）。

预览里对 `onChange` 的 `syncNodeValue` 仅在非受控时调用（`PreviewRenderer` / `previewAntdNodes`）。

---

## 4. 已从 `Input` 物料中移除的属性

以下项已从 **`src/config/componentCatalog.ts`** 的 `Input` 定义中删除；旧 JSON 模板若仍带这些 key，渲染侧不再读取：

| 属性 | 说明 |
|------|------|
| `className` | 组件级类名 |
| `style` | 组件级内联样式（JSON） |
| `autocomplete` | 自动填充 |
| `allowInputOverMax` | 超长继续输入 |
| `spellCheck` | 拼写检查 |

---

## 5. 数字输入框（`InputNumber` / `antd.InputNumber`）

### 受控与非受控

与单行输入相同：**`controlled === true`** 时，画布/预览 **不把** `onChange` 结果写回 DSL 的 `value`；仅在 **非受控** 时同步（`formComponents.tsx`、`PreviewRenderer.tsx`、`antdComponents.tsx`、`previewAntdNodes.tsx` 已对齐）。

### 已从 `InputNumber` 物料移除的属性

以下项已从 **`componentCatalog.ts`** 的 `InputNumber` 定义中删除，渲染侧不再读取：

| 属性 | 说明 |
|------|------|
| `allowInputOverLimit` | 允许超限输入 |
| `autoWidth` | 自动宽度 |
| `largeNumber` | 大数模式 |

### Ant Design 映射（`mapTdesignInputNumberPropsToAntd`）

实现见 `src/utils/antdTdesignPropBridge.ts`：

- `decimalPlaces` → `precision`
- `size`：`medium` → `middle` 等
- `status`：`error` / `warning` 走 antd；`success` 用 `styles.root` 绿色描边模拟
- `align` → `styles.input.textAlign`
- `theme`：`normal`（无步进按钮）→ `controls={false}`；`row` / `column` 使用 antd 默认步进控制
- `min` / `max` / `step` / `placeholder` / `disabled` / `readOnly` 直接透传
- `styles.root` 与搭建/预览的 `mergeStyle()`（`__style`）合并，避免丢外层样式

---

## 6. 相关文件一览

| 文件 | 作用 |
|------|------|
| `src/builder/renderer/tdesignInputField.tsx` | TDesign `Input` 字数统计与 DSL 对齐 |
| `src/builder/renderer/registries/formComponents.tsx` | 搭建 TDesign `Input` / `InputNumber` |
| `src/pages/PreviewEngine/components/PreviewRenderer.tsx` | 预览 TDesign `Input` / `InputNumber` |
| `src/utils/antdTdesignPropBridge.ts` | antd 映射（含 `mapTdesignInputNumberPropsToAntd`）与 `parseDslAutosizeValue` 等 |
| `src/builder/renderer/registries/antdComponents.tsx` | 搭建 `antd.Input` / `antd.Textarea` / `antd.InputNumber` |
| `src/pages/PreviewEngine/components/previewAntdNodes.tsx` | 预览 antd 节点 |
| `src/config/componentCatalog.ts` | `Input` / `InputNumber` 可配置项定义 |

更宏观的双库约定见 [TDesign / Ant Design：同一套 DSL 下的对齐约定](./tdesign-antd-dsl-alignment.md)。
