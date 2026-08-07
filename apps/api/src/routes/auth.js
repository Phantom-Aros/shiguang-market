import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { createRateLimiter } from '../middleware/rateLimit.js';
import { ok } from '../utils/response.js';
import * as authService from '../services/authService.js';

const router = Router();

const phoneSchema = z
  .string()
  .regex(/^1[3-9]\d{9}$/, '请输入有效的手机号');

const sendSmsSchema = z.object({
  phone: phoneSchema,
});

const smsLoginSchema = z.object({
  phone: phoneSchema,
  code: z.string().length(6, '验证码为 6 位数字'),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, '缺少 refreshToken'),
});

const wechatLoginSchema = z.object({
  code: z.string().min(1, '缺少微信 code'),
});

const smsSendLimiter = createRateLimiter({
  keyPrefix: 'auth:sms:send',
  windowSec: 60,
  max: 1,
  keyFn: (req) => req.body?.phone ?? req.ip ?? 'unknown',
});

const smsLoginLimiter = createRateLimiter({
  keyPrefix: 'auth:sms:login',
  windowSec: 60,
  max: 5,
  keyFn: (req) => req.body?.phone ?? req.ip ?? 'unknown',
});

const wechatLoginLimiter = createRateLimiter({
  keyPrefix: 'auth:wechat:login',
  windowSec: 60,
  max: 10,
  keyFn: (req) => req.ip ?? 'unknown',
});

router.post('/sms/send', smsSendLimiter, validate(sendSmsSchema), async (req, res, next) => {
  try {
    const data = await authService.sendSms(req.body.phone);
    ok(res, data);
  } catch (err) {
    next(err);
  }
});

router.post('/sms/login', smsLoginLimiter, validate(smsLoginSchema), async (req, res, next) => {
  try {
    const data = await authService.loginWithSms(req.body.phone, req.body.code);
    ok(res, data);
  } catch (err) {
    next(err);
  }
});

router.post('/refresh', validate(refreshSchema), async (req, res, next) => {
  try {
    const data = await authService.refreshTokens(req.body.refreshToken);
    ok(res, data);
  } catch (err) {
    next(err);
  }
});

router.post('/logout', validate(refreshSchema), async (req, res, next) => {
  try {
    await authService.logout(req.body.refreshToken);
    ok(res, { success: true });
  } catch (err) {
    next(err);
  }
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const data = await authService.getMe(req.userId);
    ok(res, data);
  } catch (err) {
    next(err);
  }
});

router.post(
  '/wechat/login',
  wechatLoginLimiter,
  validate(wechatLoginSchema),
  async (req, res, next) => {
    try {
      const data = await authService.loginWithWechat(req.body.code);
      ok(res, data);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
