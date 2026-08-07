/**
 * AI 大模型配置（独立文件，便于后续切换供应商）
 *
 * 切换模型时只需修改环境变量，无需改动业务代码。
 * 支持所有 OpenAI 兼容 API（通义千问、DeepSeek、OpenAI 等）。
 */

function readBool(value, fallback = false) {
  if (value === undefined || value === '') return fallback;
  return value === 'true' || value === '1';
}

const apiKey = process.env.AI_API_KEY ?? process.env.QWEN_API_KEY ?? '';

export const aiConfig = {
  /** 供应商标识，仅用于日志与 mock 提示 */
  provider: process.env.AI_PROVIDER ?? 'qwen',

  /** OpenAI 兼容 API 密钥 */
  apiKey,

  /**
   * API Base URL（不含 /chat/completions）
   * - 通义千问：https://dashscope.aliyuncs.com/compatible-mode/v1
   * - DeepSeek：https://api.deepseek.com/v1
   * - OpenAI：https://api.openai.com/v1
   */
  baseUrl: process.env.AI_BASE_URL,

  /** 模型名称 */
  model: process.env.AI_MODEL,

  /** 无密钥或显式开启时使用 mock 流式响应（开发环境） */
  mock: readBool(process.env.AI_MOCK, !apiKey),

  maxTokens: Number(process.env.AI_MAX_TOKENS ?? 1024),
  temperature: Number(process.env.AI_TEMPERATURE ?? 0.7),

  /** 聊天接口 per-user 限流 */
  rateLimit: {
    windowSec: Number(process.env.AI_RATE_LIMIT_WINDOW_SEC ?? 60),
    max: Number(process.env.AI_RATE_LIMIT_MAX ?? 20),
  },
};
