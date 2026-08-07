# 拾光市集 · 性能基线报告

> 阶段 5 产出：建立可观测闭环后的首版性能基线，供阶段 9 优化专项对比使用。

---

## 1. 测量环境

| 项目 | 配置 |
|------|------|
| 测量日期 | 2026-07-29 |
| 环境 | 本地开发（`npm run dev` / `vite build`） |
| 浏览器 | Chrome 最新稳定版 |
| 网络 | 本地回环（开发服务器） |
| 设备 | macOS 桌面端 |

> 生产环境数据可通过 `GET /api/analytics/dashboard` 查看 Web Vitals 聚合（`vitals` 字段）。

---

## 2. 包体积基线（`apps/web`）

在仓库根目录执行：

```bash
npm --workspace=web run build
```

| 指标 | 基线值 | 阶段 9 目标 |
|------|--------|-------------|
| 主 chunk（`index-*.js`）gzip | **91.11 KB** | < 200 KB |
| 总 JS 体积（dist/assets） | **283.72 KB**（未压缩） | 较基线减少 30%+ |
| CSS 体积 | **5.38 KB** gzip / 30.38 KB 未压缩 | — |

### 测量命令参考

```bash
# 构建并查看产物大小
npm --workspace=web run build
du -sh apps/web/dist/assets/*
gzip -c apps/web/dist/assets/index-*.js | wc -c
```

---

## 3. Web Vitals 基线

采集方式：`web-vitals` 库 → `POST /api/metrics/vitals` → `client_metrics` 表。

| 指标 | 含义 | 基线（本地） | 目标（4G 模拟） |
|------|------|--------------|-----------------|
| **LCP** | 最大内容绘制 | 待采集 | < 2.5s |
| **INP** | 交互响应 | 待采集 | < 200ms |
| **CLS** | 布局偏移 | 待采集 | < 0.1 |
| **FCP** | 首次绘制 | 待采集 | — |
| **TTFB** | 首字节时间 | 待采集 | — |

### 查看聚合数据

```bash
curl http://localhost:3000/api/analytics/dashboard
```

响应示例：

```json
{
  "ok": true,
  "data": {
    "funnel": [
      {
        "date": "2026-07-29",
        "feed_expose": 120,
        "feed_click": 45,
        "detail_view": 30,
        "add_cart": 8,
        "order_submit": 2
      }
    ],
    "vitals": [
      { "name": "LCP", "avgValue": 1800, "p75Value": 2100, "sampleCount": 15 }
    ]
  }
}
```

---

## 4. 业务漏斗基线

核心事件（`packages/shared/analytics`）：

| 事件 | 触发点 |
|------|--------|
| `feed_expose` | Feed 卡片进入视口 |
| `feed_click` | 点击 Feed 卡片 |
| `detail_view` | 帖子/商品详情页 PV |
| `add_cart` | 加入购物车 |
| `order_submit` | 提交订单成功 |

漏斗查询：`GET /api/analytics/dashboard?days=7`

---

## 5. 错误监控

| 能力 | 实现 |
|------|------|
| Sentry | `@sentry/react`，通过 `VITE_SENTRY_DSN` 启用（可选） |
| Error Boundary | `apps/web/src/components/ErrorBoundary.tsx` |
| 自研错误快照 | `POST /api/metrics/errors` → `client_errors` 表 |

---

## 6. 已知问题与后续优化方向（阶段 9）

1. **路由级 code splitting**：当前主 chunk 包含全量页面，待拆分。
2. **图片格式**：Feed 封面尚未统一 WebP/AVIF 与 `srcset`。
3. **第三方库审计**：Sentry 仅在配置 DSN 时加载，可改为动态 import。
4. **Lighthouse CI**：尚未接入 CI 门禁。

---

## 7. 变更记录

| 日期 | 说明 |
|------|------|
| 2026-07-29 | 阶段 5 首版基线文档，建立埋点与 Vitals 采集链路 |
