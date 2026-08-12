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
    let shouldSyncFromServer = false;
    let hasError = false;

    try {
      for await (const event of api.ai.chatStream(id, trimmed, {
        signal: controller.signal,
        retry: isRetry,
      })) {
        if (event.type === 'thinking') {
          serverAcked = true;
        } else if (event.type === 'token') {
          assistantText += event.data;
          setStreamingContent(assistantText);
        } else if (event.type === 'error') {
          throw new Error(event.data);
        } else if (event.type === 'done') {
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
        try {
          const { items } = await api.ai.getMessages(id);
          setMessages(items);
        } catch {
          // 校准失败时保留当前本地状态，避免覆盖已有内容
        }
      }
      setStreamingContent('');
      setStatus(hasError ? 'error' : 'idle');
      abortRef.current = null;
      queryClient.invalidateQueries({ queryKey: ['ai', 'conversations'] });
    }
  }

  function handleStop() {
    abortRef.current?.abort();
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
