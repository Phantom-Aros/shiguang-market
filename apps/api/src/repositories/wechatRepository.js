import { ulid } from 'ulid';
import { query } from '../db/postgres.js';

/**
 * @param {string} openid
 */
export async function findByOpenid(openid) {
  const result = await query(
    `SELECT wb.binding_id, wb.user_id, wb.openid, wb.union_id,
            u.phone, u.nickname, u.avatar_url, u.created_at, u.updated_at
     FROM wechat_bindings wb
     JOIN users u ON u.user_id = wb.user_id
     WHERE wb.openid = $1`,
    [openid],
  );
  return result.rows[0] ?? null;
}

/**
 * @param {string} userId
 * @param {string} openid
 * @param {string | null} [unionId]
 */
export async function createBinding(userId, openid, unionId = null) {
  const bindingId = ulid();
  await query(
    `INSERT INTO wechat_bindings (binding_id, user_id, openid, union_id)
     VALUES ($1, $2, $3, $4)`,
    [bindingId, userId, openid, unionId],
  );
}
