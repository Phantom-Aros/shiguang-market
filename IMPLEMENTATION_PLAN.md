# 拾光市集 · 完整实施计划

> 面向深圳 C 端资深前端（5–10 年）的练手项目：React 主栈 + 完整 Node.js 后端，覆盖活动页、Feed 流、跨端、性能监控、设计系统、AI 产品化六大能力点。

---

## 目录

- [1. 项目概览](#1-项目概览)
- [2. 仓库结构](#2-仓库结构)
- [3. 技术栈总览](#3-技术栈总览)
- [4. 能力点映射](#4-能力点映射)
- [5. 分阶段实施计划](#5-分阶段实施计划)
- [6. 数据模型速查](#6-数据模型速查)
- [7. API 模块速查](#7-api-模块速查)
- [8. 验收标准与量化指标](#8-验收标准与量化指标)
- [9. 面试叙事素材](#9-面试叙事素材)
- [10. 风险与取舍](#10-风险与取舍)

---

## 1. 项目概览

### 1.1 定位

**拾光市集**：面向年轻用户的「内容种草 + 轻电商」C 端产品。用户刷 Feed 发现好物，进入详情下单，大促期间访问配置化活动页，全程有 AI 导购辅助。

### 1.2 交付形态

| 端 | 技术 | 说明 |
|----|------|------|
| Web/H5 主站 | React 18 + TypeScript + Vite | Feed、详情、交易、AI 助手 |
| 活动页 | React + Vite（独立 app） | Schema 渲染 + 搭建预览 |
| 微信小程序 | Taro 3 + React | Feed、详情、分享、登录 |
| 组件库 | `packages/ui` + Storybook | 跨端复用的 C 端设计系统 |
| 后端 API | Express 5 + PostgreSQL | 全业务真实接口，无 MSW 主流程 |

### 1.3 工程原则

- **Monorepo**：npm workspaces + Turborepo，统一类型与构建。
- **后端分层**：`routes → services → repositories`，与常见 Express 生产项目一致。
- **外部 ID**：业务资源统一 ULID 字符串（`user_id`、`post_id` 等）。
- **一个主线**：所有能力点落在同一产品叙事里，而非六个互不相关 demo。

---

## 2. 仓库结构

```
shiguang-market/
├── apps/
│   ├── web/                    # 主站 H5
│   ├── campaign/               # 活动页站点 + 搭建预览
│   ├── mini-program/           # Taro 微信小程序
│   └── api/                    # Node.js 后端（Express）
├── packages/
│   ├── ui/                     # C 端组件库 + Design Token
│   ├── shared/                 # 前后端共享类型、常量、错误码
│   ├── api-client/             # TanStack Query hooks + 请求封装
│   └── campaign-schema/        # 活动页 JSON Schema + zod 校验
├── infra/
│   ├── docker-compose.yml      # Postgres + Redis + MinIO
│   └── migrations/             # SQL 迁移（或由 api 包管理）
├── docs/
│   ├── api.md                  # OpenAPI 说明
│   └── performance-report.md   # 性能优化复盘（阶段六产出）
├── IMPLEMENTATION_PLAN.md      # 本文件
├── turbo.json
└── package.json                # 根 package.json 含 workspaces 配置
```

### 后端内部分层（`apps/api/src/`）

```
apps/api/src/
├── app.js
├── env.js
├── db/postgres.js              # Pool + withTransaction
├── cache/redis.js
├── storage/minio.js
├── middleware/
│   ├── auth.js
│   ├── rateLimit.js
│   ├── validate.js
│   └── errorHandler.js
├── routes/
├── services/
├── repositories/
├── jobs/                       # BullMQ 消费者
├── utils/
└── scripts/seed.js
```

---

## 3. 技术栈总览

### 3.1 前端

| 类别 | 技术 |
|------|------|
| 框架 | React 18、TypeScript |
| 构建 | Vite、Taro CLI |
| 路由 | React Router v6 |
| 数据 | TanStack Query v5 |
| 样式 | CSS Variables（Design Token） |
| 列表 | 自研 masonry 虚拟滚动（`FeedGrid`：视口裁剪 + 高度缓存） |
| 文档 | Storybook |
| 监控 | Sentry、自研 Web Vitals 上报 SDK |
| 测试 | Vitest、Playwright |
| 工程 | npm、Turborepo、ESLint、Prettier |

### 3.2 后端

| 类别 | 技术 |
|------|------|
| 运行时 | Node.js 20 LTS |
| 框架 | Express 5 |
| 数据库 | PostgreSQL 16 |
| 缓存/队列 | Redis 7、BullMQ |
| 对象存储 | MinIO（本地）/ 云 OSS（可选） |
| 查询 | 原生 `pg` + SQL |
| 迁移 | node-pg-migrate 或版本化 SQL |
| 鉴权 | JWT（access + refresh） |
| 校验 | zod |
| 日志 | pino |
| 文档 | OpenAPI 3 + swagger-ui-express |
| AI | OpenAI 兼容 API + SSE 流式 |
| 测试 | Vitest + supertest |

### 3.3 基础设施

```bash
# 本地启动依赖
docker compose -f infra/docker-compose.yml up -d

# 典型开发命令
npm install
npm --workspace=api run migrate
npm --workspace=api run seed
npm run dev    # turbo 并行启动 api + web + campaign
```

---

## 4. 能力点映射

| # | 能力点 | 前端落点 | 后端落点 | 关键验收 |
|---|--------|----------|----------|----------|
| ① | 高流量活动页 / 搭建 | `apps/campaign`、搭建器 UI | `campaigns` 模块、Schema 版本发布 | 不改代码换活动页；楼层懒加载 |
| ② | 内容流 Feed | `apps/web` 首页 | `feed`、`posts`、游标分页 | 虚拟列表流畅；返回保持滚动 |
| ③ | 跨端 H5 + 小程序 | `web` + `mini-program` | `auth` 双端登录、统一用户 | 同一用户体系；分享链路 |
| ④ | 性能与监控治理 | Sentry、Vitals SDK、CI | `metrics`、`analytics` 落库 | 有优化前后数据对比 |
| ⑤ | 设计系统 + 组件库 | `packages/ui`、Storybook | `uploads`、静态资源 URL | 三端禁止重复造 Button |
| ⑥ | AI 能力产品化 | 流式对话 UI | `ai` 模块、SSE、会话持久化 | 密钥不落前端；可停止/重试 |

---

## 5. 分阶段实施计划

> 共 **12 周**，可按个人节奏压缩为 8 周（合并相邻阶段）。每阶段列出：**目标、后端任务、前端任务、涉及技术、能力点、产出物**。

---

### 阶段 0：工程初始化（第 0–1 周）

#### 目标

搭建 Monorepo 骨架、本地基础设施、开发规范，确保 `api` + `web` 能联调通。

#### 后端任务

- [ ] 初始化 `apps/api`：Express 5、`env.js`、`pino` 日志
- [ ] 实现 `db/postgres.js`（Pool、`query`、`withTransaction`）
- [ ] 实现 `cache/redis.js` 连接封装
- [ ] 编写 `infra/docker-compose.yml`（Postgres、Redis、MinIO）
- [ ] 迁移脚本：`users` 表骨架
- [ ] `GET /api/health` 健康检查
- [ ] 全局 `errorHandler`、统一响应格式 `{ ok, data }` / `{ ok: false, error, code }`
- [ ] 配置 CORS、Helmet（生产向）

#### 前端任务

- [ ] 初始化 `apps/web`（Vite + React + TS）
- [ ] 初始化 `packages/shared`、`packages/api-client` 请求基座
- [ ] 配置 Vite proxy：`/api` → `http://localhost:3000`
- [ ] 首页占位 + 调用 `/api/health` 验证联通

#### 涉及技术

npm workspaces、Turborepo、Docker Compose、Express 5、pg、Redis 客户端、Vite

#### 能力点

工程化基础（为 ④⑤ 铺路）

#### 产出物

- 可 `npm run dev` 一键启动
- `README.md` 本地启动说明
- `.env.example` 环境变量模板

---

### 阶段 1：鉴权与用户体系（第 1–2 周）

#### 目标

完成手机号登录（开发环境固定验证码）与 JWT 双 token；为 H5 与小程序统一用户主键。

#### 后端任务

- [ ] 迁移：`users`、`user_sessions`、`wechat_bindings`
- [ ] `POST /api/auth/sms/send`：验证码写入 Redis（TTL 5min）
- [ ] `POST /api/auth/sms/login`：签发 access（15min）+ refresh（7d）
- [ ] `POST /api/auth/refresh`、`POST /api/auth/logout`
- [ ] `GET /api/auth/me`
- [ ] `middleware/auth.js`：Bearer JWT 校验
- [ ] `POST /api/auth/wechat/login`：小程序 code 换 openid（测试号或 mock）
- [ ] 登录/发短信接口 Redis 限流

#### 前端任务

- [ ] 登录页（手机号 + 验证码）
- [ ] `api-client` 封装：token 存储、自动 refresh、401 跳转
- [ ] 个人中心页（展示用户信息、退出登录）
- [ ] 路由守卫：需登录页面拦截

#### 涉及技术

JWT、Redis、zod 校验、React Router 守卫、localStorage/session

#### 能力点

③ 跨端（用户体系基础）

#### 产出物

- 可完成登录 → 获取 me → 退出全流程
- `docs/api.md` 鉴权章节

---

### 阶段 2：设计系统与组件库（第 2–3 周）

#### 目标

建立 `packages/ui` 与 Design Token，web 主站全面使用，禁止各页面手写基础组件。

#### 后端任务

- [ ] `storage/minio.js` 封装
- [ ] `POST /api/uploads/images`：multipart 上传，返回 CDN/MinIO URL
- [ ] 上传校验：MIME 白名单、大小限制（如 5MB）

#### 前端任务

- [ ] `packages/ui` 初始化 + Storybook
- [ ] 实现基础组件：`Button`、`Icon`、`Image`（懒加载+失败兜底）、`Modal`、`Toast`、`Tabs`、`Skeleton`、`Empty`、`Loading`
- [ ] 实现业务组件：`ProductCard`、`Price`、`Countdown`
- [ ] Design Token：颜色、字号、圆角、间距（CSS Variables），可选暗色模式
- [ ] `apps/web` 全局引入主题与 Toast 容器

#### 涉及技术

Storybook、CSS Variables、MinIO、multer

#### 能力点

⑤ 设计系统 + 组件库

#### 产出物

- Storybook 可本地浏览
- 至少 10 个组件有文档与交互示例
- 上传图片接口可供后续内容模块使用

---

### 阶段 3：内容与 Feed 流（第 3–5 周）

#### 目标

双列瀑布流首页、帖子详情、点赞收藏；后端游标分页与幂等交互。

#### 后端任务

- [ ] 迁移：`posts`、`post_media`、`products`、`post_products`、`likes`、`favorites`
- [ ] `src/scripts/seed.js`：种子数据（50+ 帖子、关联商品）
- [ ] `GET /api/feed`：游标分页 `cursor + limit`，返回 `items + nextCursor`
- [ ] `GET /api/posts/:postId`：详情（含商品、当前用户点赞收藏态）
- [ ] `POST/DELETE /api/posts/:postId/like`：幂等（唯一约束）
- [ ] `POST/DELETE /api/posts/:postId/favorite`
- [ ] `GET /api/posts/:postId/related`：相关推荐（同标签/同作者简化版）
- [ ] 热门 Feed Redis 缓存 60s（可选）

#### 前端任务

- [ ] 首页双列瀑布流布局
- [ ] 自研双列瀑布流虚拟滚动（视口裁剪 + `ResizeObserver` 高度测量）
- [ ] TanStack Query：无限滚动 `useInfiniteQuery`
- [ ] 图片懒加载、骨架屏
- [ ] 详情页：图文、关联商品、点赞收藏按钮
- [ ] 乐观更新：点赞/收藏即时反馈，失败回滚
- [ ] 路由返回：scroll restoration + Query 缓存保持列表状态

#### 涉及技术

TanStack Query、自研 masonry 虚拟滚动、游标分页、乐观更新、PostgreSQL 索引

#### 能力点

② 内容流 Feed

#### 产出物

- 可刷 Feed、进详情、点赞收藏
- 列表 500+ 条仍流畅（本地 seed 可重复生成）

---

### 阶段 4：商品与交易链路（第 5–6 周）

#### 目标

商品详情、购物车、下单、模拟支付、订单列表；后端事务保证库存与订单一致性。

#### 后端任务

- [ ] 迁移：`carts`、`cart_items`、`orders`、`order_items`、`payments`
- [ ] `GET /api/products/:productId`
- [ ] `GET /api/cart`、`PUT /api/cart/items`、`DELETE /api/cart/items/:itemId`
- [ ] `POST /api/orders`：`withTransaction` + `SELECT FOR UPDATE` 锁库存
- [ ] 订单状态机：`pending → paid | cancelled`
- [ ] `POST /api/orders/:orderId/pay`：模拟支付成功
- [ ] `POST /api/orders/:orderId/cancel`
- [ ] `GET /api/orders`、`GET /api/orders/:orderId`
- [ ] BullMQ：`pending` 订单 30 分钟自动取消

#### 前端任务

- [ ] 商品详情页（规格、价格、加购）
- [ ] 购物车页（改数量、删除、合计）
- [ ] 下单确认页、模拟支付页
- [ ] 订单列表与订单详情
- [ ] 加购后购物车角标更新（TanStack Query `setQueryData` / `invalidate`）

#### 涉及技术

PostgreSQL 事务、BullMQ、Redis、TanStack Query、状态机

#### 能力点

② Feed（带货闭环）、C 端业务交付能力

#### 产出物

- 完整链路：Feed → 详情 → 加购 → 下单 → 支付
- 单元/集成测试：`orderService.createOrder` 库存不足场景

---

### 阶段 5：埋点与监控治理（第 6–7 周）

#### 目标

前后端可观测闭环：错误监控、Web Vitals、业务埋点落库，并产出第一份性能基线。

#### 后端任务

- [ ] 迁移：`analytics_events`、`client_metrics`、`client_errors`
- [ ] `POST /api/analytics/events`：批量事件（异步落库）
- [ ] `POST /api/analytics/events/beacon`：支持 `navigator.sendBeacon`
- [ ] `POST /api/metrics/vitals`：LCP、INP、CLS
- [ ] `POST /api/metrics/errors`：前端错误快照
- [ ] `GET /api/analytics/dashboard`：按日漏斗聚合（简易）
- [ ] 埋点接口限流 + 无鉴权/弱鉴权策略

#### 前端任务

- [ ] 接入 Sentry（`apps/web`、`apps/campaign`）
- [ ] React Error Boundary + 上报
- [ ] 自研 `packages/shared/analytics`：统一 `track(event, properties)`
- [ ] 实现核心事件：`feed_expose`、`feed_click`、`detail_view`、`add_cart`、`order_submit`
- [ ] Web Vitals 采集与上报
- [ ] 记录当前性能基线（LCP、包体积、主 chunk 大小）

#### 涉及技术

Sentry、pino、JSONB、sendBeacon、web-vitals 库

#### 能力点

④ 性能与监控治理

#### 产出物

- `docs/performance-report.md` 基线章节
- 简易漏斗可在 dashboard 接口查到数据

---

### 阶段 6：活动页与配置化搭建（第 7–8 周）

#### 目标

活动页 Schema 驱动渲染；后端版本发布、回滚、灰度；前端搭建预览。

#### 后端任务

- [ ] 迁移：`campaigns`、`campaign_versions`
- [ ] `packages/campaign-schema`：zod 校验规则（前后端共用）
- [ ] `GET /api/campaigns/:slug`：读当前已发布版本（支持灰度：`rollout_percent` + user_id 哈希）
- [ ] `POST /api/campaigns`：创建活动（draft）
- [ ] `PUT /api/campaigns/:id/schema`：更新 Schema（新版本）
- [ ] `POST /api/campaigns/:id/publish`、`POST /api/campaigns/:id/rollback`
- [ ] `GET /api/campaigns/:id/versions`
- [ ] 发布前强制 zod 校验

#### 前端任务

- [ ] 初始化 `apps/campaign`
- [ ] Schema 渲染引擎：根据 `blocks[]` 动态渲染 `HeroBanner`、`Countdown`、`ProductGrid` 等
- [ ] 做一个完整大促页（618 示例）
- [ ] 搭建器 MVP：JSON 编辑器 + 实时预览（后期可加拖拽）
- [ ] 活动页独立路由分包、楼层懒加载
- [ ] 埋点：`campaign_page_view`、`campaign_block_click`

#### 涉及技术

JSON Schema、zod、动态组件、React.lazy、代码分割

#### 能力点

① 高流量活动页 / 搭建平台

#### 产出物

- 至少 1 个可发布活动页 slug 可供 web 跳转
- 版本发布与回滚可演示

---

### 阶段 7：AI 导购（第 8–9 周）

#### 目标

商品详情页 AI 问答，流式 SSE，会话持久化，密钥仅在后端。

#### 后端任务

- [ ] 迁移：`ai_conversations`、`ai_messages`
- [ ] `POST /api/ai/conversations`：创建会话（可带 `productId` 上下文）
- [ ] `GET /api/ai/conversations`、`GET /api/ai/conversations/:id/messages`
- [ ] `POST /api/ai/conversations/:id/chat`：SSE 流式输出
- [ ] 注入商品信息到 system prompt（从 `products` 表读取）
- [ ] 流结束后持久化 assistant 消息
- [ ] AI 接口 per-user 限流

#### 前端任务

- [ ] 商品详情页「问 AI」入口
- [ ] 对话 UI：流式打字、停止生成、重试、空状态
- [ ] 历史会话列表（侧边栏或抽屉）
- [ ] 使用 `fetch` + `ReadableStream` 或 EventSource 消费 SSE
- [ ] 埋点：`ai_chat_start`、`ai_chat_complete`

#### 涉及技术

SSE、OpenAI 兼容 API、Redis 限流、流式 UI

#### 能力点

⑥ AI 能力产品化

#### 产出物

- 详情页可针对当前商品进行多轮问答
- 对话历史可在后端查到

---

### 阶段 8：微信小程序跨端（第 9–10 周）

#### 目标

Taro 小程序复用 `api-client`、`shared`、`ui` 中可跨端部分，跑通 Feed + 详情 + 分享 + 微信登录。

#### 后端任务

- [ ] 完善 `POST /api/auth/wechat/login`（测试号配置文档）
- [ ] 分享元数据接口（可选）：`GET /api/posts/:postId/share-meta` 返回 title、image、path
- [ ] 确认 CORS / 域名白名单说明（上线备忘）

#### 前端任务

- [ ] 初始化 `apps/mini-program`（Taro 3 + React + TS）
- [ ] 复用 `packages/api-client`、`packages/shared`
- [ ] 抽取 `packages/ui` 跨端兼容层（或 Taro 专用 thin wrapper）
- [ ] 页面：首页 Feed、详情、个人中心
- [ ] 微信登录、分享 `onShareAppMessage`
- [ ] 支付 mock 页（文档注明真实微信支付接入步骤）
- [ ] 真机调试：安全区、滚动、图片比例

#### 涉及技术

Taro、微信小程序 API、跨端组件抽象

#### 能力点

③ 跨端 H5 + 小程序

#### 产出物

- 小程序可预览 Feed 与详情
- 分享卡片信息正确

---

### 阶段 9：性能优化专项（第 10–11 周）

#### 目标

在已有监控基线上做第二轮优化，产出可量化的前后对比报告。

#### 后端任务

- [ ] Feed 接口 SQL explain 优化、补索引
- [ ] 热点商品/帖子 Redis 缓存策略复核
- [ ] 接口 gzip、合理 pagination 默认 limit
- [ ] 压测笔记（autocannon/k6 简单报告，QPS 基线即可）

#### 前端任务

- [ ] 路由级 code splitting，活动页独立 chunk
- [ ] 图片 WebP/AVIF、responsive `srcset`、blur placeholder
- [ ] 第三方库按需引入（审计 bundle）
- [ ] 长列表与详情图片策略复核
- [ ] CI：Lighthouse CI 或 bundle size budget（main chunk gzip < 200KB 目标）
- [ ] 更新 `docs/performance-report.md`：问题 → 手段 → 结果

#### 涉及技术

Lighthouse、rollup-plugin-visualizer、Redis 缓存、PostgreSQL 索引

#### 能力点

④ 性能与监控治理（深化）

#### 产出物

- 性能报告含优化前后 LCP、包体积、接口 P95 对比
- CI 门禁配置

---

### 阶段 10：测试、文档与收尾（第 11–12 周）

#### 目标

核心链路可测试、API 有文档、项目可演示、简历可写。

#### 后端任务

- [ ] supertest 集成测试：auth、feed、order 核心路径
- [ ] OpenAPI 3 文档 + swagger-ui `/api/docs`
- [ ] `seed.js` 完善：活动页、商品、帖子一键灌库
- [ ] 生产向 checklist：env、日志、错误码表

#### 前端任务

- [ ] Playwright E2E：登录 → Feed → 详情 → 加购 → 下单
- [ ] 活动页渲染冒烟测试
- [ ] README：架构图、启动步骤、技术亮点
- [ ] 录制 demo  GIF 或短视频（可选）

#### 涉及技术

Vitest、supertest、Playwright、OpenAPI

#### 能力点

全栈交付与工程质量

#### 产出物

- `npm test` 通过
- 完整 README + API 文档
- 可对外演示的 stable 版本

---

## 6. 数据模型速查

| 表名 | 用途 |
|------|------|
| `users` | 用户主表 |
| `user_sessions` | refresh token |
| `wechat_bindings` | 小程序 openid 绑定 |
| `posts` | 图文笔记 |
| `post_media` | 帖子媒体 |
| `products` | 商品 |
| `post_products` | 笔记带货关联 |
| `likes` | 点赞（唯一约束幂等） |
| `favorites` | 收藏 |
| `carts` / `cart_items` | 购物车 |
| `orders` / `order_items` | 订单 |
| `payments` | 支付记录 |
| `campaigns` / `campaign_versions` | 活动与 Schema 版本 |
| `ai_conversations` / `ai_messages` | AI 会话 |
| `analytics_events` | 业务埋点 |
| `client_metrics` | Web Vitals |
| `client_errors` | 前端错误 |

**外部 ID 约定**：`user_id`、`post_id`、`product_id`、`order_id`、`campaign_id` 等均为 ULID 字符串。

---

## 7. API 模块速查

| 前缀 | 模块 | 主要端点 |
|------|------|----------|
| `/api/health` | 健康检查 | `GET` |
| `/api/auth` | 鉴权 | sms/login、wechat/login、refresh、me |
| `/api/uploads` | 上传 | `POST /images` |
| `/api/feed` | Feed | `GET` 游标分页 |
| `/api/posts` | 内容 | 详情、点赞、收藏、相关 |
| `/api/products` | 商品 | 详情 |
| `/api/cart` | 购物车 | 列表、增删改 |
| `/api/orders` | 订单 | 创建、支付、取消、列表 |
| `/api/campaigns` | 活动 | CRUD、发布、回滚、按 slug 读取 |
| `/api/ai` | AI | 会话、SSE chat |
| `/api/analytics` | 埋点 | events、dashboard |
| `/api/metrics` | 监控 | vitals、errors |

**统一响应**：

```json
{ "ok": true, "data": {} }
{ "ok": false, "error": "描述", "code": "ERROR_CODE" }
```

---

## 8. 验收标准与量化指标

### 8.1 功能验收

- [ ] H5 完整链路：登录 → Feed → 详情 → 加购 → 下单 → 支付
- [ ] 活动页可通过 slug 访问，支持发布新版本与回滚
- [ ] AI 对话流式可用，历史可查
- [ ] 小程序：Feed + 详情 + 分享 + 微信登录
- [ ] 所有基础 UI 来自 `packages/ui`

### 8.2 性能目标（练手可达）

| 指标 | 目标 |
|------|------|
| 首页 LCP（4G 模拟） | < 2.5s |
| 主包 gzip 体积 | 较首版减少 30%+ |
| Feed 1000 条滚动 | 无明显卡顿（视口虚拟化，仅渲染可见卡片） |
| 下单接口 | 事务正确，库存不为负 |
| JS 错误率（自测环境） | 可控，有 Error Boundary |

### 8.3 工程验收

- [ ] `docker compose up` + `migrate` + `seed` 可复现
- [ ] 核心 API 有集成测试
- [ ] Web 核心路径有 Playwright E2E
- [ ] OpenAPI 文档可访问

---

## 9. 面试叙事素材

### 亮点 1：Feed 性能与体验

> 双列瀑布流针对 masonry 布局自研视口虚拟化（`FeedGrid`：按滚动位置裁剪可见项 + 高度缓存），配合图片懒加载；TanStack Query 游标分页 + 缓存避免闪烁；返回列表通过 scroll restoration 与 cache key 保持状态。优化后 LCP 从 Xs 降至 Ys（见 performance-report）。

**能力点**：②④

### 亮点 2：订单与活动配置化

> 下单使用 `SELECT FOR UPDATE` 与事务保证库存；活动页 Schema 版本化发布，支持灰度与回滚，运营无需发版即可上线大促页。

**能力点**：①④

### 亮点 3：Monorepo 跨端与可观测

> `packages/ui` 统一组件与 Token；web 与 Taro 复用 api-client 与类型；埋点、Vitals、Sentry 全链路统一，漏斗数据驱动优化优先级。

**能力点**：③④⑤

### 亮点 4：AI 产品化边界

> 前端负责流式体验与上下文展示，密钥与 prompt 组装在后端；限流 + 会话持久化，可讲清「C 端 AI 功能前端职责边界」。

**能力点**：⑥

---

## 10. 风险与取舍

| 风险 | 建议 |
|------|------|
| 12 周周期过长 | 阶段 2 与 3 可并行；搭建器先 JSON 后拖拽 |
| 微信小程序审核/资质 | 练手阶段用体验版 + 开发者工具即可 |
| AI API 费用 | 开发环境 mock 流式；联调时再开真实 key |
| 范围膨胀 | 管理后台只做最小 JSON 编辑，不做完整运营平台 |
| 支付真实接入 | 保持 mock，文档写清微信支付接入步骤 |

### 明确不做（第一版）

- 完整运营后台权限系统
- 微服务拆分（保持单体 `api`）
- 实时 IM、直播
- WebAssembly / 3D

---

## 附录：阶段甘特一览

```
周次  0   1   2   3   4   5   6   7   8   9  10  11  12
      ├───┤
阶段0 工程初始化
          ├───┤
阶段1     鉴权用户
              ├───┤
阶段2         设计系统
                  ├───────┤
阶段3             Feed 流
                          ├───┤
阶段4                     交易
                              ├───┤
阶段5                         监控
                                  ├───┤
阶段6                             活动页
                                      ├───┤
阶段7                                 AI
                                          ├───┤
阶段8                                     小程序
                                              ├───┤
阶段9                                         性能
                                                  ├───┤
阶段10                                            收尾
```

---

*文档版本：1.0 · 拾光市集实施计划 · 与 Node.js 后端方案配套*
