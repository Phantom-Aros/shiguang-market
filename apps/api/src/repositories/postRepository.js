import { query } from '../db/postgres.js';

/**
 * @param {string | undefined} userId
 */
function interactionSelect(userId) {
  if (!userId) {
    return {
      select: `FALSE AS is_liked, FALSE AS is_favorited`,
      params: [],
    };
  }

  return {
    select: `
      EXISTS (
        SELECT 1 FROM likes l
        WHERE l.post_id = p.post_id AND l.user_id = $USER
      ) AS is_liked,
      EXISTS (
        SELECT 1 FROM favorites f
        WHERE f.post_id = p.post_id AND f.user_id = $USER
      ) AS is_favorited
    `,
    params: [userId],
  };
}

/**
 * @param {object} row
 */
export function mapFeedRow(row) {
  return {
    postId: row.post_id,
    title: row.title,
    coverUrl: row.cover_url,
    coverWidth: row.cover_width,
    coverHeight: row.cover_height,
    likeCount: row.like_count,
    favoriteCount: row.favorite_count,
    minPrice: row.min_price ?? null,
    author: {
      userId: row.author_id,
      nickname: row.author_nickname,
      avatarUrl: row.author_avatar_url,
    },
    isLiked: row.is_liked,
    isFavorited: row.is_favorited,
    createdAt: row.created_at.toISOString(),
  };
}

/**
 * @param {object} row
 */
export function mapPostDetailRow(row) {
  return {
    postId: row.post_id,
    title: row.title,
    content: row.content,
    coverUrl: row.cover_url,
    coverWidth: row.cover_width,
    coverHeight: row.cover_height,
    tags: row.tags ?? [],
    likeCount: row.like_count,
    favoriteCount: row.favorite_count,
    viewCount: row.view_count,
    author: {
      userId: row.author_id,
      nickname: row.author_nickname,
      avatarUrl: row.author_avatar_url,
    },
    isLiked: row.is_liked,
    isFavorited: row.is_favorited,
    createdAt: row.created_at.toISOString(),
  };
}

/**
 * @param {{ cursor?: string; limit: number; userId?: string }} options
 */
export async function findFeedPage({ cursor, limit, userId }) {
  const interaction = interactionSelect(userId);
  const interactionSql = interaction.select.replace(/\$USER/g, '$1');

  const params = [...interaction.params];
  let cursorClause = '';

  if (cursor) {
    params.push(cursor.createdAt, cursor.postId);
    const createdAtParam = params.length - 1;
    const postIdParam = params.length;
    cursorClause = `
      AND (
        p.created_at < $${createdAtParam}
        OR (p.created_at = $${createdAtParam} AND p.post_id < $${postIdParam})
      )
    `;
  }

  params.push(limit + 1);
  const limitParam = params.length;

  const sql = `
    SELECT
      p.post_id,
      p.title,
      p.cover_url,
      p.cover_width,
      p.cover_height,
      p.like_count,
      p.favorite_count,
      p.created_at,
      p.author_id,
      u.nickname AS author_nickname,
      u.avatar_url AS author_avatar_url,
      ${interactionSql},
      price_agg.min_price
    FROM posts p
    JOIN users u ON u.user_id = p.author_id
    LEFT JOIN (
      SELECT pp.post_id, MIN(pr.price) AS min_price
      FROM post_products pp
      JOIN products pr ON pr.product_id = pp.product_id AND pr.status = 'active'
      GROUP BY pp.post_id
    ) price_agg ON price_agg.post_id = p.post_id
    WHERE 1 = 1
    ${cursorClause}
    ORDER BY p.created_at DESC, p.post_id DESC
    LIMIT $${limitParam}
  `;

  const result = await query(sql, params);
  return result.rows;
}

/**
 * @param {string} postId
 * @param {string | undefined} userId
 */
export async function findById(postId, userId) {
  const interaction = interactionSelect(userId);
  const interactionSql = interaction.select.replace(/\$USER/g, '$2');

  const result = await query(
    `
    SELECT
      p.post_id,
      p.title,
      p.content,
      p.cover_url,
      p.cover_width,
      p.cover_height,
      p.tags,
      p.like_count,
      p.favorite_count,
      p.view_count,
      p.created_at,
      p.author_id,
      u.nickname AS author_nickname,
      u.avatar_url AS author_avatar_url,
      ${interactionSql}
    FROM posts p
    JOIN users u ON u.user_id = p.author_id
    WHERE p.post_id = $1
    `,
    [postId, ...interaction.params],
  );

  return result.rows[0] ?? null;
}

/**
 * @param {string} postId
 */
export async function incrementViewCount(postId) {
  await query(
    `UPDATE posts SET view_count = view_count + 1, updated_at = NOW() WHERE post_id = $1`,
    [postId],
  );
}

/**
 * @param {string} postId
 */
export async function findMediaByPostId(postId) {
  const result = await query(
    `
    SELECT media_id, url, width, height, sort_order
    FROM post_media
    WHERE post_id = $1
    ORDER BY sort_order ASC, created_at ASC
    `,
    [postId],
  );

  return result.rows.map((row) => ({
    mediaId: row.media_id,
    url: row.url,
    width: row.width,
    height: row.height,
    sortOrder: row.sort_order,
  }));
}

/**
 * @param {string} postId
 */
export async function findProductsByPostId(postId) {
  const result = await query(
    `
    SELECT
      pr.product_id,
      pr.name,
      pr.description,
      pr.cover_url,
      pr.price,
      pr.original_price,
      pr.stock,
      pp.sort_order
    FROM post_products pp
    JOIN products pr ON pr.product_id = pp.product_id
    WHERE pp.post_id = $1 AND pr.status = 'active'
    ORDER BY pp.sort_order ASC, pr.created_at ASC
    `,
    [postId],
  );

  return result.rows.map((row) => ({
    productId: row.product_id,
    name: row.name,
    description: row.description,
    coverUrl: row.cover_url,
    price: row.price,
    originalPrice: row.original_price,
    stock: row.stock,
  }));
}

/**
 * @param {string} postId
 * @param {string | undefined} userId
 * @param {number} limit
 */
export async function findRelated(postId, userId, limit = 6) {
  const post = await findById(postId, userId);
  if (!post) return [];

  const interaction = interactionSelect(userId);
  const interactionSql = interaction.select.replace(/\$USER/g, '$4');

  const params = [postId, post.author_id, post.tags ?? [], ...interaction.params, limit];
  const limitParam = params.length;

  const result = await query(
    `
    SELECT
      p.post_id,
      p.title,
      p.cover_url,
      p.cover_width,
      p.cover_height,
      p.like_count,
      p.favorite_count,
      p.created_at,
      p.author_id,
      u.nickname AS author_nickname,
      u.avatar_url AS author_avatar_url,
      ${interactionSql},
      price_agg.min_price
    FROM posts p
    JOIN users u ON u.user_id = p.author_id
    LEFT JOIN (
      SELECT pp.post_id, MIN(pr.price) AS min_price
      FROM post_products pp
      JOIN products pr ON pr.product_id = pp.product_id AND pr.status = 'active'
      GROUP BY pp.post_id
    ) price_agg ON price_agg.post_id = p.post_id
    WHERE p.post_id <> $1
      AND (
        p.author_id = $2
        OR p.tags && $3::text[]
      )
    ORDER BY
      CASE WHEN p.author_id = $2 THEN 0 ELSE 1 END,
      p.like_count DESC,
      p.created_at DESC
    LIMIT $${limitParam}
    `,
    params,
  );

  return result.rows;
}
