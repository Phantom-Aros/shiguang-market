import { AppError } from '../middleware/errorHandler.js';
import { buildGeneralSystemPrompt, buildProductSystemPrompt } from '../config/aiPrompts.js';
import * as aiRepository from '../repositories/aiRepository.js';
import * as productRepository from '../repositories/productRepository.js';
import * as llmService from './llmService.js';

/**
 * 正在进行中的生成任务：conversationId -> AbortController
 * 用于「显式停止」——不依赖 SSE 连接关闭（经过 dev 代理时连接关闭可能延迟）。
 * @type {Map<string, AbortController>}
 */
const activeGenerations = new Map();

/**
 * @param {string} userId
 * @param {{ productId?: string }} [input]
 */
export async function createConversation(userId, input = {}) {
  let title = '新对话';
  let productId = input.productId ?? null;

  if (productId) {
    const product = await productRepository.findById(productId);
    if (!product || product.status !== 'active') {
      throw new AppError('商品不存在', 'NOT_FOUND', 404);
    }
    title = `关于「${product.name}」的咨询`;
  }

  return aiRepository.createConversation(userId, { productId, title });
}

/**
 * @param {string} userId
 */
export async function listConversations(userId) {
  const items = await aiRepository.findConversationsByUserId(userId);
  return { items };
}

/**
 * @param {string} userId
 * @param {string} conversationId
 */
export async function getMessages(userId, conversationId) {
  const conversation = await aiRepository.findConversationById(conversationId);
  if (!conversation || conversation.user_id !== userId) {
    throw new AppError('会话不存在', 'NOT_FOUND', 404);
  }

  const items = await aiRepository.findMessagesByConversationId(conversationId);
  return { conversationId, items };
}

/**
 * @param {string} userId
 * @param {string} conversationId
 */
async function assertConversationOwner(userId, conversationId) {
  const conversation = await aiRepository.findConversationById(conversationId);
  if (!conversation || conversation.user_id !== userId) {
    throw new AppError('会话不存在', 'NOT_FOUND', 404);
  }
  return conversation;
}

/**
 * @param {object} conversation
 */
async function buildSystemPrompt(conversation) {
  if (!conversation.product_id) {
    return buildGeneralSystemPrompt();
  }

  const product = await productRepository.findById(conversation.product_id);
  if (!product) {
    return buildGeneralSystemPrompt();
  }

  return buildProductSystemPrompt(productRepository.mapProductRow(product));
}

/**
 * @param {import('express').Response} res
 */
function setupSse(res) {
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();
  res.socket?.setNoDelay?.(true);
}

/**
 * @param {import('express').Response} res
 * @param {{ type: string; data?: string }} event
 */
function writeSseEvent(res, event) {
  res.write(`data: ${JSON.stringify(event)}\n\n`);
  if (typeof res.flush === 'function') {
    res.flush();
  }
}

/**
 * @param {string} userId
 * @param {string} conversationId
 * @param {string} content
 * @param {import('express').Response} res
 * @param {AbortSignal} [signal]
 * @param {{ retry?: boolean }} [options]
 */
export async function streamChat(userId, conversationId, content, res, signal, options = {}) {
  const conversation = await assertConversationOwner(userId, conversationId);
  const trimmed = content.trim();
  const isRetry = options.retry === true;

  if (!trimmed) {
    throw new AppError('消息不能为空', 'VALIDATION_ERROR', 400);
  }

  // 尽早建立 SSE 连接并通知前端，避免等待 DB + LLM 首 token 期间无反馈
  setupSse(res);
  writeSseEvent(res, { type: 'thinking' });

  if (isRetry) {
    const existing = await aiRepository.findMessagesByConversationId(conversationId);
    const lastMessage = existing[existing.length - 1];
    if (!lastMessage || lastMessage.role !== 'user' || lastMessage.content !== trimmed) {
      throw new AppError('无法重试该消息', 'VALIDATION_ERROR', 400);
    }
  } else {
    await aiRepository.insertMessage({ conversationId, role: 'user', content: trimmed });
  }

  const history = await aiRepository.findMessagesByConversationId(conversationId);
  const messages = history.map((m) => ({ role: m.role, content: m.content }));
  const systemPrompt = await buildSystemPrompt(conversation);

  // 本地控制器：既响应客户端断连（signal），也响应显式停止接口
  const localController = new AbortController();
  const onExternalAbort = () => localController.abort();
  if (signal) {
    if (signal.aborted) localController.abort();
    else signal.addEventListener('abort', onExternalAbort, { once: true });
  }
  activeGenerations.set(conversationId, localController);
  const localSignal = localController.signal;

  let fullContent = '';

  try {
    try {
      for await (const token of llmService.streamChat({ systemPrompt, messages, signal: localSignal })) {
        if (localSignal.aborted) break;
        fullContent += token;
        writeSseEvent(res, { type: 'token', data: token });
      }
    } catch (streamErr) {
      if (!localSignal.aborted) {
        throw streamErr;
      }
    }

    const saved = await saveAssistantMessage(conversationId, fullContent, localSignal.aborted);

    if (localSignal.aborted) {
      if (saved) {
        writeSseEvent(res, {
          type: 'stopped',
          data: { messageId: saved.messageId, conversationId },
        });
      }
    } else if (saved) {
      writeSseEvent(res, {
        type: 'done',
        data: { messageId: saved.messageId, conversationId },
      });
    } else {
      writeSseEvent(res, { type: 'done' });
    }
  } catch (err) {
    writeSseEvent(res, {
      type: 'error',
      data: err instanceof Error ? err.message : '生成失败',
    });
  } finally {
    signal?.removeEventListener?.('abort', onExternalAbort);
    if (activeGenerations.get(conversationId) === localController) {
      activeGenerations.delete(conversationId);
    }
    res.end();
  }
}

/**
 * 显式停止指定会话正在进行的生成（不依赖 SSE 连接关闭）
 * @param {string} userId
 * @param {string} conversationId
 */
export async function stopGeneration(userId, conversationId) {
  await assertConversationOwner(userId, conversationId);
  const controller = activeGenerations.get(conversationId);
  if (controller) {
    controller.abort();
    return { stopped: true };
  }
  return { stopped: false };
}

/**
 * @param {string} conversationId
 * @param {string} fullContent
 * @param {boolean} aborted
 */
async function saveAssistantMessage(conversationId, fullContent, aborted) {
  if (!fullContent) return null;

  const content = aborted ? `${fullContent}…` : fullContent;
  const saved = await aiRepository.insertMessage({
    conversationId,
    role: 'assistant',
    content,
  });
  await aiRepository.touchConversation(conversationId);
  return saved;
}

/**
 * 删除最后一条 assistant 消息（用于重试）
 * @param {string} userId
 * @param {string} conversationId
 */
export async function removeLastAssistantMessage(userId, conversationId) {
  await assertConversationOwner(userId, conversationId);
  const messages = await aiRepository.findMessagesByConversationId(conversationId);
  const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
  if (lastAssistant) {
    await aiRepository.deleteMessage(lastAssistant.messageId);
    return { removed: true, messageId: lastAssistant.messageId };
  }
  return { removed: false };
}
