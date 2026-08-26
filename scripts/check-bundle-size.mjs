#!/usr/bin/env node
/**
 * CI 门禁：检查 web 构建产物体积。
 * - 入口 chunk gzip < 200 KB
 * - 任意单 chunk gzip < 250 KB
 */
import { execSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const ROOT = new URL('..', import.meta.url).pathname;
const WEB_DIST = join(ROOT, 'apps/web/dist/assets');
const ENTRY_GZIP_LIMIT = 200 * 1024;
const CHUNK_GZIP_LIMIT = 250 * 1024;

function gzipSize(buffer) {
  return gzipSync(buffer).length;
}

function ensureBuild() {
  try {
    statSync(WEB_DIST);
  } catch {
    console.log('未找到构建产物，正在执行 npm --workspace=web run build ...');
    execSync('npm --workspace=web run build', { cwd: ROOT, stdio: 'inherit' });
  }
}

function analyze() {
  const files = readdirSync(WEB_DIST).filter((f) => f.endsWith('.js'));
  const rows = files.map((file) => {
    const path = join(WEB_DIST, file);
    const raw = readFileSync(path);
    return {
      file,
      raw: raw.length,
      gzip: gzipSize(raw),
    };
  });

  rows.sort((a, b) => b.gzip - a.gzip);

  console.log('\n=== Web Bundle Size Report ===\n');
  for (const row of rows) {
    console.log(`${row.file}: ${(row.raw / 1024).toFixed(1)} KB raw, ${(row.gzip / 1024).toFixed(1)} KB gzip`);
  }

  const entry = rows.find((r) => r.file.startsWith('index-')) ?? rows[0];
  let failed = false;

  if (entry.gzip > ENTRY_GZIP_LIMIT) {
    console.error(
      `\n❌ 入口 chunk gzip ${(entry.gzip / 1024).toFixed(1)} KB 超过 ${ENTRY_GZIP_LIMIT / 1024} KB 限制`,
    );
    failed = true;
  } else {
    console.log(`\n✅ 入口 chunk gzip ${(entry.gzip / 1024).toFixed(1)} KB < ${ENTRY_GZIP_LIMIT / 1024} KB`);
  }

  for (const row of rows) {
    if (row.gzip > CHUNK_GZIP_LIMIT) {
      console.error(`❌ ${row.file} gzip ${(row.gzip / 1024).toFixed(1)} KB 超过单 chunk 限制`);
      failed = true;
    }
  }

  const totalGzip = rows.reduce((sum, r) => sum + r.gzip, 0);
  console.log(`\n总 JS gzip: ${(totalGzip / 1024).toFixed(1)} KB (${rows.length} chunks)`);

  if (failed) process.exit(1);
}

ensureBuild();
analyze();
