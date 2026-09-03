# AI 导购与 Skills 架构

本文档描述拾光市集 AI 对话模块的架构，重点说明 **aiSkills**（工具型 / 指令型 skill）、prompt 分层与 agent 循环。

## 目录结构

```
apps/api/src/
├── config/
│   ├── ai.js              # 模型配置（API Key、Mock、限流）
│   └── aiPrompts.js       # 基础 system prompt（商品 / 通用）
├── aiSkills/
│   ├── loader.js          # 扫描 skills/、按需加载、toLlmTools
│   ├── registry.js        # 统一导出
│   ├── parseSkillMd.js    # 解析 skill.md frontmatter
│   ├── types.js           # JSDoc 类型
│   └── skills/
│       ├── get-product-detail/   # 工具型 skill
│       │   ├── skill.md
│       │   ├── parameters.json
│       │   └── handler.js
│       └── product-answer-style/ # 指令型 skill（仅 skill.md）
│           └── skill.md
├── services/
│   ├── aiService.js       # 会话编排、agent 循环、SSE
│   └── llmService.js      # streamChat + streamChatWithTools（流式 + tools）
└── routes/ai.js           # HTTP / SSE 路由
```

## API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/api/ai/conversations` | 创建会话，body 可带 `productId` |
| `GET` | `/api/ai/conversations` | 会话列表 |
| `GET` | `/api/ai/conversations/:id/messages` | 消息历史 |
| `POST` | `/api/ai/conversations/:id/chat` | SSE 流式对话 |
| `POST` | `/api/ai/conversations/:id/chat/stop` | 显式停止生成 |
| `DELETE` | `/api/ai/conversations/:id/messages/last-assistant` | 删除最后一条 assistant（重试用） |

## SSE 事件

| 事件 | 说明 |
|------|------|
| `thinking` | 连接建立，等待首 token |
| `tool_call` | 工具型 skill 执行中 / 完成，`{ name, status: 'running' \| 'done' }` |
| `token` | 流式文本片段 |
| `done` | 正常结束，含 `messageId` |
| `stopped` | 用户手动停止，含 `messageId` |
| `error` | 错误信息 |

类型定义见 `packages/shared/src/ai/types.ts`。

### 微信小程序流式消费

与 Web 共用 SSE 协议与 `parseSseChunk` / `chatSync`；传输层使用 `wx.request` 的 `enableChunked` + `onChunkReceived`。

