import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { pool } from '../db/postgres.js';
import { redis } from '../cache/redis.js';
import {
  E2E_DEV_CODE,
  E2E_TEST_PHONE,
  authed,
  canConnectServices,
  loginWithSms,
} from './helpers.js';

const servicesAvailable = await canConnectServices();

describe.skipIf(!servicesAvailable)('API integration', () => {
  /** @type {import('express').Express} */
  let app;

  beforeAll(async () => {
    app = createApp();
  });

  afterAll(async () => {
    await pool.end();
    redis.disconnect();
  });

  describe('auth', () => {
    it('POST /api/auth/sms/login 验证码错误返回 INVALID_CODE', async () => {
      const phone = '13900009999';
      await redis.del(`ratelimit:auth:sms:send:${phone}`);
      await request(app).post('/api/auth/sms/send').send({ phone });

      const res = await request(app)
        .post('/api/auth/sms/login')
        .send({ phone, code: '000000' });

      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({ ok: false, code: 'INVALID_CODE' });
    });

    it('POST /api/auth/sms/login 成功返回 tokens 与 user', async () => {
      const { tokens, user } = await loginWithSms(E2E_TEST_PHONE);
      expect(tokens.accessToken).toBeTruthy();
      expect(tokens.refreshToken).toBeTruthy();
      expect(user.phone).toBe(E2E_TEST_PHONE);
    });

    it('GET /api/auth/me 需要鉴权', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHORIZED');
    });

    it('GET /api/auth/me 携带 token 返回当前用户', async () => {
      const { tokens } = await loginWithSms(E2E_TEST_PHONE);
      const res = await authed(app, tokens.accessToken).get('/api/auth/me');
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data.phone).toBe(E2E_TEST_PHONE);
    });

    it('POST /api/auth/refresh 可刷新令牌', async () => {
      const { tokens } = await loginWithSms(E2E_TEST_PHONE);
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: tokens.refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.data.tokens.accessToken).toBeTruthy();
      expect(res.body.data.tokens.refreshToken).toBeTruthy();
    });
  });

  describe('feed', () => {
    it('GET /api/feed 返回分页列表', async () => {
      const res = await request(app).get('/api/feed?limit=5');
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(Array.isArray(res.body.data.items)).toBe(true);
      expect(res.body.data.items.length).toBeGreaterThan(0);
      expect(res.body.data.items[0]).toMatchObject({
        postId: expect.any(String),
        title: expect.any(String),
        coverUrl: expect.any(String),
      });
    });

    it('GET /api/feed 支持游标分页', async () => {
      const first = await request(app).get('/api/feed?limit=2');
      expect(first.body.data.items).toHaveLength(2);

      const cursor = first.body.data.nextCursor;
      expect(cursor).toBeTruthy();

      const second = await request(app).get(`/api/feed?limit=2&cursor=${cursor}`);
      expect(second.status).toBe(200);
      const firstIds = first.body.data.items.map((i) => i.postId);
      const secondIds = second.body.data.items.map((i) => i.postId);
      expect(secondIds.some((id) => firstIds.includes(id))).toBe(false);
    });
  });

  describe('order', () => {
    it('完整下单链路：加购 → 创建订单 → 支付', async () => {
      const { tokens } = await loginWithSms(E2E_TEST_PHONE);
      const client = authed(app, tokens.accessToken);

      const productsRes = await request(app).get('/api/feed?limit=1');
      const feedItem = productsRes.body.data.items[0];
      expect(feedItem).toBeTruthy();

      const postRes = await request(app).get(`/api/posts/${feedItem.postId}`);
      expect(postRes.status).toBe(200);

      const productId =
        postRes.body.data.products?.[0]?.productId ??
        (await pool.query(`SELECT product_id FROM products WHERE status = 'active' LIMIT 1`)).rows[0]
          ?.product_id;

      expect(productId).toBeTruthy();

      const cartRes = await client
        .put('/api/cart/items')
        .send({ productId, quantity: 1 });
      expect(cartRes.status).toBe(200);

      const orderRes = await client.post('/api/orders').send({ fromCart: true });
      expect(orderRes.status).toBe(200);
      expect(orderRes.body.data.status).toBe('pending');
      const orderId = orderRes.body.data.orderId;

      const payRes = await client.post(`/api/orders/${orderId}/pay`);
      expect(payRes.status).toBe(200);
      expect(payRes.body.data.status).toBe('paid');

      const detailRes = await client.get(`/api/orders/${orderId}`);
      expect(detailRes.body.data.status).toBe('paid');
    });

    it('POST /api/orders 未登录返回 UNAUTHORIZED', async () => {
      const res = await request(app).post('/api/orders').send({ fromCart: true });
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHORIZED');
    });

    it('GET /api/orders 返回订单列表', async () => {
      const { tokens } = await loginWithSms(E2E_TEST_PHONE);
      const res = await authed(app, tokens.accessToken).get('/api/orders');
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(Array.isArray(res.body.data.items)).toBe(true);
    });
  });
});
