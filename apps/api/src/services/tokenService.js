import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../env.js';

const ACCESS_EXPIRES = '15m';
const REFRESH_EXPIRES = '7d';

export const ACCESS_EXPIRES_SECONDS = 15 * 60;

/**
 * @param {string} userId
 */
export function signAccessToken(userId) {
  return jwt.sign({ sub: userId, type: 'access' }, env.jwtAccessSecret, {
    expiresIn: ACCESS_EXPIRES,
  });
}

/**
 * @param {string} userId
 * @param {string} sessionId
 */
export function signRefreshToken(userId, sessionId) {
  return jwt.sign({ sub: userId, sessionId, type: 'refresh' }, env.jwtRefreshSecret, {
    expiresIn: REFRESH_EXPIRES,
  });
}

/**
 * @param {string} token
 */
export function verifyAccessToken(token) {
  return jwt.verify(token, env.jwtAccessSecret);
}

/**
 * @param {string} token
 */
export function verifyRefreshToken(token) {
  return jwt.verify(token, env.jwtRefreshSecret);
}

/**
 * @param {string} token
 */
export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}
