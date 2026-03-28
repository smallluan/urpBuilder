# 组件版本隔离与可选升级 API 对接文档

## 1. 背景与问题定义

当前搭建器支持将自定义组件（`CustomComponent`）作为原子组件复用，实例节点中已记录：

- `__componentId`
- `__componentVersion`
- `__componentUpdatedAt`

但现状是渲染加载仍按 `componentId` 获取详情，未使用 `__componentVersion` 完成“版本钉住”。这会导致“选择性升级”仅体现在元信息和契约补齐层，而不是严格的渲染隔离层。

目标能力：

1. 引用某组件的某版本后，该引用默认绑定到该版本快照。
2. 上游组件发布新版本时，引用方不自动漂移。
3. 引用方可手动升级到新版本，升级后再保存。

非目标：

1. 不做跨层级自动升级传播（只处理直接依赖）。
2. 不在本期引入全量插件化生态。

---

## 2. 当前前端现状与风险

### 2.1 已有能力

- 自定义组件实例节点写入了 `__componentVersion` 字段。
- 编辑页支持依赖更新提示与“升级一个/升级全部”。
- 升级动作会补齐 exposed props / lifecycles / slots。

### 2.2 风险点

- 渲染详情加载仅按 `componentId`，若后端默认返回最新版本，则引用可能隐式漂移。
- 缓存键若不带版本，多个版本实例会共享同一缓存数据。
- “依赖升级”与“渲染隔离”不一致时，用户认知会混乱。

### 2.3 本次前端已对齐点（供后端联调参考）

- 详情加载与缓存已升级为 `(componentId, version)` 维度（缺失版本回退 latest，作为迁移兼容）。
- 保存时新增校验：存在未钉版本依赖时阻断保存并提示先固化/升级。
- 依赖提示面板中将“未钉版本”显示为 `未固定 -> vX`。

---

## 3. 术语与数据模型

### 3.1 术语

- **组件模板（template）**：组件的可发布内容（`uiTree/flow/pageConfig`）。
- **组件版本（version）**：发布后的不可变快照版本号（正整数）。
- **实例引用（instance）**：页面/组件中 `type=CustomComponent` 的节点。
- **版本钉住（pin）**：实例明确声明 `componentId + version`，渲染按该版本加载。

### 3.2 实例节点建议最小结构

```json
{
  "type": "CustomComponent",
  "props": {
    "__componentId": { "value": "cmp_user_card" },
    "__componentVersion": { "value": 12 },
    "__componentUpdatedAt": { "value": "2026-03-27T10:00:00.000Z" }
  }
}
```

字段约束：

- `__componentId`：必填，非空字符串。
- `__componentVersion`：必填，正整数（迁移期可兼容缺失）。
- `__componentUpdatedAt`：可选，ISO 时间字符串。

---

## 4. API 设计（必须项）

## 4.1 获取组件详情（版本化）

`GET /page-template/{componentId}?entityType=component&version={version}`

说明：

- `version` 为可选；传入时返回指定版本快照，不传时返回默认版本（建议为最新已发布）。
- 返回结构继续复用现有 `ApiResponse<ComponentDetail>`，降低改造成本。

请求示例：

```http
GET /api/page-template/cmp_user_card?entityType=component&version=12
Authorization: Bearer <token>
```

成功响应示例：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "base": {
      "pageId": "cmp_user_card",
      "pageName": "用户卡片",
      "currentVersion": 12,
      "status": "published"
    },
    "template": {
      "uiTree": {},
      "flowNodes": [],
      "flowEdges": [],
      "pageConfig": {}
    }
  }
}
```

错误建议：

- `404`：组件或版本不存在。
- `403`：组件存在但无权限访问。
- `410`：版本已下线且不可回放（如采用强清理策略，原则上不建议）。

---

## 4.2 批量依赖元信息检查

`POST /v1/components/meta:batch`

用途：

- 编辑器一次性检查直接依赖的升级状态。
- 同时识别“usedVersion 缺失”与“usedVersion 不存在”。

请求体：

```json
{
  "items": [
    { "componentId": "cmp_user_card", "usedVersion": 10 },
    { "componentId": "cmp_order_panel" }
  ]
}
```

响应体：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "list": [
      {
        "componentId": "cmp_user_card",
        "pageName": "用户卡片",
        "usedVersion": 10,
        "latestVersion": 12,
        "upgradeAvailable": true,
        "accessible": true,
        "deleted": false
      },
      {
        "componentId": "cmp_order_panel",
        "latestVersion": 5,
        "upgradeAvailable": true,
        "accessible": true,
        "deleted": false
      }
    ]
  }
}
```

