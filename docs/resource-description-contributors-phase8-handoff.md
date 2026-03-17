# 资源卡片元数据（描述 + 参与者 + 团队简介）对接文档（Phase 8）

## 1. 背景

前端已将“搭建页面 / 搭建组件”改为 TDesign Card + Grid 形态，并新增元数据展示诉求：

- 资源描述（description）
- 参与者头像组（contributors）
- 团队信息简介（teamSummary）

为了避免列表接口过重，建议采用“列表轻量字段 + 详情按需请求”方案。

---

## 2. 当前前端行为

### 2.1 保存时新增描述字段
- 保存页面/组件时，新增 `description`（非必填，前端限制最多 300 字）
- UI 组件使用 TDesign `Textarea`

### 2.2 列表页展示规则
- 卡片展示 description（单行省略）
- 若为空，展示“暂无描述”
- 卡片底部展示参与者头像组
- 点击详情可查看完整信息

### 2.3 详情弹窗展示规则
- 描述区域可滚动（当文本过长）
- 参与者通过 Popup 弹出列表查看（List + ListItemMeta）
- 团队信息通过 Popup 显示简要介绍

---

## 3. 建议接口字段

统一响应结构：

```json
{
  "code": 0,
  "message": "ok",
  "data": {}
}
```

### 3.1 列表接口（轻量）
- `GET /api/page-base/list?entityType=page`
- `GET /api/page-base/list?entityType=component`

每条记录建议追加：

```json
{
  "description": "页面/组件描述（建议最多 300 字）",
  "contributors": [
    {
      "userId": "u_1001",
      "username": "alice",
      "nickname": "Alice",
      "avatar": "https://...",
      "role": "owner",
      "lastActiveAt": "2026-03-17T12:30:00.000Z"
    }
  ],
  "teamSummary": {
    "id": "team_001",
    "name": "产品中台",
    "description": "负责页面与组件资产建设",
    "avatar": "https://...",
    "memberCount": 12
  }
}
```

> 若列表性能敏感：`contributors` 可仅返回前 4 个，并附 `contributorCount`。

### 3.2 详情接口（推荐单独提供）
建议新增：
- `GET /api/page-template/:id/meta?entityType=page|component`

返回完整元数据：
- full description
- full contributors list
- team summary
- 其他审计信息（可选）

这样列表页不需要携带大字段，详情时再拉全量数据。

---

## 4. 保存接口字段扩展

保存草稿时建议支持：

```json
{
  "base": {
    "pageId": "...",
    "pageName": "...",
    "description": "..."
  }
}
```

适用于：
- `POST /api/page-template/draft?entityType=page|component`
- `PUT /api/page-template/:id?entityType=page|component`

---

## 5. 校验建议

- `description` 最大长度：300（前后端一致）
- 超长返回明确错误码，例如：`RESOURCE_DESCRIPTION_TOO_LONG`
- 空描述允许

---

## 6. 一句话总结

前端已完成资源卡片元数据展示能力，后端建议按“列表轻量 + 详情按需”的接口策略补齐 `description / contributors / teamSummary`，可在不增加列表压力的前提下完成完整信息展示。
