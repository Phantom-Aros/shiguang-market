import { Router } from 'express';
import { z } from 'zod';
import { optionalAuth } from '../middleware/optionalAuth.js';
import { createRateLimiter } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import * as metricsService from '../services/metricsService.js';
import { ok } from '../utils/response.js';

const router = Router();

const metricsRateLimit = createRateLimiter({
  keyPrefix: 'metrics',
  windowSec: 60,
  max: 60,
});

const vitalSchema = z.object({
  name: z.enum(['LCP', 'INP', 'CLS', 'FCP', 'TTFB']),
  value: z.number(),
  rating: z.enum(['good', 'needs-improvement', 'poor']).optional(),
  pageUrl: z.string().max(2000).optional(),
  navigationType: z.string().max(30).optional(),
  sessionId: z.string().max(64).optional(),
});

const vitalsBodySchema = z.object({
  vitals: z.array(vitalSchema).min(1).max(20),
});

const errorBodySchema = z.object({
  message: z.string().min(1).max(2000),
  stack: z.string().max(10000).optional(),
  componentStack: z.string().max(10000).optional(),
  pageUrl: z.string().max(2000).optional(),
  sessionId: z.string().max(64).optional(),
});

router.post(
  '/vitals',
  metricsRateLimit,
  optionalAuth,
  validate(vitalsBodySchema),
  (req, res) => {
    metricsService.ingestVitals(req, req.body.vitals);
    ok(res, { accepted: req.body.vitals.length }, 202);
  },
);

router.post(
  '/errors',
  metricsRateLimit,
  optionalAuth,
  validate(errorBodySchema),
  (req, res) => {
    metricsService.ingestError(req, req.body);
    ok(res, { accepted: true }, 202);
  },
);

export default router;
