import { verifyAccessToken } from '../services/tokenService.js';
import { fail } from '../utils/response.js';

/** @type {import('express').RequestHandler} */
export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return fail(res, '未登录', 'UNAUTHORIZED', 401);
  }

  try {
    const token = header.slice(7);
    const payload = verifyAccessToken(token);
    if (payload.type !== 'access') {
      return fail(res, '无效的访问令牌', 'UNAUTHORIZED', 401);
    }
    req.userId = payload.sub;
    next();
  } catch {
    return fail(res, '登录已过期，请重新登录', 'UNAUTHORIZED', 401);
  }
}
