import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@shiguang/api-client';
import { Empty, Loading } from '@shiguang/ui';
import { CampaignRenderer } from '../components/CampaignRenderer';
import { initCampaignAnalytics, trackCampaignBlockClick, trackCampaignPageView } from '../lib/analytics';
import styles from './CampaignPage.module.css';

export function CampaignPage() {
  const { slug = '' } = useParams();

  useEffect(() => {
    initCampaignAnalytics();
  }, []);

  const { data, isLoading, error } = useQuery({
    queryKey: ['campaign', slug],
    queryFn: () => api.campaigns.getBySlug(slug),
    enabled: Boolean(slug),
  });

  useEffect(() => {
    if (data) {
      trackCampaignPageView(slug, data.campaignId);
    }
  }, [data, slug]);

  if (isLoading) {
    return (
      <div className={styles.center}>
        <Loading />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={styles.center}>
        <Empty title="活动不存在" description="该活动可能已下线或未发布" />
      </div>
    );
  }

  return (
    <CampaignRenderer
      schema={data.schema as import('@shiguang/campaign-schema').CampaignPageSchema}
      slug={slug}
      onBlockClick={(block) => trackCampaignBlockClick(slug, block.id, block.type)}
    />
  );
}
