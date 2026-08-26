#!/usr/bin/env node
/**
 * Feed 查询 EXPLAIN ANALYZE 脚本。
 * 需 PostgreSQL 已启动且已 migrate + seed。
 *
 * 用法：npm --workspace=api run explain:feed
 */
import pg from 'pg';
import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '../../../../.env') });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const FEED_SQL = `
  EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
  SELECT
    p.post_id,
    p.title,
    p.cover_url,
    price_agg.min_price
  FROM posts p
  JOIN users u ON u.user_id = p.author_id
  LEFT JOIN (
    SELECT pp.post_id, MIN(pr.price) AS min_price
    FROM post_products pp
    JOIN products pr ON pr.product_id = pp.product_id AND pr.status = 'active'
    GROUP BY pp.post_id
  ) price_agg ON price_agg.post_id = p.post_id
  ORDER BY p.created_at DESC, p.post_id DESC
  LIMIT 21
`;

try {
  const { rows } = await pool.query(FEED_SQL);
  console.log('=== Feed EXPLAIN ANALYZE ===\n');
  for (const row of rows) {
    console.log(row['QUERY PLAN']);
  }
} finally {
  await pool.end();
}
