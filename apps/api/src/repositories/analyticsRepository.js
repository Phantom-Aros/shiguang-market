import { ulid } from 'ulid';
import { query } from '../db/postgres.js';

const FUNNEL_EVENTS = ['feed_expose', 'feed_click', 'detail_view', 'add_cart', 'order_submit'];
/** 漏斗按日聚合时区（与主要用户群一致） */
const ANALYTICS_TIMEZONE = 'Asia/Shanghai';

/**
 * @param {Array<{
 *   userId?: string | null;
 *   sessionId?: string | null;
 *   eventName: string;
 *   properties?: Record<string, unknown>;
 *   pageUrl?: string | null;
 *   userAgent?: string | null;
 *   clientIp?: string | null;
 * }>} events
 */
export async function insertEvents(events) {
  if (events.length === 0) return;

  const values = [];
  const params = [];
  let paramIndex = 1;

  for (const event of events) {
    values.push(
      `($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`,
    );
    params.push(
      ulid(),
      event.userId ?? null,
      event.sessionId ?? null,
      event.eventName,
      JSON.stringify(event.properties ?? {}),
      event.pageUrl ?? null,
      event.userAgent ?? null,
      event.clientIp ?? null,
    );
  }

  await query(
    `INSERT INTO analytics_events
      (event_id, user_id, session_id, event_name, properties, page_url, user_agent, client_ip)
     VALUES ${values.join(', ')}`,
    params,
  );
}

/**
 * @param {{ days?: number }} [options]
 */
export async function getDailyFunnel({ days = 7 } = {}) {
  const result = await query(
    `SELECT
       TO_CHAR(created_at AT TIME ZONE $3, 'YYYY-MM-DD') AS day,
       event_name,
       COUNT(*)::int AS count
     FROM analytics_events
     WHERE event_name = ANY($1::text[])
       AND created_at >= NOW() - ($2::int || ' days')::interval
     GROUP BY 1, event_name
     ORDER BY 1 DESC, event_name`,
    [FUNNEL_EVENTS, days, ANALYTICS_TIMEZONE],
  );

  /** @type {Map<string, Record<string, number>>} */
  const byDay = new Map();

  for (const row of result.rows) {
    const dayKey = row.day;
    if (!byDay.has(dayKey)) {
      byDay.set(dayKey, Object.fromEntries(FUNNEL_EVENTS.map((name) => [name, 0])));
    }
    byDay.get(dayKey)[row.event_name] = row.count;
  }

  return Array.from(byDay.entries())
    .map(([date, counts]) => ({ date, ...counts }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
