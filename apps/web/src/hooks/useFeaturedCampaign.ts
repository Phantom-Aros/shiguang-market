import { useQuery } from '@tanstack/react-query';
import { api } from '@shiguang/api-client';
import type { PublishedCampaign } from '@shiguang/shared';
import { FEATURED_CAMPAIGN_SLUG } from '@shiguang/shared';

export function featuredCampaignQueryKey(slug = FEATURED_CAMPAIGN_SLUG) {
  return ['featured-campaign', slug] as const;
}

async function fetchFeaturedCampaign(slug: string): Promise<PublishedCampaign | null> {
  try {
    return await api.campaigns.getBySlug(slug);
  } catch {
    return null;
  }
}

/** 首页 Featured 活动：仅 status=published 时返回数据 */
export function useFeaturedCampaign(slug = FEATURED_CAMPAIGN_SLUG) {
  return useQuery({
    queryKey: featuredCampaignQueryKey(slug),
    queryFn: () => fetchFeaturedCampaign(slug),
    staleTime: 60_000,
  });
}
