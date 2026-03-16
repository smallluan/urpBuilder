# 账号注销与管理员用户管理（一期）前后端对接文档

## 1. 背景

当前平台进入测试阶段后，存在两个高频需求：

1. 测试账号需要频繁清理（避免脏数据影响回归结果）
2. 平台管理员需要统一查看用户并执行账号注销

因此本期引入两类能力：
- 用户自助注销账号
- 管理员查询所有用户并注销指定账号

---

## 2. 目标范围

### 2.1 用户侧
- 在右上角用户菜单新增“注销账号”入口
- 二次确认后执行账号注销
- 注销成功后清理登录态并返回登录页

### 2.2 管理员侧
- 新增“用户管理”页面（仅管理员可见）
- 支持按用户名/昵称/邮箱搜索
- 支持按状态筛选
- 支持分页
- 支持管理员注销指定账号

---

## 3. 当前前端实现

## 3.1 已新增页面与入口
- 页面：`/user-admin`
- 侧边菜单：管理员角色可见“用户管理”
- 用户菜单：新增“注销账号”

管理员角色判定（前端）：
- `admin`
- `super_admin`
- `platform_admin`
- `root`

> 最终权限以后端鉴权为准，前端仅做入口控制。

## 3.2 已新增前端 API 封装
- `DELETE /api/auth/me`（用户自助注销）
- `GET /api/admin/users`（管理员查用户列表）
- `DELETE /api/admin/users/:userId`（管理员注销账号）

---

## 4. 接口定义建议

统一响应结构：

```json
{
  "code": 0,
  "message": "ok",
  "data": {}
}
```

## 4.1 用户自助注销

- `DELETE /api/auth/me`

### 行为建议
- 软删除账号（推荐）
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

## 4.2 管理员用户列表

- `GET /api/admin/users`

### Query 参数
- `keyword`：用户名/昵称/邮箱模糊搜索
- `status`：`all | active | disabled | deleted`
- `page`：页码（从 1 开始）
- `pageSize`：每页条数

### 返回 data 结构
```json
{
  "list": [
    {
      "id": "u_1001",
      "username": "zhangsan",
      "nickname": "张三",
      "email": "zhangsan@example.com",
      "roles": ["admin"],
      "status": "active",
      "createdAt": "2026-03-01T08:00:00.000Z",
      "updatedAt": "2026-03-16T09:30:00.000Z"
    }
  ],
  "total": 1
}
```

## 4.3 管理员注销指定账号

- `DELETE /api/admin/users/:userId`

### 行为建议
- 软删除目标用户
- 目标用户所有会话失效
- 禁止管理员注销自己（后端兜底）

### 返回
```json
{
  "code": 0,
  "message": "用户已注销",
  "data": null
}
```

---

## 5. 数据结构建议

## 5.1 用户状态字段

```ts
status: 'active' | 'disabled' | 'deleted'
```

说明：
- `active`：正常
- `disabled`：禁用（保留账号，不可登录）
- `deleted`：已注销（软删除）

## 5.2 审计字段建议
- `deletedAt`
- `deletedBy`
- `deleteReason`（可选）

---

## 6. 权限与安全建议

1. `DELETE /auth/me` 仅允许当前登录用户调用
2. `GET /admin/users` 仅平台管理员可访问
3. `DELETE /admin/users/:userId` 仅平台管理员可访问
4. 管理员不能注销自己（避免误操作导致管理失控）
5. 注销后必须清理 access/refresh token
6. 关键操作建议记录审计日志（操作人、目标用户、时间、IP）

---

## 7. 兼容与迁移建议

1. 若历史用户表无 `status` 字段，迁移时默认 `active`
2. 已删除账号建议默认不参与普通业务查询
3. 搜索接口可按 `status=all` 包含 `deleted`；普通用户接口应排除

---

## 8. 前端联调清单

1. 用户菜单注销：`DELETE /auth/me` 成功后返回登录页
2. 管理员页列表：分页+搜索+状态筛选
3. 管理员注销用户：成功后列表刷新
4. 权限错误码：前端可直接展示 message

建议错误码：
- `AUTH_ACCOUNT_DELETE_FORBIDDEN`
- `ADMIN_PERMISSION_REQUIRED`
- `ADMIN_CANNOT_DELETE_SELF`
- `USER_NOT_FOUND`

---

## 9. 一句话总结

本期新增“自助注销 + 管理员注销用户”双能力，前端入口与页面已就绪，后端需重点补齐账号状态机、权限校验、会话失效与审计日志。