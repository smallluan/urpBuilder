# 素材节点 API 对接说明（文件夹 + 文件统一模型）

本文档与前端 `src/api/assetNodes.ts`、`src/api/types.ts` 保持一致。采用**统一节点模型**（`kind: folder | file` 同一 `id` 空间），取代原有扁平素材列表，支持无限层级文件夹、懒加载、搜索与完整 CRUD。

## 1. 通用约定

- **Base URL**：与其它接口相同（如 `http://localhost:3333/api`），下文为相对此前缀的路径。
- **响应**：`ApiResponse<T>`：`{ "code": 0, "message": "ok", "data": T }`，`code !== 0` 为失败。
- **鉴权**：`Authorization: Bearer <access_token>`。
- **个人素材**：仅当前登录用户可读写自己的记录；**不得**出现在其他用户列表中。
- **团队素材**：仅对该 `teamId` 有权限的成员可访问；非成员 **403**。
- **空间隔离**：个人与团队素材严格隔离，接口路径不同，禁止跨域访问。

## 2. 数据模型 `MediaNodeDTO`

统一节点模型，文件夹与文件共用 `id` 空间（建议 UUID）。

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 节点 ID（UUID） |
| kind | `'folder' \| 'file'` | 是 | 节点类型 |
| parentId | string \| null | 是 | 父节点 ID，`null` 表示根目录 |
| name | string | 是 | 展示名称（文件夹/文件均必填） |
| childCount | number | 否 | 仅 `folder`：直接子节点数量（用于懒加载提示） |
| hasChildren | boolean | 否 | 仅 `folder`：是否有子节点（替代 `childCount` 亦可） |
| type | `'image' \| 'icon' \| 'other'` | 否 | 仅 `file`：素材类型 |
| mimeType | string | 否 | 仅 `file`：如 `image/png` |
| sizeBytes | number | 否 | 仅 `file`：字节数 |
| url | string | 否 | 仅 `file`：浏览器可直接访问的完整 URL |
| thumbnailUrl | string \| null | 否 | 仅 `file`：缩略图 URL |
| width | number \| null | 否 | 仅 `file`：图片宽度 |
| height | number \| null | 否 | 仅 `file`：图片高度 |
| createdBy | object \| null | 否 | 仅 `file`：`{ userId, username }` |
| createdAt | string | 是 | ISO8601 |
| updatedAt | string | 是 | ISO8601 |
| teamId | string \| null | 否 | 团队素材必有值；个人素材为 `null` 或省略 |

### 2.1 示例 JSON

```json
{
  "id": "folder-uuid-1",
  "kind": "folder",
  "parentId": null,
  "name": "产品图片",
  "childCount": 12,
  "hasChildren": true,
  "createdAt": "2024-01-15T08:30:00Z",
  "updatedAt": "2024-01-15T10:20:00Z",
  "teamId": "team-uuid-123"
}
```

```json
{
  "id": "file-uuid-1",
  "kind": "file",
  "parentId": "folder-uuid-1",
  "name": "首页 Banner.png",
  "type": "image",
  "mimeType": "image/png",
  "sizeBytes": 204800,
  "url": "https://cdn.example.com/assets/file-uuid-1.png",
  "thumbnailUrl": "https://cdn.example.com/assets/file-uuid-1-thumb.png",
  "width": 1920,
  "height": 1080,
  "createdBy": { "userId": "user-123", "username": "张三" },
  "createdAt": "2024-01-15T09:00:00Z",
  "updatedAt": "2024-01-15T09:00:00Z",
  "teamId": "team-uuid-123"
}
```

## 3. 列表/子节点（懒加载）

按 `parentId` 分页获取直接子节点，用于左侧树懒加载与右侧内容区展示。

### 3.1 个人素材子节点

```
GET /v1/me/asset-nodes/children?parentId={parentId}&page={page}&pageSize={pageSize}
```

**Query 参数：**
- `parentId`：父节点 ID，省略或空字符串表示根目录（`null`）
- `page`：页码，默认 1
- `pageSize`：每页数量，默认 20，最大 100
- `keyword`（可选）：按名称过滤（局部匹配）

**响应 `data`：**
```json
{
  "list": [MediaNodeDTO],
  "total": 100,
  "page": 1,
  "pageSize": 20
}
```

