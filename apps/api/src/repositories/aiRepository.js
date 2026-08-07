import { ulid } from 'ulid';
import { query } from '../db/postgres.js';

/**
 * @param {object} row
 */
export function mapConversationRow(row) {
  return {
    conversationId: row.conversation_id,
    productId: row.product_id,
    title: row.title,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

/**
 * @param {object} row
 */
export function mapMessageRow(row) {
  return {
    messageId: row.message_id,
    conversationId: row.conversation_id,
    role: row.role,
    content: row.content,
    createdAt: row.created_at.toISOString(),
  };
}

/**
 * @param {string} userId
 * @param {{ productId?: string | null; title: string }} input
 */
export async function createConversation(userId, { productId = null, title }) {
  const conversationId = ulid();
  const result = await query(
    `INSERT INTO ai_conversations (conversation_id, user_id, product_id, title)
     VALUES ($1, $2, $3, $4)
     RETURNING conversation_id, user_id, product_id, title, created_at, updated_at`,
    [conversationId, userId, productId, title],
  );
  return mapConversationRow(result.rows[0]);
}

/**
 * @param {string} userId
 */
export async function findConversationsByUserId(userId) {
  const result = await query(
    `SELECT conversation_id, user_id, product_id, title, created_at, updated_at
     FROM ai_conversations
     WHERE user_id = $1
     ORDER BY updated_at DESC
     LIMIT 50`,
    [userId],
  );
  return result.rows.map(mapConversationRow);
}

/**
 * @param {string} conversationId
 */
export async function findConversationById(conversationId) {
  const result = await query(
    `SELECT conversation_id, user_id, product_id, title, created_at, updated_at
     FROM ai_conversations
     WHERE conversation_id = $1`,
    [conversationId],
  );
  return result.rows[0] ?? null;
}

/**
 * @param {string} conversationId
 */
export async function touchConversation(conversationId) {
  await query(
    `UPDATE ai_conversations SET updated_at = NOW() WHERE conversation_id = $1`,
    [conversationId],
  );
}

/**
 * @param {string} conversationId
 */
export async function findMessagesByConversationId(conversationId) {
  const result = await query(
    `SELECT message_id, conversation_id, role, content, created_at
     FROM ai_messages
     WHERE conversation_id = $1
     ORDER BY created_at ASC`,
    [conversationId],
  );
  return result.rows.map(mapMessageRow);
}

/**
 * @param {{ conversationId: string; role: string; content: string }} input
 */
export async function insertMessage({ conversationId, role, content }) {
  const messageId = ulid();
  const result = await query(
    `INSERT INTO ai_messages (message_id, conversation_id, role, content)
     VALUES ($1, $2, $3, $4)
     RETURNING message_id, conversation_id, role, content, created_at`,
    [messageId, conversationId, role, content],
  );
  return mapMessageRow(result.rows[0]);
}

/**
 * @param {string} messageId
 */
export async function deleteMessage(messageId) {
  await query(`DELETE FROM ai_messages WHERE message_id = $1`, [messageId]);
}
