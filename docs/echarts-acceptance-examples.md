# ECharts 验收与示例

本文用于快速验证 18 个图表组件与统一数据源协议是否可用。

## 0. 组件清单

- `LineChart`（折线）
- `BarChart`（柱状）
- `PieChart`（饼图）
- `RadarChart`（雷达）
- `ScatterChart`（散点）
- `AreaChart`（面积）
- `DonutChart`（环形）
- `GaugeChart`（仪表盘）
- `FunnelChart`（漏斗）
- `CandlestickChart`（K线）
- `TreemapChart`（矩形树图）
- `HeatmapChart`（热力图）
- `SunburstChart`（旭日图）
- `MapChart`（地图）
- `SankeyChart`（桑基图）
- `GraphChart`（关系图）
- `BoxplotChart`（箱线图）
- `WaterfallChart`（瀑布图）

以上组件统一支持 `dataSource + dataSourceConfig`，并兼容代码节点 patch。

## 1. 静态数据

### 组件配置

- 拖入 `LineChart`（也可替换成其他 8 种图表任一）
- `dataSourceConfig.type`: `static`
- `dataSource`:

```json
[
  { "name": "Mon", "value": 120 },
  { "name": "Tue", "value": 200 },
  { "name": "Wed", "value": 150 }
]
```

### 预期

- 图表正常渲染。
- 同一份 `dataSource` 更换为其他图表组件时，无需改 patch 协议即可展示。

## 2. 数据表数据源

### 组件配置

- `dataSourceConfig.type`: `dataTable`
- `dataSourceConfig.tableId`: 选择某个数据表
- `dataSourceConfig.page`: `1`
- `dataSourceConfig.pageSize`: `20`
- `xField`: `name`
- `yField`: `value`

### 预期

- 图表或表格会读取数据表记录。
- 修改数据表记录后刷新预览，可看到最新数据。

## 3. 云函数数据源

### 组件配置

- `dataSourceConfig.type`: `cloudFunction`
- `dataSourceConfig.functionId`: 选择云函数
- `dataSourceConfig.responsePath`: `output`
- `dataSourceConfig.payload`: 例如 `{ "page": 1, "pageSize": 20 }`

### 云函数返回示例

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "executionId": "exec_xxx",
    "output": [
      { "name": "Mon", "value": 88 },
      { "name": "Tue", "value": 133 }
    ]
  }
}
```

### 预期

- 渲染层按 `responsePath=output` 取值并展示。
- 云函数报错时，组件上方展示“数据源加载失败”提示，不阻断页面其他组件渲染。

## 4. 代码节点 patch 示例

代码节点可直接下发 patch 更新图表/表格：

```javascript
const res = await dataHub.cloud.invoke('fn_sales_overview', { page: 1 });
return {
  dataSource: res.output
};
```

预期：下游任意图表组件或 `Table` 组件即时刷新数据。

## 5. 图表类型专项冒烟

推荐最小化逐项验证：

1. 依次拖入 18 个图表组件，保持默认配置，确认均可渲染。
2. 将 18 个图表全部切换为 `dataTable` 数据源，确认均能取数。
3. 将 18 个图表全部切换为 `cloudFunction` 数据源，确认均能取 `output`。
4. 通过代码节点 `return { dataSource: [...] }`，确认 18 个图表都能刷新。

## 6. 严格分型配置验证

1. `LineChart` 仅显示轴类相关字段（如 `xField/yField/smooth`），不显示饼图字段。
2. `PieChart` / `DonutChart` 仅显示 `nameField/valueField`，不显示 `xField/yField`。
3. `GaugeChart` 显示 `valueField + min/max/splitNumber`，隐藏无关字段。
4. `CandlestickChart` 显示 `open/close/low/high` 映射字段。
5. `MapChart` 显示 `mapName + name/value` 字段并可预览。

## 7. 回归基线（本轮）

执行时间：2026-03-22

- 构建验证：`npm run build` 通过。
- 组件清单验证：`componentCatalog` 已注册 18 种图表组件。
- 搭建态验证：`dataComponents` 的 `CHART_TYPE_BY_COMPONENT` 已覆盖 18 种图表。
- 预览态验证：`PreviewRenderer` 图表分支 `case` 已覆盖 18 种图表。
- 数据源验证：`resolveDataBySourceConfig` 覆盖 `static/constant/dataTable/cloudFunction` 四类来源。
- 流程联动验证：`flowRuntime` 代码节点返回对象时产出 `patch`，组件节点消费 `patch` 并调用 `applyComponentPatch`。
- 高风险图专项：
  - `MapChart`：运行时会注册 `china` 地图（`ensureBuiltInChinaMap`）。
  - `SankeyChart`：无结构化数据时回退到 `source/target/value` 兜底样本。
  - `GraphChart`：按 `categories + categoryIndex` 生成节点分类，避免类别字段导致空图。