### 3.2 团队素材子节点

```
GET /v1/teams/{teamId}/asset-nodes/children?parentId={parentId}&page={page}&pageSize={pageSize}
```

参数同上。`teamId` 必须与用户权限匹配，否则返回 **403**。

## 4. 文件夹 CRUD

### 4.1 创建文件夹

```
POST /v1/me/asset-nodes/folder
POST /v1/teams/{teamId}/asset-nodes/folder
```

**请求体：**
```json
{
  "parentId": "folder-uuid-1",
  "name": "新年活动"
}
```

- `parentId`：`null` 或省略表示在根目录创建
- `name`：必填，1-100 字符，不能包含 `/` `\` 等特殊字符

**响应：** 返回完整的 `MediaNodeDTO`（`kind: folder`）

**错误码：**
- `400`：`name` 格式非法或 `parentId` 指向的节点不是文件夹
- `404`：`parentId` 不存在
- `409`：同目录下 `name` 冲突

### 4.2 更新节点（重命名/移动）

```
PATCH /v1/me/asset-nodes/{nodeId}
PATCH /v1/teams/{teamId}/asset-nodes/{nodeId}
```

**请求体（按需组合）：**
```json
{
  "name": "新名称",
  "parentId": "new-parent-folder-uuid"
}
```

- `name`：重命名
- `parentId`：移动到新文件夹（`null` 表示移动到根目录）

**校验规则（必须实现）：**
1. **成环检测**：不能将节点移动到自己的子孙节点下（直接或间接）
2. **跨空间禁止**：个人素材不能移动到团队，反之亦然（路径即空间，由 URL 前缀隔离）
3. **类型一致**：文件夹只能移动到文件夹下，文件同理
4. **同目录名称冲突**：目标父节点下已有同名节点时返回 **409**

**错误码：**
- `400`：请求体非法（如 `name` 格式错误）
- `404`：`nodeId` 或 `parentId` 不存在
- `409`：名称冲突、成环移动、非空文件夹删除（见下文）

### 4.3 删除节点

```
DELETE /v1/me/asset-nodes/{nodeId}
DELETE /v1/teams/{teamId}/asset-nodes/{nodeId}
```

**删除策略（请后端明确选择一种并在文档中注明）：**

**方案 A：非空禁止删除（推荐）**
- 文件夹下有子节点（文件或文件夹）时返回 **409**，并提示 "文件夹非空，请先删除内部文件"
- 前端展示确认对话框，用户手动清空后再删除

**方案 B：级联删除**
- 删除文件夹时递归删除所有子孙节点
- 需要事务保证，删除的文件同时清理存储

**错误码：**
- `404`：`nodeId` 不存在
- `409`：（仅方案 A）文件夹非空

## 5. 文件操作

### 5.1 上传文件

```
POST /v1/me/asset-nodes/upload
POST /v1/teams/{teamId}/asset-nodes/upload
```

**Content-Type**：`multipart/form-data`

**表单字段：**
- `file`（必填）：文件数据
- `name`（可选）：自定义名称，省略则使用原始文件名
- `parentId`（可选）：目标文件夹 ID，省略或空表示上传到根目录
- `type`（可选）：`image` | `icon` | `other`，省略则后端从 MIME 推断

**校验：**
- 单文件大小限制：建议 15MB（与前端约定一致）
- 文件类型：图片（PNG/JPG/GIF/WebP/SVG）、ICO 等

**响应：** 返回 `MediaNodeDTO`（`kind: file`，包含 `url`）

**错误码：**
- `400`：`file` 缺失或 `parentId` 不是文件夹
- `413`：文件过大
- `415`：不支持的 MIME 类型
- `404`：`parentId` 不存在

### 5.2 更新文件元数据

使用通用的 **PATCH** 接口（见 4.2），可更新：
- `name`：重命名
- `parentId`：移动到其它文件夹
- `type`：修正素材类型（如从 `other` 改为 `image`）

### 5.3 删除文件

使用通用的 **DELETE** 接口（见 4.3）。

## 6. 搜索（全局）

用于左侧树的搜索模式或独立搜索页面。

```
GET /v1/me/asset-nodes/search?keyword={keyword}&page={page}&pageSize={pageSize}&kind={kind}
GET /v1/teams/{teamId}/asset-nodes/search?keyword={keyword}&page={page}&pageSize={pageSize}&kind={kind}
```

**Query 参数：**
- `keyword`（必填）：搜索关键词，名称局部匹配
- `page`、`pageSize`：分页
- `kind`（可选）：`folder`、`file`，省略表示全部

**响应 `data`：** 分页对象，`list` 中每项为 `MediaNodeDTO` + 扩展字段：

```json
{
  "id": "file-uuid-1",
  "kind": "file",
  "name": "首页 Banner.png",
  "parentId": "folder-uuid-1",
  "pathIds": [null, "folder-uuid-1"],
  "pathNames": ["根目录", "产品图片"]
}
```

- `pathIds`：从根到父节点的 ID 链（根为 `null`）
- `pathNames`：对应的中文名称链

**用途：** 前端搜索后点击结果，可根据 `pathIds` 展开左侧树并定位到该节点。

## 7. HTTP 状态码汇总

| 场景 | 状态码 | 前端处理建议 |
|------|--------|--------------|
| 参数非法 | 400 | 提示具体字段错误 |
| 未登录 | 401 | 跳转登录 |
| 无团队权限 / 无资源权限 | 403 | 提示"无权限访问" |
| 节点/文件夹不存在 | 404 | 刷新列表，提示"已删除或不存在" |
| 名称冲突 / 成环移动 / 非空文件夹删除 | 409 | 提示具体业务错误 |
| 文件过大 | 413 | 提示"单文件不能超过 15MB" |
| MIME 不支持 | 415 | 提示"仅支持图片、图标等格式" |
| 服务器错误 | 500 | 重试或联系管理员 |

## 8. 迁移与兼容

### 8.1 现有扁平素材迁移

1. 后端将所有现有素材（`TeamAssetDTO`）迁移为 `kind: file`、`parentId: null` 的节点
2. 可选：为每个用户/团队创建一个默认文件夹（如 `"未分类"`）存放现有素材

### 8.2 旧 API 处理

原有扁平 API（`GET /v1/me/assets`、`GET /v1/teams/{teamId}/assets`）：

**方案 A：只读兼容**
- 保留一段时间（如 3 个月），内部实现改为查询 `parentId=null` 的文件节点
- 响应结构不变，老版本前端可继续使用

**方案 B：返回 301/410**
- 返回 `410 Gone`，body 中说明 "请升级到节点 API"

建议采用 **方案 A**，并 deprecation 标记，给前端足够迁移时间。

## 9. 前端对接清单（供后端参考）

前端需修改的文件：

1. `src/api/types.ts` - 新增 `MediaNodeDTO`、`MediaNodeKind`、`MediaNodeChildrenParams`、`MediaNodeSearchItem` 等类型
2. `src/api/assetNodes.ts`（新建）- 实现 children、search、folder CRUD、upload with parentId
3. `src/hooks/useAssetNodeChildren.ts`（新建）- 子节点分页 hook
4. `src/hooks/useAssetTree.ts`（新建）- 树状态管理与懒加载缓存
5. `src/hooks/useAssetSearch.ts`（新建）- 搜索 debounce hook
6. `src/pages/DataAssets/index.tsx` - 重构为左树右栏布局
7. `src/pages/DataAssets/style.less` - 新增树与布局样式
8. `src/builder/components/AssetPickerModal.tsx` - 对齐树+文件选择逻辑

## 10. 性能建议

1. **懒加载**：树节点 `children` 属性为 `true` 时，前端展开时调用 `load` 方法，不要一次性返回整棵树
2. **分页**：右侧内容区使用分页（`page`、`pageSize`），不要一次返回文件夹下所有文件
3. **搜索索引**：`keyword` 搜索需要数据库索引（如 MySQL `FULLTEXT` 或 Elasticsearch）
4. **面包屑缓存**：`pathIds`/`pathNames` 在搜索时计算，日常操作可缓存避免重复查询

---

**文档版本**：v1.0  
**适用前端版本**：待新建 `assetNodes.ts` 后的版本  
**关联旧文档**：`backend-team-assets-api.md`（扁平素材 API，将逐步废弃）
