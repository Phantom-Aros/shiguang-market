import { Router } from 'express';
import { z } from 'zod';
import { optionalAuth } from '../middleware/optionalAuth.js';
import { ok } from '../utils/response.js';
import * as feedService from '../services/feedService.js';

const router = Router();

const feedQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

/** @type {import('express').RequestHandler} */
function validateFeedQuery(req, res, next) {
  const result = feedQuerySchema.safeParse(req.query);
  if (!result.success) {
    const message = result.error.errors.map((e) => e.message).join('; ');
    return res.status(400).json({ ok: false, error: message, code: 'VALIDATION_ERROR' });
  }
  req.feedQuery = result.data;
  next();
}

router.get('/', optionalAuth, validateFeedQuery, async (req, res, next) => {
  try {
    const data = await feedService.getFeed({
      cursor: req.feedQuery.cursor,
      limit: req.feedQuery.limit,
      userId: req.userId,
    });
    ok(res, data);
  } catch (err) {
    next(err);
  }
});

export default router;
