import type { AiChatEvent, AbortSignalLike } from '@shiguang/shared';
import { parseSseChunk } from '@shiguang/shared';

export interface ChatStreamRequest {
  url: string;
  headers: Record<string, string>;
  body: string;
  signal?: AbortSignalLike;
}

export type ChatStreamTransport = (
  request: ChatStreamRequest,
) => AsyncGenerator<AiChatEvent>;

interface TaroChunkResponse {
  data: ArrayBuffer | string;
}

interface TaroRequestTask {
  abort: () => void;
  onChunkReceived?: (callback: (res: TaroChunkResponse) => void) => void;
  offChunkReceived?: (callback: (res: TaroChunkResponse) => void) => void;
}

interface TaroRequestResult {
  statusCode: number;
  data: unknown;
}

type TaroRequestFn = (options: {
  url: string;
  method?: string;
  data?: unknown;
  header?: Record<string, string>;
  enableChunked?: boolean;
  success?: (res: TaroRequestResult) => void;
  fail?: (err: { errMsg: string }) => void;
}) => TaroRequestTask;

interface ChunkDecoder {
  decode(data?: ArrayBuffer, options?: { stream?: boolean }): string;
}

function createChunkDecoder(): ChunkDecoder {
  if (typeof TextDecoder !== 'undefined') {
    const decoder = new TextDecoder('utf-8');
    return {
      decode(data, options) {
        return decoder.decode(data, options);
      },
    };
  }

  let pending = new Uint8Array(0);

  return {
    decode(data, options) {
      const incoming = data ? new Uint8Array(data) : new Uint8Array(0);
      const bytes = new Uint8Array(pending.length + incoming.length);
      bytes.set(pending);
      bytes.set(incoming, pending.length);
      pending = new Uint8Array(0);

      let result = '';
      let offset = 0;

      while (offset < bytes.length) {
        const first = bytes[offset];
        let width = 1;

        if (first >= 0xc2 && first <= 0xdf) width = 2;
        else if (first >= 0xe0 && first <= 0xef) width = 3;
        else if (first >= 0xf0 && first <= 0xf4) width = 4;

        if (offset + width > bytes.length && options?.stream) {
          pending = bytes.slice(offset);
          break;
        }

        if (width === 1) {
          result += first <= 0x7f ? String.fromCharCode(first) : '\uFFFD';
          offset += 1;
          continue;
        }

        const continuation = bytes.slice(offset + 1, offset + width);
        const validContinuation =
          continuation.length === width - 1 &&
          continuation.every((byte) => byte >= 0x80 && byte <= 0xbf);

        if (!validContinuation) {
          result += '\uFFFD';
          offset += 1;
          continue;
        }

        let codePoint = first & (0x7f >> width);
        for (const byte of continuation) {
          codePoint = (codePoint << 6) | (byte & 0x3f);
        }

        const minCodePoint = width === 2 ? 0x80 : width === 3 ? 0x800 : 0x10000;
        const validCodePoint =
          codePoint >= minCodePoint &&
          codePoint <= 0x10ffff &&
          !(codePoint >= 0xd800 && codePoint <= 0xdfff);

        result += validCodePoint ? String.fromCodePoint(codePoint) : '\uFFFD';
        offset += width;
      }

      if (!options?.stream && pending.length > 0) {
        result += '\uFFFD';
        pending = new Uint8Array(0);
      }

      return result;
    },
  };
}

function waitForNext(
  getState: () => { queue: AiChatEvent[]; done: boolean; error: Error | null },
  onWait: (resolve: () => void) => void,
) {
  return new Promise<void>((resolve) => {
    const state = getState();
    if (state.queue.length > 0 || state.done || state.error) {
      resolve();
      return;
    }
    onWait(resolve);
  });
}

/** 微信小程序 enableChunked + onChunkReceived 消费 SSE */
export function createTaroChatStreamTransport(request: TaroRequestFn): ChatStreamTransport {
  return async function* taroChatStream(req: ChatStreamRequest) {
    const queue: AiChatEvent[] = [];
    let done = false;
    let error: Error | null = null;
    let buffer = '';
    let wake: (() => void) | null = null;
    const decoder = createChunkDecoder();

    const notify = () => {
      wake?.();
      wake = null;
    };

    const pushEvents = (chunk: string) => {
      const parsed = parseSseChunk(buffer, chunk);
      buffer = parsed.remaining;
      if (parsed.events.length > 0) {
        queue.push(...parsed.events);
        notify();
      }
    };

    let body: unknown = req.body;
    try {
      body = JSON.parse(req.body);
    } catch {
      // 保持原始字符串
    }

    const task = request({
      url: req.url,
      method: 'POST',
      data: body,
      header: req.headers,
      enableChunked: true,
      success: (res) => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          const payload = res.data as { ok?: boolean; error?: string; code?: string } | null;
          if (payload && payload.ok === false && payload.error) {
            error = new Error(payload.error);
          } else {
            error = new Error('AI 对话失败');
          }
        } else if (typeof res.data === 'string' && res.data) {
          pushEvents(res.data);
        }
        const finalText = decoder.decode();
        if (finalText) pushEvents(finalText);
        done = true;
        notify();
      },
      fail: (err) => {
        if (req.signal?.aborted) {
          done = true;
          notify();
          return;
        }
        error = new Error(err.errMsg || '网络请求失败');
        done = true;
        notify();
      },
    });

    const onChunk = (res: TaroChunkResponse) => {
      const chunk =
        typeof res.data === 'string'
          ? res.data
          : decoder.decode(res.data, { stream: true });
      if (chunk) pushEvents(chunk);
    };

    if (typeof task.onChunkReceived === 'function') {
      task.onChunkReceived(onChunk);
    }

    const onAbort = () => {
      task.abort();
      done = true;
      notify();
    };
    req.signal?.addEventListener('abort', onAbort);

    try {
      while (true) {
        if (queue.length > 0) {
          yield queue.shift()!;
          continue;
        }
        if (error) throw error;
        if (done) break;
        await waitForNext(
          () => ({ queue, done, error }),
          (resolve) => {
            wake = resolve;
          },
        );
      }
    } finally {
      req.signal?.removeEventListener('abort', onAbort);
      if (typeof task.offChunkReceived === 'function') {
        task.offChunkReceived(onChunk);
      }
    }
  };
}
