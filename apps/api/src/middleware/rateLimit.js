import { redis } from '../cache/redis.js';
import { fail } from '../utils/response.js';

/**
 * @param {object} options
 * @param {string} options.keyPrefix
 * @param {number} options.windowSec
 * @param {number} options.max
 * @param {(req: import('express').Request) => string} [options.keyFn]
 * @returns {import('express').RequestHandler}
 */
export function createRateLimiter({ keyPrefix, windowSec, max, keyFn }) {
  return async (req, res, next) => {
    try {
      const identifier = keyFn ? keyFn(req) : (req.ip ?? 'unknown');
      const key = `ratelimit:${keyPrefix}:${identifier}`;
      const count = await redis.incr(key);
      if (count === 1) {
        await redis.expire(key, windowSec);
      }
      if (count > max) {
        return fail(res, '请求过于频繁，请稍后再试', 'RATE_LIMITED', 429);
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}
