import type { IconifyIcon } from '@iconify/types';
import iconLookup from './generated/iconify-lookup.json';

export function getIconDataById(iconId: string): IconifyIcon {
  const data = (iconLookup as Record<string, IconifyIcon>)[iconId];
  if (!data) {
    throw new Error(
      `图标 ${iconId} 不在子集中，请确认 registry 已登记并运行 npm run generate --workspace=@shiguang/icons`,
    );
  }
  return data;
}
