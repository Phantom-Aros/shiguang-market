import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '@shiguang/api-client';
import type { AiConversation, AiMessage } from '@shiguang/shared';
import { AnalyticsEvents, track } from '@shiguang/shared/analytics';
import { Button, Empty, Icon, Loading } from '@shiguang/ui';
import { useAuth } from '../contexts/AuthContext';
import styles from './AiChatDrawer.module.css';

interface AiChatDrawerProps {
  open: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
}

type ChatStatus = 'idle' | 'streaming' | 'error';

const MESSAGE_SYNC_MAX_ATTEMPTS = 30;
const MESSAGE_SYNC_INTERVAL_MS = 200;

async function syncMessagesFromServer(
  conversationId: string,
  options?: { waitForAssistant?: boolean; maxAttempts?: number },
) {
  const waitForAssistant = options?.waitForAssistant ?? false;
  const maxAttempts = options?.maxAttempts ?? MESSAGE_SYNC_MAX_ATTEMPTS;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const { items } = await api.ai.getMessages(conversationId);
    const lastItem = items[items.length - 1];
    if (!waitForAssistant || lastItem?.role === 'assistant') {
      return items;
    }
    await new Promise((resolve) => setTimeout(resolve, MESSAGE_SYNC_INTERVAL_MS));
  }

  const { items } = await api.ai.getMessages(conversationId);
  return items;
}

function withLocalStoppedAssistant(
  items: AiMessage[],
  conversationId: string,
  assistantText: string,
): AiMessage[] {
  const lastItem = items[items.length - 1];
  if (!assistantText || lastItem?.role === 'assistant') {
    return items;
  }

  const plain = assistantText.replace(/…$/, '');
  return [
    ...items,
    {
      messageId: `pending-sync-${Date.now()}`,
      conversationId,
      role: 'assistant',
      content: `${plain}…`,
      createdAt: new Date().toISOString(),
    },
  ];
}

/** 用户手动停止后，仅当服务器内容与停止时一致才采纳（避免完整回复覆盖截断内容） */
function isAcceptedStoppedServerContent(serverContent: string, localText: string) {
  const plain = localText.replace(/…$/, '');
  return serverContent === `${plain}…`;
}

function resolveStoppedSyncResult(
  items: AiMessage[],
  conversationId: string,
  assistantText: string,
): AiMessage[] {
  const last = items[items.length - 1];
  if (!assistantText) return items;

  if (last?.role === 'user') {
    return withLocalStoppedAssistant(items, conversationId, assistantText);
  }

  if (last?.role === 'assistant' && isAcceptedStoppedServerContent(last.content, assistantText)) {
    return items;
  }

  if (last?.role === 'assistant') {
    return withLocalStoppedAssistant(items.slice(0, -1), conversationId, assistantText);
  }

  return items;
}

