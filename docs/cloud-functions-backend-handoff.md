# 云开发控制台后端对接文档

## 1. 需求背景

当前前端已实现“云开发控制台”风格的可视化管理界面，采用多 Tab：

- Tab1：`数据表管理`
- Tab2：`云函数管理`

用户侧不需要手写建表或复杂部署参数，主要通过可视化操作完成管理。

---

## 2. 空间与权限约束（强约束）

- `ownerType=user`：仅可读写当前用户资源。
- `ownerType=team`：仅可读写当前团队资源，需校验成员关系。
- 前端根据当前页面上下文自动传 `ownerType` / `ownerTeamId`，不提供手动切换作用域入口。

---

## 3. 统一响应结构

```json
{
  "code": 0,
  "message": "ok",
  "data": {}
}
```

- `code=0`：成功
- `code!=0`：失败（前端直接展示 `message`）

---

## 4. 数据表管理 API（已接入）

## 4.1 查询数据表列表

- **Method**: `GET`
- **Path**: `/data-tables/list`

Query 参数：

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| ownerType | `user \| team` | 是 | 空间类型 |
| ownerTeamId | `string` | 团队必填 | 团队 ID |
| keyword | `string` | 否 | 数据表名搜索 |
| page | `number` | 否 | 页码，默认 1 |
| pageSize | `number` | 否 | 每页条数，默认 12 |

返回建议：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "list": [
      {
        "id": "tbl_001",
        "name": "user_profile",
        "description": "用户资料表",
        "fieldCount": 6,
        "recordCount": 120,
        "updatedAt": "2026-03-22T12:30:00.000Z"
      }
    ],
    "total": 1
  }
}
```

## 4.2 查询数据表详情（含字段）

- **Method**: `GET`
- **Path**: `/data-tables/{tableId}`

## 4.3 新建数据表

- **Method**: `POST`
- **Path**: `/data-tables`

```json
{
  "name": "user_profile",
  "description": "用户资料表",
  "ownerType": "team",
  "ownerTeamId": "team_001"
}
```

## 4.4 编辑数据表

- **Method**: `PUT`
- **Path**: `/data-tables/{tableId}`

```json
{
  "name": "user_profile",
  "description": "更新后的描述"
}
```

## 4.5 删除数据表

- **Method**: `DELETE`
- **Path**: `/data-tables/{tableId}`

## 4.6 新建字段

- **Method**: `POST`
- **Path**: `/data-tables/{tableId}/fields`

```json
{
  "name": "username",
  "type": "string",
  "required": true,
  "description": "用户名",
  "defaultValue": ""
}
```

字段类型枚举建议：

- `string`
- `number`
- `boolean`
- `object`
- `array`
- `date`

## 4.7 编辑字段

- **Method**: `PUT`
- **Path**: `/data-tables/{tableId}/fields/{fieldId}`

## 4.8 删除字段

- **Method**: `DELETE`
- **Path**: `/data-tables/{tableId}/fields/{fieldId}`

---

## 5. 云函数管理 API（已接入）

> 运行时固定为 `Node.js 22`，前端不提供运行时切换。

## 5.1 查询云函数列表

- **Method**: `GET`
- **Path**: `/cloud-functions/list`

Query 参数：

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| ownerType | `user \| team` | 是 | 空间类型 |
| ownerTeamId | `string` | 团队必填 | 团队 ID |
| keyword | `string` | 否 | 函数名搜索 |
| status | `draft \| deployed \| deploying \| failed` | 否 | 状态筛选 |
| page | `number` | 否 | 页码，默认 1 |
| pageSize | `number` | 否 | 每页条数，默认 12 |

## 5.2 查询云函数详情

- **Method**: `GET`
- **Path**: `/cloud-functions/{functionId}`

返回应包含 `code` 字段（代码文本）。

## 5.3 新建云函数

- **Method**: `POST`
- **Path**: `/cloud-functions`

```json
{
  "name": "getUserProfile",
  "description": "获取用户资料",
  "runtime": "nodejs22",
  "timeoutSeconds": 5,
  "memorySize": 256,
  "code": "exports.main = async (event, context) => ({ success: true });",
  "ownerType": "team",
  "ownerTeamId": "team_001"
}
```

## 5.4 保存云函数代码

- **Method**: `PUT`
- **Path**: `/cloud-functions/{functionId}`

```json
{
  "description": "更新后的描述",
  "runtime": "nodejs22",
  "timeoutSeconds": 8,
  "memorySize": 512,
  "code": "exports.main = async () => ({ success: true });"
}
```

## 5.5 触发部署

- **Method**: `POST`
- **Path**: `/cloud-functions/{functionId}/deploy`

返回建议：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "deploymentId": "dep_001"
  }
}
```

## 5.6 执行云函数（代码节点调用）

- **Method**: `POST`
- **Path**: `/cloud-functions/{functionId}/execute`
- **说明**：`{functionId}` 支持传函数 `id` 或函数 `name`（同空间下唯一）。

```json
{
  "payload": {
    "userId": 1
  }
}
```

返回示例：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "executionId": "exec_9f12ab34cd56ef78ab90",
    "functionId": "fn_1234567890abcdef",
    "functionName": "getUserProfile",
    "durationMs": 12,
    "output": {
      "success": true
    }
  }
}
```

---

## 6. 推荐补充 API（建议）

- `GET /cloud-function-logs?functionId=&page=&pageSize=`（执行日志分页查询，可用于控制台“调用日志”）
- `POST /cloud-functions/{functionId}/rollback`（按 deploymentId 回滚）

---

## 7. 参数校验建议

- 数据表名：`^[a-zA-Z][a-zA-Z0-9_]{1,63}$`
- 字段名：`^[a-zA-Z][a-zA-Z0-9_]{1,63}$`
- 函数名：`^[a-zA-Z][a-zA-Z0-9_-]{1,63}$`
- `timeoutSeconds`：`1 ~ 60`
- `memorySize`：`128 ~ 3072`，步长 `128`
- `runtime` 固定 `nodejs22`

---

## 8. 错误码建议

- `code=0`：成功
- `code=40001`：参数错误
- `code=40003`：无权限
- `code=40009`：名称冲突（同作用域重名）
- `code=40010`：资源不存在
- `code=40011`：状态冲突（如函数部署中）
- `code=50000`：服务端异常

---

## 9. 联调注意事项

- 列表接口前端兼容：
  1. `data: { list, total }`
  2. `data: list[]`
  但建议后端固定为第 1 种。
- 时间字段建议统一 UTC ISO 字符串。
- 部署建议异步化，立即返回 `deploymentId`。
