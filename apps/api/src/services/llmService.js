import { aiConfig } from '../config/ai.js';
import { logger } from '../logger.js';

const CHAT_COMPLETIONS_URL = () =>
  `${aiConfig.baseUrl.replace(/\/$/, '')}/chat/completions`;

const TOOL_CODE_MARKUP_RE = /<tool_code>[\s\S]*?<\/tool_code>/g;
const TOOL_CODE_OPEN_RE = /<tool_code>/;

/**
 * @param {string} text
 */
function stripToolCodeMarkup(text) {
  return text.replace(TOOL_CODE_MARKUP_RE, '').trim();
}

/**
 * @param {string} text
 */
function containsToolCodeMarkup(text) {
  return TOOL_CODE_OPEN_RE.test(text);
}

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
 * @param {Response} response
 */
async function readChatCompletionError(response) {
  const errText = await response.text().catch(() => '');
  logger.warn({ status: response.status, body: errText }, 'LLM API error');
  throw new Error(`大模型服务异常（${response.status}）`);
}

/**
 * @param {Record<number, { id: string; type: string; function: { name: string; arguments: string } }>} accumulator
 * @param {Array<Record<string, unknown>>} toolCalls
 */
function setCompleteToolCalls(accumulator, toolCalls) {
  for (const [index, call] of toolCalls.entries()) {
    const idx = typeof call.index === 'number' ? call.index : index;
    const fn = call.function;
    accumulator[idx] = {
      id: typeof call.id === 'string' ? call.id : `call_${idx}`,
      type: typeof call.type === 'string' ? call.type : 'function',
      function: {
        name: fn && typeof fn === 'object' && typeof fn.name === 'string' ? fn.name : '',
        arguments:
          fn && typeof fn === 'object' && typeof fn.arguments === 'string'
            ? fn.arguments
            : '{}',
      },
    };
  }
}

/**
 * @param {Record<number, { id: string; type: string; function: { name: string; arguments: string } }>} accumulator
 * @param {Array<Record<string, unknown>>} deltaToolCalls
 */
function appendToolCallDeltas(accumulator, deltaToolCalls) {
  for (const delta of deltaToolCalls) {
    const index = typeof delta.index === 'number' ? delta.index : 0;

    if (!accumulator[index]) {
      accumulator[index] = {
        id: '',
        type: 'function',
        function: { name: '', arguments: '' },
      };
    }

    const entry = accumulator[index];
    if (typeof delta.id === 'string') entry.id = delta.id;
    if (typeof delta.type === 'string') entry.type = delta.type;

    const fn = delta.function;
    if (fn && typeof fn === 'object') {
      if (typeof fn.name === 'string') entry.function.name += fn.name;
      if (typeof fn.arguments === 'string') entry.function.arguments += fn.arguments;
    }
  }
}

/**
 * @param {Record<number, { id: string; type: string; function: { name: string; arguments: string } }>} accumulator
 */
function finalizeToolCalls(accumulator) {
  return Object.keys(accumulator)
    .map(Number)
    .sort((a, b) => a - b)
    .map((index) => accumulator[index])
    .filter((call) => call.function.name)
    .map((call, index) => ({
      id: call.id || `call_${index}`,
      type: call.type ?? 'function',
      function: {
        name: call.function.name,
        arguments: call.function.arguments || '{}',
      },
    }));
}

/**
 * @param {ReadableStreamDefaultReader<Uint8Array>} reader
 * @param {AbortSignal} [signal]
 * @returns {AsyncGenerator<{ content?: string; tool_calls?: Array<Record<string, unknown>> }>}
 */
