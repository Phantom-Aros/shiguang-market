import { redis } from '../cache/redis.js';
import { env } from '../env.js';
import { AppError } from '../middleware/errorHandler.js';

const SMS_TTL = 300;

/** @param {string} phone */
function smsKey(phone) {
  return `sms:code:${phone}`;
}

/**
 * @param {string} phone
 */
export async function sendVerificationCode(phone) {
  const code = env.smsDevCode;
  await redis.setex(smsKey(phone), SMS_TTL, code);
  return { expiresIn: SMS_TTL };
}

/**
 * @param {string} phone
 * @param {string} code
 */
export async function verifyCode(phone, code) {
  const stored = await redis.get(smsKey(phone));
  if (!stored || stored !== code) {
    throw new AppError('验证码错误或已过期', 'INVALID_CODE', 400);
  }
  await redis.del(smsKey(phone));
}
