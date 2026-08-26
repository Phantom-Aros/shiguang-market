import { cacheGet, cacheSet, CACHE_TTL } from '../cache/contentCache.js';
import { AppError } from '../middleware/errorHandler.js';
import * as postRepository from '../repositories/postRepository.js';
import { decodeCursor, encodeCursor } from '../utils/cursor.js';

const FEED_CACHE_PREFIX = 'feed:hot:';

/**
 * @param {{ cursor?: string; limit: number; userId?: string }} options
 */
export async function getFeed({ cursor, limit, userId }) {
  const decodedCursor = cursor ? decodeCursor(cursor) : null;
  if (cursor && !decodedCursor) {
    throw new AppError('无效的分页游标', 'VALIDATION_ERROR', 400);
  }

  const cacheKey = !decodedCursor && !userId ? `${FEED_CACHE_PREFIX}${limit}` : null;

  if (cacheKey) {
    const cached = await cacheGet(cacheKey);
    if (cached) {
      return cached;
    }
  }

  const rows = await postRepository.findFeedPage({
    cursor: decodedCursor ?? undefined,
    limit,
    userId,
  });

  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;
  const items = pageRows.map(postRepository.mapFeedRow);

  const last = pageRows[pageRows.length - 1];
  const nextCursor =
    hasMore && last
      ? encodeCursor({ createdAt: last.created_at, postId: last.post_id })
      : null;

  const result = { items, nextCursor };

  if (cacheKey) {
    await cacheSet(cacheKey, result, CACHE_TTL.FEED_HOT);
  }

  return result;
}
