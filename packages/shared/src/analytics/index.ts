import type { AnalyticsConfig, AnalyticsEventPayload } from './types.js';
export { AnalyticsEvents } from './types.js';
export type { AnalyticsEventName, AnalyticsDashboard, AnalyticsDashboardDay, VitalsSummaryItem } from './types.js';

const SESSION_KEY = 'sg_analytics_session';

let config: AnalyticsConfig | null = null;
let queue: AnalyticsEventPayload[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;

function getSessionId(): string {
  if (typeof window === 'undefined') return 'server';
  const existing = sessionStorage.getItem(SESSION_KEY);
  if (existing) return existing;
  const sessionId = crypto.randomUUID();
  sessionStorage.setItem(SESSION_KEY, sessionId);
  return sessionId;
}

function getPageUrl(): string {
  if (typeof window === 'undefined') return '';
  return window.location.href;
}

function buildEvent(event: AnalyticsEventPayload): AnalyticsEventPayload {
  return {
    ...event,
    timestamp: event.timestamp ?? Date.now(),
    properties: {
      ...event.properties,
      sessionId: getSessionId(),
      pageUrl: getPageUrl(),
      userId: config?.getUserId?.() ?? null,
    },
  };
}

async function postEvents(events: AnalyticsEventPayload[], useBeacon = false) {
  if (!config || events.length === 0) return;

  const payload = JSON.stringify({ events });
  const endpoint = useBeacon && config.beaconEndpoint ? config.beaconEndpoint : config.endpoint;

  if (useBeacon && typeof navigator !== 'undefined' && navigator.sendBeacon) {
    const blob = new Blob([payload], { type: 'application/json' });
    navigator.sendBeacon(endpoint, blob);
    return;
  }

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const accessToken = config.getAccessToken?.();
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    await fetch(endpoint, {
      method: 'POST',
      headers,
      body: payload,
      keepalive: true,
    });
  } catch (err) {
    if (config.debug) {
      console.warn('[analytics] flush failed', err);
    }
  }
}

export function flush(useBeacon = false) {
  if (!config || queue.length === 0) return;
  const batch = queue.splice(0, queue.length);
  void postEvents(batch, useBeacon);
}

function scheduleFlush() {
  if (!config) return;
  const batchSize = config.batchSize ?? 10;
  if (queue.length >= batchSize) {
    flush();
  }
}

export function initAnalytics(nextConfig: AnalyticsConfig) {
  config = nextConfig;

  if (flushTimer) {
    clearInterval(flushTimer);
  }

  const flushIntervalMs = nextConfig.flushIntervalMs ?? 5000;
  flushTimer = setInterval(() => flush(), flushIntervalMs);

  if (typeof window !== 'undefined') {
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        flush(true);
      }
    });
    window.addEventListener('pagehide', () => flush(true));
  }
}

export function track(event: string, properties?: Record<string, unknown>) {
  if (!config) return;

  queue.push(buildEvent({ event, properties }));

  if (config.debug) {
    console.debug('[analytics] track', event, properties);
  }

  scheduleFlush();
}

export function getAnalyticsSessionId(): string {
  return getSessionId();
}
