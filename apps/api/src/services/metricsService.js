import * as metricsRepository from '../repositories/metricsRepository.js';
import { logger } from '../logger.js';

const log = logger.child({ name: 'metricsService' });

/**
 * @param {import('express').Request} req
 * @param {Array<{
 *   name: string;
 *   value: number;
 *   rating?: string;
 *   pageUrl?: string;
 *   navigationType?: string;
 *   sessionId?: string;
 * }>} vitals
 */
export function ingestVitals(req, vitals) {
  const normalized = vitals.map((item) => ({
    userId: req.userId ?? null,
    sessionId: item.sessionId ?? null,
    name: item.name,
    value: item.value,
    rating: item.rating ?? null,
    pageUrl: item.pageUrl ?? null,
    navigationType: item.navigationType ?? null,
  }));

  setImmediate(() => {
    metricsRepository.insertMetrics(normalized).catch((err) => {
      log.error({ err }, 'failed to insert client metrics');
    });
  });
}

/**
 * @param {import('express').Request} req
 * @param {{
 *   message: string;
 *   stack?: string;
 *   componentStack?: string;
 *   pageUrl?: string;
 *   sessionId?: string;
 * }} payload
 */
export function ingestError(req, payload) {
  const normalized = {
    userId: req.userId ?? null,
    sessionId: payload.sessionId ?? null,
    message: payload.message,
    stack: payload.stack ?? null,
    componentStack: payload.componentStack ?? null,
    pageUrl: payload.pageUrl ?? null,
    userAgent: req.get('user-agent') ?? null,
  };

  setImmediate(() => {
    metricsRepository.insertError(normalized).catch((err) => {
      log.error({ err }, 'failed to insert client error');
    });
  });
}

/**
 * @param {{ days?: number }} [options]
 */
export function getVitalsSummary(options) {
  return metricsRepository.getVitalsSummary(options);
}
