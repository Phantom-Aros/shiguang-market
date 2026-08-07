import Redis from 'ioredis';
import { env } from '../env.js';
import { logger } from '../logger.js';

export const redis = new Redis(env.redisUrl, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

redis.on('error', (err) => {
  logger.error({ err }, 'redis connection error');
});

export async function ping() {
  const result = await redis.ping();
  return result === 'PONG';
}
