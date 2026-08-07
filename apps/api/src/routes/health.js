import { Router } from 'express';
import * as postgres from '../db/postgres.js';
import * as redis from '../cache/redis.js';
import { ok } from '../utils/response.js';

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    const [dbOk, redisOk] = await Promise.all([postgres.ping(), redis.ping()]);

    const status = dbOk && redisOk ? 'healthy' : 'degraded';

    return ok(res, {
      status,
      timestamp: new Date().toISOString(),
      services: {
        postgres: dbOk ? 'up' : 'down',
        redis: redisOk ? 'up' : 'down',
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
