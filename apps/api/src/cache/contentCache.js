import { redis } from './redis.js';

export const CACHE_TTL = {
  FEED_HOT: 60,
  POST_PARTS: 120,
  PRODUCT_DETAIL: 300,
  PRODUCT_SAMPLES: 300,
};

/**
 * @template T
 * @param {string} key
 * @returns {Promise<T | null>}
 */
export async function cacheGet(key) {
  try {
    const raw = await redis.get(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * @param {string} key
 * @param {unknown} value
 * @param {number} ttlSec
 */
export async function cacheSet(key, value, ttlSec) {
  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSec);
  } catch {
    // Redis 不可用时静默降级
  }
}

/** 清除 Feed 首屏热数据缓存（点赞/收藏后 like_count 变化） */
export async function invalidateFeedHotCache() {
  try {
    const keys = await redis.keys('feed:hot:*');
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch {
    // 忽略
  }
}

/**
 * @param {string} postId
 */
export async function invalidatePostPartsCache(postId) {
  try {
    await redis.del(`post:parts:${postId}`);
  } catch {
    // 忽略
  }
}

/**
 * @param {string} productId
 */
export async function invalidateProductCache(productId) {
  try {
    const keys = await redis.keys('product:samples:*');
    const delKeys = [`product:detail:${productId}`, ...keys];
    if (delKeys.length > 0) {
      await redis.del(...delKeys);
    }
  } catch {
    // 忽略
  }
}
