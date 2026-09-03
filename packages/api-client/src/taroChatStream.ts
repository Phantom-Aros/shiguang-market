import type { AiChatEvent, AbortSignalLike } from '@shiguang/shared';
import { parseSseChunk, readSseFromStream } from '@shiguang/shared';

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

function decodeChunk(data: ArrayBuffer | string): string {
  if (typeof data === 'string') return data;
  if (typeof TextDecoder !== 'undefined') {
    return new TextDecoder('utf-8').decode(data);
  }
  return String.fromCharCode(...new Uint8Array(data));
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
      pushEvents(decodeChunk(res.data));
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
