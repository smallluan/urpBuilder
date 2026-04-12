# 登录 / 注册图形验证码

## 概述

使用 `svg-captcha` 在服务端生成 SVG 图形验证码；答案与 `captchaId` 保存在**服务端进程内存**（带 TTL），一次性校验后删除。登录、注册提交时必须携带 `captchaId` 与 `captchaCode`。

**限制**：多实例部署或负载均衡时，验证码仅保存在生成该验证码的那台进程内；若请求落到其他实例会校验失败。生产环境多节点请改为 Redis 等共享存储（沿用同一 key 设计即可）。

## 接口

### `GET /auth/captcha`

无需登录。

**响应**（与全局 `{ code, message, data }` 一致）：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "captchaId": "uuid",
    "image": "<svg xmlns=\"http://www.w3.org/2000/svg\" ...>...</svg>"
  }
}
```

- `image`：SVG 字符串。前端展示：`data:image/svg+xml;charset=utf-8,${encodeURIComponent(image)}`。
- 服务端 TTL：约 240 秒（见 `urpBuilder-backend/src/services/captcha.service.ts`）。

### `POST /auth/login`

**请求体**（在原有字段基础上增加）：

| 字段 | 类型 | 说明 |
|------|------|------|
| `username` | string | 登录账号 |
| `password` | string | 密码 |
| `captchaId` | string | `GET /auth/captcha` 返回的 id |
| `captchaCode` | string | 用户输入的验证码 |

校验顺序：参数非空 → 图形验证码 → 账号密码。验证码**不区分大小写**。

### `POST /auth/register`

在注册 body 中同样增加 `captchaId`、`captchaCode`，其余字段不变。

## 错误码

| code | 说明 |
|------|------|
| `1002` | 参数不全（含未填验证码） |
| `400011` | 图形验证码错误或已失效（需重新 `GET /auth/captcha`） |
| `401001` | 登录账号或密码错误（验证码已通过） |
| `1004` | 注册时登录账号已被占用（HTTP 409） |

## 前端约定

- 进入登录或注册面板时拉取验证码；切换登录/注册 tab 时重新拉取。
- 登录/注册请求失败后**重新拉取**验证码（避免重复使用已消费的 `captchaId`）。
- 登录/注册接口使用 `skipErrorToast: true`，避免全局 Message；表单内用 TDesign `Input` 的 `status="error"` 与 `tips` 展示校验与常见接口错误（如 `400011` 映射到验证码输入框、`401001` 映射到密码框）。
- 本地开发：见 [README.md](../README.md) 中后端地址与联调说明。
