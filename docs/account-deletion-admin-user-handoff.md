# 用户与团队治理（禁用 / 解禁 / 注销 / 删除）前后端对接文档

## 1. 背景

当前平台已经进入多人协作与高频测试阶段，出现了两类明确需求：

1. 测试账号、测试团队需要频繁清理，否则会污染回归数据。
2. 平台管理员需要具备基础治理能力，能对异常用户/团队做限制，而不只是“彻底删除”。

因此本期能力从“仅注销用户”升级为完整治理模型：
- 用户自助注销账号
- 管理员查询所有用户
- 管理员禁用 / 解禁 / 注销用户
- 管理员查询所有团队
- 管理员禁用 / 解禁 / 删除团队

其中禁用又分两类：
- 手动禁用：管理员手动封禁，需管理员手动解禁
- 定时禁用：封禁到某个时间点，或按时长自动计算截止时间

---

## 2. 目标范围

### 2.1 用户侧
- 右上角用户菜单支持“注销账号”
- 注销后清理登录态并返回登录页

### 2.2 管理员侧
- 用户管理：搜索、筛选、分页、禁用、解禁、注销
- 团队治理：搜索、筛选、分页、禁用、解禁、删除

---

## 3. 当前前端实现

## 3.1 已新增页面与入口
- 用户菜单：新增“注销账号”
- 管理员菜单：新增“用户管理”页 `/user-admin`
- 团队协作页：管理员新增“团队治理”区块

管理员角色前端识别：
- `admin`
- `super_admin`
- `platform_admin`
- `root`

> 最终权限以后端鉴权为准，前端仅做入口控制。

## 3.2 已接入前端 API
### 用户
- `DELETE /api/auth/me`
- `GET /api/admin/users`
- `PATCH /api/admin/users/:userId/disable`
- `PATCH /api/admin/users/:userId/enable`
- `DELETE /api/admin/users/:userId`

### 团队
- `GET /api/admin/teams`
- `PATCH /api/admin/teams/:teamId/disable`
- `PATCH /api/admin/teams/:teamId/enable`
- `DELETE /api/admin/teams/:teamId`

---

## 4. 状态模型建议

## 4.1 用户状态
```ts
status: 'active' | 'disabled' | 'deleted'
```

## 4.2 团队状态
```ts
status: 'active' | 'disabled' | 'deleted'
```

## 4.3 禁用附加字段
```ts
disableType?: 'manual' | 'timed'
disabledUntil?: string
disableReason?: string
```

字段含义：
- `manual`：手动禁用，必须人工解禁
- `timed`：定时禁用，到 `disabledUntil` 自动恢复或在鉴权时判断失效
- `disableReason`：禁用原因，便于治理审计

---

## 5. 行为规则建议

## 5.1 用户禁用后的系统行为
建议后端禁止用户发起所有非幂等操作，包括但不限于：
- 创建页面/组件
- 保存草稿
- 发布资源
- 邀请成员
- 创建团队
- 修改资料

建议允许的操作：
- 登录后查看只读信息（可选）
- 登出
- 读取必要的个人资料（可选）

更严格方案：
- 用户被禁用后，所有会话立即失效，重新登录直接提示“账号已禁用”

## 5.2 团队禁用后的系统行为
建议后端禁止该团队相关非幂等操作，包括：
- 团队资源新建/修改/发布/删除
- 邀请成员
- 移除成员
- 团队资料变更

建议读操作：
- 是否允许读取团队详情、团队资源列表，可按产品策略决定

---

## 6. 接口定义建议

统一响应结构：

```json
{
  "code": 0,
  "message": "ok",
  "data": {}
}
```

## 6.1 用户自助注销
- `DELETE /api/auth/me`

### 行为建议
- 软删除账号
- 当前会话失效
- 所有 refresh token 失效

### 返回
```json
{
  "code": 0,
  "message": "账号已注销",
  "data": null
}
```

## 6.2 管理员用户列表
- `GET /api/admin/users`

### Query 参数
- `keyword`：用户名 / 昵称 / 邮箱模糊搜索
- `status`：`all | active | disabled | deleted`
- `page`
- `pageSize`

### 返回 data
```json
{
  "list": [
    {
      "id": "u_1001",
      "username": "zhangsan",
      "nickname": "张三",
      "email": "zhangsan@example.com",
      "roles": ["admin"],
      "status": "disabled",
      "disableType": "timed",
      "disabledUntil": "2026-03-20T10:00:00.000Z",
      "disableReason": "测试封禁",
      "createdAt": "2026-03-01T08:00:00.000Z",
      "updatedAt": "2026-03-16T09:30:00.000Z"
    }
  ],
  "total": 1
}
```

## 6.3 管理员禁用用户
- `PATCH /api/admin/users/:userId/disable`

### 请求体
```json
{
  "mode": "timed",
  "disabledUntil": "2026-03-20T10:00:00.000Z",
  "reason": "测试账号临时封禁"
}
```

### 字段说明
- `mode`: `manual | timed`
- `disabledUntil`: `mode=timed` 时必填
- `reason`: 可选

