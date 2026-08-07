# 拾光市集

面向年轻用户的「内容种草 + 轻电商」C 端练手项目。

## 环境要求

- Node.js 20+
- Docker & Docker Compose
- npm 10+

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
```

### 5. 启动开发服务

```bash
npm run dev
```

- Web 前端：http://localhost:5173
- API 服务：http://localhost:3000
- 健康检查：http://localhost:3000/api/health

## 项目结构

```
shiguang-market/
├── apps/
│   ├── api/          # Express 5 后端
│   └── web/          # React 主站 H5
├── packages/
│   ├── shared/       # 前后端共享类型
│   └── api-client/   # API 请求封装
└── infra/
    ├── docker-compose.yml
    └── migrations/
```

## 常用命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 并行启动 api + web |
| `npm --workspace=api run migrate` | 执行数据库迁移 |
| `npm --workspace=api run seed` | 填充种子数据（阶段 3 起） |
| `docker compose -f infra/docker-compose.yml down` | 停止基础设施 |

## 阶段进度

当前完成 **阶段 1：鉴权与用户体系**。详见 [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md)。

### 阶段 1 验收

1. 访问 http://localhost:5173/login
2. 输入手机号，点击「获取验证码」
3. 输入验证码 `123456`（开发环境固定值）登录
4. 进入「我的」查看用户信息，可退出登录

API 文档见 [docs/api.md](./docs/api.md)。
