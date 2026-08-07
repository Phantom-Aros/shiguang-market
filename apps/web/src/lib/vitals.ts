import type { Metric } from 'web-vitals';
import { onCLS, onFCP, onINP, onLCP, onTTFB } from 'web-vitals';
import { getAnalyticsSessionId } from '@shiguang/shared/analytics';
import { tokenStorage } from '@shiguang/api-client';

function sendVital(metric: Metric) {
  const payload = {
    vitals: [
      {
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
        pageUrl: window.location.href,
        navigationType: metric.navigationType,
        sessionId: getAnalyticsSessionId(),
      },
    ],
  };

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const accessToken = tokenStorage.getAccess();
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  void fetch('/api/metrics/vitals', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    keepalive: true,
  });
}

export function initWebVitals() {
  onLCP(sendVital); // Largest Contentful Paint 最大内容绘制时间（加载速度）
  onINP(sendVital); // Interaction to Next Paint 交互到下一个绘制时间（交互速度）
  onCLS(sendVital); // Cumulative Layout Shift 累计布局偏移（稳定性）
  onFCP(sendVital); // First Contentful Paint 首次内容绘制时间（加载速度）
  onTTFB(sendVital); // Time to First Byte 首次字节时间（加载速度）
}
