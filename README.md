# 拾光市集

面向年轻用户的「内容种草 + 轻电商」C 端练手项目。

## 环境要求

- Node.js 20+
- Docker & Docker Compose
- npm 10+
- 微信开发者工具（小程序开发）

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
```

### 3. 启动基础设施

```bash
docker compose -f infra/docker-compose.yml up -d
```

### 4. 数据库迁移

```bash
npm --workspace=api run migrate
npm --workspace=api run seed
```

### 5. 启动开发服务

```bash
npm run dev
```

- Web 前端：http://localhost:5173
- API 服务：http://localhost:3000
- 健康检查：http://localhost:3000/api/health

### 6. 微信小程序（可选，需单独启动）

```bash
npm run dev:mini-program
```

用微信开发者工具打开 `apps/mini-program` 目录。详见 [docs/mini-program.md](./docs/mini-program.md)。

## 项目结构

```
shiguang-market/
├── apps/
│   ├── api/            # Express 5 后端
│   ├── web/            # React 主站 H5
│   ├── campaign/       # 活动页
│   └── mini-program/   # Taro 微信小程序
├── packages/
│   ├── shared/         # 前后端共享类型
│   ├── api-client/     # API 请求封装
│   ├── ui/             # Web 组件库
│   └── ui-taro/        # 小程序 UI 薄封装
└── infra/
    ├── docker-compose.yml
    └── migrations/
```

## 常用命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 并行启动 api + web + campaign + Storybook（不含小程序） |
| `npm run dev:mini-program` | 单独编译微信小程序（Taro watch） |
| `npm --workspace=mini-program run dev` | 同上，等价写法 |
| `npm --workspace=api run migrate` | 执行数据库迁移 |
| `npm --workspace=api run seed` | 填充种子数据 |
| `docker compose -f infra/docker-compose.yml down` | 停止基础设施 |

## 阶段进度

当前完成 **阶段 8：微信小程序跨端**。详见 [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md)。

### 阶段 8 验收

1. 启动 API 与 seed 数据
2. `npm run dev:mini-program`，微信开发者工具打开项目
3. 浏览 Feed 双列流，点击进入帖子详情
4. 「我的」页微信一键登录（开发环境 mock）
5. 详情页点击分享，卡片标题与封面正确
6. 「模拟支付」页可创建订单并完成 Mock 支付

API 文档见 [docs/api.md](./docs/api.md)，小程序指南见 [docs/mini-program.md](./docs/mini-program.md)。
