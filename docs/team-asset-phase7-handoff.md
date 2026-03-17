# 团队资产中心（Phase 7）前后端对接文档

## 1. 目标

在已有团队成员管理基础上，新增“团队资产”能力，统一呈现团队拥有的：

- 成员（已有）
- 页面资产
- 组件资产
- 团队文档（预留）
- 团队接口资产（预留）

本期前端已先接入：成员 + 页面 + 组件；文档与接口先保留扩展位。

---

## 2. 前端当前实现

### 2.1 团队资产入口
- 页面：`/teams`
- 在团队详情中新增“团队资产”区块，展示资产汇总与分类列表。

### 2.2 当前已接入资产
1. **成员资产**：复用 `GET /api/teams/:teamId` 的 `members`
2. **页面资产**：通过 `/page-base/list` 结合 `ownerType=team + ownerTeamId`
3. **组件资产**：通过 `/page-base/list` 结合 `entityType=component + ownerType=team + ownerTeamId`

### 2.3 预留资产
- 团队文档（document）
- 团队接口（api）

前端已保留 Tab 和展示结构，只需后端补接口即可点亮。

---

## 3. 建议后端接口（新增）

统一响应结构：

```json
{
  "code": 0,
  "message": "ok",
  "data": {}
}
```

### 3.1 团队文档列表
- `GET /api/teams/:teamId/documents`

Query 参数建议：
- `keyword`（可选）
- `status`：`draft | published | archived`（可选）
- `page`
- `pageSize`

返回：

```json
{
  "list": [
    {
      "id": "doc_001",
      "name": "团队规范",
      "status": "published",
      "updatedAt": "2026-03-17T10:00:00.000Z",
      "ownerName": "Alice"
    }
  ],
  "total": 1
}
```

### 3.2 团队接口资产列表
- `GET /api/teams/:teamId/apis`

Query 参数建议：
- `keyword`（可选）
- `status`：`active | deprecated | draft`（可选）
- `page`
- `pageSize`

返回：

```json
{
  "list": [
    {
      "id": "api_001",
      "name": "查询订单列表",
      "status": "active",
      "updatedAt": "2026-03-17T10:00:00.000Z",
      "ownerName": "Bob"
    }
  ],
  "total": 1
}
```

### 3.3 团队资产总览（可选，推荐）
- `GET /api/teams/:teamId/assets/summary`

返回：

```json
{
  "memberCount": 12,
  "pageCount": 35,
  "componentCount": 58,
  "documentCount": 9,
  "apiCount": 14
}
```

---

## 4. 鉴权建议

- 资产读取：团队成员可读（或按角色策略收敛）
- 资产编辑：
  - owner/admin：可编辑团队资产
  - member：默认只读（可按业务开放部分权限）

---

## 5. 联调清单

1. 选择团队后资产区块正常展示
2. 页面资产数量与 `ownerType=team` 查询结果一致
3. 组件资产数量与 `ownerType=team` 查询结果一致
4. 文档接口返回后，文档 Tab 正常渲染
5. 接口资产返回后，接口 Tab 正常渲染

---

## 6. 本期涉及前端文件

- `src/team/types.ts`
- `src/team/api.ts`
- `src/pages/Teams/index.tsx`
- `src/pages/Teams/style.less`

---

## 7. 一句话总结

Phase 7 先把“团队资产中心”骨架跑通并接入团队页面/组件资产，文档与接口资产接口补齐后可直接无缝启用。
