# 单选组（`Radio.Group` / `antd.Radio.Group`）DSL 与双库桥接

## 目标

- 同一套 DSL 在 **TDesign** 画布与 **Ant Design** 预览间共用 `props` / `lifetimes`。
- 语义以 **TDesign `Radio.Group`** 为准；antd 侧通过 `mapTdesignRadioGroupToAntd` 映射为 `Radio.Group` 的 `optionType`、`buttonStyle` 等（**不再**暴露物料级 `size`，由主题 token 决定观感）。

## 物料与镜像

| 项目 | 说明 |
|------|------|
| TDesign `type` | `Radio.Group`（`componentCatalog.ts`） |
| TDesign 子物料 | `Radio`（单选项）：仅允许拖入 `Radio.Group` 内；由父级收集渲染，子节点在画布上**不单独绘制**（注册表返回 `null`，与 `Steps.Item` 相同策略）。组件库中「单选」分组内同时提供单选组与单选项；**新拖入的单选组**在 DSL 中带 **两个默认子 `Radio`**（选项值 `1`、`2`），组件树中可见。继续拖入单选项时，**选项值在兄弟节点中按已有最大数值 +1** 自动分配。 |
| antd `type` | `antd.Radio.Group` / `antd.Radio`（`antdCatalogMirror.ts` 镜像生成） |
| 实现 | `mapTdesignRadioGroupToAntd`：`src/utils/antdTdesignPropBridge.ts`；子选项收集：`src/builder/utils/radioDsl.ts`（`collectDslRadioRows`） |
| 搭建 TDesign | `basicComponents.tsx` → `Radio.Group`（外层 `DropArea` 须设 **`isTreeNode`**，与 `Steps` 相同，避免把子节点注入进宿主导致拆掉 `Radio.Group`、子 `Radio` 又因注册表为 `null` 而整组空白） |
| 搭建 antd | `antdComponents.tsx` → `Radio.Group`（同上） |
| 预览 TDesign | `previewTdesignRadioGroup.tsx` |
| 预览 antd | `previewAntdNodes.tsx` → `antd.Radio.Group` |

## DSL 字段（与物料表一致）

| 属性 | 说明 |
|------|------|
| `Radio` 子项 | `value`（选项值）、`content`（标签）、`disabled`；**推荐**用子树配置选项（物料表已不提供「选项 JSON」编辑项；历史 DSL 里若仍有 `options` 字段，无子项时仍会作为回退解析）。 |
| `controlled` / `value` / `defaultValue` | 受控与非受控，与 `Switch` 类似；非受控时初始值优先 `defaultValue`，否则 `value`，再否则第一项 `value`。属性面板：关闭受控时隐藏「选中值」(`value`)；开启受控时隐藏「默认值」(`defaultValue`)。搭建/预览会将面板里多为字符串的选中值与子 `Radio` 的 `value` 做类型对齐（如 `"1"` 与 `1`），避免受控不选中。 |
| `theme` | `radio`：经典圆点；`button`：按钮式单选。 |
| `variant` | 仅在 **`theme === 'button'`** 时参与语义：`outline`、`primary-filled`、`default-filled`。 |
| `disabled` | 整组禁用（DSL 布尔经 `normalizeDslBoolean` 解析，兼容非严格 boolean 的旧数据）。 |
| `allowUncheck` | **仅非受控时**生效（与 TDesign 一致）：再点当前已选项可取消选中。**TDesign**：原生 `allowUncheck`。**antd**：无原生 API，非受控时在子 `Radio` 上用本地状态 + 再点模拟清空；**受控**时画布/预览对整组 `pointer-events: none`，此项不带来「再点取消」，选中值只靠属性面板。 |

生命周期：`onChange`（payload 含 `value`）。

## 映射关系（TDesign DSL → antd props）

实现：`mapTdesignRadioGroupToAntd`。

| DSL | antd |
|-----|------|
| `theme: radio` | `optionType: default` |
| `theme: button` | `optionType: button` |
| `variant: outline`（且为按钮式） | `buttonStyle: outline` |
| `variant: primary-filled` 或 `default-filled`（且为按钮式） | `buttonStyle: solid` |
| `disabled: true` | `disabled: true`（经 `normalizeDslBoolean`） |

### 旧数据兼容

若历史节点仍带 **仅 antd-only 物料** 的 `optionType`（`default` | `button`）而没有 `theme`，桥接会推断：`button` → `theme` 等价于按钮式，`default` → 经典圆点。

## 已支持

- 选项来源：**拖入 `Radio` / `antd.Radio` 子项**（推荐）；历史数据可无子项仅靠 `options`。
- 组级 `disabled`（解析兼容旧格式）。
- 经典圆点 / 按钮式外观档位（通过 `theme` + `variant` → `optionType` + `buttonStyle`）。
- 受控 / 非受控与预览/搭建中的值同步（antd 预览路径）。
- 选项级 `disabled`（解析进 `options` 条目）。

## 未支持或不对等

| 能力 | 说明 |
|------|------|
| `allowUncheck` | antd 侧无原生能力，**非受控**时用本地状态近似；实现路径与 TDesign 内部不同，**语义**（仅非受控可取消）对齐。 |
| `primary-filled` vs `default-filled` | TDesign 有两种「填充」按钮风格；antd `buttonStyle` 仅有 `outline` / `solid` **两档**，二者在 antd 侧**均映射为 `solid`**，**无法区分**两种填充语义。 |
| `orientation` / `block` / `vertical`（antd `Radio.Group` 扩展） | 当前 DSL **未暴露**；需要时再加字段并单独说明。 |

## 风险与注意点

1. **样式对齐**：圆角、间距、选中色仍随各组件库主题 token 变化，DSL 只保证**档位**（圆点/按钮、outline/solid）一致，**不保证像素级一致**。
2. **`allowUncheck`（antd）**：依赖**非受控** + 子项 `Radio` 上再点清空（本地状态），与 TDesign 内部实现不同。
3. **值类型**：子项 `value` 若混用字符串与数字，搭建/预览会做对齐。
4. **React 受控/非受控**：非受控时**不得**向 `Radio.Group` 传入 `value`（包括 `value={undefined}`），否则 `defaultValue` 会被忽略；预览中非受控时 `onChange` 不写入 dataHub 的 `value`（除非业务另有约定）。**受控**时预览/搭建对组容器使用 `pointer-events: none`，选中值仅靠属性面板。**`allowUncheck` 仅在非受控时**参与「再点当前项取消选中」；受控下开启该开关也不会在画布上通过点击清空 DSL。
5. **镜像表**：`Radio.Group` 已加入 `ANTD_TD_MIRROR_PAIRS`；`antd` 物料由 TDesign 条目克隆，**不再**使用 `componentCatalogAntd.ts` 中已删除的独立 `antd.Radio.Group` 定义。

## 相关文档

- [双库桥接总览](./tdesign-antd-dsl-alignment.md)
- [预览组件库与镜像](./preview-component-library.md)
