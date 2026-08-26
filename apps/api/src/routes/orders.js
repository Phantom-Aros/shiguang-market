import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { ok } from '../utils/response.js';
import * as orderService from '../services/orderService.js';

const router = Router();

const listOrdersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

const createOrderSchema = z.object({
  fromCart: z.boolean().optional(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().positive(),
      }),
    )
    .optional(),
});

router.get('/', requireAuth, validate(listOrdersQuerySchema, 'query'), async (req, res, next) => {
  try {
    const { page, limit } = req.validatedQuery;
    const data = await orderService.listOrders(req.userId, { page, limit });
    ok(res, data);
  } catch (err) {
    next(err);
  }
});

router.post('/', requireAuth, validate(createOrderSchema), async (req, res, next) => {
  try {
    const data = await orderService.createOrder(req.userId, req.body);
    ok(res, data);
  } catch (err) {
    next(err);
  }
});

router.get('/:orderId', requireAuth, async (req, res, next) => {
  try {
    const data = await orderService.getOrderDetail(req.userId, req.params.orderId);
    ok(res, data);
  } catch (err) {
    next(err);
  }
});

router.post('/:orderId/pay', requireAuth, async (req, res, next) => {
  try {
    const data = await orderService.payOrder(req.userId, req.params.orderId);
    ok(res, data);
  } catch (err) {
    next(err);
  }
});

router.post('/:orderId/cancel', requireAuth, async (req, res, next) => {
  try {
    const data = await orderService.cancelOrder(req.params.orderId, req.userId);
    ok(res, data);
  } catch (err) {
    next(err);
  }
});

export default router;
