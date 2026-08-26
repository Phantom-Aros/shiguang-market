import { useState, type ImgHTMLAttributes, type ReactNode } from 'react';
import { buildResponsiveImageSources } from '@shiguang/shared';
import { cn } from '../../utils/cn';
import { Icon } from '../Icon/Icon';
import styles from './Image.module.css';

export interface ImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt' | 'srcSet' | 'sizes'> {
  src: string;
  alt: string;
  aspectRatio?: string;
  fallback?: ReactNode;
  /** 响应式 sizes，默认 (max-width: 768px) 100vw, 50vw */
  sizes?: string;
  /** 生成 srcset 的宽度列表，默认 [400, 800, 1200] */
  widths?: number[];
  /** 低质量占位图（LQIP），加载完成前显示模糊预览 */
  blurDataURL?: string;
  /** 禁用 WebP/AVIF picture 回退，仅使用原始 src */
  disableModernFormats?: boolean;
}

export function Image({
  src,
  alt,
  aspectRatio = '1 / 1',
  className,
  fallback,
  loading = 'lazy',
  sizes,
  widths,
  blurDataURL,
  disableModernFormats = false,
  ...rest
}: ImageProps) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const responsive = buildResponsiveImageSources(src, { sizes, widths });
  const usePicture = !disableModernFormats && responsive.webpSrcSet;

  return (
    <div className={cn(styles.wrapper, className)} style={{ aspectRatio }}>
      {status === 'loading' && blurDataURL && (
        <img
          src={blurDataURL}
          alt=""
          aria-hidden
          className={cn(styles.img, styles.blur)}
        />
      )}
      {status !== 'error' &&
        (usePicture ? (
          <picture>
            {responsive.avifSrcSet && (
              <source type="image/avif" srcSet={responsive.avifSrcSet} sizes={responsive.sizes} />
            )}
            <source type="image/webp" srcSet={responsive.webpSrcSet} sizes={responsive.sizes} />
            <img
              src={responsive.src}
              srcSet={responsive.srcSet}
              sizes={responsive.sizes}
              alt={alt}
              loading={loading}
              className={cn(styles.img, status === 'loading' && styles.hidden)}
              onLoad={() => setStatus('loaded')}
              onError={() => setStatus('error')}
              {...rest}
            />
          </picture>
        ) : (
          <img
            src={responsive.src}
            srcSet={responsive.srcSet}
            sizes={responsive.sizes}
            alt={alt}
            loading={loading}
            className={cn(styles.img, status === 'loading' && styles.hidden)}
            onLoad={() => setStatus('loaded')}
            onError={() => setStatus('error')}
            {...rest}
          />
        ))}
      {status === 'loading' && !blurDataURL && <div className={styles.placeholder} aria-hidden />}
      {status === 'error' && (
        <div className={styles.fallback} role="img" aria-label={alt}>
          {fallback ?? <Icon name="image" size={32} />}
        </div>
      )}
    </div>
  );
}