字段建议：

- `componentId`：组件 ID。
- `pageName`：组件名（可选）。
- `usedVersion`：请求中回传，方便前端直接渲染。
- `latestVersion`：当前可升级目标版本。
- `upgradeAvailable`：是否可升级。
- `accessible`：是否可访问。
- `deleted`：是否已删除。

---

## 5. 数据结构与存储建议

### 5.1 最低要求

后端必须保证可按 `(componentId, version)` 返回不可变快照内容。

### 5.2 推荐结构

若现有模型无法稳定回放历史，建议显式落表（或等价存储）：

- `component_versions`
  - `component_id` (string)
  - `version` (int)
  - `base_snapshot` (json)
  - `template_snapshot` (json)
  - `status` (enum)
  - `created_at` / `published_at`

约束建议：

- 唯一键：`(component_id, version)`。
- 历史版本默认不可物理删除；若需清理，先做引用扫描并保留被引用版本。

---

## 6. 前端-后端协作语义

### 6.1 渲染语义

1. 前端读取实例 `__componentId` + `__componentVersion`。
2. 请求详情接口时传 `version`。
3. 返回模板后做 exposed props/slots 注入再渲染。

### 6.2 升级语义

1. 前端发起“升级某依赖”时，使用后端返回的 `latestVersion`。
2. 前端更新实例：
   - `__componentVersion`
   - `__componentUpdatedAt`
   - `__slots`
   - exposed props 与 lifetimes
3. 前端保存模板；后端按普通保存流程持久化。

### 6.3 未钉版本语义（迁移期）

- 若实例缺失 `__componentVersion`：
  - 渲染期：前端回退 latest（兼容旧数据）。
  - 编辑期：前端标记“未固定”，并要求用户升级/固化后再保存。

---

## 7. 迁移策略（三阶段）

## Phase 1：兼容运行

- 后端支持 `version` 可选参数。
- 前端允许缺失版本回退 latest，确保旧模板可打开。

## Phase 2：修复存量

- 编辑器提供“升级/固化依赖”操作，将缺失版本实例写入明确版本号。
- 优先修复高频模板。

## Phase 3：强约束收敛

- 保存接口校验：`CustomComponent` 必须带合法 `__componentVersion`。
- 不满足则返回业务错误，提示先固化依赖。

---

## 8. 性能与缓存建议

- 详情接口：支持 ETag / 短缓存；版本化内容天然可缓存。
- 前端缓存键建议：`${componentId}@${version}`。
- 依赖检查接口建议支持批量（单次 <= 200 项）。
- 若页面深度嵌套依赖较多，可考虑增加批量详情接口减少网络往返。

---

## 9. 风险清单与回滚策略

### 风险

1. 历史版本缺失导致旧模板打不开。
2. 多层嵌套导致请求并发激增。
3. 版本接口灰度期行为与旧接口不一致。

### 回滚建议

1. 保留旧版“按 latest 渲染”开关（仅应急）。
2. 版本化参数支持灰度开关。
3. 保存校验可分阶段从 warning -> block。

---

## 10. 联调清单（必须通过）

1. 组件 `A@1` 被页面 P 引用，发布 `A@2` 后，P 仍渲染 `A@1`。
2. 页面 P 触发升级后，实例切到 `A@2`，保存成功。
3. 旧页面缺失 `__componentVersion` 可正常打开，但保存前需固化。
4. 无权限组件返回 `accessible=false`，前端可提示并阻断升级。
5. 已删除组件返回 `deleted=true`，前端提示不可恢复依赖。

---

## 11. 建议落地顺序

1. 后端先完成版本化详情查询能力（最关键）。
2. 前端切到 `id+version` 渲染加载与缓存。
3. 接入批量元信息接口，完善升级提示。
4. 上线迁移与保存校验。
5. 灰度观测后收敛为强约束。

