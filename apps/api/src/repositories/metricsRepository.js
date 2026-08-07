import { ulid } from 'ulid';
import { query } from '../db/postgres.js';

/**
 * @param {Array<{
 *   userId?: string | null;
 *   sessionId?: string | null;
 *   name: string;
 *   value: number;
 *   rating?: string | null;
 *   pageUrl?: string | null;
 *   navigationType?: string | null;
 * }>} metrics
 */
export async function insertMetrics(metrics) {
  if (metrics.length === 0) return;

  const values = [];
  const params = [];
  let paramIndex = 1;

  for (const metric of metrics) {
    values.push(
      `($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`,
    );
    params.push(
      ulid(),
      metric.userId ?? null,
      metric.sessionId ?? null,
      metric.name,
      metric.value,
      metric.rating ?? null,
      metric.pageUrl ?? null,
      metric.navigationType ?? null,
    );
  }

  await query(
    `INSERT INTO client_metrics
      (metric_id, user_id, session_id, name, value, rating, page_url, navigation_type)
     VALUES ${values.join(', ')}`,
    params,
  );
}

/**
 * @param {{
 *   userId?: string | null;
 *   sessionId?: string | null;
 *   message: string;
 *   stack?: string | null;
 *   componentStack?: string | null;
 *   pageUrl?: string | null;
 *   userAgent?: string | null;
 * }} error
 */
export async function insertError(error) {
  await query(
    `INSERT INTO client_errors
      (error_id, user_id, session_id, message, stack, component_stack, page_url, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      ulid(),
      error.userId ?? null,
      error.sessionId ?? null,
      error.message,
      error.stack ?? null,
      error.componentStack ?? null,
      error.pageUrl ?? null,
      error.userAgent ?? null,
    ],
  );
}

/**
 * @param {{ days?: number }} [options]
 */
export async function getVitalsSummary({ days = 7 } = {}) {
  const result = await query(
    `SELECT
       name,
       ROUND(AVG(value)::numeric, 2) AS avg_value,
       ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY value)::numeric, 2) AS p75_value,
       COUNT(*)::int AS sample_count
     FROM client_metrics
     WHERE name IN ('LCP', 'INP', 'CLS', 'FCP', 'TTFB')
       AND created_at >= NOW() - ($1::int || ' days')::interval
     GROUP BY name
     ORDER BY name`,
    [days],
  );

  return result.rows.map((row) => ({
    name: row.name,
    avgValue: Number(row.avg_value),
    p75Value: Number(row.p75_value),
    sampleCount: row.sample_count,
  }));
}
