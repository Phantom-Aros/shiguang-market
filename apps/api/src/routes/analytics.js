import express, { Router } from 'express';
import { z } from 'zod';
import { optionalAuth } from '../middleware/optionalAuth.js';
import { createRateLimiter } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import * as analyticsService from '../services/analyticsService.js';
import * as metricsService from '../services/metricsService.js';
import { ok } from '../utils/response.js';

const router = Router();

const analyticsRateLimit = createRateLimiter({
  keyPrefix: 'analytics',
  windowSec: 60,
  max: 120,
});

const eventSchema = z.object({
  event: z.string().min(1).max(100),
  properties: z.record(z.unknown()).optional(),
  timestamp: z.number().optional(),
});

const eventsBodySchema = z.object({
  events: z.array(eventSchema).min(1).max(50),
});

const dashboardQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(30).default(7),
});

/** @type {import('express').RequestHandler} */
function validateDashboardQuery(req, res, next) {
  const result = dashboardQuerySchema.safeParse(req.query);
  if (!result.success) {
    const message = result.error.errors.map((e) => e.message).join('; ');
    return res.status(400).json({ ok: false, error: message, code: 'VALIDATION_ERROR' });
  }
  req.dashboardQuery = result.data;
  next();
}

/** @type {import('express').RequestHandler} */
function parseBeaconBody(req, res, next) {
  if (typeof req.body === 'string' && req.body.length > 0) {
    try {
      req.body = JSON.parse(req.body);
    } catch {
      return res.status(400).json({ ok: false, error: '无效的 beacon 数据', code: 'VALIDATION_ERROR' });
    }
  }
  next();
}

router.post(
  '/events',
  analyticsRateLimit,
  optionalAuth,
  validate(eventsBodySchema),
  (req, res) => {
    analyticsService.ingestEvents(req, req.body.events);
    ok(res, { accepted: req.body.events.length }, 202);
  },
);

router.post(
  '/events/beacon',
  express.text({ type: '*/*', limit: '256kb' }),
  analyticsRateLimit,
  optionalAuth,
  parseBeaconBody,
  validate(eventsBodySchema),
  (req, res) => {
    analyticsService.ingestEvents(req, req.body.events);
    res.status(204).end();
  },
);

router.get('/dashboard', optionalAuth, validateDashboardQuery, async (req, res, next) => {
  try {
    const [funnel, vitals] = await Promise.all([
      analyticsService.getDashboard(req.dashboardQuery),
      metricsService.getVitalsSummary(req.dashboardQuery),
    ]);
    ok(res, { funnel, vitals });
  } catch (err) {
    next(err);
  }
});

export default router;
