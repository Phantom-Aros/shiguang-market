import { useCallback, useEffect, useRef, useState } from 'react';
import type { AbortControllerLike, AiConversation, AiMessage } from '@shiguang/shared';
import {
  createAbortController,
  isAcceptedStoppedServerContent,
  resolveStoppedSyncResult,
  syncMessagesFromServer,
  withLocalStoppedAssistant,
} from '@shiguang/shared';
import { api } from '../lib/api';

export type AiChatStatus = 'idle' | 'streaming' | 'error';

interface UseAiProductChatOptions {
  productId: string;
  isLoggedIn: boolean;
  onRequireLogin?: () => void;
}

export function useAiProductChat({
  productId,
  isLoggedIn,
  onRequireLogin,
}: UseAiProductChatOptions) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<AiConversation[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(false);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<AiChatStatus>('idle');
  const [streamingContent, setStreamingContent] = useState('');
  const [toolStatus, setToolStatus] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [creatingConversation, setCreatingConversation] = useState(false);

  const abortRef = useRef<AbortControllerLike | null>(null);
  const assistantTextRef = useRef('');
  const streamingConversationRef = useRef<string | null>(null);
  const stoppingRef = useRef(false);

  const getMessages = useCallback(
    (id: string) => api.ai.getMessages(id),
    [],
  );

  const refreshConversations = useCallback(async () => {
    if (!isLoggedIn) {
      setConversations([]);
      return;
    }
    setConversationsLoading(true);
    try {
      const data = await api.ai.listConversations();
      setConversations(data.items.filter((item) => item.productId === productId));
    } catch {
      setConversations([]);
    } finally {
      setConversationsLoading(false);
    }
  }, [isLoggedIn, productId]);

  useEffect(() => {
    void refreshConversations();
  }, [refreshConversations]);

  const ensureConversation = useCallback(async () => {
    if (conversationId) return conversationId;
    setCreatingConversation(true);
    try {
      const conversation = await api.ai.createConversation({ productId });
      setConversationId(conversation.conversationId);
      await refreshConversations();
      return conversation.conversationId;
    } finally {
      setCreatingConversation(false);
    }
  }, [conversationId, productId, refreshConversations]);

  const loadConversation = useCallback(async (id: string) => {
    abortRef.current?.abort();
    setConversationId(id);
    setStatus('idle');
    setStreamingContent('');
    setToolStatus(null);
    setErrorMessage('');
    const data = await api.ai.getMessages(id);
    setMessages(data.items);
  }, []);

  const sendMessage = useCallback(
    async (
      content: string,
      options?: { retry?: boolean; skipOptimisticUser?: boolean },
    ) => {
      if (!isLoggedIn) {
        onRequireLogin?.();
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
      setToolStatus(null);

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

      const controller = createAbortController();
      abortRef.current = controller;
      let assistantText = '';
      let serverAcked = false;
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
          } else if (event.type === 'tool_call') {
            setToolStatus(
              event.data.status === 'running'
                ? `正在查询 ${event.data.name}…`
                : null,
            );
          } else if (event.type === 'token') {
            if (stoppingRef.current) continue;
            assistantText += event.data;
            assistantTextRef.current = assistantText;
            setStreamingContent(assistantText);
            setToolStatus(null);
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
      } catch (err) {
        if (controller.signal.aborted) {
          wasUserStopped = true;
          shouldSyncFromServer = true;
        } else {
          hasError = true;
          setErrorMessage(err instanceof Error ? err.message : '发送失败，请重试');

          if (!serverAcked && optimisticUserMessageId) {
            setMessages((prev) => prev.filter((m) => m.messageId !== optimisticUserMessageId));
          } else if (serverAcked) {
            shouldSyncFromServer = true;
          }
        }
      } finally {
        if (shouldSyncFromServer) {
          const hadLocalAssistant = Boolean(assistantText);
          try {
            let items = receivedPersistAck
              ? (await getMessages(id)).items
              : await syncMessagesFromServer(getMessages, id, {
                  waitForAssistant: hadLocalAssistant,
                });

            if (wasUserStopped && hadLocalAssistant) {
              items = resolveStoppedSyncResult(items, id, assistantText);
            } else {
              const needsFallback = hadLocalAssistant && items[items.length - 1]?.role === 'user';
              if (needsFallback) {
                items = withLocalStoppedAssistant(items, id, assistantText);
              }
            }
            setMessages(items);

            if (wasUserStopped && hadLocalAssistant) {
              void syncMessagesFromServer(getMessages, id, { waitForAssistant: true })
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
        setToolStatus(null);
        setStatus(hasError ? 'error' : 'idle');
        abortRef.current = null;
        void refreshConversations();
      }
    },
    [ensureConversation, getMessages, isLoggedIn, onRequireLogin, refreshConversations, status],
  );

  const handleStop = useCallback(() => {
    if (stoppingRef.current) return;
    stoppingRef.current = true;

    const id = streamingConversationRef.current;
    const partial = assistantTextRef.current;

    if (id && partial) {
      setMessages((prev) => withLocalStoppedAssistant(prev, id, partial));
    }
    setStreamingContent('');
    setToolStatus(null);

    if (id) {
      void api.ai
        .stopChat(id)
        .catch(() => {})
        .finally(() => {
          abortRef.current?.abort();
        });
    } else {
      abortRef.current?.abort();
    }
  }, []);

  const handleRetry = useCallback(async () => {
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
  }, [conversationId, messages, sendMessage]);

  const handleNewChat = useCallback(() => {
    abortRef.current?.abort();
    setConversationId(null);
    setMessages([]);
    setInput('');
    setStatus('idle');
    setStreamingContent('');
    setToolStatus(null);
    setErrorMessage('');
  }, []);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  return {
    conversationId,
    conversations,
    conversationsLoading,
    messages,
    input,
    setInput,
    status,
    streamingContent,
    toolStatus,
    errorMessage,
    creatingConversation,
    sendMessage,
    handleStop,
    handleRetry,
    handleNewChat,
    loadConversation,
    refreshConversations,
  };
}
