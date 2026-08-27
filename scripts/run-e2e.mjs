import { mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const nodeMajor = Number(process.versions.node.split('.')[0]);
if (nodeMajor < 20) {
  console.error(
    `Playwright 需要 Node.js 20+，当前为 ${process.versions.node}。\n` +
      '请升级 Node 后重试，例如：brew install node@20',
  );
  process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tmpDir = join(root, '.tmp');
mkdirSync(tmpDir, { recursive: true });

const playwrightArgs = ['playwright', 'test', ...process.argv.slice(2)];
const result = spawnSync('npx', playwrightArgs, {
  stdio: 'inherit',
  cwd: root,
  env: { ...process.env, TMPDIR: tmpDir },
});

process.exit(result.status ?? 1);
