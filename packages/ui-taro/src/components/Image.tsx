import { Image as TaroImage, View } from '@tarojs/components';
import { useState } from 'react';
import './Image.scss';

export interface ImageProps {
  src: string;
  alt?: string;
  aspectRatio?: string;
  className?: string;
  mode?: 'aspectFill' | 'aspectFit' | 'widthFix';
}

function parseAspectRatio(ratio: string) {
  const parts = ratio.split('/').map((s) => Number(s.trim()));
  if (parts.length === 2 && parts[0] && parts[1]) {
    return (parts[1] / parts[0]) * 100;
  }
  return 125;
}

export function Image({
  src,
  alt = '',
  aspectRatio = '4 / 5',
  className = '',
  mode = 'aspectFill',
}: ImageProps) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const paddingTop = `${parseAspectRatio(aspectRatio)}%`;

  return (
    <View className={`sg-image ${className}`} style={{ paddingTop }}>
      {status !== 'error' && (
        <TaroImage
          className={`sg-image__img ${status === 'loading' ? 'sg-image__img--hidden' : ''}`}
          src={src}
          mode={mode}
          lazyLoad
          onLoad={() => setStatus('loaded')}
          onError={() => setStatus('error')}
        />
      )}
      {status === 'loading' && <View className="sg-image__placeholder" />}
      {status === 'error' && (
        <View className="sg-image__fallback" aria-label={alt}>
          图片加载失败
        </View>
      )}
    </View>
  );
}
