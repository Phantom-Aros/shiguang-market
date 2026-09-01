export interface HttpResponse {
  ok: boolean;
  status: number;
  json<T>(): Promise<T>;
  /** 浏览器 fetch 的原始 body，供 SSE 流式读取；Taro 适配器不提供 */
  body?: ReadableStream<Uint8Array> | null;
}

export type HttpFetch = (url: string, init?: RequestInit) => Promise<HttpResponse>;

export const browserFetch: HttpFetch = async (url, init) => {
  const response = await fetch(url, init);
  return {
    ok: response.ok,
    status: response.status,
    json: <T>() => response.json() as Promise<T>,
    body: response.body,
  };
};

/** Taro.request 适配器，供微信小程序使用 */
export function createTaroFetch(
  request: (options: {
    url: string;
    method?: string;
    data?: unknown;
    header?: Record<string, string>;
  }) => Promise<{ statusCode: number; data: unknown }>,
): HttpFetch {
  return async (url, init) => {
    const method = init?.method ?? 'GET';
    let data: unknown;
    if (init?.body && typeof init.body === 'string') {
      data = JSON.parse(init.body);
    }

    const result = await request({
      url,
      method,
      data,
      header: init?.headers as Record<string, string> | undefined,
    });

    return {
      ok: result.statusCode >= 200 && result.statusCode < 300,
      status: result.statusCode,
      json: async <T>() => result.data as T,
    };
  };
}
