import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { ok } from '../utils/response.js';
import * as productService from '../services/productService.js';

const router = Router();

const samplesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(20).default(4),
});

router.get('/samples', validate(samplesQuerySchema, 'query'), async (req, res, next) => {
  try {
    const { limit } = req.validatedQuery;
    const data = await productService.listSamples(limit);
    ok(res, data);
  } catch (err) {
    next(err);
  }
});

router.get('/:productId', async (req, res, next) => {
  try {
    const data = await productService.getProduct(req.params.productId);
    ok(res, data);
  } catch (err) {
    next(err);
  }
});

export default router;
