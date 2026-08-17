/**
 * 从 registry 提取 Iconify ID，按图标集生成 lookup 供小程序打包。
 * 修改 registry 后运行：npm run generate --workspace=@shiguang/icons
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { getIconData, getIcons } from '@iconify/utils';

const require = createRequire(import.meta.url);

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const registryPath = join(root, 'src/registry.ts');
const outPath = join(root, 'src/generated/iconify-lookup.json');

const registry = readFileSync(registryPath, 'utf8');
const iconIds = [
  ...new Set([...registry.matchAll(/['"]([a-z0-9-]+:[a-z0-9-]+)['"]/g)].map((m) => m[1])),
].sort();

/** prefix -> icon names */
const byPrefix = new Map();
for (const iconId of iconIds) {
  const colon = iconId.indexOf(':');
  const prefix = iconId.slice(0, colon);
  const name = iconId.slice(colon + 1);
  if (!byPrefix.has(prefix)) byPrefix.set(prefix, []);
  byPrefix.get(prefix).push(name);
}

const lookup = {};
for (const [prefix, names] of byPrefix) {
  const uniqueNames = [...new Set(names)].sort();
  let iconSet;
  try {
    iconSet = require(`@iconify-json/${prefix}/icons.json`);
  } catch {
    throw new Error(
      `未安装 @iconify-json/${prefix}，请先执行：npm install @iconify-json/${prefix} --workspace=@shiguang/icons`,
    );
  }

  const subset = getIcons(iconSet, uniqueNames, true);
  if (!subset) {
    throw new Error(`图标集 ${prefix} 中找不到：${uniqueNames.join(', ')}`);
  }

  for (const name of uniqueNames) {
    const data = getIconData(subset, name);
    if (!data) {
      throw new Error(`图标 ${prefix}:${name} 不存在，请到 https://icon-sets.iconify.design/${prefix}/ 核对名称`);
    }
    lookup[`${prefix}:${name}`] = data;
  }
}

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${JSON.stringify(lookup, null, 2)}\n`);
console.log(`已生成 ${iconIds.length} 个图标 -> ${outPath}`);
