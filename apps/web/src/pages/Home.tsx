import { Icon } from '@shiguang/ui';
import { FeedGrid } from '../components/FeedGrid';
import { flattenFeedPages, useFeed } from '../hooks/useFeed';
import { useFeaturedCampaign } from '../hooks/useFeaturedCampaign';
import { useInteractionActions } from '../hooks/usePostInteractions';
import { rememberScrollPosition, useScrollRestoration } from '../hooks/useScrollRestoration';
import { getCampaignBannerCopy } from '@shiguang/shared';
import styles from './Home.module.css';

const CAMPAIGN_ORIGIN = import.meta.env.VITE_CAMPAIGN_ORIGIN ?? 'http://localhost:5174';

export function HomePage() {
  const feedQuery = useFeed();
  const featuredCampaignQuery = useFeaturedCampaign();
  const { toggleLike } = useInteractionActions();
  const { scrollKey, restoreTarget, acknowledgeRestore } = useScrollRestoration('feed');
  const items = flattenFeedPages(feedQuery.data?.pages);
  const campaign = featuredCampaignQuery.data;
  const bannerCopy = campaign ? getCampaignBannerCopy(campaign) : null;

  return (
    <div className={styles.home}>
      {campaign && bannerCopy ? (
        <a href={`${CAMPAIGN_ORIGIN}/${campaign.slug}`} className={styles.campaignBanner}>
          <div className={styles.campaignDecor} aria-hidden />
          <div className={styles.campaignInner}>
            <div className={styles.campaignBadge}>
              <span className={styles.campaignBadgeNum}>{bannerCopy.badgeNum}</span>
              <span className={styles.campaignBadgeLabel}>{bannerCopy.badgeLabel}</span>
            </div>
            <div className={styles.campaignContent}>
              <p className={styles.campaignTitle}>{bannerCopy.title}</p>
              <p className={styles.campaignDesc}>{bannerCopy.desc}</p>
            </div>
            <span className={styles.campaignAction} aria-hidden>
              <Icon name="chevronRight" size={18} />
            </span>
          </div>
        </a>
      ) : null}

      <div className={styles.feedArea}>
        <FeedGrid
          items={items}
          isLoading={feedQuery.isLoading}
          isError={feedQuery.isError}
          hasNextPage={feedQuery.hasNextPage}
          isFetchingNextPage={feedQuery.isFetchingNextPage}
          onLoadMore={() => feedQuery.fetchNextPage()}
          onLike={(item) => toggleLike(item.postId, item.isLiked, '/')}
          restoreScrollTop={restoreTarget}
          onScrollRestored={acknowledgeRestore}
          onBeforeItemNavigate={() => rememberScrollPosition(scrollKey, window.scrollY)}
        />
      </div>
    </div>
  );
}
