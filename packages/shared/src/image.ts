export interface ResponsiveImageSources {
  src: string;
  srcSet?: string;
  webpSrcSet?: string;
  avifSrcSet?: string;
  sizes?: string;
}

const DEFAULT_WIDTHS = [400, 800, 1200];
const DEFAULT_SIZES = '(max-width: 768px) 100vw, 50vw';

function isStaticSrc(src: string) {
  return !src || src.startsWith('data:') || src.startsWith('blob:');
}

/**
 * 为图片 URL 生响应式 srcset。
 * 约定 query 参数 `w` / `f`，便于后续接入 CDN 或 MinIO 图片处理。
 */
export function buildImageVariantUrl(
  src: string,
  width: number,
  format?: 'webp' | 'avif',
): string {
  if (isStaticSrc(src)) return src;

  const separator = src.includes('?') ? '&' : '?';
  const params = [`w=${width}`];
  if (format) params.push(`f=${format}`);
  return `${src}${separator}${params.join('&')}`;
}

/**
 * @param src 原始图片 URL
 * @param options.widths 生成宽度列表
 * @param options.sizes  响应式 sizes 属性
 */
export function buildResponsiveImageSources(
  src: string,
  options?: { widths?: number[]; sizes?: string },
): ResponsiveImageSources {
  if (isStaticSrc(src)) {
    return { src };
  }

  const widths = options?.widths ?? DEFAULT_WIDTHS;
  const sizes = options?.sizes ?? DEFAULT_SIZES;
  const defaultWidth = widths[Math.min(1, widths.length - 1)] ?? widths[0];

  return {
    src: buildImageVariantUrl(src, defaultWidth),
    srcSet: widths.map((w) => `${buildImageVariantUrl(src, w)} ${w}w`).join(', '),
    webpSrcSet: widths.map((w) => `${buildImageVariantUrl(src, w, 'webp')} ${w}w`).join(', '),
    avifSrcSet: widths.map((w) => `${buildImageVariantUrl(src, w, 'avif')} ${w}w`).join(', '),
    sizes,
  };
}
