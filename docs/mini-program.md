# 拾光市集 · 微信小程序开发指南

## 概述

`apps/mini-program` 基于 Taro 3 + React + TypeScript，复用 monorepo 中的：

- `@shiguang/shared`：共享类型
- `@shiguang/api-client`：API 客户端（Taro 存储 + request 适配）
- `@shiguang/ui-taro`：小程序端 UI 薄封装层

## 快速开始

### 1. 启动后端

```bash
docker compose -f infra/docker-compose.yml up -d
npm --workspace=api run migrate
npm --workspace=api run seed
npm --workspace=api run dev
```

### 2. 配置 API 地址

开发环境默认 `http://localhost:3000/api`，可在 `apps/mini-program/config/dev.ts` 修改 `TARO_APP_API_BASE`。

**真机调试**时须将地址改为本机局域网 IP，例如：

```ts
TARO_APP_API_BASE: '"http://192.168.1.100:3000/api"',
```

### 3. 编译并预览

```bash
npm install
npm run dev:mini-program
```

用微信开发者工具打开 `apps/mini-program` 目录（编译产物在 `dist/`）。

> **说明**：monorepo 环境下已关闭 Taro 依赖预编译（`compiler.prebundle.enable: false`），避免与根目录 `enhanced-resolve` 版本冲突。不影响功能，仅首编略慢。

### 4. 开发者工具设置

- **详情 → 本地设置**：勾选「不校验合法域名、web-view、TLS 版本以及 HTTPS 证书」（仅开发环境）
- `project.config.json` 中 `appid` 可先用测试号 `touristappid`，或替换为你的小程序 AppID

## 微信登录配置

### 开发环境（Mock）

未配置 `WECHAT_APP_ID` / `WECHAT_APP_SECRET` 时，后端对任意 `wx.login()` 返回的 code 生成 mock openid，可直接联调。

### 生产 / 体验版（真实登录）

1. 登录 [微信公众平台](https://mp.weixin.qq.com/)，获取小程序 **AppID** 与 **AppSecret**
2. 在根目录 `.env` 中配置：

```env
WECHAT_APP_ID=wxXXXXXXXX
WECHAT_APP_SECRET=xxxxxxxx
```

3. 后端 `POST /api/auth/wechat/login` 将调用 `jscode2session` 换取 openid
4. 同一 openid 绑定同一 `user_id`，与 H5 用户体系隔离但结构一致（通过 `wechat_bindings` 表）

### 登录流程

```
小程序 wx.login() → code
  → POST /api/auth/wechat/login { code }
  → 返回 accessToken + refreshToken
  → 存入 Taro Storage，后续请求带 Bearer
```

## 分享

帖子详情页通过 `useShareAppMessage` 配置分享卡片：

- **title**：帖子标题（来自 `GET /api/posts/:postId/share-meta`）
- **imageUrl**：封面图
- **path**：`/pages/post-detail/index?postId=xxx`

分享元数据接口无需登录，可供小程序与 H5 共用。

## 模拟支付 vs 真实微信支付

当前 `pages/pay` 为 **Mock 支付**：创建订单后调用 `POST /api/orders/:id/pay` 模拟成功。

### 真实微信支付接入步骤（备忘）

1. **商户资质**：开通微信支付商户号，小程序与商户号绑定
2. **后端统一下单**：`POST /v3/pay/transactions/jsapi`，传入 openid、金额、订单号
3. **返回 prepay_id**：组装小程序支付参数（timeStamp、nonceStr、package、signType、paySign）
4. **前端唤起支付**：

```ts
Taro.requestPayment({
  timeStamp: '',
  nonceStr: '',
  package: '',
  signType: 'RSA',
  paySign: '',
});
```

5. **支付回调**：微信服务器通知后端，更新订单状态（需公网 HTTPS 回调 URL）
6. **小程序域名**：在微信后台配置 request 合法域名为 API 域名（须 HTTPS）

## 上线域名与白名单

| 配置项 | 说明 |
|--------|------|
| 小程序 request 合法域名 | 微信公众平台 → 开发 → 开发管理 → 服务器域名 |
| API HTTPS | 生产 API 须 HTTPS，不支持 IP 直连 |
| 后端 CORS | H5 跨域通过 `CORS_ORIGINS` 环境变量配置，逗号分隔 |
| 图片域名 | 封面图 CDN / MinIO 域名需加入小程序 downloadFile 合法域名 |

```env
# 生产 .env 示例
CORS_ORIGINS=https://h5.example.com,https://campaign.example.com
```

## 图标

小程序端通过 `@shiguang/ui-taro` 的 `Icon` 组件渲染，底层使用 [Iconify](https://iconify.design/) + [Material Design Light](https://icon-sets.iconify.design/mdi-light/)。

> 平台限制、颜色处理、组件分层等说明见 [小程序端 Icon 与组件限制说明](./mini-program-ui.md)。

**换图标**：只需修改 `packages/icons/src/registry.ts` 中的 Iconify ID，例如：

```ts
discover: { filled: 'mdi-light:book-multiple', outline: 'mdi-light:book-multiple' },
```

在 [icon-sets.iconify.design/mdi-light](https://icon-sets.iconify.design/mdi-light/) 挑选图标后，运行：

```bash
npm run generate --workspace=@shiguang/icons
```

脚本会从 registry 自动提取用到的图标并生成精简子集（约 7KB），无需手抄 SVG path。

## 页面结构

| 页面 | 路径 | 说明 |
|------|------|------|
| 发现（Feed） | `pages/index` | 双列瀑布流，无限滚动，顶部 618 入口 |
| 帖子详情 | `pages/post-detail` | 图文、点赞收藏、分享 |
| 618 活动 | `pages/campaign` | Schema 驱动活动页，slug 默认 `618-sale` |
| 我的 | `pages/profile` | 微信登录、退出 |
| 模拟支付 | `pages/pay` | 演示下单支付 Mock，支持 `productId` 参数 |

## 真机调试注意

- **安全区**：页面底部使用 `.safe-bottom` 适配 iPhone 刘海/Home Indicator
- **滚动**：Feed 使用 `ScrollView` + `useReachBottom` 分页加载
- **图片比例**：`Image` 组件通过 `aspectRatio` 保持封面比例，避免布局抖动
