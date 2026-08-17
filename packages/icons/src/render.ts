import { iconToSVG } from '@iconify/utils';
import { getIconDataById } from './iconifyData';
import { getIconifyId, type SemanticIconName } from './registry';

function applyColorToSvgBody(body: string, color: string): string {
  return body
    .replace(/fill="currentColor"/g, `fill="${color}"`)
    .replace(/stroke="currentColor"/g, `stroke="${color}"`);
}

export function buildIconSvg(
  name: SemanticIconName,
  options: { size?: number; color?: string; filled?: boolean } = {},
): string {
  const { size = 24, color = 'currentColor', filled = false } = options;
  const iconId = getIconifyId(name, { filled });
  const iconData = getIconDataById(iconId);
  const { attributes, body } = iconToSVG(iconData, {
    width: `${size}`,
    height: `${size}`,
  });

  const viewBox = attributes.viewBox ?? '0 0 24 24';
  const coloredBody = applyColorToSvgBody(body, color);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${viewBox}">${coloredBody}</svg>`;
}

/** 小程序 Image 组件可用的 SVG data URI */
export function buildIconDataUri(
  name: SemanticIconName,
  options: { size?: number; color?: string; filled?: boolean } = {},
): string {
  return `data:image/svg+xml,${encodeURIComponent(buildIconSvg(name, options))}`;
}
