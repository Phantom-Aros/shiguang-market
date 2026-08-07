# 拾光市集 API 文档

> 基础路径：`/api` · 统一响应格式见下文

## 统一响应格式

**成功**

```json
{ "ok": true, "data": {} }
```

**失败**

```json
{ "ok": false, "error": "描述", "code": "ERROR_CODE" }
```

---

## 健康检查

### `GET /api/health`

无需鉴权。返回 PostgreSQL、Redis 连通状态。

---

## 鉴权模块 `/api/auth`

### 令牌说明

| 令牌 | 有效期 | 用途 |
|------|--------|------|
| accessToken | 15 分钟 | 请求头 `Authorization: Bearer <token>` |
| refreshToken | 7 天 | 刷新 accessToken，登出时吊销 |

开发环境短信验证码固定为 `123456`（可通过 `SMS_DEV_CODE` 环境变量修改）。

### `POST /api/auth/sms/send`

发送短信验证码（开发环境写入 Redis，不实际发短信）。

**请求体**

```json
{ "phone": "13800138000" }
```

**响应**

```json
{ "ok": true, "data": { "expiresIn": 300 } }
```

**限流**：同一手机号 60 秒内 1 次。

---

### `POST /api/auth/sms/login`

手机号 + 验证码登录，自动注册新用户。

**请求体**

```json
{ "phone": "13800138000", "code": "123456" }
```

**响应**

```json
{
  "ok": true,
  "data": {
    "tokens": {
      "accessToken": "eyJ...",
      "refreshToken": "eyJ...",
      "expiresIn": 900
    },
    "user": {
      "userId": "01H...",
      "phone": "13800138000",
      "nickname": "用户8000",
      "avatarUrl": null,
      "createdAt": "2026-06-17T00:00:00.000Z"
    }
  }
}
```

**限流**：同一手机号 60 秒内最多 5 次。

**错误码**：`INVALID_CODE`、`VALIDATION_ERROR`、`RATE_LIMITED`

---

### `POST /api/auth/refresh`

使用 refreshToken 换取新的 access + refresh（旋转刷新）。

**请求体**

```json
{ "refreshToken": "eyJ..." }
```

**响应**：同登录响应结构。

**错误码**：`INVALID_TOKEN`

---

### `POST /api/auth/logout`

吊销 refreshToken 对应会话。

**请求体**

```json
{ "refreshToken": "eyJ..." }
```

**响应**

```json
{ "ok": true, "data": { "success": true } }
```

---

### `GET /api/auth/me`

获取当前登录用户信息。需要 Bearer accessToken。

**响应**

```json
{
  "ok": true,
  "data": {
    "userId": "01H...",
    "phone": "13800138000",
    "nickname": "用户8000",
    "avatarUrl": null,
    "createdAt": "2026-06-17T00:00:00.000Z"
  }
}
```

**错误码**：`UNAUTHORIZED`

---

### `POST /api/auth/wechat/login`

微信小程序 code 换 openid 登录。开发环境任意 code 均可（生成 mock openid）；配置 `WECHAT_APP_ID` + `WECHAT_APP_SECRET` 后走真实微信接口。

**请求体**

```json
{ "code": "mock_code" }
```

**响应**：同登录响应结构。

**限流**：同一 IP 60 秒内最多 10 次。

**错误码**：`WECHAT_AUTH_FAILED`

---

## 上传模块 `/api/uploads`

### `POST /api/uploads/images`

上传图片到 MinIO，返回可访问 URL。需要 Bearer accessToken。

**请求**：`multipart/form-data`，字段名 `file`

**限制**：
- MIME 白名单：`image/jpeg`、`image/png`、`image/webp`、`image/gif`
- 单文件最大 5MB

**响应**

```json
{
  "ok": true,
  "data": {
    "url": "http://localhost:9000/shiguang/images/01H...jpg",
    "objectKey": "images/01H...jpg",
    "mimeType": "image/jpeg",
    "size": 102400
  }
}
```

**错误码**：`VALIDATION_ERROR`、`UNAUTHORIZED`

---

## 错误码速查

| code | HTTP | 说明 |
|------|------|------|
| `VALIDATION_ERROR` | 400 | 请求参数校验失败 |
| `INVALID_CODE` | 400 | 验证码错误或过期 |
| `UNAUTHORIZED` | 401 | 未登录或 accessToken 过期 |
| `INVALID_TOKEN` | 401 | refreshToken 无效或会话已吊销 |
| `NOT_FOUND` | 404 | 资源不存在 |
| `RATE_LIMITED` | 429 | 请求过于频繁 |
| `WECHAT_AUTH_FAILED` | 400 | 微信登录失败 |
| `INTERNAL_ERROR` | 500 | 服务器内部错误 |
