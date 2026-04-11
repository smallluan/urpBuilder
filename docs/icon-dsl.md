# DSL 图标契约（中立 Lucide）

搭建器画布与预览中，由物料属性选择的**业务图标**统一走 **Lucide** 动态图标（`lucide-react/dynamic`），与 TDesign / Ant Design 各自内置图标集**无绑定关系**。

## 命名空间

- DSL 中以下字段的值均为 **Lucide 图标名**（与 `src/constants/iconRegistry.ts` 中 `ICON_NAME_OPTIONS` / `resolveIconName` 一致），可含历史别名的简单规范化（如驼峰 → kebab）。
- 字段示例：`iconName`、`prefixIconName`、`suffixIconName`。
- **不要**在 DSL 中写入「TDesign 图标组件名」或「Ant Design Icons 组件名」；扩展第三套 UI 库时，只实现「把同一套 `ReactNode` 塞进该库的插槽」，不维护库与库之间的图标名映射表。

## 与属性面板 `iconSelect` 的关系

- 物料里通过 `editType: 'iconSelect'` 绑定上述字段，选项来自同一 Lucide 集合。
- 用户选择的值即 DSL 中存储的字符串，渲染时经 `resolveIconName` 解析后由 `DynamicIcon` 绘制。

## 唯一渲染入口

- 凡来自 DSL 的命名图标，画布与预览（含 antd 分支）统一调用 **`renderNamedIcon`**（定义于 `src/constants/iconRegistry.ts`）。
- TDesign 与 antd 仅**插槽形式**不同（例如 TDesign `Button` 的 `icon`/`suffix`，antd `Button` 的 `icon` + 子节点内后缀区等），**数据源同一套** DSL 字段。

## 与搭建器壳层的区别

- 搭建器外壳、工具栏等处使用的 `tdesign-icons-react` 等，仅服务于 **IDE chrome**，与页面 DSL 中的中立图标无关；请勿与上述 DSL 图标混为一谈。

## 实现索引

| 能力 | 主要位置 |
|------|----------|
| 解析与渲染 | `src/constants/iconRegistry.ts` |
| TDesign 搭建 | `src/builder/renderer/registries/basicComponents.tsx` 等 |
| antd 搭建 | `src/builder/renderer/registries/antdComponents.tsx` |
| TDesign 预览 | `src/pages/PreviewEngine/components/PreviewRenderer.tsx` |
| antd 预览 | `src/pages/PreviewEngine/components/previewAntdNodes.tsx` |

更完整的双库对齐说明见 [tdesign-antd-dsl-alignment.md](./tdesign-antd-dsl-alignment.md)。
