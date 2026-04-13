# 预览公开访问与 API 约定

## 行为说明

- **草稿 / 未发布**：仅登录用户在平台内通过「预览」（含带 `snapshotKey` 的搭建器预览或列表预览）可看；匿名直接打开带 `pageId` 的预览 URL 会收到 **403**（业务码见下）。
- **已发布但 visibility=private**：同上，匿名不可见；登录且有权用户可从平台内预览。
- **已发布且 visibility=public**：匿名无需登录即可请求模板详情并渲染预览页；与搭建器内「普通预览」使用同一 `GET /api/page-template/:pageId` 路径（该路由注册在全局鉴权之前，凭 Bearer 可选解析登录用户）。

## 新增 / 调整的接口

| 方法 | 路径 | 鉴权 |
|------|------|------|
| GET | `/api/page-template/:pageId` | 可选 Bearer；匿名仅 `published` + `public` |
| GET | `/api/page-base/public/resolve-route?routePath=` | 匿名；仅解析 **已发布且公开** 的页面 `pageId`（用于 `/site-preview/...` 无 query 时的路径解析） |

## 403 业务码（预览相关）

| code | 含义 |
|------|------|
| 403102 | 匿名请求草稿（`draft=true`） |
| 403103 | 匿名访问未发布内容 |
| 403104 | 匿名访问非公开（private）内容 |
| 403107 | 匿名访问组件历史版本但无快照回退路径 |
| 403108 | 匿名访问组件但无法仅通过已发布快照渲染 |

前端预览页应对上述码展示「未公开 / 需登录后从平台内预览」类说明，而非跳转登录。

## 前端路由

- `/preview-engine` 与 `/site-preview/*` 均 **不再** 包在 `RequireAuth` 内；匿名可进入页面并由接口决定是否返回数据。
