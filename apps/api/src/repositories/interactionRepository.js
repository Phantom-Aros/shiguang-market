import { ulid } from 'ulid';
import { query } from '../db/postgres.js';

/**
 * @param {string} userId
 * @param {string} postId
 */
export async function likePost(userId, postId) {
  const likeId = ulid();
  const result = await query(
    `
    INSERT INTO likes (like_id, user_id, post_id)
    VALUES ($1, $2, $3)
    ON CONFLICT (user_id, post_id) DO NOTHING
    RETURNING like_id
    `,
    [likeId, userId, postId],
  );

  if (result.rowCount > 0) {
    await query(
      `UPDATE posts SET like_count = like_count + 1, updated_at = NOW() WHERE post_id = $1`,
      [postId],
    );
    return { created: true };
  }

  return { created: false };
}

/**
 * @param {string} userId
 * @param {string} postId
 */
export async function unlikePost(userId, postId) {
  const result = await query(
    `DELETE FROM likes WHERE user_id = $1 AND post_id = $2 RETURNING like_id`,
    [userId, postId],
  );

  if (result.rowCount > 0) {
    await query(
      `
      UPDATE posts
      SET like_count = GREATEST(like_count - 1, 0), updated_at = NOW()
      WHERE post_id = $1
      `,
      [postId],
    );
    return { removed: true };
  }

  return { removed: false };
}

/**
 * @param {string} userId
 * @param {string} postId
 */
export async function favoritePost(userId, postId) {
  const favoriteId = ulid();
  const result = await query(
    `
    INSERT INTO favorites (favorite_id, user_id, post_id)
    VALUES ($1, $2, $3)
    ON CONFLICT (user_id, post_id) DO NOTHING
    RETURNING favorite_id
    `,
    [favoriteId, userId, postId],
  );

  if (result.rowCount > 0) {
    await query(
      `UPDATE posts SET favorite_count = favorite_count + 1, updated_at = NOW() WHERE post_id = $1`,
      [postId],
    );
    return { created: true };
  }

  return { created: false };
}

/**
 * @param {string} userId
 * @param {string} postId
 */
export async function unfavoritePost(userId, postId) {
  const result = await query(
    `DELETE FROM favorites WHERE user_id = $1 AND post_id = $2 RETURNING favorite_id`,
    [userId, postId],
  );

  if (result.rowCount > 0) {
    await query(
      `
      UPDATE posts
      SET favorite_count = GREATEST(favorite_count - 1, 0), updated_at = NOW()
      WHERE post_id = $1
      `,
      [postId],
    );
    return { removed: true };
  }

  return { removed: false };
}

/**
 * @param {string} postId
 */
export async function getCounts(postId) {
  const result = await query(
    `SELECT like_count, favorite_count FROM posts WHERE post_id = $1`,
    [postId],
  );
  return result.rows[0] ?? null;
}
