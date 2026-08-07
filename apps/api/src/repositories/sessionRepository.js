import { query } from '../db/postgres.js';

/**
 * @param {string} sessionId
 * @param {string} userId
 * @param {string} refreshTokenHash
 * @param {Date} expiresAt
 */
export async function createSession(sessionId, userId, refreshTokenHash, expiresAt) {
  await query(
    `INSERT INTO user_sessions (session_id, user_id, refresh_token_hash, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [sessionId, userId, refreshTokenHash, expiresAt],
  );
  return sessionId;
}

/**
 * @param {string} sessionId
 * @param {string} refreshTokenHash
 */
export async function findActiveSession(sessionId, refreshTokenHash) {
  const result = await query(
    `SELECT session_id, user_id, expires_at
     FROM user_sessions
     WHERE session_id = $1
       AND refresh_token_hash = $2
       AND revoked_at IS NULL
       AND expires_at > NOW()`,
    [sessionId, refreshTokenHash],
  );
  return result.rows[0] ?? null;
}

/**
 * @param {string} sessionId
 */
export async function revokeSession(sessionId) {
  await query(
    `UPDATE user_sessions SET revoked_at = NOW() WHERE session_id = $1 AND revoked_at IS NULL`,
    [sessionId],
  );
}

/**
 * @param {string} sessionId
 * @param {string} newHash
 * @param {Date} expiresAt
 */
export async function rotateSession(sessionId, newHash, expiresAt) {
  await query(
    `UPDATE user_sessions
     SET refresh_token_hash = $2, expires_at = $3
     WHERE session_id = $1 AND revoked_at IS NULL`,
    [sessionId, newHash, expiresAt],
  );
}
