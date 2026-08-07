import { ulid } from 'ulid';
import { query } from '../db/postgres.js';
import * as userRepo from '../repositories/userRepository.js';
import * as sessionRepo from '../repositories/sessionRepository.js';
import * as wechatRepo from '../repositories/wechatRepository.js';
import { sendVerificationCode, verifyCode } from '../services/smsService.js';
import {
  ACCESS_EXPIRES_SECONDS,
  hashToken,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../services/tokenService.js';
import { AppError } from '../middleware/errorHandler.js';
import { env } from '../env.js';

const REFRESH_EXPIRES_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * @param {object} row
 */
export function toUserDto(row) {
  return {
    userId: row.user_id,
    phone: row.phone ?? null,
    nickname: row.nickname ?? null,
    avatarUrl: row.avatar_url ?? null,
    createdAt: row.created_at.toISOString(),
  };
}

/**
 * @param {string} userId
 */
async function issueTokens(userId) {
  const sessionId = ulid();
  const refreshToken = signRefreshToken(userId, sessionId);
  const refreshHash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + REFRESH_EXPIRES_MS);

  await sessionRepo.createSession(sessionId, userId, refreshHash, expiresAt);

  return {
    accessToken: signAccessToken(userId),
    refreshToken,
    expiresIn: ACCESS_EXPIRES_SECONDS,
  };
}

/**
 * @param {string} phone
 */
export async function sendSms(phone) {
  return sendVerificationCode(phone);
}

/**
 * @param {string} phone
 * @param {string} code
 */
export async function loginWithSms(phone, code) {
  await verifyCode(phone, code);

  let user = await userRepo.findByPhone(phone);
  if (!user) {
    user = await userRepo.createByPhone(phone);
  }

  const tokens = await issueTokens(user.user_id);
  return { tokens, user: toUserDto(user) };
}

/**
 * @param {string} refreshToken
 */
export async function refreshTokens(refreshToken) {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new AppError('刷新令牌无效或已过期', 'INVALID_TOKEN', 401);
  }

  if (payload.type !== 'refresh' || !payload.sessionId) {
    throw new AppError('刷新令牌无效', 'INVALID_TOKEN', 401);
  }

  const refreshHash = hashToken(refreshToken);
  const session = await sessionRepo.findActiveSession(payload.sessionId, refreshHash);
  if (!session) {
    throw new AppError('会话已失效，请重新登录', 'INVALID_TOKEN', 401);
  }

  const user = await userRepo.findById(session.user_id);
  if (!user) {
    throw new AppError('用户不存在', 'NOT_FOUND', 404);
  }

  const newRefreshToken = signRefreshToken(user.user_id, payload.sessionId);
  const newHash = hashToken(newRefreshToken);
  const expiresAt = new Date(Date.now() + REFRESH_EXPIRES_MS);
  await sessionRepo.rotateSession(payload.sessionId, newHash, expiresAt);

  return {
    tokens: {
      accessToken: signAccessToken(user.user_id),
      refreshToken: newRefreshToken,
      expiresIn: ACCESS_EXPIRES_SECONDS,
    },
    user: toUserDto(user),
  };
}

/**
 * @param {string} refreshToken
 */
export async function logout(refreshToken) {
  try {
    const payload = verifyRefreshToken(refreshToken);
    if (payload.sessionId) {
      await sessionRepo.revokeSession(payload.sessionId);
    }
  } catch {
    // 令牌已过期也视为登出成功
  }
}

/**
 * @param {string} userId
 */
export async function getMe(userId) {
  const user = await userRepo.findById(userId);
  if (!user) {
    throw new AppError('用户不存在', 'NOT_FOUND', 404);
  }
  return toUserDto(user);
}

/**
 * @param {string} code
 */
async function exchangeWechatCode(code) {
  if (env.wechatAppId && env.wechatAppSecret) {
    const url = new URL('https://api.weixin.qq.com/sns/jscode2session');
    url.searchParams.set('appid', env.wechatAppId);
    url.searchParams.set('secret', env.wechatAppSecret);
    url.searchParams.set('js_code', code);
    url.searchParams.set('grant_type', 'authorization_code');

    const response = await fetch(url);
    const data = await response.json();

    if (data.errcode) {
      throw new AppError(data.errmsg ?? '微信登录失败', 'WECHAT_AUTH_FAILED', 400);
    }

    return { openid: data.openid, unionId: data.unionid ?? null };
  }

  if (code === 'mock_code' || !env.isProduction) {
    return { openid: `mock_openid_${code}`, unionId: null };
  }

  throw new AppError('微信登录失败', 'WECHAT_AUTH_FAILED', 400);
}

/**
 * @param {string} code
 */
export async function loginWithWechat(code) {
  const { openid, unionId } = await exchangeWechatCode(code);

  const binding = await wechatRepo.findByOpenid(openid);
  let user;

  if (binding) {
    user = binding;
  } else {
    const userId = ulid();
    const nickname = `微信用户${openid.slice(-4)}`;
    const result = await query(
      `INSERT INTO users (user_id, nickname)
       VALUES ($1, $2)
       RETURNING user_id, phone, nickname, avatar_url, created_at, updated_at`,
      [userId, nickname],
    );
    user = result.rows[0];
    await wechatRepo.createBinding(userId, openid, unionId);
  }

  const tokens = await issueTokens(user.user_id);
  return { tokens, user: toUserDto(user) };
}
