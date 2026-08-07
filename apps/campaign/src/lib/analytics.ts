import { initAnalytics, track } from '@shiguang/shared/analytics';
import { tokenStorage } from '@shiguang/api-client';

let initialized = false;

export function initCampaignAnalytics() {
  if (initialized) return;
  initialized = true;

  initAnalytics({
    endpoint: '/api/analytics/events',
    beaconEndpoint: '/api/analytics/events/beacon',
    getAccessToken: () => tokenStorage.getAccess(),
    batchSize: 8,
    flushIntervalMs: 4000,
  });
}

export function trackCampaignPageView(slug: string, campaignId: string) {
  track('campaign_page_view', { slug, campaignId });
}

export function trackCampaignBlockClick(
  slug: string,
  blockId: string,
  blockType: string,
  extra?: Record<string, unknown>,
) {
  track('campaign_block_click', { slug, blockId, blockType, ...extra });
}
