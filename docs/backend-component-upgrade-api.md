# 自定义组件依赖检查与无感升级 API 对接说明

本文档用于支持前端的“依赖组件更新提示/无感升级”能力，让开发者在编辑 **页面/组件模板** 时，能够获知其 **直接依赖** 的自定义组件是否已有新版本，并可一键将当前模板里的组件实例升级到最新合同（暴露属性/插槽/生命周期）以避免反复删改重搭。

> 重要约束（产品要求）
>
> - **只在当前层级提示**：A 被 B 引用，B 被 C 引用；A 更新只会在编辑 B 时提示，不直接提示 C。\n+> - **每次进入编辑都会提示**：进入“搭建页面/搭建组件”时拉取一次依赖检查。\n+> - **不做跨层级自动升级传播**：只有你打开并升级了 B，之后再去编辑 C 才会基于“B 已升级后的模板”进行新的依赖检查。\n+
本文档与前端现有接口风格保持一致（参考 `src/api/componentTemplate.ts` / `src/api/pageTemplate.ts`）：统一返回 `ApiResponse<T>`。

---

## 1. 背景：为什么需要后端接口

前端在运行时/编辑态可从 UI 树解析出 `CustomComponent` 节点依赖（`__componentId`），但要高效判断是否有更新，需要一个 **批量查询“最新版本元信息”** 的接口：

- 不能对每个依赖都调用一次 `/page-template/{id}` 详情接口（慢、浪费带宽、易被并发限制）。\n+- 需要返回：`currentVersion`、`updatedAt`、`pageName`、`status` 等最小集。\n+- 需要权限判断：团队组件/个人组件的可见性、访问权限、禁用/删除处理。\n+
“无感升级”的真正落地是前端保存新的模板内容（更新实例节点 `props`），后端只需提供：\n+1) 查询依赖最新元信息\n+2)（可选）提供服务端缓存的依赖边\n+3)（可选）提供依赖差异/破坏性变更标记\n+
---

## 2. 通用约定

- **Base URL**：与其它接口相同（如 `http://localhost:3333/api`），下文为相对此前缀的路径。\n+- **响应**：`ApiResponse<T>`：`{ \"code\": 0, \"message\": \"ok\", \"data\": T }`，`code !== 0` 为失败。\n+- **鉴权**：`Authorization: Bearer <access_token>`。\n+- **实体类型**：\n+  - `page`：页面模板\n+  - `component`：自定义组件模板\n+
### 2.1 直接依赖的定义

“直接依赖”指：某个模板的 UI 树中出现 `type === 'CustomComponent'`（或存在 `props.__componentId.value`）的节点。\n+
每个 `CustomComponent` 节点可携带（建议后续统一）：

| 字段 | 存储位置 | 说明 |
|------|----------|------|
| componentId | `props.__componentId.value` | 依赖的组件模板 ID |
| usedVersion | `props.__componentVersion.value` | 放置/上次升级时记录的组件版本（数字） |
| usedUpdatedAt | `props.__componentUpdatedAt.value` | 放置/上次升级时记录的组件更新时间（ISO） |

后端不必强制前端一定上传这些字段，但当存在时，后端可用于更准确的比较/审计。\n+
---

## 3. API：批量查询组件最新元信息（必需）

### 3.1 `POST /v1/components/meta:batch`

用于一次性查询多个组件模板的“最新元信息”。\n+前端进入编辑页后：解析出 `componentIds[]`，调用该接口获得每个组件的 `currentVersion/updatedAt/pageName/status/visibility`。\n+
#### Request

Header：`Authorization: Bearer ...`\n+
Body（JSON）：

```json
{
  "componentIds": ["cmp_1", "cmp_2", "cmp_3"]
}
```

字段说明：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| componentIds | string[] | 是 | 组件模板 ID 列表，建议限制长度（如 ≤200） |

#### Response

`data`：

```json
{
  "list": [
    {
      "componentId": "cmp_1",
      "pageName": "登录组件",
      "currentVersion": 12,
      "updatedAt": "2026-03-26T12:00:00.000Z",
      "status": "published",
      "visibility": "team",
      "ownerType": "team",
      "ownerTeamId": "team_1",
      "deleted": false,
      "accessible": true
    },
    {
      "componentId": "cmp_2",
      "deleted": true,
      "accessible": false
    }
  ]
}
```

返回项字段：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| componentId | string | 是 | 请求的组件 ID |
| pageName | string | 否 | 组件名称 |
| currentVersion | number | 否 | 最新版本号（与 `/page-base/list` 的 `currentVersion` 一致） |
| updatedAt | string | 否 | 最新更新时间（ISO8601） |
| status | `draft`\\|`published` | 否 | 最新状态 |
| visibility | string | 否 | 建议：`private`/`public`/`team`（或复用你们现有枚举） |
| ownerType | `user`\\|`team` | 否 | 所属类型 |
| ownerTeamId | string | 否 | ownerType=team 时返回 |
| deleted | boolean | 是 | 组件是否已删除/不可用 |
| accessible | boolean | 是 | 当前用户是否有权限访问该组件（无权限时应为 false） |

#### 权限与错误处理

- 未登录：401\n+- componentIds 为空/过长：400\n+- 对于单个组件：\n+  - 若组件不存在：返回 `deleted=true, accessible=false`\n+  - 若组件存在但无权限：返回 `deleted=false, accessible=false`（不要泄露敏感字段）\n+  - 若可访问：返回完整元信息，`accessible=true`\n+
#### 性能建议

