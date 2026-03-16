# 资源归属三期（个人/团队）对接文档

## 1. 历史背景与阶段关系

当前项目团队协作能力已经走过两步：

1. **团队一期**：团队创建、成员管理、团队切换。
2. **邀请与消息二期**：邀请状态机（pending/accept/reject）+ 全局消息中心处理邀请。

本次是 **三期：资源归属模型落地**，目标是让“页面模板/组件模板”从单一用户归属，升级为：

- 个人资源（user）
- 团队资源（team）

并且支持在列表页按“我的 / 当前团队 / 全部”筛选。

---

## 2. 本次前端改动结果

### 2.1 保存草稿时携带归属信息
在创建/编辑页点击保存时，前端会在 `base` 中传递：

- `ownerType`: `user | team`
- `ownerTeamId`: 当 `ownerType=team` 时传当前团队 ID

> 当前行为：如果已选团队，保存弹窗默认归属为“当前团队”；也可以切回“个人资源”。

### 2.2 列表页新增“当前团队”筛选
页面模板列表、组件模板列表新增筛选项：

- 我的（mine）
- 当前团队（ownerType=team + ownerTeamId=currentTeamId）
- 全部

### 2.3 列表展示归属信息
列表“发布人”列新增归属标签：

- 个人
- 团队（显示团队名）

### 2.4 团队资源的前端可管理判定（UI 层）
前端对“操作按钮是否展示”做了补充：

- 个人资源：沿用 ownerId=当前用户
- 团队资源：当前团队且当前用户角色为 `owner/admin` 时展示可管理操作

> 最终权限必须以后端鉴权为准，前端仅做可用性判断。

---

## 3. 本次涉及文件

- `src/api/types.ts`
- `src/builder/components/HeaderControls.tsx`
- `src/pages/BuildPage/index.tsx`
- `src/pages/BuildPage/style.less`
- `src/pages/BuildComponent/index.tsx`
- `src/pages/BuildComponent/style.less`

---

## 4. 接口改动说明（重点给后端）

本次**不新增路径**，主要是对既有接口的入参与出参字段扩展。

统一响应结构仍然沿用：

```json
{
  "code": 0,
  "message": "ok",
  "data": {}
}
```

### 4.1 保存草稿（页面/组件）

#### 页面草稿
- `POST /api/page-template/draft`
- `PUT /api/page-template/:id`

#### 组件草稿
- `POST /api/page-template/draft`
- `PUT /api/page-template/:id`

> 组件与页面通过 `base.entityType` 区分（`page | component`）

#### 请求体新增字段（base）

```json
{
  "base": {
    "pageId": "user_profile_page",
    "pageName": "用户详情页",
    "entityType": "page",
    "ownerType": "team",
    "ownerTeamId": "team_1001",
    "visibility": "private"
  },
  "template": {}
}
```

字段说明：
- `ownerType`: `user | team`
- `ownerTeamId`: `ownerType=team` 时必填，`ownerType=user` 时可省略或 null

---

### 4.2 列表查询（页面/组件）

- `GET /api/page-base/list?entityType=page`
- `GET /api/page-base/list?entityType=component`

#### 新增可选查询参数
- `ownerType`: `user | team`
- `ownerTeamId`: 团队筛选时传

#### 示例

查询当前团队页面：

```http
GET /api/page-base/list?entityType=page&ownerType=team&ownerTeamId=team_1001&page=1&pageSize=10
```

查询我的组件：

```http
GET /api/page-base/list?entityType=component&mine=true&page=1&pageSize=10
```

---

### 4.3 列表返回字段扩展

列表项建议返回：

```json
{
  "pageId": "user_profile_card",
  "pageName": "用户信息卡片",
  "entityType": "component",
  "status": "draft",
  "currentVersion": 3,
  "ownerId": "u_1001",
  "ownerName": "张三",
  "ownerType": "team",
  "ownerTeamId": "team_1001",
  "ownerTeamName": "前端优化团队",
  "visibility": "private",
  "updatedAt": "2026-03-16T10:30:00.000Z"
}
```

---

## 5. 前后端字段约定

### 5.1 归属类型
```ts
ownerType: 'user' | 'team'
```

### 5.2 团队归属 ID
```ts
ownerTeamId?: string
```

### 5.3 列表里团队显示名
```ts
ownerTeamName?: string
```

---

## 6. 权限与业务规则（后端必须兜底）

1. `ownerType=team` 时，写入前校验 `ownerTeamId` 存在且用户属于该团队。
2. 团队资源修改/删除/发布/可见性切换需校验团队角色（至少 `owner/admin`）。
3. `mine=true` 与 `ownerType/ownerTeamId` 同时出现时，建议后端定义优先级并保持一致（建议参数冲突报错或以 ownerType 规则优先）。
4. 非团队成员不可读取团队私有资源。
5. 团队资源的 `ownerId` 建议保留“创建人”，但权限判断应以团队角色为准。

---

## 7. 兼容建议

1. 旧数据没有 `ownerType` 时，后端可按 `user` 兜底。
2. 旧数据没有 `ownerTeamId` 时按个人资源处理。
3. 对旧客户端（不传 owner 字段）也要兼容，默认写成个人资源。

---

## 8. 前端现状与待后端配合点

### 已完成
- 保存时传归属字段
- 列表支持团队筛选参数
- 列表展示归属标签

### 待后端确认
- `page-base/list` 是否支持 `ownerType + ownerTeamId`
- 草稿保存时是否接受并落库 `ownerType/ownerTeamId`
- 团队资源操作权限错误码定义

建议错误码：
- `RESOURCE_OWNER_TEAM_REQUIRED`
- `RESOURCE_OWNER_TYPE_INVALID`
- `RESOURCE_TEAM_ACCESS_DENIED`
- `RESOURCE_TEAM_NOT_FOUND`

---

## 9. 一句话总结

本次三期将模板资源从“个人拥有”升级为“个人/团队双归属”，前端链路已打通保存、筛选、展示与基础权限可见性，后端需补齐字段落库、查询过滤与团队权限校验。