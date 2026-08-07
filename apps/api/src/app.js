import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { logger } from './logger.js';
import healthRouter from './routes/health.js';
import authRouter from './routes/auth.js';
import uploadsRouter from './routes/uploads.js';
import feedRouter from './routes/feed.js';
import postsRouter from './routes/posts.js';
import productsRouter from './routes/products.js';
import cartRouter from './routes/cart.js';
import ordersRouter from './routes/orders.js';
import analyticsRouter from './routes/analytics.js';
import metricsRouter from './routes/metrics.js';
import campaignsRouter from './routes/campaigns.js';
import aiRouter from './routes/ai.js';
import { errorHandler } from './middleware/errorHandler.js';
import { env } from './env.js';

export function createApp() {
  const app = express();

  app.use(
    pinoHttp({
      logger,
      autoLogging: env.isProduction,
    }),
  );

  app.use(
    helmet({
      contentSecurityPolicy: env.isProduction ? undefined : false,
    }),
  );

  app.use(
    cors({
      origin: env.isProduction ? false : true,
      credentials: true,
    }),
  );

  app.use(express.json({ limit: '1mb' }));

  app.use('/api/health', healthRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/uploads', uploadsRouter);
  app.use('/api/feed', feedRouter);
  app.use('/api/posts', postsRouter);
  app.use('/api/products', productsRouter);
  app.use('/api/cart', cartRouter);
  app.use('/api/orders', ordersRouter);
  app.use('/api/analytics', analyticsRouter);
  app.use('/api/metrics', metricsRouter);
  app.use('/api/campaigns', campaignsRouter);
  app.use('/api/ai', aiRouter);

  app.use(errorHandler);

  return app;
}
