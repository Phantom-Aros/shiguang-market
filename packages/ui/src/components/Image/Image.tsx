import { useState, type ImgHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../utils/cn';
import { Icon } from '../Icon/Icon';
import styles from './Image.module.css';

export interface ImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt'> {
  src: string;
  alt: string;
  aspectRatio?: string;
  fallback?: ReactNode;
}

export function Image({
  src,
  alt,
  aspectRatio = '1 / 1',
  className,
  fallback,
  loading = 'lazy',
  ...rest
}: ImageProps) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');

  return (
    <div className={cn(styles.wrapper, className)} style={{ aspectRatio }}>
      {status !== 'error' && (
        <img
          src={src}
          alt={alt}
          loading={loading}
          className={cn(styles.img, status === 'loading' && styles.hidden)}
          onLoad={() => setStatus('loaded')}
          onError={() => setStatus('error')}
          {...rest}
        />
      )}
      {status === 'loading' && <div className={styles.placeholder} aria-hidden />}
      {status === 'error' && (
        <div className={styles.fallback} role="img" aria-label={alt}>
          {fallback ?? <Icon name="image" size={32} />}
        </div>
      )}
    </div>
  );
}
