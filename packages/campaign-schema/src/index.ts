export {
  campaignBlockSchema,
  campaignPageSchema,
  heroBannerBlockSchema,
  countdownBlockSchema,
  productGridBlockSchema,
  richTextBlockSchema,
  couponBannerBlockSchema,
  validateCampaignPageSchema,
  build618ExampleSchema,
} from './schema.js';

export interface CampaignTheme {
  primaryColor?: string;
  backgroundColor?: string;
}

export interface HeroBannerProps {
  imageUrl: string;
  title: string;
  subtitle?: string;
  linkUrl?: string;
  height?: number;
}

export interface CountdownProps {
  endTime: number;
  label?: string;
}

export interface ProductGridProps {
  title?: string;
  productIds: string[];
  columns?: 2 | 3;
}

export interface RichTextProps {
  content: string;
}

export interface CouponBannerProps {
  title: string;
  description?: string;
  code?: string;
  backgroundColor?: string;
}

export type HeroBannerBlock = { id: string; type: 'heroBanner'; props: HeroBannerProps };
export type CountdownBlock = { id: string; type: 'countdown'; props: CountdownProps };
export type ProductGridBlock = { id: string; type: 'productGrid'; props: ProductGridProps };
export type RichTextBlock = { id: string; type: 'richText'; props: RichTextProps };
export type CouponBannerBlock = { id: string; type: 'couponBanner'; props: CouponBannerProps };

export type CampaignBlock =
  | HeroBannerBlock
  | CountdownBlock
  | ProductGridBlock
  | RichTextBlock
  | CouponBannerBlock;

export interface CampaignPageSchema {
  title: string;
  theme?: CampaignTheme;
  blocks: CampaignBlock[];
}
