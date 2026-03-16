# 团队邀请二期（全局消息化）对接文档

## 1. 需求背景

团队一期已经完成基础能力（创建团队、团队切换、邀请/移除成员），但有两个明显体验问题：

1. 邀请输入没有联想搜索，输入用户名/邮箱不直观，容易输错。
2. 邀请处理入口只在团队页，不是全局可达，且“直接入队”不够规范。

本次二期目标是把邀请能力升级为“可搜索 + 待确认 + 全局消息中心可处理”的模型。

---

## 2. 本次实现效果

### 2.1 邀请输入支持远程搜索
- 团队页邀请弹窗支持边输入边搜索候选用户。
- 输入关键词后，会延迟 260ms 触发远程搜索。
- 候选结果支持点击选中，提交邀请时优先用 `inviteeUserId`。

### 2.2 邀请流程改为“待对方确认”
- 邀请动作由“直接加入成员”改为“创建邀请单”。
- 邀请发出后不立刻进成员列表。
- 受邀人需要显式“接受/拒绝”。

### 2.3 新增全局消息中心（顶栏）
- 顶栏增加“消息”按钮和未处理邀请角标。
- 打开后可查看：
  - 收到的邀请（可接受/拒绝）
  - 发出的邀请（查看状态）
- 在消息中心处理邀请后会刷新团队上下文。

### 2.4 团队页新增邀请看板
- 团队管理页（管理员/拥有者）可查看当前团队“待确认邀请”列表。
- 个人也可在团队页查看“我收到的邀请”。

---

## 3. 前端当前进度（阶段定位）

### 已完成
- 邀请搜索候选人 UI + API 对接
- 邀请状态流转（pending -> accept/reject）
- 顶栏消息中心框架（Drawer + Tab + 表格 + 处理按钮）
- 团队页邀请状态看板

### 未完成（下一步可做）
- 消息中心统一聚合更多消息类型（系统公告、权限申请、发布审核）
- 消息已读/未读状态持久化
- WebSocket 实时推送（目前是手动刷新/打开时拉取）
- 团队邀请“撤回”能力

---

## 4. 前端改动文件范围

- 全局消息中心：
  - `src/components/GlobalNoticeCenter/index.tsx`
  - `src/components/GlobalNoticeCenter/style.less`
- 团队 API：
  - `src/team/api.ts`
- 团队类型：
  - `src/team/types.ts`
- 团队上下文：
  - `src/team/context.tsx`
- 团队页：
  - `src/pages/Teams/index.tsx`
  - `src/pages/Teams/style.less`
- 布局接入消息中心：
  - `src/components/Layout/index.tsx`

---

## 5. 接口新增 / 适配说明

> 前端默认所有接口继续沿用统一响应结构：

```json
{
  "code": 0,
  "message": "ok",
  "data": {}
}
```

### 5.1 邀请候选搜索（新增）
- `GET /api/users/search?keyword=xxx`

**用途**：邀请输入框联想候选

**返回 data（数组）**
```json
[
  {
    "userId": "u_1002",
    "username": "lisi",
    "nickname": "李四",
    "email": "lisi@example.com"
  }
]
```

### 5.2 发起团队邀请（适配）
- `POST /api/teams/:teamId/invitations`

**请求体**
```json
{
  "inviteeUserId": "u_1002",
  "identity": "lisi@example.com",
  "role": "member"
}
```

说明：
- 前端优先传 `inviteeUserId`（选择候选时）
- 若用户手动输入未命中候选，传 `identity`
- 后端可按业务要求决定是否允许“仅 identity 直邀”

### 5.3 获取当前团队邀请列表（新增）
- `GET /api/teams/:teamId/invitations?status=pending`

**用途**：团队页查看“待确认邀请”

### 5.4 获取我收到的邀请（新增）
- `GET /api/team-invitations/mine?status=pending`

**用途**：消息中心“收到的邀请”

### 5.5 获取我发出的邀请（新增）
- `GET /api/team-invitations/sent?status=pending`

**用途**：消息中心“发出的邀请”

### 5.6 响应邀请（新增）
- `POST /api/team-invitations/:invitationId/respond`

**请求体**
```json
{
  "action": "accept"
}
```
或
```json
{
  "action": "reject"
}
```

**用途**：受邀人在消息中心接受/拒绝

---

## 6. 数据格式（前端已使用）

### 6.1 邀请状态
```ts
export type TeamInvitationStatus = 'pending' | 'accepted' | 'rejected' | 'canceled' | 'expired';
```

### 6.2 邀请对象
```ts
export interface TeamInvitation {
  id: string;
  teamId: string;
  teamName?: string;
  inviteeUserId?: string;
  inviteeIdentity?: string;
  inviteeName?: string;
  inviterId?: string;
  inviterName?: string;
  role: 'admin' | 'member';
  status: TeamInvitationStatus;
  createdAt?: string;
  respondedAt?: string;
}
```

### 6.3 候选用户对象
```ts
export interface TeamUserCandidate {
  userId: string;
  username: string;
  nickname?: string;
  email?: string;
}
```

---

## 7. 关键业务规则（后端需兜底）

1. 同一团队同一用户，`pending` 邀请不可重复发起。
2. 非团队管理员/拥有者不能发邀请。
3. 受邀人只能操作自己的邀请（accept/reject）。
4. `accepted/rejected/canceled/expired` 的邀请不可重复响应。
5. 接受邀请时才真正写入团队成员关系。
6. 拒绝邀请不写入团队成员关系。
7. 成员被加入后，`/teams/mine` 结果应立即可见（前端会刷新）。

---

## 8. 注意点与兼容建议

### 8.1 兼容旧流程
此前是 `/teams/:teamId/members` 直接入队模型；现在前端已切换到邀请模型。

建议后端：
- 若暂时无法完全切换，可保留旧接口但不再供前端调用。
- 新接口应成为主链路。

### 8.2 角标计数定义
前端消息角标当前使用“我收到的 pending 邀请数量”。
后续若并入系统消息，可改为“所有未读消息总数”。

### 8.3 刷新机制
当前前端是拉模式：打开抽屉时拉取、处理后拉取、手动刷新。
如果后端后续支持推送（WebSocket/SSE），可再对接实时更新。

---

## 9. 建议错误码

- `TEAM_INVITATION_NOT_FOUND`
- `TEAM_INVITATION_ALREADY_RESPONDED`
- `TEAM_INVITATION_EXPIRED`
- `TEAM_INVITATION_PERMISSION_DENIED`
- `TEAM_INVITATION_DUPLICATED`
- `TEAM_MEMBER_ALREADY_EXISTS`
- `TEAM_INVITER_PERMISSION_DENIED`
- `USER_SEARCH_KEYWORD_INVALID`

---

## 10. 一句话总结

本次二期把团队邀请从“团队页局部功能”升级为“全局消息中心可处理的邀请状态机”，并补了邀请搜索与待确认流程，已经具备了可扩展成统一消息中心的基础架子。
