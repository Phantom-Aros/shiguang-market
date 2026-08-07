import * as analyticsRepository from '../repositories/analyticsRepository.js';
import { logger } from '../logger.js';

const log = logger.child({ name: 'analyticsService' });

/**
 * @param {import('express').Request} req
 * @param {Array<{ event: string; properties?: Record<string, unknown>; timestamp?: number }>} events
 */
export function ingestEvents(req, events) {
  const normalized = events.map((item) => ({
    userId: req.userId ?? null,
    sessionId: typeof item.properties?.sessionId === 'string' ? item.properties.sessionId : null,
    eventName: item.event,
    properties: sanitizeProperties(item.properties),
    pageUrl: typeof item.properties?.pageUrl === 'string' ? item.properties.pageUrl : req.get('referer') ?? null,
    userAgent: req.get('user-agent') ?? null,
    clientIp: req.ip ?? null,
  }));

  setImmediate(() => {
    analyticsRepository.insertEvents(normalized).catch((err) => {
      log.error({ err }, 'failed to insert analytics events');
    });
  });
}

/**
 * @param {Record<string, unknown> | undefined} properties
 */
function sanitizeProperties(properties) {
  if (!properties || typeof properties !== 'object') return {};
  const { sessionId: _sessionId, pageUrl: _pageUrl, ...rest } = properties;
  return rest;
}

/**
 * @param {{ days?: number }} [options]
 */
export function getDashboard(options) {
  return analyticsRepository.getDailyFunnel(options);
}
