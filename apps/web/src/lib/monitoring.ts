import * as Sentry from '@sentry/react';
import { initAnalytics } from '@shiguang/shared/analytics';
import { tokenStorage } from '@shiguang/api-client';

export function initMonitoring() {
  const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
  if (sentryDsn) {
    Sentry.init({
      dsn: sentryDsn,
      environment: import.meta.env.MODE,
      integrations: [Sentry.browserTracingIntegration()],
      tracesSampleRate: import.meta.env.PROD ? 0.2 : 1,
      enabled: Boolean(sentryDsn),
    });
  }

  initAnalytics({
    endpoint: '/api/analytics/events',
    beaconEndpoint: '/api/analytics/events/beacon',
    getAccessToken: () => tokenStorage.getAccess(),
    batchSize: 8,
    flushIntervalMs: 4000,
    debug: import.meta.env.DEV,
  });
}

export { Sentry };
