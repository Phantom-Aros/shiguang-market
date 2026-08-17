import { Image, View } from '@tarojs/components';
import { useMemo } from 'react';
import { buildIconDataUri, type SemanticIconName } from '@shiguang/icons';

export type IconName = SemanticIconName;

export interface IconProps {
  name: IconName;
  /** 尺寸，单位 px */
  size?: number;
  color?: string;
  /** 实心样式，用于激活态 */
  filled?: boolean;
  className?: string;
}

/**
 * 小程序图标：基于 Iconify 图标数据渲染为 SVG data URI + Image。
 * 换图标请改 @shiguang/icons 的 registry，无需手抄 path。
 */
export function Icon({ name, size = 20, color = '#636e72', filled = false, className }: IconProps) {
  const src = useMemo(
    () => buildIconDataUri(name, { size, color, filled }),
    [name, size, color, filled],
  );
  const sizePx = `${size}px`;

  return (
    <View className={className} style={{ width: sizePx, height: sizePx, lineHeight: 0 }}>
      <Image src={src} mode="aspectFit" style={{ width: sizePx, height: sizePx }} />
    </View>
  );
}
