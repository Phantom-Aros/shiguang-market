# 拾光市集 API 文档

> 基础路径：`/api` · 统一响应格式见下文
>
> **交互式文档**：启动 API 后访问 [`/api/docs`](http://localhost:3000/api/docs)（OpenAPI 3 + Swagger UI）

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

**测试号配置**：详见 [mini-program.md](./mini-program.md#微信登录配置)

---

## 内容模块 `/api/posts`

### `GET /api/posts/:postId/share-meta`

获取帖子分享元数据，供小程序 `onShareAppMessage` 与 H5 分享使用。无需鉴权。

**响应**

```json
{
  "ok": true,
  "data": {
    "postId": "01H...",
    "title": "夏日好物分享",
    "image": "http://localhost:9000/shiguang/...",
    "path": "/pages/post-detail/index?postId=01H..."
  }
}
```

**错误码**：`NOT_FOUND`

---

## AI 导购 `/api/ai`

需要 Bearer accessToken。SSE 对话接口有 per-user 限流（`AI_RATE_LIMIT_*`）。

架构与 Skills 说明见 [docs/ai-skills.md](./ai-skills.md)。

### `POST /api/ai/conversations`

创建会话。

**请求体**

```json
{ "productId": "01H..." }
```

`productId` 可选；传入时校验商品存在且 `active`，并生成标题「关于「xxx」的咨询」。

**响应** `201`

```json
{
  "ok": true,
  "data": {
    "conversationId": "01H...",
    "productId": "01H...",
    "title": "关于「夏日T恤」的咨询",
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

### `GET /api/ai/conversations`

当前用户的会话列表。

### `GET /api/ai/conversations/:conversationId/messages`

会话消息历史。

### `POST /api/ai/conversations/:conversationId/chat`

SSE 流式对话。`Content-Type: text/event-stream`。

**请求体**

```json
{ "content": "这件衣服有货吗？", "retry": false }
```

| 字段 | 说明 |
|------|------|
| `content` | 用户消息，1–2000 字 |
| `retry` | `true` 时不重复写入 user 消息，仅重新生成 assistant |

**SSE 事件**（`data:` 后为 JSON）

| type | 说明 |
|------|------|
| `thinking` | 连接建立 |
| `tool_call` | `{ name, status: "running" \| "done" }` |
| `token` | 流式文本片段 |
| `done` | 正常结束，含 `messageId` |
| `stopped` | 用户停止，含 `messageId` |
| `error` | 错误信息 |

### `POST /api/ai/conversations/:conversationId/chat/stop`

显式停止正在进行的生成。响应 `{ stopped: true \| false }`。

### `DELETE /api/ai/conversations/:conversationId/messages/last-assistant`

删除最后一条 assistant 消息，供重试使用。响应 `{ removed: true, messageId }` 或 `{ removed: false }`。

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
