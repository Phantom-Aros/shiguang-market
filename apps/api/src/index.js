import { createApp } from './app.js';
import { env } from './env.js';
import { redis } from './cache/redis.js';
import { pool } from './db/postgres.js';
import { startOrderExpiryWorker, closeOrderExpiry } from './jobs/orderExpiry.js';
import { logger } from './logger.js';

const app = createApp();

async function start() {
  await redis.connect();
  startOrderExpiryWorker();
  const server = app.listen(env.port, () => {
    logger.info({ port: env.port }, 'API server listening');
  });

  const shutdown = async (signal) => {
    logger.info({ signal }, 'shutting down');
    server.close(async () => {
      await closeOrderExpiry();
      await redis.quit();
      await pool.end();
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start().catch((err) => {
  logger.fatal({ err }, 'failed to start API server');
  process.exit(1);
});
