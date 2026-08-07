import { Icon } from '@shiguang/ui';
import { FeedGrid } from '../components/FeedGrid';
import { flattenFeedPages, useFeed } from '../hooks/useFeed';
import { useInteractionActions } from '../hooks/usePostInteractions';
import { rememberScrollPosition, useScrollRestoration } from '../hooks/useScrollRestoration';
import styles from './Home.module.css';

const CAMPAIGN_ORIGIN = import.meta.env.VITE_CAMPAIGN_ORIGIN ?? 'http://localhost:5174';

export function HomePage() {
  const feedQuery = useFeed();
  const { toggleLike } = useInteractionActions();
  const { scrollKey, restoreTarget, acknowledgeRestore } = useScrollRestoration('feed');
  const items = flattenFeedPages(feedQuery.data?.pages);

  return (
    <div className={styles.home}>
      <a href={`${CAMPAIGN_ORIGIN}/618-sale`} className={styles.campaignBanner}>
        <div className={styles.campaignDecor} aria-hidden />
        <div className={styles.campaignInner}>
          <div className={styles.campaignBadge}>
            <span className={styles.campaignBadgeNum}>618</span>
            <span className={styles.campaignBadgeLabel}>狂欢</span>
          </div>
          <div className={styles.campaignContent}>
            <p className={styles.campaignTitle}>全场好物低至 5 折</p>
            <p className={styles.campaignDesc}>限时抢购 · 手慢无</p>
          </div>
          <span className={styles.campaignAction} aria-hidden>
            <Icon name="chevronRight" size={18} />
          </span>
        </div>
      </a>

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
