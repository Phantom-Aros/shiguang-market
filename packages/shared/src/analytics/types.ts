/** 核心埋点事件名 */
export const AnalyticsEvents = {
  FEED_EXPOSE: 'feed_expose',
  FEED_CLICK: 'feed_click',
  DETAIL_VIEW: 'detail_view',
  ADD_CART: 'add_cart',
  ORDER_SUBMIT: 'order_submit',
  CAMPAIGN_PAGE_VIEW: 'campaign_page_view',
  CAMPAIGN_BLOCK_CLICK: 'campaign_block_click',
  AI_CHAT_START: 'ai_chat_start',
  AI_CHAT_COMPLETE: 'ai_chat_complete',
} as const;

export type AnalyticsEventName = (typeof AnalyticsEvents)[keyof typeof AnalyticsEvents];

export interface AnalyticsEventPayload {
  event: AnalyticsEventName | string;
  properties?: Record<string, unknown>;
  timestamp?: number;
}

export interface AnalyticsConfig {
  endpoint: string;
  beaconEndpoint?: string;
  getUserId?: () => string | null;
  getAccessToken?: () => string | null;
  batchSize?: number;
  flushIntervalMs?: number;
  debug?: boolean;
}

export interface AnalyticsDashboardDay {
  date: string;
  feed_expose: number;
  feed_click: number;
  detail_view: number;
  add_cart: number;
  order_submit: number;
}

export interface VitalsSummaryItem {
  name: string;
  avgValue: number;
  p75Value: number;
  sampleCount: number;
}

export interface AnalyticsDashboard {
  funnel: AnalyticsDashboardDay[];
  vitals: VitalsSummaryItem[];
}
