import pg from 'pg';
import { env } from '../env.js';
import { logger } from '../logger.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: env.databaseUrl,
});

pool.on('error', (err) => {
  logger.error({ err }, 'unexpected postgresql pool error');
});

/**
 * @template T
 * @param {string} text
 * @param {unknown[]} [params]
 * @returns {Promise<import('pg').QueryResult<T>>}
 */
export async function query(text, params = []) {
  return pool.query(text, params);
}

/**
 * @template T
 * @param {(client: import('pg').PoolClient) => Promise<T>} fn
 * @returns {Promise<T>}
 */
export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function ping() {
  const result = await query('SELECT 1 AS ok');
  return result.rows[0]?.ok === 1;
}
