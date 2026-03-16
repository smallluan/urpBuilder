# 资源 Key 作用域隔离（四期）后端对接文档

## 1. 结论（先给答案）

推荐将 `pageId` / `componentId` 从“全局唯一”改为“作用域内唯一”。

目标规则：
- 同一作用域内：不允许重复
- 不同作用域之间：允许重复

作用域定义：
- 个人作用域：`ownerType=user` + `ownerId`
- 团队作用域：`ownerType=team` + `ownerTeamId`

实体维度：
- 页面与组件建议继续隔离（`entityType=page|component`）

---

## 2. 为什么要做作用域隔离

如果继续全局唯一，会带来这些问题：
- 团队 A 的 `user_profile` 会阻塞团队 B 使用同名业务 Key
- 个人草稿常见命名（如 `form_basic`）会与团队模板冲突
- 多团队协作时，资源命名需要人为加前缀，管理成本高

作用域内唯一更符合协作模型：
- 同团队内保证稳定、可追踪
- 跨团队/个人互不干扰

---

## 3. 唯一性规则建议

## 3.1 唯一键推荐

建议后端按如下逻辑做唯一约束（概念表达）：

- 页面：`(entityType='page', ownerType, ownerScopeId, pageId)` 唯一
- 组件：`(entityType='component', ownerType, ownerScopeId, pageId)` 唯一

其中 `ownerScopeId` 定义：
- `ownerType=user` 时取 `ownerId`
- `ownerType=team` 时取 `ownerTeamId`

> 若数据库不方便表达“条件字段”，可在写入层生成统一的 `scopeKey`，例如：
> - 用户：`u:{ownerId}`
> - 团队：`t:{ownerTeamId}`
> 再做唯一索引 `(entityType, scopeKey, pageId)`。

## 3.2 更新时规则

- 更新草稿（PUT）允许保持原 `pageId`
- 若未来支持改 ID，则也必须按同作用域校验冲突

## 3.3 冲突错误码建议

- `RESOURCE_KEY_CONFLICT_IN_SCOPE`
- 错误 message 建议包含：`entityType`、`scope`、`pageId`

---

## 4. 接口约定（与现有接口兼容）

当前前端已传：
- `base.entityType`
- `base.ownerType`
- `base.ownerTeamId`（团队时）
- `base.pageId`

后端在保存草稿/发布时需要：
1. 先解析作用域（用户/团队）
2. 在该作用域内校验 Key 唯一
3. 冲突时返回业务错误码，不要返回 500

适用接口：
- `POST /api/page-template/draft`
- `PUT /api/page-template/:id`
- `POST /api/page-template/publish`（如发布也要求唯一）

---

## 5. 迁移建议（从全局唯一到作用域唯一）

1. 先补齐历史数据的 `ownerType/ownerId/ownerTeamId`
2. 生成 `scopeKey`（若采用该方案）
3. 先做数据巡检，找同作用域重复 Key
4. 清理冲突后再切换唯一索引
5. 发布后保留一段时间冲突日志

---

## 6. 前端本次已配合内容

- 创建保存时增加“作用域内 Key 冲突预检查”：
  - 个人保存只查个人作用域
  - 团队保存只查当前团队作用域
- 若命中冲突，前端直接提示“当前作用域已存在，请更换 ID”

说明：
- 前端预检查仅用于提升体验
- 最终一致性必须以后端唯一约束为准

---

## 7. 一句话总结

资源 Key 建议升级为“作用域内唯一、跨作用域可重复”，后端应以 `entityType + scope + pageId` 作为唯一约束核心，前端已同步配合冲突预校验。