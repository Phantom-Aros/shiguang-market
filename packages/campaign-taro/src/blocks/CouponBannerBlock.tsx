import { Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import type { CouponBannerBlock as CouponBannerBlockType } from '@shiguang/campaign-schema';
import './CouponBannerBlock.scss';

export interface CouponBannerBlockProps {
  block: CouponBannerBlockType;
}

export function CouponBannerBlock({ block }: CouponBannerBlockProps) {
  const { title, description, code, backgroundColor } = block.props;

  const handleClick = () => {
    if (!code) return;
    Taro.setClipboardData({
      data: code,
      success: () => {
        Taro.showToast({ title: '优惠券码已复制', icon: 'success' });
      },
    });
  };

  return (
    <View
      className="campaign-coupon"
      style={{ backgroundColor: backgroundColor ?? '#ff4d4f' }}
      onClick={handleClick}
    >
      <View className="campaign-coupon__content">
        <Text className="campaign-coupon__title">{title}</Text>
        {description ? <Text className="campaign-coupon__desc">{description}</Text> : null}
        {code ? <Text className="campaign-coupon__code">{code}</Text> : null}
      </View>
      {code ? <Text className="campaign-coupon__action">领取</Text> : null}
    </View>
  );
}