- DB 查询采用 `IN (componentIds)` 一次性返回\n+- 对返回字段做投影（只取 base 元信息，不取大字段 template）\n+- 支持缓存（短 TTL，如 30s）\n+
---

## 4. API：依赖检查（可选，但推荐）

若希望后端帮前端直接给出“哪些依赖需要升级”，可以提供该接口。\n+它的价值：避免前端自己比对 usedVersion/updatedAt，并可统一实现“缺少 usedVersion 时的策略”。\n+
### 4.1 `POST /v1/templates/dependencies/check`

#### Request

```json
{
  "entityType": "component",
  "templateId": "cmp_parent",
  "dependencies": [
    { "componentId": "cmp_1", "usedVersion": 8, "usedUpdatedAt": "2026-03-01T00:00:00.000Z" },
    { "componentId": "cmp_2", "usedVersion": 3 }
  ]
}
```

字段说明：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| entityType | `page`\\|`component` | 是 | 当前正在编辑的实体类型 |
| templateId | string | 是 | 当前模板 ID |
| dependencies | array | 是 | 前端解析出的直接依赖（只传当前层） |
| dependencies[].componentId | string | 是 | 依赖组件 ID |
| dependencies[].usedVersion | number | 否 | 当前模板里记录的使用版本 |
| dependencies[].usedUpdatedAt | string | 否 | 当前模板里记录的使用更新时间 |

#### Response

```json
{
  "directDependencies": [
    {
      "componentId": "cmp_1",
      "pageName": "登录组件",
      "usedVersion": 8,
      "latestVersion": 12,
      "updateAvailable": true,
      "blockedReason": null,
      "accessible": true,
      "deleted": false,
      "latestUpdatedAt": "2026-03-26T12:00:00.000Z"
    },
    {
      "componentId": "cmp_2",
      "updateAvailable": false,
      "accessible": false,
      "deleted": false,
      "blockedReason": "forbidden"
    }
  ]
}
```

`blockedReason` 建议枚举：

- `forbidden`：无权限\n+- `deleted`：已删除\n+- `unpublished`：仅草稿/不可引用\n+
> 注意：该接口只做“检查”，不做升级。\n+
---

## 5. API：依赖边存储与查询（可选）

如果希望后端支持更多能力（如“组件发布后可反查谁引用了它”），建议后端维护依赖边表。\n+\n+### 5.1 数据表建议：`template_dependency_edges`\n+\n+| 列 | 类型 | 说明 |\n+|---|------|------|\n+| id | bigint/uuid | 主键 |\n+| parentEntityType | enum | `page`/`component` |\n+| parentTemplateId | string | 父模板 ID |\n+| childComponentId | string | 依赖组件 ID |\n+| parentVersion | number | 父模板版本（保存/发布时） |\n+| usedChildVersion | number | 当时使用的子组件版本（若可得） |\n+| createdAt | datetime | |\n+| updatedAt | datetime | |\n+\n+索引：\n+\n+- `(parentEntityType, parentTemplateId)` 用于查询父模板的直接依赖\n+- `(childComponentId)` 用于查询“谁引用了我”（未来可用于分析，不要求前端弹窗跨层级）\n+\n+### 5.2 依赖边生成时机\n+\n+- `PUT /page-template/{id}`（更新草稿）成功后\n+- `POST /page-template/publish`（发布）成功后\n+\n+后端解析模板 `uiTree`（页面还需要解析 sharedUiTree + routes.uiTree），提取 `CustomComponent` 的 `__componentId`，去重后 upsert 到依赖边表。\n+\n+### 5.3 查询接口（可选）\n+\n+`GET /v1/templates/{entityType}/{templateId}/dependencies`\n+\n+返回：\n+\n+```json\n+{\n+  \"list\": [\n+    { \"componentId\": \"cmp_1\", \"usedChildVersion\": 8, \"updatedAt\": \"...\" }\n+  ]\n+}\n+```\n+\n+该接口并不替代 3.1 的 batch meta（前端依然要拿 latest meta）。\n+\n+---\n+\n+## 6. 无感升级语义（后端需要理解的行为）\n+\n+前端“无感升级”会在本地对模板做如下改动，并在用户保存时提交到后端：\n+\n+- 对每个 `CustomComponent` 实例节点：\n+  - 更新 `__componentVersion`、`__componentUpdatedAt`、`__slots`\n+  - 用最新组件合同补齐暴露属性 schema（保留旧 value，新增字段填默认值）\n+  - 同步 `lifetimes` 列表（暴露事件集合）\n+\n+后端只需像平常一样保存新的 `uiTree/flowNodes/flowEdges/pageConfig`，无需额外特殊处理。\n+\n+---\n+\n+## 7. 状态码与错误码建议\n+\n+| 场景 | HTTP | code | message 建议 |\n+|------|------|------|--------------|\n+| 未登录 | 401 | 40101 | unauthorized |\n+| 参数错误（componentIds 为空/过长） | 400 | 40001 | invalid_param |\n+| 部分组件无权限 | 200 | 0 | data.list[].accessible=false |\n+\n+---\n+\n+## 8. 前端对接示例（最小）\n+\n+进入编辑页：\n+\n+1. 解析 UI 树获得依赖：`componentIds[]` +（可选）`usedVersion`。\n+2. 调用 `POST /v1/components/meta:batch` 获取 latest meta。\n+3. 对比后弹窗提示。\n+4. 用户确认后：前端对 UI 树执行“无感升级补齐”，然后继续编辑；最终保存时将新模板提交。\n+\n*** End Patch"}Oops ApplyPatch should be string not json.
