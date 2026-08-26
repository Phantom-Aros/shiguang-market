# 拾光市集 · 性能优化报告

> 阶段 9 产出：在阶段 5 基线上完成第二轮优化，记录问题 → 手段 → 结果对比。

---

## 1. 测量环境

| 项目 | 配置 |
|------|------|
| 测量日期 | 2026-08-17 |
| 环境 | 本地（`vite build` / API `localhost:3000`） |
| 浏览器 | Chrome 最新稳定版 |
| 网络 | 本地回环 |
| 设备 | macOS 桌面端 |

---

## 2. 前端包体积对比（`apps/web`）

| 指标 | 阶段 5 基线 | 阶段 9 优化后 | 目标 |
|------|-------------|---------------|------|
| 入口 chunk gzip | **91.11 KB**（单 chunk） | **7.0 KB**（`index-*.js`，vendor 独立） | < 200 KB |
| vendor-react gzip | — | **53.3 KB**（全页共享，长期缓存） | — |
| 总 JS gzip | **~91 KB**（单 chunk） | **104.2 KB**（12 chunks 按需加载） | 首屏减少 |
| 路由 chunk | 无 | Home / PostDetail / ProductDetail 等独立 chunk | 按需加载 |
| CSS gzip | 5.38 KB | ~6.8 KB | — |

### 优化手段

1. **路由级 code splitting**：`React.lazy` + `Suspense`，各页面独立 chunk。
2. **Vendor 拆分**：`react`、`react-router`、`react-query` 独立 chunk，利于长期缓存。
3. **Sentry 动态 import**：仅在配置 DSN 时异步加载，未配置时不打入主包。
4. **rollup-plugin-visualizer**：`ANALYZE=1 npm --workspace=web run build` 生成 `dist/stats.html`。

### 测量命令

```bash
npm --workspace=web run build
npm run check:bundle
# 可视化分析
ANALYZE=1 npm --workspace=web run build
```

---

## 3. 活动页包体积（`apps/campaign`）

| Chunk | 优化前 gzip | 优化后 |
|-------|-------------|--------|
| 主包 index | 29.05 KB | **5.08 KB** |
| page-builder | — | **41.92 KB**（独立 chunk） |
| page-campaign | — | **1.37 KB**（独立 chunk） |
| block-hero 等 | 已有 | 保留 block 级 lazy |

### 优化手段

- Builder 与 Campaign 展示页路由级 lazy load。
- `manualChunks` 按页面与 block 拆分。

---

## 4. 图片策略

| 能力 | 优化前 | 优化后 |
|------|--------|--------|
| lazy loading | ✅ | ✅ |
| Shimmer placeholder | ✅ | ✅ |
| Blur LQIP | ❌ | ✅ `blurDataURL` prop |
| WebP / AVIF | ❌ | ✅ `<picture>` + `buildResponsiveImageSources` |
| responsive srcset | ❌ | ✅ 默认 400/800/1200w |

共享工具：`packages/shared/src/image.ts`，约定 `?w=` / `?f=webp` query 参数，便于后续接入 CDN 图片处理。

Feed 长列表：`FeedGrid` 虚拟渲染保留；详情页作者头像建议使用 `Image` 组件。

---

## 5. 后端接口性能

### 5.1 Feed SQL 优化

**问题**：`findFeedPage` 每行 correlated 子查询 `MIN(price)`，数据量增大时成本高。

**手段**：
- 改写为 `LEFT JOIN` 聚合子查询（一次 GROUP BY）。
- 新增迁移 `008_perf_indexes.sql`：
  - `idx_post_products_post_id`
  - `idx_products_status_product_id`
  - `idx_likes_post_user` / `idx_favorites_post_user`
  - `idx_posts_author_created`

**验证**：

```bash
npm --workspace=api run migrate
npm --workspace=api run explain:feed
```

### 5.2 Redis 缓存策略

| Key 模式 | TTL | 场景 |
|----------|-----|------|
| `feed:hot:{limit}` | 60s | 匿名首屏 Feed |
| `post:parts:{postId}` | 120s | 帖子 media + products |
| `product:detail:{id}` | 300s | 商品详情 |
| `product:samples:{limit}` | 300s | 首页样品列表 |

**失效**：点赞/收藏后 `invalidateFeedHotCache()`，保证 like_count 及时更新。

### 5.3 gzip 与分页

- 接入 `compression` 中间件（threshold 1KB），SSE 路由自动跳过。
- 分页默认 limit：
  - Feed / Orders：**20**（max 50）
  - Product samples：**4**（max 20）

### 5.4 压测基线

```bash
# 需 API 已启动
npm --workspace=api run benchmark:feed
```

**参考结果**（本地 seed 数据，20 并发，10s）：

| 指标 | 值 |
|------|-----|
| QPS | ~800–1200 req/s |
| Latency avg | ~15–25 ms |
| Latency p99 | ~40–80 ms |
| Errors | 0 |

> 实际数值因硬件与数据量而异，以本地运行输出为准。

---

## 6. CI 门禁

`.github/workflows/ci.yml`：

- `npm test`
- `npm run build`
- `node scripts/check-bundle-size.mjs`（入口 chunk gzip < 200 KB）

本地预检：`npm run check:bundle`

---

## 7. Web Vitals（待生产采集）

| 指标 | 阶段 5 | 阶段 9 目标 |
|------|--------|-------------|
| LCP | 待采集 | < 2.5s（4G） |
| INP | 待采集 | < 200ms |
| CLS | 待采集 | < 0.1 |

采集链路不变：`web-vitals` → `POST /api/metrics/vitals` → `GET /api/analytics/dashboard`。

---

## 8. 变更记录

| 日期 | 说明 |
|------|------|
| 2026-07-29 | 阶段 5 首版基线 |
| 2026-08-17 | 阶段 9：SQL/缓存/gzip/路由拆分/图片/CI 门禁 |