**详细说明（含与 Web 对比、停止/重试、环境要求）见 [小程序开发指南 · AI 流式对话](./mini-program.md#ai-流式对话)。**

## 对话流程

```
用户提问
  → 写入 user 消息（DB）
  → 组装 system prompt（见下文「Prompt 分层」）
  → [真实 API + 有工具型 skill] agent 循环（streamChatWithTools，最多 5 轮）
      → 边流式输出 token；若出现 tool_call → executeSkill(handler) → 继续下一轮
  → streamChat 流式生成最终回复（agent 直接返回文本时已边生成边推送）
  → 落库 assistant 消息 → SSE done / stopped
```

**Mock 模式**（`AI_MOCK=true`）：跳过 agent 循环与 function calling，直接 mock 流式输出；指令型 skill 的全文仍会注入 prompt。

## Prompt 分层

最终 system prompt 由以下部分拼接：

| 层级 | 来源 | 内容 |
|------|------|------|
| 1. 基础 prompt | `aiPrompts.js` | 角色 + 商品 ID / 名称 / 价格 / 描述（商品会话） |
| 2. 技能目录 | `buildSkillCatalogPrompt()` | 所有 skill 的 name + 短 description |
| 3. 自动指令 | `buildAutoActivatedInstructionsPrompt()` | `auto: true` 或 `context` 匹配的 instruction skill 全文 |
| 4. 按需工具说明 | `prepareActivatedSkills()` | 模型 tool_call 命中后，注入该 tool skill 的 skill.md 正文 |

### 静态信息 vs 实时数据

- **prompt 中的商品信息**：会话构建时的快照，适合名称、描述等；**库存等易变字段应通过工具查询**。
- **商品 ID**：建议写入 prompt，便于模型填充 `get_product_detail` 的 `productId` 参数。
- **后端兜底**：即使模型 tool_call 未带 `productId`，`aiService` 会用 `conversation.product_id` 自动补全（仅在该次已发起 tool_call 时生效）。

## Skill 类型

### 工具型（tool）

需要三个文件：

```
skills/your-tool/
├── skill.md           # name、description、type: tool（可省略，有 handler 即视为 tool）
├── parameters.json    # OpenAI function 参数 JSON Schema
└── handler.js         # export async function execute(args, ctx)
```

- 注册为 LLM `tools`，由模型 **tool_call** 触发。
- `handler.js` **仅在模型返回 tool_calls 后** 由 `executeSkill()` 执行，不会随用户发消息自动运行。

### 指令型（instruction）

只需一个文件：

```
skills/your-instruction/
└── skill.md           # type: instruction，可选 auto / context
```

- **不**注册为 `tools`，不执行 handler。
- 通过 frontmatter 控制激活时机：
  - `auto: true`：满足条件时自动注入全文到 system prompt。
  - `context: product`：商品详情会话（有 `productId`）时激活。
  - `context: general`：无商品绑定的通用会话时激活。
  - `context: any`：任意会话均激活（与 `auto: true` 配合使用）。

类型推断：显式 `type`，或仅有 `skill.md`、无 `handler.js` / `parameters.json` 时视为 instruction。

## 按需加载

| 阶段 | 传给模型的内容 |
|------|----------------|
| 目录 | 所有 skill 的 **name + 短 description**（`buildSkillCatalogPrompt`） |
| 工具定义 | 仅 tool 型：**短 description + parameters**（`toLlmTools`，不含 skill.md 正文） |
| 全文 | instruction 自动激活，或 tool 被 **tool_call 命中后** 注入 skill.md 正文 |

## 新增 Skill 步骤

1. 在 `apps/api/src/aiSkills/skills/` 下新建目录。
2. 编写 `skill.md`（frontmatter 含 `name`、`description`、`enabled`）。
3. 工具型：补充 `parameters.json`、`handler.js`（`export async function execute(args, ctx)`）。
4. 重启 API，或调用 `loadSkills({ force: true })`（测试用）。
5. 无需修改 `aiService` 主流程，loader 会自动扫描。

### handler 上下文 `ctx`

```typescript
{ userId?, conversationId?, productId? }
```

`productId` 来自 `ai_conversations.product_id`。商品详情页创建的会话应带 `productId`。

## 停止生成与重试

### 停止生成

用户点击「停止」时：

1. 前端立即定格当前已显示文本并追加 `…`
2. 调用 `POST /api/ai/conversations/:id/chat/stop`，后端通过 `activeGenerations` 显式 `abort`（不依赖 SSE 连接关闭，避免 Vite 代理下 `req.on('close')` 延迟）
3. Mock / 真实 API 均检查 `AbortSignal`，停止后不再继续生成
4. 已生成部分落库为 assistant 消息，末尾带 `…`，SSE 发送 `stopped` 事件

### 重试

1. 前端删除本地最后一条 assistant 消息
2. 调用 `DELETE /api/ai/conversations/:id/messages/last-assistant`
3. 以 `{ content, retry: true }` 重新 `POST .../chat`（不重复写入 user 消息）

## 会话与商品绑定

| 场景 | `product_id` | system prompt | 自动激活的 instruction |
|------|--------------|---------------|------------------------|
| 商品详情页「问 AI」 | 有 | `buildProductSystemPrompt`（含商品 ID、名称、价格、描述） | `context: product` 的 skill |
| 通用新对话（未传 `productId`） | 无 | `buildGeneralSystemPrompt` | `context: general` 的 skill |

**注意**：`POST /api/ai/conversations` 的 body 需带 `productId` 才会绑定商品上下文；仅在前端清空对话 state 而未创建新会话时，首条消息可能落在无商品绑定的会话上。

## skill.md Frontmatter

| 字段 | 必填 | 说明 |
|------|------|------|
| `name` | 是 | 唯一标识，工具型对应 LLM function name（如 `get_product_detail`） |
| `description` | 是 | 短描述，用于技能目录与 LLM tool 定义 |
| `enabled` | 否 | `false` 时跳过加载，默认启用 |
| `type` | 否 | `tool` / `instruction`；可省略，由文件结构推断 |
| `auto` | 否 | 指令型：`true` 时满足 context 即自动注入全文 |
| `context` | 否 | 指令型：`product` / `general` / `any` |

正文（`---` 之后）为 skill 指令全文，在自动激活或 tool 被调用后注入 system prompt。

## Agent 循环细节

`runSkillAgentLoop`（`aiService.js`，最多 `MAX_TOOL_ROUNDS = 5`）：

1. `streamChatWithTools`：流式 + tools，token 实时推送给前端
2. 流结束无 `tool_calls` → 完成（内容已在流式过程中输出）
3. 有 `tool_calls` → `prepareActivatedSkills` 注入 skill 正文 → `executeSkill` → 下一轮
4. 达到轮次上限后，用 `streamChat`（无 tools）输出最终答案

触发条件：`toolSkills.length > 0 && !aiConfig.mock`。

## 环境变量

见根目录 `.env.example`：

| 变量 | 说明 |
|------|------|
| `AI_MOCK` | `true` 时 mock 流式，不走 function calling |
| `AI_MOCK_CHUNK_DELAY_MS` | Mock 流式每 chunk 延迟（毫秒），默认 80 |
| `AI_API_KEY` / `QWEN_API_KEY` | 模型密钥 |
| `AI_BASE_URL` / `AI_MODEL` | OpenAI 兼容端点与模型名 |
| `AI_RATE_LIMIT_*` | 按用户限流 |

修改 `.env` 后需**重启 API**（`node --watch` 不会因 `.env` 变更自动重载配置）。

## 测试工具型 Skill 是否被调用

1. 设置 `AI_MOCK=false` 并配置真实 API Key，重启 API。
2. 在**商品详情页**打开 AI，新建对话后发需要实时数据的问题（如「请查实时库存」）。
3. 浏览器 Network → SSE `chat` 响应中应出现：
   - `tool_call`（`get_product_detail`，`running` / `done`）
   - 随后 `token` 流式回复
4. 若仅有 `token`、无 `tool_call`：模型未发起 function calling（可能仍用 prompt 静态信息作答，或缺少商品 ID 导致不敢调用）。

## 内置 Skill

| name | 类型 | 说明 |
|------|------|------|
| `get_product_detail` | tool | 查商品实时价格、库存、描述 |
| `product_answer_style` | instruction | 商品导购话术与风格（`auto: true`，`context: product`） |
