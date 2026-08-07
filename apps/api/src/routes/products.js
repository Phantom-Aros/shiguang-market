import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { ok } from '../utils/response.js';
import * as productService from '../services/productService.js';

const router = Router();

router.get('/samples', async (req, res, next) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 4;
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
