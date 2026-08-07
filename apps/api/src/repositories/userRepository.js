import { ulid } from 'ulid';
import { query } from '../db/postgres.js';

/**
 * @param {string} phone
 */
export async function findByPhone(phone) {
  const result = await query(
    `SELECT user_id, phone, nickname, avatar_url, created_at, updated_at
     FROM users WHERE phone = $1`,
    [phone],
  );
  return result.rows[0] ?? null;
}

/**
 * @param {string} userId
 */
export async function findById(userId) {
  const result = await query(
    `SELECT user_id, phone, nickname, avatar_url, created_at, updated_at
     FROM users WHERE user_id = $1`,
    [userId],
  );
  return result.rows[0] ?? null;
}

/**
 * @param {string} phone
 */
export async function createByPhone(phone) {
  const userId = ulid();
  const nickname = `用户${phone.slice(-4)}`;
  const result = await query(
    `INSERT INTO users (user_id, phone, nickname)
     VALUES ($1, $2, $3)
     RETURNING user_id, phone, nickname, avatar_url, created_at, updated_at`,
    [userId, phone, nickname],
  );
  return result.rows[0];
}
