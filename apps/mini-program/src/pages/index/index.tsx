import { useCallback, useState } from 'react';
import { ScrollView, Text, View } from '@tarojs/components';
import Taro, { useDidShow, useReachBottom } from '@tarojs/taro';
import type { FeedItem, PublishedCampaign } from '@shiguang/shared';
import { getCampaignBannerCopy } from '@shiguang/shared';
import { Empty, Icon, Loading, ProductCard } from '@shiguang/ui-taro';
import { api } from '../../lib/api';
import { useFeaturedCampaign } from '../../hooks/useFeaturedCampaign';
import { useTabBarSelected } from '../../hooks/useTabBarSelected';
import './index.scss';

function CampaignBanner({ campaign }: { campaign: PublishedCampaign }) {
  const copy = getCampaignBannerCopy(campaign);

  return (
    <View
      className="campaign-banner"
      onClick={() => Taro.navigateTo({ url: `/pages/campaign/index?slug=${campaign.slug}` })}
    >
      <View className="campaign-banner__decor" />
      <View className="campaign-banner__inner">
        <View className="campaign-banner__badge">
          <Text className="campaign-banner__badge-num">{copy.badgeNum}</Text>
          <Text className="campaign-banner__badge-label">{copy.badgeLabel}</Text>
        </View>
        <View className="campaign-banner__content">
          <Text className="campaign-banner__title">{copy.title}</Text>
          <Text className="campaign-banner__desc">{copy.desc}</Text>
        </View>
        <View className="campaign-banner__action">
          <Icon name="chevronRight" size={18} color="#fff" />
        </View>
      </View>
    </View>
  );
}

export default function IndexPage() {
  useTabBarSelected(0);
  const { campaign } = useFeaturedCampaign();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const loadFeed = useCallback(async (nextCursor?: string) => {
    const isFirstPage = !nextCursor;
    if (isFirstPage) {
      setLoading(true);
      setError(false);
    } else {
      setLoadingMore(true);
    }

    try {
      const page = await api.feed.list({ cursor: nextCursor, limit: 20 });
      setItems((prev) => (isFirstPage ? page.items : [...prev, ...page.items]));
      setCursor(page.nextCursor);
      setHasMore(Boolean(page.nextCursor));
    } catch {
      if (isFirstPage) setError(true);
      Taro.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useDidShow(() => {
    if (items.length === 0) {
      void loadFeed();
    }
  });

  useReachBottom(() => {
    if (!loadingMore && hasMore && cursor) {
      void loadFeed(cursor);
    }
  });

  const handleLike = async (item: FeedItem) => {
    try {
      if (item.isLiked) {
        await api.posts.unlike(item.postId);
      } else {
        await api.posts.like(item.postId);
      }
      setItems((prev) =>
        prev.map((row) =>
          row.postId === item.postId
            ? {
                ...row,
                isLiked: !row.isLiked,
                likeCount: row.likeCount + (row.isLiked ? -1 : 1),
              }
            : row,
        ),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : '操作失败';
      Taro.showToast({ title: message, icon: 'none' });
    }
  };

  const openDetail = (postId: string) => {
    Taro.navigateTo({ url: `/pages/post-detail/index?postId=${postId}` });
  };

  const banner = campaign ? <CampaignBanner campaign={campaign} /> : null;

  if (loading) {
    return (
      <View className="feed-page safe-bottom">
        {banner}
        <Loading tip="加载 Feed…" block />
      </View>
    );
  }

  if (error) {
    return (
      <View className="feed-page safe-bottom">
        {banner}
        <Empty
          title="加载失败"
          description="请检查网络或 API 地址配置"
          action={
            <View className="retry-btn" onClick={() => void loadFeed()}>
              重试
            </View>
          }
        />
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View className="feed-page safe-bottom">
        {banner}
        <Empty title="暂无内容" description="稍后再来看看吧" />
      </View>
    );
  }

  const leftColumn: FeedItem[] = [];
  const rightColumn: FeedItem[] = [];
  items.forEach((item, index) => {
    if (index % 2 === 0) leftColumn.push(item);
    else rightColumn.push(item);
  });

  return (
    <ScrollView className="feed-page safe-bottom" scrollY enableBackToTop>
      {banner}
      <View className="feed-grid">
        <View className="feed-column">
          {leftColumn.map((item) => (
            <ProductCard
              key={item.postId}
              imageUrl={item.coverUrl}
              title={item.title}
              aspectRatio={
                item.coverWidth && item.coverHeight
                  ? `${item.coverWidth} / ${item.coverHeight}`
                  : '4 / 5'
              }
              price={item.minPrice ?? undefined}
              authorName={item.author.nickname ?? undefined}
              likeCount={item.likeCount}
              liked={item.isLiked}
              onClick={() => openDetail(item.postId)}
              onLike={() => void handleLike(item)}
            />
          ))}
        </View>
        <View className="feed-column">
          {rightColumn.map((item) => (
            <ProductCard
              key={item.postId}
              imageUrl={item.coverUrl}
              title={item.title}
              aspectRatio={
                item.coverWidth && item.coverHeight
                  ? `${item.coverWidth} / ${item.coverHeight}`
                  : '4 / 5'
              }
              price={item.minPrice ?? undefined}
              authorName={item.author.nickname ?? undefined}
              likeCount={item.likeCount}
              liked={item.isLiked}
              onClick={() => openDetail(item.postId)}
              onLike={() => void handleLike(item)}
            />
          ))}
        </View>
      </View>
      {loadingMore && <Loading tip="加载更多…" />}
      {!hasMore && items.length > 0 && (
        <View className="feed-end">— 已经到底啦 —</View>
      )}
    </ScrollView>
  );
}
