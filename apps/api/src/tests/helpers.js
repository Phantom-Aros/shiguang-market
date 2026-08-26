import request from 'supertest';
import { createApp } from '../app.js';
import { pool } from '../db/postgres.js';
import { redis } from '../cache/redis.js';
import { env } from '../env.js';

/** E2E / 集成测试固定账号，与 seed.js 保持一致 */
export const E2E_TEST_PHONE = '13900000001';
export const E2E_DEV_CODE = env.smsDevCode;

/**
 * @returns {Promise<boolean>}
 */
export async function canConnectServices() {
  try {
    if (redis.status !== 'ready') {
      await redis.connect();
    }
    await redis.ping();
    await pool.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

/**
 * @param {string} [phone]
 */
export async function loginWithSms(phone = E2E_TEST_PHONE) {
  const app = createApp();
  await redis.del(`ratelimit:auth:sms:send:${phone}`);
  await redis.del(`ratelimit:auth:sms:login:${phone}`);
  await request(app).post('/api/auth/sms/send').send({ phone });
  const res = await request(app).post('/api/auth/sms/login').send({ phone, code: E2E_DEV_CODE });
  if (!res.body.ok) {
    throw new Error(`login failed: ${res.body.error}`);
  }
  return {
    app,
    tokens: res.body.data.tokens,
    user: res.body.data.user,
  };
}

/**
 * @param {import('express').Express} app
 * @param {string} token
 */
export function authed(app, token) {
  return {
    get: (url) => request(app).get(url).set('Authorization', `Bearer ${token}`),
    post: (url) => request(app).post(url).set('Authorization', `Bearer ${token}`),
    put: (url) => request(app).put(url).set('Authorization', `Bearer ${token}`),
    delete: (url) => request(app).delete(url).set('Authorization', `Bearer ${token}`),
  };
}
