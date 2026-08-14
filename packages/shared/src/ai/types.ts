/** AI 消息角色 */
export type AiMessageRole = 'user' | 'assistant' | 'system';

/** AI 会话 */
export interface AiConversation {
  conversationId: string;
  productId: string | null;
  title: string;
  createdAt: string;
  updatedAt: string;
}

/** AI 消息 */
export interface AiMessage {
  messageId: string;
  conversationId: string;
  role: AiMessageRole;
  content: string;
  createdAt: string;
}

/** 创建 AI 会话请求 */
export interface CreateAiConversationInput {
  productId?: string;
}

/** 发送 AI 消息请求 */
export interface AiChatInput {
  content: string;
  /** 重试模式：不重复写入 user 消息，仅重新生成 assistant 回复 */
  retry?: boolean;
}

/** AI 会话列表响应 */
export interface AiConversationListResponse {
  items: AiConversation[];
}

/** AI 消息列表响应 */
export interface AiMessagesResponse {
  conversationId: string;
  items: AiMessage[];
}

/** SSE 落库完成事件载荷 */
export interface AiChatPersistEvent {
  messageId: string;
  conversationId: string;
}

/** SSE 流式事件 */
export type AiChatEvent =
  | { type: 'thinking' }
  | { type: 'token'; data: string }
  | { type: 'done'; data?: AiChatPersistEvent }
  | { type: 'stopped'; data: AiChatPersistEvent }
  | { type: 'error'; data: string };