### 返回
```json
{
  "code": 0,
  "message": "用户已禁用",
  "data": null
}
```

## 6.4 管理员解禁用户
- `PATCH /api/admin/users/:userId/enable`

### 返回
```json
{
  "code": 0,
  "message": "用户已恢复",
  "data": null
}
```

## 6.5 管理员注销用户
- `DELETE /api/admin/users/:userId`

### 行为建议
- 软删除目标用户
- 目标用户所有会话失效
- 禁止管理员注销自己

### 返回
```json
{
  "code": 0,
  "message": "用户已注销",
  "data": null
}
```

## 6.6 管理员团队列表
- `GET /api/admin/teams`

### Query 参数
- `keyword`：团队名称 / code / key 模糊搜索
- `status`：`all | active | disabled | deleted`
- `page`
- `pageSize`

### 返回 data
```json
{
  "list": [
    {
      "id": "team_001",
      "name": "产品中台",
      "code": "product-platform",
      "description": "负责页面与组件搭建",
      "ownerId": "u_1001",
      "ownerName": "张三",
      "memberCount": 8,
      "status": "active",
      "disableType": null,
      "disabledUntil": null,
      "disableReason": null
    }
  ],
  "total": 1
}
```

## 6.7 管理员禁用团队
- `PATCH /api/admin/teams/:teamId/disable`

### 请求体
```json
{
  "mode": "manual",
  "reason": "测试团队暂停使用"
}
```

或

```json
{
  "mode": "timed",
  "disabledUntil": "2026-03-25T18:00:00.000Z",
  "reason": "活动期间冻结"
}
```

## 6.8 管理员解禁团队
- `PATCH /api/admin/teams/:teamId/enable`

## 6.9 管理员删除团队
- `DELETE /api/admin/teams/:teamId`

### 行为建议
- 推荐软删除团队
- 删除前需定义资源归属策略：
  - 团队资源是否一并软删除
  - 是否转移到 owner 名下
  - 是否保留审计归档

---

## 7. 数据结构建议

## 7.1 用户表扩展字段
- `status`
- `disable_type`
- `disabled_until`
- `disable_reason`
- `deleted_at`
- `deleted_by`

## 7.2 团队表扩展字段
- `status`
- `disable_type`
- `disabled_until`
- `disable_reason`
- `deleted_at`
- `deleted_by`

## 7.3 审计日志建议
建议单独建治理审计表：
```ts
entityType: 'user' | 'team'
entityId: string
action: 'disable' | 'enable' | 'delete'
operatorId: string
reason?: string
snapshot?: string
createdAt: string
```

---

## 8. 权限与安全建议

1. `DELETE /auth/me`：仅允许本人
2. `GET /admin/users` / `PATCH /admin/users/*` / `DELETE /admin/users/*`：仅平台管理员
3. `GET /admin/teams` / `PATCH /admin/teams/*` / `DELETE /admin/teams/*`：仅平台管理员
4. 管理员不能注销自己
5. 建议管理员不能删除自己创建且仍在使用的核心团队，至少要有风险确认
6. 禁用/注销/删除操作应清理会话并记录审计日志
7. 定时禁用应在鉴权层统一判断，避免业务层漏判

---

## 9. 兼容与迁移建议

1. 历史用户、团队无 `status` 字段时默认 `active`
2. 历史禁用字段为空时视为未禁用
3. 已删除记录默认不参与普通业务查询
4. 后端若做定时禁用自动恢复，可通过：
   - 登录/鉴权时动态判断 `disabledUntil < now`
   - 定时任务批量恢复

---

## 10. 前端联调清单

### 用户
1. 用户菜单注销：`DELETE /auth/me`
2. 管理员列表查询：`GET /admin/users`
3. 管理员手动禁用用户
4. 管理员定时禁用用户
5. 管理员解禁用户
6. 管理员注销用户

### 团队
1. 管理员查询所有团队：`GET /admin/teams`
2. 管理员手动禁用团队
3. 管理员定时禁用团队
4. 管理员解禁团队
5. 管理员删除团队

---

## 11. 建议错误码

### 用户
- `AUTH_ACCOUNT_DELETE_FORBIDDEN`
- `AUTH_ACCOUNT_DISABLED`
- `ADMIN_PERMISSION_REQUIRED`
- `ADMIN_CANNOT_DELETE_SELF`
- `USER_NOT_FOUND`
- `USER_ALREADY_DISABLED`
- `USER_NOT_DISABLED`
- `USER_DISABLE_UNTIL_REQUIRED`

### 团队
- `TEAM_NOT_FOUND`
- `TEAM_ALREADY_DISABLED`
- `TEAM_NOT_DISABLED`
- `TEAM_DISABLE_UNTIL_REQUIRED`
- `TEAM_DELETE_FORBIDDEN`

---

## 12. 一句话总结

本期从“仅注销用户”升级为“用户与团队治理体系”的第一版：支持手动禁用、定时禁用、解禁、注销/删除，前端入口和治理页面已补齐，后端需要重点完成状态机、鉴权、会话失效、定时禁用判定与审计落库。