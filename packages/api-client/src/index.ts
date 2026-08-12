import type {
  ApiResponse,
  AiChatEvent,
  AiConversation,
  AiConversationListResponse,
  AiMessagesResponse,
  CampaignSummary,
  CampaignVersion,
  CampaignVersionsResponse,
  Cart,
  CreateCampaignResponse,
  CreateOrderInput,
  FeedPage,
  InteractionResult,
  LoginResponse,
  OrderDetail,
  OrderListPage,
  PostDetail,
  ProductDetail,
  PublishedCampaign,
  SendSmsResponse,
  User,
} from '@shiguang/shared';

const STORAGE_KEY_ACCESS = 'sg_access_token';
const STORAGE_KEY_REFRESH = 'sg_refresh_token';

export interface ApiClientOptions {
  baseUrl?: string;
  headers?: Record<string, string>;
  onUnauthorized?: () => void;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const tokenStorage = {
  getAccess(): string | null {
    return localStorage.getItem(STORAGE_KEY_ACCESS);
  },
  getRefresh(): string | null {
    return localStorage.getItem(STORAGE_KEY_REFRESH);
  },
  set(accessToken: string, refreshToken: string): void {
    localStorage.setItem(STORAGE_KEY_ACCESS, accessToken);
    localStorage.setItem(STORAGE_KEY_REFRESH, refreshToken);
  },
  clear(): void {
    localStorage.removeItem(STORAGE_KEY_ACCESS);
    localStorage.removeItem(STORAGE_KEY_REFRESH);
  },
  hasTokens(): boolean {
    return Boolean(tokenStorage.getAccess() && tokenStorage.getRefresh());
  },
};

let refreshPromise: Promise<void> | null = null;

export function createApiClient(options: ApiClientOptions = {}) {
  const baseUrl = options.baseUrl ?? '';
  let onUnauthorized = options.onUnauthorized;

  function setOnUnauthorized(handler: () => void) {
    onUnauthorized = handler;
  }

  async function doRefresh(): Promise<void> {
    const refreshToken = tokenStorage.getRefresh();
    if (!refreshToken) {
      tokenStorage.clear();
      onUnauthorized?.();
      throw new ApiError('未登录', 'UNAUTHORIZED', 401);
    }

    const response = await fetch(`${baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    const body = (await response.json()) as ApiResponse<LoginResponse>;

    if (!body.ok) {
      tokenStorage.clear();
      onUnauthorized?.();
      throw new ApiError(body.error, body.code, response.status);
    }

    tokenStorage.set(body.data.tokens.accessToken, body.data.tokens.refreshToken);
  }

  async function refreshOnce(): Promise<void> {
    if (!refreshPromise) {
      refreshPromise = doRefresh().finally(() => {
        refreshPromise = null;
      });
    }
    await refreshPromise;
  }

  async function request<T>(path: string, init?: RequestInit, retried = false): Promise<T> {
    const accessToken = tokenStorage.getAccess();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers,
      ...(init?.headers as Record<string, string> | undefined),
    };

    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    const response = await fetch(`${baseUrl}${path}`, { ...init, headers });
    const body = (await response.json()) as ApiResponse<T>;

    if (!body.ok) {
      if (
        body.code === 'UNAUTHORIZED' &&
        !retried &&
        tokenStorage.getRefresh() &&
        !path.includes('/auth/refresh') &&
        !path.includes('/auth/sms/')
      ) {
        await refreshOnce();
        return request<T>(path, init, true);
      }

      if (body.code === 'UNAUTHORIZED') {
        tokenStorage.clear();
        onUnauthorized?.();
      }

      throw new ApiError(body.error, body.code, response.status);
    }

    return body.data;
  }

  return {
    setOnUnauthorized,
    get: <T>(path: string) => request<T>(path),
    post: <T>(path: string, data?: unknown) =>
      request<T>(path, {
        method: 'POST',
        body: data !== undefined ? JSON.stringify(data) : undefined,
      }),
    put: <T>(path: string, data?: unknown) =>
      request<T>(path, {
        method: 'PUT',
        body: data !== undefined ? JSON.stringify(data) : undefined,
      }),
    delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),

    auth: {
      sendSms(phone: string) {
        return request<SendSmsResponse>('/auth/sms/send', {
          method: 'POST',
          body: JSON.stringify({ phone }),
        });
      },
      login(phone: string, code: string) {
        return request<LoginResponse>('/auth/sms/login', {
          method: 'POST',
          body: JSON.stringify({ phone, code }),
        });
      },
      logout() {
        const refreshToken = tokenStorage.getRefresh();
        if (!refreshToken) return Promise.resolve({ success: true });
        return request<{ success: boolean }>('/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken }),
        });
      },
      getMe() {
        return request<User>('/auth/me');
      },
    },

    feed: {
      list(params?: { cursor?: string; limit?: number }) {
        const search = new URLSearchParams();
        if (params?.cursor) search.set('cursor', params.cursor);
        if (params?.limit) search.set('limit', String(params.limit));
        const query = search.toString();
        return request<FeedPage>(`/feed${query ? `?${query}` : ''}`);
      },
    },

    posts: {
      get(postId: string) {
        return request<PostDetail>(`/posts/${postId}`);
      },
      related(postId: string) {
        return request<{ items: FeedPage['items'] }>(`/posts/${postId}/related`);
      },
      like(postId: string) {
        return request<InteractionResult>(`/posts/${postId}/like`, { method: 'POST' });
      },
      unlike(postId: string) {
        return request<InteractionResult>(`/posts/${postId}/like`, { method: 'DELETE' });
      },
      favorite(postId: string) {
        return request<InteractionResult>(`/posts/${postId}/favorite`, { method: 'POST' });
      },
      unfavorite(postId: string) {
        return request<InteractionResult>(`/posts/${postId}/favorite`, { method: 'DELETE' });
      },
    },

    products: {
      get(productId: string) {
        return request<ProductDetail>(`/products/${productId}`);
      },
      samples(limit = 4) {
        return request<{ items: ProductDetail[] }>(`/products/samples?limit=${limit}`);
      },
    },

    cart: {
      get() {
        return request<Cart>('/cart');
      },
      upsertItem(productId: string, quantity: number) {
        return request<Cart>('/cart/items', {
          method: 'PUT',
          body: JSON.stringify({ productId, quantity }),
        });
      },
      removeItem(itemId: string) {
        return request<Cart>(`/cart/items/${itemId}`, { method: 'DELETE' });
      },
    },

    orders: {
      list(params?: { page?: number; limit?: number }) {
        const search = new URLSearchParams();
        if (params?.page) search.set('page', String(params.page));
        if (params?.limit) search.set('limit', String(params.limit));
        const query = search.toString();
        return request<OrderListPage>(`/orders${query ? `?${query}` : ''}`);
      },
      get(orderId: string) {
        return request<OrderDetail>(`/orders/${orderId}`);
      },
      create(input: CreateOrderInput) {
        return request<OrderDetail>('/orders', {
          method: 'POST',
          body: JSON.stringify(input),
        });
      },
      pay(orderId: string) {
        return request<OrderDetail>(`/orders/${orderId}/pay`, { method: 'POST' });
      },
      cancel(orderId: string) {
        return request<OrderDetail>(`/orders/${orderId}/cancel`, { method: 'POST' });
      },
    },

    campaigns: {
      getBySlug(slug: string) {
        return request<PublishedCampaign>(`/campaigns/${slug}`);
      },
      create(input: { slug: string; title: string; schema?: Record<string, unknown> }) {
        return request<CreateCampaignResponse>('/campaigns', {
          method: 'POST',
          body: JSON.stringify(input),
        });
      },
      updateSchema(campaignId: string, schema: Record<string, unknown>) {
        return request<CampaignVersion>(`/campaigns/${campaignId}/schema`, {
          method: 'PUT',
          body: JSON.stringify({ schema }),
        });
      },
      publish(campaignId: string, rolloutPercent?: number) {
        return request<{ campaign: CampaignSummary; publishedVersion: CampaignVersion }>(
          `/campaigns/${campaignId}/publish`,
          {
            method: 'POST',
            body: JSON.stringify({ rolloutPercent }),
          },
        );
      },
      rollback(campaignId: string, versionId: string) {
        return request<{ campaign: CampaignSummary; publishedVersion: CampaignVersion }>(
          `/campaigns/${campaignId}/rollback`,
          {
            method: 'POST',
            body: JSON.stringify({ versionId }),
          },
        );
      },
      listVersions(campaignId: string) {
        return request<CampaignVersionsResponse>(`/campaigns/${campaignId}/versions`);
      },
    },

    ai: {
      createConversation(input?: { productId?: string }) {
        return request<AiConversation>('/ai/conversations', {
          method: 'POST',
          body: JSON.stringify(input ?? {}),
        });
      },
      listConversations() {
        return request<AiConversationListResponse>('/ai/conversations');
      },
      getMessages(conversationId: string) {
        return request<AiMessagesResponse>(`/ai/conversations/${conversationId}/messages`);
      },
      removeLastAssistantMessage(conversationId: string) {
        return request<{ removed: boolean; messageId?: string }>(
          `/ai/conversations/${conversationId}/messages/last-assistant`,
          { method: 'DELETE' },
        );
      },
      async *chatStream(
        conversationId: string,
        content: string,
        options?: { signal?: AbortSignal; retry?: boolean },
      ): AsyncGenerator<AiChatEvent> {
        const accessToken = tokenStorage.getAccess();
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (accessToken) {
          headers.Authorization = `Bearer ${accessToken}`;
        }

        const response = await fetch(`${baseUrl}/ai/conversations/${conversationId}/chat`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ content, retry: options?.retry }),
          signal: options?.signal,
        });

        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as ApiResponse<unknown> | null;
          if (body && !body.ok) {
            throw new ApiError(body.error, body.code, response.status);
          }
          throw new ApiError('AI 对话失败', 'INTERNAL_ERROR', response.status);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new ApiError('无法读取流式响应', 'INTERNAL_ERROR', 500);
        }

        const decoder = new TextDecoder();
        let buffer = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith('data:')) continue;
              const data = trimmed.slice(5).trim();
              if (!data) continue;

              try {
                const event = JSON.parse(data) as AiChatEvent;
                yield event;
              } catch {
                // 忽略无法解析的行
              }
            }
          }
        } finally {
          reader.releaseLock();
        }
      },
    },
  };
}

export const api = createApiClient({ baseUrl: '/api' });
