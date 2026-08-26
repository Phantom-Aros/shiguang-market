import { initAnalytics } from '@shiguang/shared/analytics';
import { tokenStorage } from '@shiguang/api-client';

let sentryReady: Promise<void> | null = null;

async function ensureSentry() {
  if (!sentryReady) {
    sentryReady = (async () => {
      const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
      if (!sentryDsn) return;

      const Sentry = await import('@sentry/react');
      Sentry.init({
        dsn: sentryDsn,
        environment: import.meta.env.MODE,
        integrations: [Sentry.browserTracingIntegration()],
        tracesSampleRate: import.meta.env.PROD ? 0.2 : 1,
        enabled: Boolean(sentryDsn),
      });
    })();
  }

  await sentryReady;
}

export async function initMonitoring() {
  await ensureSentry();

  initAnalytics({
    endpoint: '/api/analytics/events',
    beaconEndpoint: '/api/analytics/events/beacon',
    getAccessToken: () => tokenStorage.getAccess(),
    batchSize: 8,
    flushIntervalMs: 4000,
    debug: import.meta.env.DEV,
  });
}

export async function captureException(error: Error, extra?: Record<string, unknown>) {
  await ensureSentry();
  const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
  if (!sentryDsn) return;

  const Sentry = await import('@sentry/react');
  Sentry.captureException(error, { extra });
}
