import { Text, View } from '@tarojs/components';
import type { HeroBannerBlock as HeroBannerBlockType } from '@shiguang/campaign-schema';
import { Image } from '@shiguang/ui-taro';
import './HeroBannerBlock.scss';

export interface HeroBannerBlockProps {
  block: HeroBannerBlockType;
}

export function HeroBannerBlock({ block }: HeroBannerBlockProps) {
  const { imageUrl, title, subtitle, height = 180 } = block.props;

  return (
    <View className="campaign-hero" style={{ minHeight: `${height * 2}rpx` }}>
      <Image
        src={imageUrl}
        aspectRatio={`750 / ${height}`}
        className="campaign-hero__image"
      />
      <View className="campaign-hero__overlay">
        <Text className="campaign-hero__title">{title}</Text>
        {subtitle ? <Text className="campaign-hero__subtitle">{subtitle}</Text> : null}
      </View>
    </View>
  );
}