async function* readCompletionDeltas(reader, signal) {
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
          const choice = parsed.choices?.[0];
          if (!choice) continue;

          const chunk = {};
          const delta = choice.delta;
          const message = choice.message;

          if (delta?.content) chunk.content = delta.content;
          if (message?.content) {
            chunk.content = `${chunk.content ?? ''}${message.content}`;
          }

          if (delta?.tool_calls?.length) {
            chunk.tool_calls = delta.tool_calls;
            chunk.tool_calls_mode = 'delta';
          } else if (message?.tool_calls?.length) {
            chunk.tool_calls = message.tool_calls;
            chunk.tool_calls_mode = 'complete';
          }

          if (chunk.content || chunk.tool_calls) yield chunk;
        } catch {
          // 忽略无法解析的行
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * 流式聊天（无 tools）
 * @param {{
 *   systemPrompt: string;
 *   messages: Array<Record<string, unknown>>;
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

  const body = {
    model: aiConfig.model,
    messages: [{ role: 'system', content: systemPrompt }, ...messages],
    stream: true,
    max_tokens: aiConfig.maxTokens,
    temperature: aiConfig.temperature,
  };

  const response = await fetch(CHAT_COMPLETIONS_URL(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${aiConfig.apiKey}`,
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    await readChatCompletionError(response);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('无法读取流式响应');
  }

  for await (const delta of readCompletionDeltas(reader, signal)) {
    if (delta.content) yield delta.content;
  }
}

/**
 * 流式聊天 + function calling（agent 循环使用）
 * @param {{
 *   systemPrompt: string;
 *   messages: Array<Record<string, unknown>>;
 *   tools: unknown[];
 *   signal?: AbortSignal;
 *   onToken?: (token: string) => void;
 *   toolChoice?: 'auto' | 'none';
 * }} options
 * @returns {Promise<{ content: string | null; toolCalls: ReturnType<typeof finalizeToolCalls> }>}
 */
export async function streamChatWithTools({
  systemPrompt,
  messages,
  tools,
  signal,
  onToken,
  toolChoice = 'auto',
}) {
  if (aiConfig.mock) {
    return { content: null, toolCalls: [] };
  }

  const body = {
    model: aiConfig.model,
    messages: [{ role: 'system', content: systemPrompt }, ...messages],
    stream: true,
    max_tokens: aiConfig.maxTokens,
    temperature: aiConfig.temperature,
    tools,
    tool_choice: toolChoice,
  };

  const response = await fetch(CHAT_COMPLETIONS_URL(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${aiConfig.apiKey}`,
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    await readChatCompletionError(response);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('无法读取流式响应');
  }

  const toolAccumulator = {};
  let content = '';
  let allowTokenStream = true;
  let streamedLength = 0;

  for await (const delta of readCompletionDeltas(reader, signal)) {
    if (delta.tool_calls?.length) {
      allowTokenStream = false;
      if (delta.tool_calls_mode === 'complete') {
        setCompleteToolCalls(toolAccumulator, delta.tool_calls);
      } else {
        appendToolCallDeltas(toolAccumulator, delta.tool_calls);
      }
    }

    if (delta.content) {
      content += delta.content;
      if (containsToolCodeMarkup(content)) {
        allowTokenStream = false;
      }
      if (allowTokenStream) {
        onToken?.(delta.content);
        streamedLength += delta.content.length;
      }
    }
  }

  const toolCalls = finalizeToolCalls(toolAccumulator);
  const cleanedContent = stripToolCodeMarkup(content);

  if (toolCalls.length > 0) {
    return {
      content: cleanedContent || null,
      toolCalls,
    };
  }

  if (!allowTokenStream && cleanedContent.length > streamedLength) {
    const remainder = cleanedContent.slice(streamedLength);
    for (const chunk of chunkText(remainder)) {
      onToken?.(chunk);
    }
  }

  if (!cleanedContent && toolCalls.length === 0) {
    logger.warn('LLM stream ended with empty content and no tool calls');
  }

  return {
    content: cleanedContent || null,
    toolCalls,
  };
}

/**
 * Mock 流式输出（开发环境无 API Key 时使用）
 * @param {string} userMessage
 * @param {AbortSignal} [signal]
 */
async function* mockStream(userMessage, signal) {
  const reply = `【Mock 模式】你好！我是拾光市集 AI 导购。你问的是：「${userMessage.slice(0, 50)}」。配置 AI_API_KEY 并关闭 AI_MOCK 即可接入真实大模型。`;
  const chunkDelayMs = aiConfig.mockChunkDelayMs;

  for (const chunk of chunkText(reply)) {
    if (signal?.aborted) return;
    if (chunkDelayMs > 0) {
      await new Promise((r) => setTimeout(r, chunkDelayMs));
    } else {
      await new Promise((r) => setImmediate(r));
    }
    if (signal?.aborted) return;
    yield chunk;
  }
}
