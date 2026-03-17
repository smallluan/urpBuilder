# 注册头像能力（默认生成 + 自定义上传）前后端对接文档

> 后续扩展（个人信息维护 + 团队创建头像）请参考：[user-profile-and-team-avatar-phase6-handoff.md](./user-profile-and-team-avatar-phase6-handoff.md)

## 1. 背景

当前注册流程只支持用户名/密码/昵称，用户首次进入平台时没有头像信息，导致：

1. 顶部用户区、用户管理页、团队成员卡片无法显示统一头像；
2. 需要大量使用“首字母占位”，视觉辨识度较弱；
3. 用户无法在注册阶段完成基础身份个性化。

本期目标：
- 注册时头像可选；
- 默认提供 GitHub 风格（identicon）头像，可点击切换；
- 支持上传自定义头像；
- 前端在用户头像缺失时，使用同一套规则兜底生成头像。

---

## 2. 前端实现范围

### 2.1 注册页新增能力
- 页面：`/register`
- 新增头像区域：
  - 头像预览
  - “切换默认头像”按钮（循环切换 identicon）
  - “上传自定义头像”按钮（图片文件，≤2MB）
  - 上传后可切回默认头像

### 2.2 全局头像展示替换
- 顶部用户菜单头像：改为真实头像/生成头像
- 用户管理页：用户行头像改为真实头像/生成头像
- 团队成员卡片：成员头像改为真实头像/生成头像
- 团队管理页：拥有者头像改为生成头像（若后端后续返回 ownerAvatar 可直接接入）

---

## 3. 依赖与实现方式

新增 npm 依赖：
- `@dicebear/core`
- `@dicebear/collection`

默认头像生成策略：
- 使用 `identicon` 风格
- 根据 `avatarSeed` 生成稳定头像（相同 seed 得到相同图）
- 输出 `data:image/svg+xml` 的 Data URI

上传头像策略：
- 使用 tdesign `Upload` 组件选择图片
- 前端读取为 Data URL
- 校验：仅图片类型，大小 ≤ 2MB

---

## 4. 接口改动建议

## 4.1 注册接口
- `POST /api/auth/register`

### 请求体（新增字段）
```json
{
  "username": "alice",
  "password": "******",
  "nickname": "Alice",
  "avatar": "data:image/svg+xml;base64,... 或 data:image/png;base64,...",
  "avatarSource": "preset",
  "avatarSeed": "register-alice-2"
}
```

字段说明：
- `avatar`：可选；头像内容（建议后端接收后转存对象存储并落库 URL）
- `avatarSource`：可选；`preset | upload`
- `avatarSeed`：可选；默认头像来源时用于审计/复现

> 向后兼容：以上新增字段均为 optional，不影响旧客户端。

### 响应体（建议）
注册成功返回的 `session.user` 中包含 `avatar`：
```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "accessToken": "...",
    "refreshToken": "...",
    "user": {
      "id": "u_1001",
      "username": "alice",
      "nickname": "Alice",
      "avatar": "https://cdn.example.com/avatar/u_1001.png",
      "roles": ["member"]
    }
  }
}
```

## 4.2 当前用户接口
- `GET /api/auth/me`

确保返回结构中持续带 `avatar` 字段，便于前端统一展示。

---

## 5. 数据结构建议

用户表建议字段：
- `avatar_url`：头像地址（推荐）
- `avatar_source`：`preset | upload`
- `avatar_seed`：默认头像 seed（可选）
- `avatar_updated_at`：头像更新时间（可选）

说明：
- 推荐后端最终存 `avatar_url`，不直接长期存储 base64 大文本；
- 若收到 data URL，后端应先落对象存储（S3/OSS/COS/MinIO）再写 URL。

---

## 6. 安全与校验建议

1. 上传类型白名单：`image/png`, `image/jpeg`, `image/webp`, `image/svg+xml`
2. 上传大小限制：建议后端 ≤2MB（与前端一致）
3. 若收到 data URL：
   - 校验 MIME 前缀
   - 校验 base64 长度
   - 防止 SVG 注入（如采用 SVG，建议做安全清洗或转码）
4. 返回前做统一地址规范化（HTTPS 可访问 URL）

---

## 7. 兼容策略

1. 旧用户没有 `avatar_url` 时，前端自动按 `id/username` 生成 identicon，不阻塞展示。
2. 旧客户端仍按原参数注册，后端按旧逻辑处理。
3. 新客户端发送 `avatar*` 字段时，后端即使暂未落库存储，也建议忽略而非报错，避免注册失败。

---

## 8. 前后端联调清单

1. 注册不传头像：可成功注册，返回用户信息
2. 注册传默认头像（preset）：可成功注册，`avatar` 可回显
3. 注册传自定义头像（upload）：可成功注册，`avatar` 可回显
4. 获取当前用户：`/auth/me` 返回 `avatar`
5. 用户管理列表：`/admin/users` 返回用户头像字段（已有 `avatar` 即可）

---

## 9. 相关前端改动文件

- `src/pages/Register/index.tsx`
- `src/pages/Login/style.less`
- `src/utils/avatar.ts`
- `src/auth/types.ts`
- `src/components/Layout/index.tsx`
- `src/components/Layout/style.less`
- `src/pages/UserAdmin/index.tsx`
- `src/pages/UserAdmin/style.less`
- `src/pages/Teams/index.tsx`
- `src/pages/Teams/style.less`
- `src/team/types.ts`

---

## 10. 一句话总结

本期将注册流程升级为“可选头像”能力：默认可切换 GitHub 风格头像 + 自定义上传，前端已全链路接入并做展示兜底；后端重点补齐注册入参扩展、头像存储与安全校验。