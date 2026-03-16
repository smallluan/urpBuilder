# 团队模块一期：前后端对接说明

## 1. 本次改动背景

当前系统已经具备基础用户体系：登录、注册、当前用户获取、资源 owner 识别、前端读写权限控制。

在此基础上，本次新增的是“团队维度”的第一阶段能力，目标不是一次性完成团队资源协作，而是先把团队上下文和团队管理主链路搭起来，让用户可以：

- 查看自己加入的团队
- 切换当前团队
- 创建团队
- 查看当前团队详情
- 邀请成员进入团队
- 将成员移出团队

本期刻意没有把“页面/组件资源归属到团队”一起做进去。资源归属会放到第二阶段处理，避免一次性把用户系统、团队系统、资源系统全部耦合在一起。

## 2. 前端当前已实现的行为

### 2.1 全局团队上下文
前端新增了团队上下文，整个应用在登录态下会自动拉取“我加入的团队列表”，并选出当前团队。

当前团队的选择优先级：
1. 当前内存中的 currentTeamId
2. localStorage 中缓存的 urp-builder.current-team-id
3. 如果以上都没有，则取我加入的第一个团队

### 2.2 顶栏团队切换
主布局顶栏已经新增“当前团队”下拉框，展示我加入的团队。

### 2.3 团队管理页
前端已新增“团队协作”页面，包含以下功能：
- 我的团队列表
- 团队详情
- 创建团队
- 邀请成员
- 移出成员

## 3. 前端当前使用的数据结构

```ts
export type TeamRole = 'owner' | 'admin' | 'member';
```

```ts
export interface TeamSummary {
  id: string;
  name: string;
  code?: string;
  description?: string;
  role: TeamRole;
  memberCount: number;
  ownerId?: string;
  ownerName?: string;
}
```

```ts
export interface TeamMember {
  userId: string;
  username: string;
  nickname?: string;
  email?: string;
  role: TeamRole;
  joinedAt?: string;
}
```

```ts
export interface TeamDetail extends TeamSummary {
  members: TeamMember[];
}
```

## 4. 本期需要后端提供的接口

统一返回格式：

```json
{
  "code": 0,
  "message": "ok",
  "data": {}
}
```

### 4.1 获取我加入的团队列表
- GET /api/teams/mine

返回 data 示例：

```json
[
  {
    "id": "team_001",
    "name": "产品中台",
    "code": "product-platform",
    "description": "负责产品组件与页面搭建",
    "role": "owner",
    "memberCount": 8,
    "ownerId": "u_1001",
    "ownerName": "张三"
  }
]
```

### 4.2 获取团队详情
- GET /api/teams/:teamId

返回 data 示例：

```json
{
  "id": "team_001",
  "name": "产品中台",
  "code": "product-platform",
  "description": "负责产品组件与页面搭建",
  "role": "owner",
  "memberCount": 8,
  "ownerId": "u_1001",
  "ownerName": "张三",
  "members": [
    {
      "userId": "u_1001",
      "username": "zhangsan",
      "nickname": "张三",
      "email": "zhangsan@example.com",
      "role": "owner",
      "joinedAt": "2026-03-16 10:00:00"
    }
  ]
}
```

### 4.3 创建团队
- POST /api/teams

请求体：

```json
{
  "name": "产品中台",
  "code": "product-platform",
  "description": "负责产品组件与页面搭建"
}
```

建议：创建人自动成为 owner，接口直接返回 TeamDetail。

### 4.4 切换当前团队
- PUT /api/teams/current

请求体：

```json
{
  "teamId": "team_001"
}
```

### 4.5 邀请成员加入团队
- POST /api/teams/:teamId/members

请求体：

```json
{
  "identity": "lisi@example.com",
  "role": "member"
}
```

说明：identity 由后端识别为用户名或邮箱。

### 4.6 将成员移出团队
- DELETE /api/teams/:teamId/members/:userId

## 5. 后端权限与状态约束建议

- owner：查看详情、邀请成员、移除成员、切换当前团队
- admin：查看详情、邀请成员、移除普通成员、切换当前团队
- member：查看详情、切换当前团队，不能邀请成员、不能移除成员

后端必须兜底以下场景：
- 非团队成员查看团队详情
- 非团队成员切换当前团队
- member 邀请成员
- member 移除成员
- 移除 owner
- 重复加入团队

## 6. 前端当前交互注意点

- 切换团队成功后，前端目前只更新团队上下文，还不会联动资源查询；资源归属放在第二阶段。
- 创建团队后前端默认认为当前用户已经是 owner，并立即切换到新团队。
- 当前邀请成员实现更偏向“直接加入”，因为邀请成功后前端会立刻重新拉团队详情并期待成员列表变化。

## 7. 本期未做的内容

- 资源归属到团队
- 团队资源列表视角
- 成员主动退出团队
- 解散团队
- 编辑团队资料
- 角色变更
- 邀请记录与待处理邀请
- 团队消息通知与站内信

## 8. 一句话总结

本期团队模块是“团队上下文与团队管理”的第一阶段版本。后端只要先把：团队列表、团队详情、创建团队、切换当前团队、邀请成员、移出成员 这 6 个接口稳定提供出来，前端这一期就能完整跑起来。
