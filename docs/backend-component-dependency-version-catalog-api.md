# 自定义组件依赖版本目录与按版本说明（后端对接）

本文档与 [backend-component-version-isolation-api.md](./backend-component-version-isolation-api.md) 配套：在已有「按 `componentId + version` 取详情快照」能力之上，增加**版本目录列表**与**每次发布附带的版本说明**，供搭建器「依赖管理 / 版本时间线 / 独立版本浏览页」使用。

---

## 1. 需求背景

- 编辑页面或组件模板时，仅需展示**直接依赖**（当前 UI 树中的 `CustomComponent`），与现有依赖升级提示范围一致。
- 用户需要：**查看全部历史版本**、**切换到任意已发布版本**（升级或降级）、**阅读各版本说明**。
- 现状：`ComponentTemplateBaseInfo.description` 仅为组件级一条描述，无法表达「每一版的变更说明」。
- 目标：每次**发布**组件时写入可选的 `versionNote`（与前端 `PublishComponentPayload.versionNote` 字段名一致），并在版本目录接口中按版本返回。

非目标：

- 不在此接口中返回完整 `template` 大 JSON（仍用现有详情接口）。
- 不替代 `POST /v1/components/meta:batch` 的批量最新元信息查询；前端组合调用。

---

## 2. 通用约定

- **Base URL**：与现有 API 相同（如 `/api` 前缀由网关决定）。
- **响应包装**：`ApiResponse<T>`：`{ code: number; message: string; data: T }`，`code === 0` 表示成功。
- **鉴权**：`Authorization: Bearer <access_token>`；无权限时 **403**，资源不存在 **404**。
- **实体类型**：下文仅针对 `entityType=component`。

---

## 3. 接口定义

### 3.1 获取组件版本目录（新增，必需）

**用途**：列出某自定义组件全部**已发布**版本的元数据（版本号、时间、状态、版本说明），供时间线与独立页展示。

```http
GET /page-template/{componentId}/versions?entityType=component
Authorization: Bearer <token>
```

#### 路径与查询参数

| 参数 | 位置 | 必填 | 说明 |
|------|------|------|------|
| componentId | path | 是 | 组件模板 ID，与 `pageId` 同义 |
| entityType | query | 是 | 固定为 `component` |

#### 成功响应 `data`

```json
{
  "list": [
    {
      "version": 1,
      "status": "published",
      "publishedAt": "2026-01-10T08:00:00.000Z",
      "createdAt": "2026-01-10T07:55:00.000Z",
      "versionNote": "首版发布"
    },
    {
      "version": 2,
      "status": "published",
      "publishedAt": "2026-03-01T12:00:00.000Z",
      "createdAt": "2026-03-01T11:50:00.000Z",
      "versionNote": "移除已废弃属性 oldTitle"
    }
  ]
}
```

#### `list[]` 字段说明（与前端 TypeScript 类型一致）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| version | number | 是 | 正整数，与详情接口 `version` 查询参数一致 |
| status | `published` | 是 | 本接口**仅返回已发布版本**；草稿不写进本列表（产品策略写死，避免与「可引用版本」混淆） |
| publishedAt | string | 否 | ISO8601，发布完成时间 |
| createdAt | string | 否 | ISO8601，版本记录创建时间（可选，便于排错） |
| versionNote | string | 否 | 该次发布时客户端传入的 `versionNote`；历史无则省略或 `null` |

#### 排序

- `list` 按 `version` **升序**。

#### 错误

| HTTP | 场景 |
|------|------|
| 401 | 未登录 |
| 403 | 组件存在但当前用户不可读 |
| 404 | 组件不存在 |

#### 前端降级

- 若接口返回 **404**（旧后端未部署）：前端可提示「版本目录暂不可用」，时间线弹窗仅提供「拉取指定版本详情并应用」（需用户知晓版本号）或隐藏入口；**禁止**在生产环境用「从 `latestVersion` 向下穷举探测」作为长期方案。

---

### 3.2 获取指定版本详情（已有，引用）

与 [backend-component-version-isolation-api.md](./backend-component-version-isolation-api.md) **§4.1** 一致：

```http
GET /page-template/{componentId}?entityType=component&version={version}
```

用于「应用该版本」时拉取完整 `ComponentDetail`（含 `template`），前端将暴露属性 / 生命周期 / 插槽等套入当前编辑器的 `CustomComponent` 实例。

---

### 3.3 发布时写入版本说明（已有字段，后端持久化约束）

**组件发布**（与现有 `POST /page-template/publish` 一致）请求体示例：

```json
{
  "pageId": "cmp_user_card",
  "entityType": "component",
  "versionNote": "本次调整暴露属性 title 为必填"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| pageId / componentId | string | 是 | 与现有发布接口一致 |
| versionNote | string | 否 | **必须在服务端与本次发布生成的版本行绑定存储**；写入 `component_versions`（或等价表）的 `version_note` 列 |

历史发布未带 `versionNote` 时，**3.1** 对应项中 `versionNote` 为空即可。

---

## 4. 存储建议（与版本隔离文档对齐）

在 [backend-component-version-isolation-api.md](./backend-component-version-isolation-api.md) **§5.2** `component_versions` 建议上增加：

| 列 | 类型 | 说明 |
|----|------|------|
| version_note | text / varchar | 对应发布时的 `versionNote` |
| published_at | datetime | 与 `publishedAt` 一致 |

唯一键：`(component_id, version)`。

---

## 5. 与 `POST /v1/components/meta:batch` 的关系

- **meta:batch**：批量查询「最新版本号、是否可升级、是否可访问」等，用于依赖列表与角标。
- **GET …/versions**：按组件拉取**历史版本目录**，用于时间线与只读浏览页。
- 两者互补，互不替代。

---

## 6. 联调清单

1. 发布组件时带 `versionNote`，随后 **3.1** 能在对应 `version` 行读到相同文案。
2. **3.1** 仅含 `status=published` 的版本；新建草稿未发布不出现在列表中。
3. 无权限用户访问 **3.1** 返回 403，前端列表项显示不可访问（可与 meta:batch 的 `accessible` 一致处理）。
4. 已删除组件 **3.1** 返回 404 或与产品约定的一致错误码。
5. **3.2** 任意列表中的 `version` 均可拉取到与当时发布一致的模板快照。

---

## 7. 前端类型映射（便于后端对齐字段名）

前端定义见 `src/api/types.ts`：

- `ComponentVersionListItem`：与 **3.1** `list[]` 一致。
- `ComponentVersionListResult`：`{ list: ComponentVersionListItem[] }`。

请求封装：`getComponentVersionList(componentId)` → `src/api/componentTemplate.ts`。
