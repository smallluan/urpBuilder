# 用户信息维护与团队头像创建（Phase 6）前后端对接文档

## 1. 背景

在完成注册头像能力后，平台侧又出现两类直接诉求：

1. 用户登录后需要在站内维护自己的资料（头像、昵称）并支持修改密码；
2. 团队创建时需要上传团队头像，避免团队列表长期使用纯占位样式。

因此本期新增两组能力：
- 个人信息页：展示账号名（只读）、编辑昵称、编辑头像、修改密码
- 创建团队：支持上传团队头像（可选）

---

## 2. 前端实现范围

### 2.1 个人信息页
- 新增侧边栏菜单：`个人信息`
- 页面路由：`/profile`
- 功能：
  - 账号名展示（只读，不可修改）
  - 昵称修改
  - 头像修改（默认头像切换 + 自定义上传）
  - 密码修改（旧密码 + 新密码 + 确认新密码）

### 2.2 团队创建头像
- 页面：`/teams`
- 在“创建团队”弹窗新增：
  - 团队头像预览
  - 上传团队头像（可选）
  - 恢复默认头像
- 创建成功后团队列表与详情优先展示团队头像

---

## 3. 前端字段变化

## 3.1 用户
新增/沿用字段：
- `avatar`
- `nickname`

注册与资料更新时补充传递：
- `avatarSource: 'preset' | 'upload'`
- `avatarSeed`（仅默认头像来源时可选）

## 3.2 团队
在团队模型新增字段：
- `avatar?: string`

团队创建请求新增可选字段：
- `avatar?: string`
- `avatarSource?: 'preset' | 'upload'`

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

## 4.1 更新个人资料
- `PATCH /api/auth/me`

### 请求体
```json
{
  "nickname": "Alice",
  "avatar": "data:image/png;base64,... 或 https://cdn.example.com/avatar/u_1001.png",
  "avatarSource": "upload",
  "avatarSeed": null
}
```

### 规则
- `username` 不允许在该接口修改
- 仅允许更新 `nickname/avatar` 相关字段

### 返回
```json
{
  "code": 0,
  "message": "资料更新成功",
  "data": {
    "id": "u_1001",
    "username": "alice",
    "nickname": "Alice",
    "avatar": "https://cdn.example.com/avatar/u_1001.png",
    "roles": ["member"]
  }
}
```

## 4.2 修改密码
- `PATCH /api/auth/password`

### 请求体
```json
{
  "currentPassword": "old-password",
  "newPassword": "new-password"
}
```

### 建议规则
- 校验旧密码正确性
- 新密码强度按平台策略校验
- 新旧密码不得一致

### 返回
```json
{
  "code": 0,
  "message": "密码修改成功",
  "data": null
}
```

## 4.3 创建团队（扩展）
- `POST /api/teams`

### 请求体（新增头像字段）
```json
{
  "name": "产品中台",
  "code": "product-platform",
  "description": "负责页面与组件搭建",
  "avatar": "data:image/png;base64,...",
  "avatarSource": "upload"
}
```

### 返回 data
```json
{
  "id": "team_001",
  "name": "产品中台",
  "code": "product-platform",
  "description": "负责页面与组件搭建",
  "avatar": "https://cdn.example.com/team-avatar/team_001.png",
  "role": "owner",
  "memberCount": 1
}
```

## 4.4 团队查询返回补充
以下接口建议均返回 `avatar` 字段：
- `GET /api/teams/mine`
- `GET /api/teams/:teamId`
- `GET /api/admin/teams`

---

## 5. 数据结构建议

## 5.1 用户表
建议增加/确认字段：
- `avatar_url`
- `avatar_source`（`preset|upload`）
- `avatar_seed`（可选）
- `profile_updated_at`

## 5.2 团队表
建议增加字段：
- `avatar_url`
- `avatar_source`（`preset|upload`）
- `avatar_updated_at`

---

## 6. 安全与校验建议

1. 图片类型白名单：`image/png`, `image/jpeg`, `image/webp`, `image/svg+xml`
2. 文件大小限制：建议后端 ≤2MB（与前端保持一致）
3. 若接收 data URL：
   - 校验 MIME 与长度
   - SVG 建议清洗或转码
4. 头像落库建议：
   - 服务端转存对象存储后返回 URL
   - 不建议数据库长存原始 base64
5. 密码修改成功后可选策略：
   - 使其他会话失效（安全优先）

---

## 7. 兼容策略

1. 新字段均可选，旧客户端不受影响
2. 后端暂不支持头像入库时，建议忽略头像字段并返回成功（不要导致创建失败）
3. 旧用户/旧团队无头像时，前端自动生成 identicon 作为兜底

---

## 8. 前后端联调清单

### 用户资料
1. `/auth/me` 获取到 `avatar`
2. `PATCH /auth/me` 更新昵称成功
3. `PATCH /auth/me` 更新头像成功
4. 校验用户名不可修改（传入 username 应被拒绝或忽略）

### 密码
1. `PATCH /auth/password` 旧密码正确成功
2. 旧密码错误返回明确错误码
3. 新旧密码一致被拒绝

### 团队头像
1. 创建团队不传头像成功
2. 创建团队传头像成功
3. 团队列表/详情返回 `avatar`

---

## 9. 建议错误码

### 用户资料/密码
- `AUTH_PROFILE_UPDATE_FORBIDDEN_FIELD`
- `AUTH_PASSWORD_INCORRECT`
- `AUTH_PASSWORD_WEAK`
- `AUTH_PASSWORD_SAME_AS_OLD`

### 头像
- `AVATAR_INVALID_TYPE`
- `AVATAR_TOO_LARGE`
- `AVATAR_UPLOAD_FAILED`

### 团队
- `TEAM_AVATAR_INVALID_TYPE`
- `TEAM_AVATAR_TOO_LARGE`

---

## 10. 涉及前端文件

- `src/pages/UserProfile/index.tsx`
- `src/pages/UserProfile/style.less`
- `src/components/Layout/index.tsx`
- `src/router/index.tsx`
- `src/auth/types.ts`
- `src/auth/api.ts`
- `src/auth/context.tsx`
- `src/team/types.ts`
- `src/pages/Teams/index.tsx`
- `src/pages/Teams/style.less`
- `src/pages/TeamAdmin/index.tsx`
- `src/pages/TeamAdmin/style.less`
- `src/utils/avatar.ts`

---

## 11. 一句话总结

本期把“注册头像”扩展为“可持续维护身份信息 + 团队头像创建”的完整闭环：用户可在站内维护昵称/头像并修改密码，团队创建支持头像上传，后端需补齐资料更新、改密接口与团队头像字段存储返回。