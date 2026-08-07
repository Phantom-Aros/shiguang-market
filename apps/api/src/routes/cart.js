import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { ok } from '../utils/response.js';
import * as cartService from '../services/cartService.js';

const router = Router();

const upsertItemSchema = z.object({
  productId: z.string().min(1, '商品 ID 不能为空'),
  quantity: z.number().int().min(0, '数量不能为负数'),
});

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const data = await cartService.getCart(req.userId);
    ok(res, data);
  } catch (err) {
    next(err);
  }
});

router.put('/items', requireAuth, validate(upsertItemSchema), async (req, res, next) => {
  try {
    const data = await cartService.upsertCartItem(req.userId, req.body);
    ok(res, data);
  } catch (err) {
    next(err);
  }
});

router.delete('/items/:itemId', requireAuth, async (req, res, next) => {
  try {
    const data = await cartService.removeCartItem(req.userId, req.params.itemId);
    ok(res, data);
  } catch (err) {
    next(err);
  }
});

export default router;
