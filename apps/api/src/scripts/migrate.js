import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from '../db/postgres.js';
import { logger } from '../logger.js';

const log = logger.child({ name: 'migrate' });

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, '../../../../infra/migrations');

async function ensureMigrationsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function getAppliedMigrations() {
  const result = await pool.query('SELECT filename FROM schema_migrations ORDER BY id');
  return new Set(result.rows.map((row) => row.filename));
}

async function migrate() {
  await ensureMigrationsTable();
  const applied = await getAppliedMigrations();
  const files = (await readdir(migrationsDir))
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const filename of files) {
    if (applied.has(filename)) {
      log.info({ filename }, 'skip migration (already applied)');
      continue;
    }

    const sql = await readFile(join(migrationsDir, filename), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [filename]);
      await client.query('COMMIT');
      log.info({ filename }, 'applied migration');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  log.info('migration complete');
}

migrate()
  .catch((err) => {
    log.fatal({ err }, 'migration failed');
    process.exit(1);
  })
  .finally(() => pool.end());
