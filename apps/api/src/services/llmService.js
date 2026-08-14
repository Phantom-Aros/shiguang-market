import { aiConfig } from '../config/ai.js';
import { logger } from '../logger.js';

/**
 * @param {string} text
 * @param {number} chunkSize
 */
function* chunkText(text, chunkSize = 4) {
  for (let i = 0; i < text.length; i += chunkSize) {
    yield text.slice(i, i + chunkSize);
  }
}

/**
 * Mock 流式输出（开发环境无 API Key 时使用）
 * @param {string} userMessage
 * @param {AbortSignal} [signal]
 */
async function* mockStream(userMessage, signal) {
  const reply = `【Mock 模式】你好！我是拾光市集 AI 导购。你问的是：「${userMessage.slice(0, 50)}」。配置 AI_API_KEY 并关闭 AI_MOCK 即可接入真实大模型。`;
  const chunkDelayMs = Number(process.env.AI_MOCK_CHUNK_DELAY_MS ?? 80);

  for (const chunk of chunkText(reply)) {
    if (signal?.aborted) return;
    await new Promise((r) => setTimeout(r, chunkDelayMs));
    if (signal?.aborted) return;
    yield chunk;
  }
}

/**
 * 调用 OpenAI 兼容 API 流式聊天
 * @param {{
 *   systemPrompt: string;
 *   messages: Array<{ role: string; content: string }>;
 *   signal?: AbortSignal;
 * }} options
 * @returns {AsyncGenerator<string>}
 */
export async function* streamChat({ systemPrompt, messages, signal }) {
  if (aiConfig.mock) {
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    yield* mockStream(lastUser?.content ?? '', signal);
    return;
  }

  const url = `${aiConfig.baseUrl.replace(/\/$/, '')}/chat/completions`;
  const body = {
    model: aiConfig.model,
    messages: [{ role: 'system', content: systemPrompt }, ...messages],
    stream: true,
    max_tokens: aiConfig.maxTokens,
    temperature: aiConfig.temperature,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${aiConfig.apiKey}`,
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    logger.warn({ status: response.status, body: errText }, 'LLM API error');
    throw new Error(`大模型服务异常（${response.status}）`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('无法读取流式响应');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      if (signal?.aborted) return;

      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;

        const data = trimmed.slice(5).trim();
        if (data === '[DONE]') return;

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) yield content;
        } catch {
          // 忽略无法解析的行
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
