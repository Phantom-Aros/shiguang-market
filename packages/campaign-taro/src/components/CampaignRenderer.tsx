import { Text, View } from '@tarojs/components';
import type { CampaignBlock, CampaignPageSchema } from '@shiguang/campaign-schema';
import type { ProductDetail } from '@shiguang/shared';
import { CountdownBlock } from '../blocks/CountdownBlock';
import { CouponBannerBlock } from '../blocks/CouponBannerBlock';
import { HeroBannerBlock } from '../blocks/HeroBannerBlock';
import { ProductGridBlock } from '../blocks/ProductGridBlock';
import { RichTextBlock } from '../blocks/RichTextBlock';
import './CampaignRenderer.scss';

export interface CampaignRendererProps {
  schema: CampaignPageSchema;
  fetchProducts: (productIds: string[]) => Promise<ProductDetail[]>;
  onProductClick?: (productId: string) => void;
}

function renderBlock(
  block: CampaignBlock,
  fetchProducts: CampaignRendererProps['fetchProducts'],
  onProductClick?: (productId: string) => void,
) {
  switch (block.type) {
    case 'heroBanner':
      return <HeroBannerBlock block={block} />;
    case 'countdown':
      return <CountdownBlock block={block} />;
    case 'productGrid':
      return (
        <ProductGridBlock
          block={block}
          fetchProducts={fetchProducts}
          onProductClick={onProductClick}
        />
      );
    case 'richText':
      return <RichTextBlock block={block} />;
    case 'couponBanner':
      return <CouponBannerBlock block={block} />;
    default:
      return null;
  }
}

export function CampaignRenderer({ schema, fetchProducts, onProductClick }: CampaignRendererProps) {
  const pageStyle = {
    backgroundColor: schema.theme?.backgroundColor,
  };

  return (
    <View className="campaign-page" style={pageStyle}>
      <View className="campaign-page__header">
        <Text className="campaign-page__title">{schema.title}</Text>
      </View>
      <View className="campaign-page__blocks">
        {schema.blocks.map((block) => (
          <View key={block.id} className="campaign-page__block">
            {renderBlock(block, fetchProducts, onProductClick)}
          </View>
        ))}
      </View>
    </View>
  );
}
