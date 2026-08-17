import { useCallback, useState } from 'react';
import { useDidShow } from '@tarojs/taro';
import type { PublishedCampaign } from '@shiguang/shared';
import { FEATURED_CAMPAIGN_SLUG } from '@shiguang/shared';
import { api } from '../lib/api';

/** 首页 Featured 活动：仅 status=published 时返回数据 */
export function useFeaturedCampaign(slug = FEATURED_CAMPAIGN_SLUG) {
  const [campaign, setCampaign] = useState<PublishedCampaign | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.campaigns.getBySlug(slug);
      setCampaign(data);
    } catch {
      setCampaign(null);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useDidShow(() => {
    void refresh();
  });

  return { campaign, loading, refresh };
}
