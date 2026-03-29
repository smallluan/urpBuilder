# 模板 props 脱水存储（v2）— 后端配合说明

## 前端在做什么

页面/组件模板的 JSON 里，原先每个节点 `props` 下的每个属性都是「完整编辑器 schema」对象，包含 `name`、`editType`、`payload`、`value` 等，与前端内置的 `componentCatalog` 大量重复。

**v2 存储形态**（自本次前端发布后，新保存的草稿会写入）：

- `template.pageConfig.propsStorageVersion === 2`。
- 对 `template.uiTree`、多路由下的 `routes[].uiTree`、以及 `pageConfig.sharedUiTree` 中的**每个节点**：
  - `props` 仍为对象，但每个业务键 `props[key]` **只保存原来的 `value` 的 JSON 形态**（字符串、数字、布尔、数组、对象等），**不再**保存 `name`、`editType`、`payload` 等元数据。

**兼容**：未带 `propsStorageVersion` 或为 `1` 的旧数据，仍为「完整 schema」；前端在 **GET 详情** 时会自动识别并 **水合** 成内存中的完整结构，无需后端区分读写逻辑。

## 后端需要配合什么

1. **透传与持久化**  
   - 在 `pageConfig`（或你们实际存放模板的等价结构）中增加/保留可选字段 **`propsStorageVersion`**（数字，当前前端写入为 `2`）。  
   - 模板 JSON 按原样存库即可，**不必**在服务端解析或校验 `uiTree` 内 props 形态。

2. **刷库（可选）**  
   - 若希望**历史数据也缩小体积**，可编写离线脚本：读出每条模板 JSON，将 `props` 按与前端一致的规则脱水（对每个属性若存在 `editType` 等则视为旧 schema，只保留 `value`），并写入 `propsStorageVersion: 2`。  
   - **非必须**：前端已能同时读取旧格式与新格式；不刷库仅影响存储体积，不影响功能。

3. **版本化/发布**  
   - 若草稿与发布版本共用同一套模板结构，行为一致：带版本号的发布包同样可包含 `propsStorageVersion` 与脱水后的 `uiTree`。

4. **其他服务**  
   - 若有**非 urpBuilder 前端**直接消费模板 JSON 并假设「每个 prop 必有 `editType`」的逻辑，需要改为读 `value` 或自行维护一份与 `componentCatalog` 对齐的 schema（与本次前端「水合」策略一致）。

## 技术参考（前端实现位置）

- 脱水：`dehydrateUiTree`（保存前，见 `HeaderControls` 组装的 `template`）。  
- 水合：`hydratePageDetailFromApi` / `hydrateComponentDetailFromApi`（在 `getPageTemplateDetail`、`getComponentTemplateDetail` 返回前处理）。  
- 常量：`PROPS_STORAGE_VERSION = 2`（`src/builder/template/propsHydration.ts`）。

## 小结

| 项目       | 后端动作                         |
| ---------- | -------------------------------- |
| 新字段     | 存储并回传 `propsStorageVersion` |
| 业务校验   | 无需解析 props 形态              |
| 刷库       | 可选，用于压缩历史 JSON          |
| API 契约   | 模板仍为 JSON，语义向后兼容      |
