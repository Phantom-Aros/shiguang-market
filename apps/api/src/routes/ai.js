import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { createRateLimiter } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import { ok } from '../utils/response.js';
import { aiConfig } from '../config/ai.js';
import * as aiService from '../services/aiService.js';

const router = Router();

const createConversationSchema = z.object({
  productId: z.string().min(1).optional(),
});

const chatSchema = z.object({
  content: z.string().min(1).max(2000),
});

const aiChatLimiter = createRateLimiter({
  keyPrefix: 'ai:chat',
  windowSec: aiConfig.rateLimit.windowSec,
  max: aiConfig.rateLimit.max,
  keyFn: (req) => req.userId ?? req.ip ?? 'unknown',
});

router.post(
  '/conversations',
  requireAuth,
  validate(createConversationSchema),
  async (req, res, next) => {
    try {
      const data = await aiService.createConversation(req.userId, req.body);
      ok(res, data, 201);
    } catch (err) {
      next(err);
    }
  },
);

router.get('/conversations', requireAuth, async (req, res, next) => {
  try {
    const data = await aiService.listConversations(req.userId);
    ok(res, data);
  } catch (err) {
    next(err);
  }
});

router.get('/conversations/:conversationId/messages', requireAuth, async (req, res, next) => {
  try {
    const data = await aiService.getMessages(req.userId, req.params.conversationId);
    ok(res, data);
  } catch (err) {
    next(err);
  }
});

router.post(
  '/conversations/:conversationId/chat',
  requireAuth,
  aiChatLimiter,
  validate(chatSchema),
  async (req, res, next) => {
    try {
      const controller = new AbortController();
      req.on('close', () => controller.abort());

      await aiService.streamChat(
        req.userId,
        req.params.conversationId,
        req.body.content,
        res,
        controller.signal,
      );
    } catch (err) {
      if (!res.headersSent) {
        next(err);
      }
    }
  },
);

export default router;
