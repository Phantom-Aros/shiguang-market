import { verifyAccessToken } from '../services/tokenService.js';

/** @type {import('express').RequestHandler} */
export function optionalAuth(req, _res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next();
  }

  try {
    const token = header.slice(7);
    const payload = verifyAccessToken(token);
    if (payload.type === 'access') {
      req.userId = payload.sub;
    }
  } catch {
    // 忽略无效 token，按未登录处理
  }

  next();
}
