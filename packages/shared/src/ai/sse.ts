import type { AiChatEvent } from './types.js';

/** 将 SSE 文本块追加到 buffer，解析完整的 data: 行 */
export function parseSseChunk(buffer: string, chunk: string): {
  events: AiChatEvent[];
  remaining: string;
} {
  const events: AiChatEvent[] = [];
  const combined = buffer + chunk;
  const lines = combined.split('\n');
  const remaining = lines.pop() ?? '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('data:')) continue;
    const data = trimmed.slice(5).trim();
    if (!data) continue;

    try {
      events.push(JSON.parse(data) as AiChatEvent);
    } catch {
      // 忽略无法解析的行
    }
  }

  return { events, remaining };
}

/** 从 ReadableStream 读取 SSE（Web fetch） */
export async function* readSseFromStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
): AsyncGenerator<AiChatEvent> {
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const parsed = parseSseChunk(buffer, decoder.decode(value, { stream: true }));
      buffer = parsed.remaining;
      for (const event of parsed.events) {
        yield event;
      }
    }
  } finally {
    reader.releaseLock();
  }
}
