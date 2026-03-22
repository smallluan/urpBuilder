# 数据常量管理后端对接文档

## 1. 需求背景

当前平台已支持个人空间与团队空间两种工作模式。  
本次新增“常量管理”页面，用于在开发过程中维护可复用的常量（如表格 mock 数据、开关配置、业务映射等），并且需要严格按空间权限隔离：

- 个人空间：只允许读取和创建当前登录用户自己的常量。
- 团队空间：只允许读取和创建当前选中团队内的常量。

前端已完成以下能力：

- 常量列表表格展示。
- 支持按关键字、常量类型筛选。
- 支持新增常量（右侧抽屉）。
- 按类型提供不同编辑器：
  - `string` -> 多行文本输入
  - `number` -> 数字输入
  - `boolean` -> 单选（`true` / `false`，默认 `false`）
  - `object` / `array` -> JSON 代码编辑器

说明：个人空间与团队空间由页面上下文自动决定，不允许在新增表单里手动切换或选择作用域。

---

## 2. 前端已接入接口（请按此对接）

前端当前调用的 API 地址如下：

- `GET /data-constants/list`
- `POST /data-constants`

基于项目现有约定，统一响应结构为：

```json
{
  "code": 0,
  "message": "ok",
  "data": {}
}
```

其中 `code === 0` 代表成功。

---

## 3. 数据模型建议

### 3.1 DataConstantRecord

```json
{
  "id": "const_001",
  "name": "table_mock_users",
  "description": "用户表 mock 数据",
  "valueType": "array",
  "value": [
    { "id": "u1", "name": "张三" }
  ],
  "ownerType": "user",
  "ownerId": "user_123",
  "ownerName": "alice",
  "ownerTeamId": null,
  "ownerTeamName": null,
  "createdAt": "2026-03-22T10:00:00.000Z",
  "updatedAt": "2026-03-22T10:00:00.000Z"
}
```

字段说明：

- `name`: 常量名，建议在同一作用域下唯一。
- `valueType`: `string | number | boolean | object | array`。
- `value`: 对应真实值（不是字符串包裹）。
- `ownerType`: `user | team`。
- `ownerTeamId`: 仅团队常量需要。

---

## 4. 接口定义

## 4.1 查询常量列表

### 请求

- **Method**: `GET`
- **Path**: `/data-constants/list`
- **Query 参数**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| ownerType | `user \| team` | 是 | 当前空间类型（由前端按当前页面上下文自动传入，非用户手动选择） |
| ownerTeamId | `string` | 团队必填 | 团队 ID（ownerType=team 时） |
| keyword | `string` | 否 | 模糊匹配 `name`/`description` |
| valueType | `string` | 否 | 类型过滤 |
| page | `number` | 否 | 页码，默认 1 |
| pageSize | `number` | 否 | 每页大小，默认 10 |

### 成功响应

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "list": [
      {
        "id": "const_001",
        "name": "table_mock_users",
        "description": "用户表 mock 数据",
        "valueType": "array",
        "value": [{ "id": "u1", "name": "张三" }],
        "ownerType": "team",
        "ownerTeamId": "team_001",
        "ownerTeamName": "增长中台",
        "createdAt": "2026-03-22T10:00:00.000Z",
        "updatedAt": "2026-03-22T10:30:00.000Z"
      }
    ],
    "total": 1
  }
}
```

---

## 4.2 新增常量

### 请求

- **Method**: `POST`
- **Path**: `/data-constants`
- **Body**

```json
{
  "name": "table_mock_users",
  "description": "用户表 mock 数据",
  "valueType": "array",
  "value": [{ "id": "u1", "name": "张三" }],
  "ownerType": "team",
  "ownerTeamId": "team_001"
}
```

其中 `ownerType` / `ownerTeamId` 同样由当前页面上下文自动确定，不提供给用户手动编辑。

### 成功响应

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "id": "const_001",
    "name": "table_mock_users",
    "description": "用户表 mock 数据",
    "valueType": "array",
    "value": [{ "id": "u1", "name": "张三" }],
    "ownerType": "team",
    "ownerTeamId": "team_001",
    "createdAt": "2026-03-22T10:00:00.000Z",
    "updatedAt": "2026-03-22T10:00:00.000Z"
  }
}
```

---

## 5. 权限与校验规则（强约束）

## 5.1 权限

- `ownerType=user` 时，后端必须强制使用当前登录用户 ID 作为归属，不允许越权指定他人。
- `ownerType=team` 时，后端必须校验当前用户属于 `ownerTeamId` 对应团队，否则返回无权限。
- 查询接口同样按上述规则过滤，禁止跨用户/跨团队读取。

## 5.2 参数校验

- `name` 必填，建议正则：`^[A-Za-z_][A-Za-z0-9_]*$`。
- `valueType` 必须在枚举内。
- `value` 的 JSON 类型必须与 `valueType` 一致：
  - `string` -> string
  - `number` -> number
  - `boolean` -> boolean
  - `object` -> object 且非数组
  - `array` -> array

---

## 6. 错误码建议

建议沿用平台统一风格：

- `code=0`: 成功
- `code=40001`: 参数错误（格式/缺失）
- `code=40003`: 权限不足
- `code=40009`: 常量名冲突（同作用域重名）
- `code=50000`: 服务端异常

前端会读取 `message` 并直接提示用户。

---

## 7. 存储与索引建议

- 表结构建议：
  - `id`
  - `name`
  - `description`
  - `value_type`
  - `value_json`（JSON/JSONB）
  - `owner_type`
  - `owner_id`
  - `owner_team_id`
  - `created_at`
  - `updated_at`
- 唯一索引建议：`(owner_type, owner_id, owner_team_id, name)`。
- 常用查询索引建议：
  - `(owner_type, owner_id, owner_team_id, updated_at desc)`
  - `(owner_type, owner_id, owner_team_id, value_type)`

---

## 8. 联调注意事项

- `GET /data-constants/list` 当前前端兼容两种返回：
  1. `data: { list, total }`
  2. `data: list[]`
  但建议后端稳定返回第 1 种。
- 新增成功后前端会自动刷新第一页。
- 建议后端统一返回 UTC 时间字符串，前端已做容错展示。

---

## 9. 可选扩展（后续阶段）

以下能力非本次必须，但建议预留：

- 更新常量：`PUT /data-constants/{id}`
- 删除常量：`DELETE /data-constants/{id}`
- 批量读取常量：`POST /data-constants/batch-get`
- 引用检查（被页面/组件使用时删除拦截）

