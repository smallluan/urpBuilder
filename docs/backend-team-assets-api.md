  # 素材库 API 对接说明（个人与团队隔离）

  > **注意**：本文档描述的**扁平素材 API**（`/v1/me/assets`、`/v1/teams/{teamId}/assets`）将逐步废弃，取而代之的是支持**文件夹层级**的新 API。
  > 
  > 新 API 文档：**[`backend-assets-nodes-api.md`](backend-assets-nodes-api.md)**（统一节点模型，`kind: folder | file`，支持懒加载、搜索、完整 CRUD）
  > 
  > 建议：新项目直接使用新 API；存量项目可并行使用旧 API（只读兼容期约 3 个月），尽快迁移至新 API。

  本文档与前端 `src/api/assets.ts`、`src/api/types.ts` 保持一致。**个人素材**与**团队素材**必须使用不同路径与存储边界，禁止混用或跨域访问。

  ## 与后端新 API 的关系

  - **旧 API**（本文档）：返回 `TeamAssetDTO[]`，无 `parentId`，所有素材平铺在一个列表中
  - **新 API**（`backend-assets-nodes-api.md`）：返回 `MediaNodeDTO`，`kind` 区分文件夹/文件，支持 `parentId` 嵌套、懒加载、完整文件夹 CRUD
  - **迁移**：现有素材在新 API 中对应 `kind: file`、`parentId: null` 的节点；旧 API 可内部调用新 API 并过滤 `parentId=null` 实现只读兼容

  ## 1. 通用约定

  - **Base URL**：与其它接口相同（如 `http://localhost:3333/api`），下文为相对此前缀的路径。
  - **响应**：`ApiResponse<T>`：`{ "code": 0, "message": "ok", "data": T }`，`code !== 0` 为失败。
  - **鉴权**：`Authorization: Bearer <access_token>`。
  - **个人素材**：仅当前登录用户可读写自己的记录；**不得**出现在其他用户列表中。
  - **团队素材**：仅对该 `teamId` 有权限的成员可访问；非成员 **403**。

  ---

  ## 2. 数据模型 `TeamAssetDTO`（列表项结构一致）

  | 字段 | 类型 | 必填 | 说明 |
  |------|------|------|------|
  | id | string | 是 | 素材 ID（建议 UUID） |
  | teamId | string | 否 | **仅团队素材返回**；个人素材省略或 null |
  | name | string | 是 | 展示名 |
  | type | string | 是 | `image` \| `icon` \| `other` |
  | mimeType | string | 是 | 如 `image/png` |
  | sizeBytes | number | 是 | 字节数 |
  | url | string | 是 | 浏览器可直接访问的完整 URL |
  | thumbnailUrl | string \| null | 否 | 缩略图 |
  | width | number \| null | 否 | 图片宽 |
  | height | number \| null | 否 | 图片高 |
  | createdAt | string | 是 | ISO8601 |
  | updatedAt | string | 是 | ISO8601 |
  | createdBy | object \| null | 否 | 可选 |

  列表分页结构（`data`）：

  ```json
  {
    "list": [],
    "total": 0,
    "page": 1,
    "pageSize": 20
  }
  ```

  ---

  ## 3. 个人素材库（当前用户）

  路径前缀：**`/v1/me/assets`**（`me` 由 Token 解析为当前用户，**禁止**用路径传 userId 给前端）。

  | 方法 | 路径 | 说明 |
  |------|------|------|
  | GET | `/v1/me/assets` | 分页列表，Query 同下 |
  | GET | `/v1/me/assets/{assetId}` | 详情 |
  | PATCH | `/v1/me/assets/{assetId}` | Body：`{ "name": "..." }` |
  | DELETE | `/v1/me/assets/{assetId}` | 删除 |
  | POST | `/v1/me/assets/upload` | `multipart/form-data`，字段 `file`、可选 `name` |

  **GET `/v1/me/assets` Query**：`page`、`pageSize`、`keyword`、`type`（与团队列表相同语义）。

  **Response `data`**：分页对象，`list` 中条目 **不应** 带 `teamId` 或应显式为 null。

  ---

  ## 4. 团队素材库

  路径前缀：**`/v1/teams/{teamId}/assets`**

  | 方法 | 路径 | 说明 |
  |------|------|------|
  | GET | `/v1/teams/{teamId}/assets` | 分页列表 |
  | GET | `/v1/teams/{teamId}/assets/{assetId}` | 详情 |
  | PATCH | `/v1/teams/{teamId}/assets/{assetId}` | 更新元数据 |
  | DELETE | `/v1/teams/{teamId}/assets/{assetId}` | 删除 |
  | POST | `/v1/teams/{teamId}/assets/upload` | multipart 上传 |

  **GET Query**：`page`、`pageSize`、`keyword`、`type`。

  **Response `data`**：分页对象，`list` 中条目 **必须** 带 `teamId` 且与路径一致。
  a
  ---

  ## 5. 上传（multipart 方案 A）

  个人：`POST /v1/me/assets/upload`  
  团队：`POST /v1/teams/{teamId}/assets/upload`  

  字段：`file`（必填）、`name`（可选）。成功返回完整 `TeamAssetDTO`（含 `url`）。

  ### 方案 B（预签名）

  若后端采用预签名，需为**个人**与**团队**分别提供会话创建与完成接口（路径需与前端约定后修改 `src/api/assets.ts`）。

  ---

  ## 6. HTTP 状态码

  | 场景 | 状态码 |
  |------|--------|
  | 参数错误 | 400 |
  | 未登录 | 401 |
  | 无团队权限 / 无资源权限 | 403 |
  | 素材不存在 | 404 |
  | 文件过大 | 413 |
  | MIME 不允许 | 415 |

  ---

  ## 7. 与搭建器、素材管理页

  搭建器将 `url` 写入组件属性。**前端不**在「个人/团队」之间做页面内切换：侧栏为**个人空间**时只调 `/v1/me/assets`；为**团队空间**且已选团队时只调 `/v1/teams/{teamId}/assets`，与严格隔离一致。

  ---

  ## 8. 数据 API 管理（占位）

  「数据 API」页与素材类似：**个人 API 配置**与**团队 API 配置**应分库或分命名空间；具体路径待产品定稿后另文约定。当前前端仅展示占位，不调用接口。
