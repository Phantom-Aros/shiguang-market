import type { AiMessage } from './types.js';

export const MESSAGE_SYNC_MAX_ATTEMPTS = 30;
export const MESSAGE_SYNC_INTERVAL_MS = 200;

export type GetMessagesFn = (
  conversationId: string,
) => Promise<{ items: AiMessage[] }>;

export async function syncMessagesFromServer(
  getMessages: GetMessagesFn,
  conversationId: string,
  options?: { waitForAssistant?: boolean; maxAttempts?: number },
) {
  const waitForAssistant = options?.waitForAssistant ?? false;
  const maxAttempts = options?.maxAttempts ?? MESSAGE_SYNC_MAX_ATTEMPTS;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const { items } = await getMessages(conversationId);
    const lastItem = items[items.length - 1];
    if (!waitForAssistant || lastItem?.role === 'assistant') {
      return items;
    }
    await new Promise((resolve) => setTimeout(resolve, MESSAGE_SYNC_INTERVAL_MS));
  }

  const { items } = await getMessages(conversationId);
  return items;
}

export function withLocalStoppedAssistant(
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
export function isAcceptedStoppedServerContent(serverContent: string, localText: string) {
  const plain = localText.replace(/…$/, '');
  return serverContent === `${plain}…`;
}

export function resolveStoppedSyncResult(
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