export function AiChatDrawer({ open, onClose, productId, productName }: AiChatDrawerProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<ChatStatus>('idle');
  const [streamingContent, setStreamingContent] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const abortRef = useRef<AbortController | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const chatStartRef = useRef<number | null>(null);
  // 停止时用于即时构造截断消息
  const assistantTextRef = useRef('');
  const streamingConversationRef = useRef<string | null>(null);
  const stoppingRef = useRef(false);

  const conversationsQuery = useQuery({
    queryKey: ['ai', 'conversations'],
    queryFn: () => api.ai.listConversations(),
    enabled: open && isAuthenticated,
  });

  const createConversationMutation = useMutation({
    mutationFn: () => api.ai.createConversation({ productId }),
    onSuccess: (conversation) => {
      setConversationId(conversation.conversationId);
      setMessages([]);
      queryClient.invalidateQueries({ queryKey: ['ai', 'conversations'] });
    },
  });

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent, scrollToBottom]);

  useEffect(() => {
    if (!open) {
      abortRef.current?.abort();
      setStatus('idle');
      setStreamingContent('');
      setErrorMessage('');
    }
  }, [open]);

  async function loadConversation(id: string) {
    abortRef.current?.abort();
    setConversationId(id);
    setStatus('idle');
    setStreamingContent('');
    setErrorMessage('');
    const data = await api.ai.getMessages(id);
    setMessages(data.items);
  }

  async function ensureConversation() {
    if (conversationId) return conversationId;
    const conversation = await createConversationMutation.mutateAsync();
    return conversation.conversationId;
  }

  async function sendMessage(
    content: string,
    options?: { retry?: boolean; skipOptimisticUser?: boolean },
  ) {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/products/${productId}` } });
      return;
    }

    const trimmed = content.trim();
    if (!trimmed || status === 'streaming') return;

    const isRetry = options?.retry === true;
    const skipOptimisticUser = options?.skipOptimisticUser === true || isRetry;

    setErrorMessage('');
    setInput('');
    setStatus('streaming');
    setStreamingContent('');

    const id = await ensureConversation();

    let optimisticUserMessageId: string | null = null;
    if (!skipOptimisticUser) {
      const userMessage: AiMessage = {
        messageId: `temp-${Date.now()}`,
        conversationId: id,
        role: 'user',
        content: trimmed,
        createdAt: new Date().toISOString(),
      };
      optimisticUserMessageId = userMessage.messageId;
      setMessages((prev) => [...prev, userMessage]);
    }

    chatStartRef.current = Date.now();
    track(AnalyticsEvents.AI_CHAT_START, {
      conversationId: id,
      productId,
      source: 'product_detail',
      retry: isRetry,
    });

    const controller = new AbortController();
    abortRef.current = controller;
    let assistantText = '';
    let serverAcked = false;
    // 是否已收到后端落库确认（done / stopped 事件在 insertMessage 之后发出）
    let receivedPersistAck = false;
    let shouldSyncFromServer = false;
    let hasError = false;
    let wasUserStopped = false;

    stoppingRef.current = false;
    assistantTextRef.current = '';
    streamingConversationRef.current = id;

    try {
      for await (const event of api.ai.chatStream(id, trimmed, {
        signal: controller.signal,
        retry: isRetry,
      })) {
        if (event.type === 'thinking') {
          serverAcked = true;
        } else if (event.type === 'token') {
          if (stoppingRef.current) continue;
          assistantText += event.data;
          assistantTextRef.current = assistantText;
          setStreamingContent(assistantText);
        } else if (event.type === 'error') {
          throw new Error(event.data);
        } else if (event.type === 'done' || event.type === 'stopped') {
          receivedPersistAck = true;
          if (event.type === 'stopped') {
            wasUserStopped = true;
          }
          break;
        }
      }

      shouldSyncFromServer = true;

      track(AnalyticsEvents.AI_CHAT_COMPLETE, {
        conversationId: id,
        productId,
        source: 'product_detail',
        durationMs: chatStartRef.current ? Date.now() - chatStartRef.current : 0,
      });
    } catch (err) {
      if (controller.signal.aborted) {
        wasUserStopped = true;
        shouldSyncFromServer = true;
        track(AnalyticsEvents.AI_CHAT_COMPLETE, {
          conversationId: id,
          productId,
          source: 'product_detail',
          stopped: true,
          durationMs: chatStartRef.current ? Date.now() - chatStartRef.current : 0,
        });
      } else {
        hasError = true;
        setErrorMessage(err instanceof Error ? err.message : '发送失败，请重试');

        if (!serverAcked && optimisticUserMessageId) {
          // 请求未到达服务器：撤销乐观添加的 user 消息
          setMessages((prev) => prev.filter((m) => m.messageId !== optimisticUserMessageId));
        } else if (serverAcked) {
          // 服务器已存 user，仅生成失败：以服务器数据为准
          shouldSyncFromServer = true;
        }
      }
    } finally {
      if (shouldSyncFromServer) {
        const hadLocalAssistant = Boolean(assistantText);
        try {
          let items = receivedPersistAck
            ? (await api.ai.getMessages(id)).items
            : await syncMessagesFromServer(id, { waitForAssistant: hadLocalAssistant });

          if (wasUserStopped && hadLocalAssistant) {
            items = resolveStoppedSyncResult(items, id, assistantText);
          } else {
            const needsFallback = hadLocalAssistant && items[items.length - 1]?.role === 'user';
            if (needsFallback) {
              items = withLocalStoppedAssistant(items, id, assistantText);
            }
          }
          setMessages(items);

          // 用户停止后：仅当服务器落库的截断内容与本地一致时，才用真实 messageId 替换
          if (wasUserStopped && hadLocalAssistant) {
            void syncMessagesFromServer(id, { waitForAssistant: true })
              .then((synced) => {
                const last = synced[synced.length - 1];
                if (
                  last?.role === 'assistant' &&
                  isAcceptedStoppedServerContent(last.content, assistantText)
                ) {
                  setMessages(synced);
                }
              })
              .catch(() => {});
          }
        } catch {
          if (assistantText) {
            setMessages((prev) => withLocalStoppedAssistant(prev, id, assistantText));
          }
        }
      }
      setStreamingContent('');
      setStatus(hasError ? 'error' : 'idle');
      abortRef.current = null;
      queryClient.invalidateQueries({ queryKey: ['ai', 'conversations'] });
    }
  }

  function handleStop() {
    if (stoppingRef.current) return;
    stoppingRef.current = true;

    const id = streamingConversationRef.current;
    const partial = assistantTextRef.current;

    // 1) 立即在本地把已生成内容定格为截断消息（带省略号），无需等待服务器
    if (id && partial) {
      setMessages((prev) => withLocalStoppedAssistant(prev, id, partial));
    }
    setStreamingContent('');

    // 2) 显式通知后端停止生成并落库截断内容（不依赖 SSE 连接关闭）
    if (id) {
      void api.ai
        .stopChat(id)
        .catch(() => {})
        .finally(() => {
          // 3) 断开 SSE，让 sendMessage 的 finally 走停止后的同步/校准流程
          abortRef.current?.abort();
        });
    } else {
      abortRef.current?.abort();
    }
  }

  async function handleRetry() {
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    if (!lastUser || !conversationId) return;

    setMessages((prev) => {
      const lastAssistantIdx = [...prev].reverse().findIndex((m) => m.role === 'assistant');
      if (lastAssistantIdx === -1) return prev;
      const idx = prev.length - 1 - lastAssistantIdx;
      return prev.filter((_, i) => i !== idx);
    });
    setErrorMessage('');

    try {
      await api.ai.removeLastAssistantMessage(conversationId);

      const { items } = await api.ai.getMessages(conversationId);
      const lastServer = items[items.length - 1];
      const serverHasUser =
        lastServer?.role === 'user' && lastServer.content === lastUser.content;

      if (serverHasUser) {
        await sendMessage(lastUser.content, { retry: true });
      } else {
        await sendMessage(lastUser.content, { skipOptimisticUser: true });
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : '重试失败，请稍后再试');
      setStatus('error');
    }
  }

  function handleNewChat() {
    abortRef.current?.abort();
    setConversationId(null);
    setMessages([]);
    setInput('');
    setStatus('idle');
    setStreamingContent('');
    setErrorMessage('');
  }

  function handleSelectConversation(conversation: AiConversation) {
    loadConversation(conversation.conversationId);
  }

  if (!open) return null;

  const conversations = conversationsQuery.data?.items ?? [];
  const productConversations = conversations.filter((c) => c.productId === productId);

  return (
    <div className={styles.overlay} onClick={onClose} role="presentation">
      <aside
        className={styles.drawer}
        role="dialog"
        aria-modal="true"
        aria-label="AI 导购"
        onClick={(e) => e.stopPropagation()}
      >
        <header className={styles.header}>
          <div>
            <h2 className={styles.title}>问 AI</h2>
            <p className={styles.subtitle}>{productName}</p>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="关闭">
            <Icon name="close" size={20} />
          </button>
        </header>

        <div className={styles.body}>
          <nav className={styles.sidebar}>
            <button type="button" className={styles.newChatBtn} onClick={handleNewChat}>
              + 新对话
            </button>
            {conversationsQuery.isLoading ? (
              <Loading tip="加载中…" />
            ) : productConversations.length === 0 ? (
              <p className={styles.sidebarEmpty}>暂无历史会话</p>
            ) : (
              <ul className={styles.conversationList}>
                {productConversations.map((c) => (
                  <li key={c.conversationId}>
                    <button
                      type="button"
                      className={
                        c.conversationId === conversationId
                          ? styles.conversationItemActive
                          : styles.conversationItem
                      }
                      onClick={() => handleSelectConversation(c)}
                    >
                      {c.title}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </nav>

          <div className={styles.chat}>
            <div className={styles.messageList} ref={listRef}>
              {messages.length === 0 && !streamingContent && status !== 'streaming' && (
                <Empty
                  title="有什么想了解的？"
                  description={`可以问我关于「${productName}」的价格、特点、适用场景等问题`}
                />
              )}

              {messages.map((msg) => (
                <div
                  key={msg.messageId}
                  className={msg.role === 'user' ? styles.messageUser : styles.messageAssistant}
                >
                  <p className={styles.messageContent}>{msg.content}</p>
                </div>
              ))}

              {status === 'streaming' && !streamingContent && (
                <div className={styles.messageAssistant}>
                  <p className={styles.thinking}>
                    <span className={styles.thinkingDots} aria-hidden>
                      <span />
                      <span />
                      <span />
                    </span>
                    思考中
                  </p>
                </div>
              )}

              {streamingContent && (
                <div className={styles.messageAssistant}>
                  <p className={styles.messageContent}>
                    {streamingContent}
                    <span className={styles.cursor}>|</span>
                  </p>
                </div>
              )}

              {errorMessage && (
                <div className={styles.errorBar}>
                  <span>{errorMessage}</span>
                  <Button variant="ghost" size="sm" onClick={handleRetry}>
                    重试
                  </Button>
                </div>
              )}
            </div>

            <form
              className={styles.inputBar}
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage(input);
              }}
            >
              <input
                type="text"
                className={styles.input}
                placeholder="输入你的问题…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={status === 'streaming'}
              />
              {status === 'streaming' ? (
                <Button type="button" variant="secondary" size="sm" onClick={handleStop}>
                  停止
                </Button>
              ) : (
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={!input.trim() || createConversationMutation.isPending}
                >
                  发送
                </Button>
              )}
            </form>
          </div>
        </div>
      </aside>
    </div>
  );
}
