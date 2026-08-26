# 生产部署 Checklist

拾光市集 API 与前端上线前的检查清单。

## 环境变量

| 变量 | 必填 | 说明 |
|------|------|------|
| `NODE_ENV` | 是 | 设为 `production` |
| `DATABASE_URL` | 是 | PostgreSQL 连接串 |
| `REDIS_URL` | 是 | Redis 连接串 |
| `JWT_ACCESS_SECRET` | 是 | 强随机字符串，勿用默认值 |
| `JWT_REFRESH_SECRET` | 是 | 与 access 不同 |
| `CORS_ORIGINS` | 是 | H5 / 活动页域名，逗号分隔 |
| `SMS_DEV_CODE` | 否 | 生产环境应接入真实短信服务并移除此项 |
| `WECHAT_APP_ID` / `WECHAT_APP_SECRET` | 小程序 | 微信登录必填 |
| `MINIO_*` | 上传 | 对象存储配置 |
| `VITE_SENTRY_DSN` | 可选 | 前端错误监控 |
| `AI_API_KEY` | 可选 | AI 功能；无则 mock |

**检查项**

- [ ] `.env` 未提交到 Git
- [ ] JWT 密钥已轮换为生产专用值
- [ ] `CORS_ORIGINS` 仅包含可信域名
- [ ] 数据库与 Redis 使用内网地址或 TLS

## 数据库

- [ ] 执行 `npm --workspace=api run migrate`
- [ ] 确认 `infra/migrations/` 全部已应用
- [ ] 生产库已配置自动备份
- [ ] 连接池上限与实例规格匹配

## 日志

- API 使用 **pino** 结构化日志（`apps/api/src/logger.js`）
- 生产环境 `pino-http` 自动记录请求（`env.isProduction`）
- 建议将 stdout 接入 ELK / Loki / CloudWatch

**检查项**

- [ ] 日志级别为 `info` 或 `warn`（非 `debug`）
- [ ] 敏感字段（token、手机号）不出现在日志明文
- [ ] 5xx 错误有告警规则

## 错误码表

统一格式：`{ ok: false, error: string, code: string }`

| HTTP | code | 场景 |
|------|------|------|
| 400 | `VALIDATION_ERROR` | 请求参数校验失败 |
| 400 | `INVALID_CODE` | 短信验证码错误 |
| 400 | `INSUFFICIENT_STOCK` | 库存不足 |
| 400 | `ORDER_INVALID_STATE` | 订单状态不允许当前操作 |
| 401 | `UNAUTHORIZED` | 未登录或 token 无效 |
| 401 | `INVALID_TOKEN` | refresh token 无效或已吊销 |
| 404 | `NOT_FOUND` | 资源不存在 |
| 429 | `RATE_LIMITED` | 触发限流 |
| 500 | `INTERNAL_ERROR` | 未捕获的服务端错误 |
| 502 | `WECHAT_AUTH_FAILED` | 微信登录失败 |

完整 API 说明见 [docs/api.md](./api.md) 或运行时 `/api/docs`。

## 安全

- [ ] `helmet` 已启用（生产默认 CSP）
- [ ] 上传接口限制文件类型与大小（5MB）
- [ ] 鉴权接口有限流（短信 60s/次）
- [ ] HTTPS 由反向代理（Nginx / CDN）终止

## 健康检查

```bash
curl https://api.example.com/api/health
```

期望 `services.postgres` 与 `services.redis` 均为 `up`。

## 发布流程建议

1. `docker compose up -d`（或托管 PG/Redis）
2. `migrate` → 可选 `seed`（仅首次）
3. `npm run build` 构建前端
4. 静态资源部署到 CDN / 对象存储
5. API 进程使用 PM2 / systemd / K8s 守护
6. 冒烟：`npm test` + 核心链路手动验证

## 回滚

- 活动页：通过 `/api/campaigns` 回滚到上一版本
- 数据库：依赖迁移脚本的幂等性；重大变更前备份
- 前端：CDN 保留上一版本静态资源
