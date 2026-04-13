# 多选组（`Checkbox.Group` / `antd.Checkbox.Group`）DSL 与双库桥接

## 目标

- 同一套 DSL 在 **TDesign** 画布与 **Ant Design** 预览间共用 `props` / `lifetimes`。
- 语义以 **TDesign `Checkbox.Group`** 为准；antd 侧通过 `mapTdesignCheckboxGroupToAntd` 映射（仅 `disabled` 需桥接）。
- 整体架构与 `Radio.Group` 完全一致，参见 [radio-group-dsl.md](./radio-group-dsl.md)。

## 物料与镜像

| 项目 | 说明 |
|------|------|
| TDesign `type` | `Checkbox.Group`（`componentCatalog.ts`） |
| TDesign 子物料 | `Checkbox`（多选项）：仅允许拖入 `Checkbox.Group` 内；由父级收集渲染，子节点在画布上**不单独绘制**（注册表返回 `null`，与 `Radio` / `Steps.Item` 相同策略）。每个 `Checkbox` 的**标签区**为可搭建容器（搭建态始终为 `DropArea`）；**新建多选组 / 新拖入多选项**时默认带 **一个 `Typography.Text` 子节点**（antd 镜像为 `antd.Typography.Text`）。组件库中「多选」分组内同时提供多选组与多选项；**新拖入的多选组**在 DSL 中带 **两个默认子 `Checkbox`**（选项值 `1`、`2`），组件树中可见。继续拖入多选项时，**选项值在兄弟节点中按已有最大数值 +1** 自动分配，并同样附带默认文本子节点。 |
| antd `type` | `antd.Checkbox.Group` / `antd.Checkbox`（`antdCatalogMirror.ts` 镜像生成） |
| 实现 | `mapTdesignCheckboxGroupToAntd`：`src/utils/antdTdesignPropBridge.ts`；子选项收集：`src/builder/utils/checkboxDsl.ts`（`collectDslCheckboxRows`） |
| 搭建 TDesign | `basicComponents.tsx` → `Checkbox.Group`（外层 `DropArea` 须设 **`isTreeNode`**，与 `Radio.Group` / `Steps` 相同） |
| 搭建 antd | `antdComponents.tsx` → `antd.Checkbox.Group`（同上） |
| 预览 TDesign | `previewTdesignCheckboxGroup.tsx` |
| 预览 antd | `previewAntdNodes.tsx` → `antd.Checkbox.Group` |

## DSL 字段（与物料表一致）

| 属性 | 说明 |
|------|------|
| `Checkbox` 子项 | `value`（选项值）、`disabled`；子节点为标签区内容。 |
| `Checkbox.Group` `controlled` / `value` / `defaultValue` | 受控与非受控。`value` / `defaultValue` 为数组（JSON 字符串或真数组）。受控时只传 `value`，不传 `defaultValue`。面板中以逗号分隔字符串或 JSON 数组输入。搭建/预览会将面板里多为字符串的选中值与子 `Checkbox` 的 `value` 做类型对齐（如 `"1"` 与 `1`），避免受控不选中。 |
| `Checkbox.Group` `disabled` | 整组禁用。 |
| `Checkbox.Group` `max` | 最多可选数（`inputNumber`）。**未配置**时按**当前选项个数**解析（与「默认可全选」一致）；显式 `0` 表示不限制。TDesign 使用原生 `max`；**antd 无原生 `max`**，属性面板在 antd 物料下不展示该项，预览/搭建仍按同一 DSL 用 `clampCheckboxGroupSelection` 截断选中值。 |
| `Checkbox.Group` `optionLayout` | `horizontal`（默认）或 `vertical`：控制组内各选项横向或纵向排列。TDesign 侧为组容器 `display:flex` + `flexDirection`（`checkboxGroupOptionLayoutStyle`）；antd 侧同样以 flex 样式实现。 |
| `Checkbox.Group` `optionGap` | 数字（px，默认 `8`）：选项之间的间距，横纵均通过容器 `gap` 生效。 |
| `Checkbox.Group` `labelAlign` | `top` / `center`（默认）/ `bottom`：各选项的复选框与其标签区域的垂直对齐（组级统一）。搭建/预览在子 `Checkbox` 根节点上设置 `data-builder-checkbox-label-align`，由 `builder/style.less` 与 `PreviewEngine/style.less` 内选择器对 `.t-checkbox` / `.ant-checkbox-wrapper` 设置 `align-items`（`!important` 覆盖组件库默认）。 |

生命周期：`onChange`（payload 含 `value`，为选中值数组）。

## 映射关系（TDesign DSL → antd props）

实现：`mapTdesignCheckboxGroupToAntd`。

| DSL | antd |
|-----|------|
| `disabled: true` | `disabled: true`（经 `normalizeDslBoolean`） |

Checkbox 无 `theme` / `variant` 的按钮式变体区分（与 Radio 不同），两库行为一致。

## 与 Radio.Group 的差异

| 差异点 | 说明 |
|--------|------|
| **值为数组** | `value` / `defaultValue` 是数组而非单值；`coerceCheckboxGroupStoredValue` 负责数组解析与类型对齐。 |
| **无 `allowUncheck`** | 多选天然支持取消选中，不需要此选项。 |
| **无按钮式 theme** | Checkbox 无 `button` 主题；无 `variant`（outline/solid 等）映射。 |
| **`max` 属性** | TDesign 原生 `max`，限制最大可选数。 |
| **受控模式** | **预览**受控时 `pointer-events: none`；**搭建态不设**（与 Radio 一致），DropArea 拖拽需保持可用。 |

## 风险与注意点

1. **嵌套 DropArea 与拖拽**：与 Radio.Group 共用相同的 `drop-area--nested-host` 机制，见 [radio-group-dsl.md](./radio-group-dsl.md)。
2. **值类型**：子项 `value` 若混用字符串与数字，搭建/预览会做对齐。
3. **React 受控/非受控**：非受控时不传 `value`；受控时只传 `value` 不传 `defaultValue`。
4. **镜像表**：`Checkbox.Group` / `Checkbox` 已加入 `ANTD_TD_MIRROR_PAIRS`。

## 相关文档

- [单选组 DSL](./radio-group-dsl.md)
- [双库桥接总览](./tdesign-antd-dsl-alignment.md)
- [预览组件库与镜像](./preview-component-library.md)
