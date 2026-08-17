/** 首页 Featured 活动 slug（Web / 小程序 Banner 与默认活动页共用） */
export const FEATURED_CAMPAIGN_SLUG = '618-sale';

type CampaignBannerSource = {
  slug: string;
  title: string;
  schema: {
    blocks: Array<{ type?: string; props?: Record<string, unknown> }>;
  };
};

/** 从已发布活动 Schema 提取 Banner 文案 */
export function getCampaignBannerCopy(campaign: CampaignBannerSource) {
  const hero = campaign.schema.blocks.find((block) => block.type === 'heroBanner');
  const props = hero?.props as { title?: string; subtitle?: string } | undefined;

  return {
    badgeNum: campaign.slug.startsWith('618') ? '618' : campaign.slug.split('-')[0]?.slice(0, 4).toUpperCase() ?? 'GO',
    badgeLabel: campaign.slug.startsWith('618') ? '狂欢' : '活动',
    title: props?.subtitle ?? campaign.title,
    desc: props?.title ?? '点击查看详情',
  };
}
