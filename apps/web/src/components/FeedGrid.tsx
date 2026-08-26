import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import type { FeedItem } from '@shiguang/shared';
import { AnalyticsEvents, track } from '@shiguang/shared/analytics';
import { Empty, ProductCard, SkeletonCard } from '@shiguang/ui';
import styles from './FeedGrid.module.css';

const GRID_GAP = 8;
const OVERSCAN = 600;
const LAYOUT_MAX_WIDTH = 640;
const LAYOUT_HORIZONTAL_PADDING = 32;
const HEIGHT_EPSILON = 2;

interface MasonryEntry {
  item: FeedItem;
  top: number;
  left: number;
  width: number;
  height: number;
}

interface FeedGridProps {
  items: FeedItem[];
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  isLoading?: boolean;
  isError?: boolean;
  onLoadMore?: () => void;
  onLike?: (item: FeedItem) => void;
  restoreScrollTop?: number | null;
  onScrollRestored?: () => void;
  onBeforeItemNavigate?: () => void;
}

function getFallbackContainerWidth() {
  if (typeof window === 'undefined') return 320;
  const contentWidth = Math.min(LAYOUT_MAX_WIDTH, window.innerWidth) - LAYOUT_HORIZONTAL_PADDING;
  return Math.max(contentWidth, 280);
}

function getCoverAspectRatio(item: FeedItem) {
  if (item.coverWidth && item.coverHeight) {
    return `${item.coverWidth} / ${item.coverHeight}`;
  }
  return '4 / 5';
}

function getCoverRatioValue(item: FeedItem) {
  if (item.coverWidth && item.coverHeight) {
    return item.coverHeight / item.coverWidth;
  }
  return 1.25;
}

/** 首屏布局兜底；真实高度由 ResizeObserver 测量后覆盖 */
function estimateItemHeight(item: FeedItem, columnWidth: number) {
  const imageHeight = columnWidth * getCoverRatioValue(item);
  let body = 24 + 20 + 8;
  if (item.minPrice != null) body += 20;
  if (item.author.nickname || item.likeCount != null) body += 44;
  return imageHeight + body;
}

function layoutMasonry(
  items: FeedItem[],
  containerWidth: number,
  heightCache: Map<string, number>,
) {
  const safeWidth = containerWidth > 0 ? containerWidth : getFallbackContainerWidth();
  const columnWidth = (safeWidth - GRID_GAP) / 2;
  const columnHeights = [0, 0];
  const entries: MasonryEntry[] = [];

  for (const item of items) {
    const column = columnHeights[0] <= columnHeights[1] ? 0 : 1;
    const top = columnHeights[column];
    const left = column * (columnWidth + GRID_GAP);
    const height = heightCache.get(item.postId) ?? estimateItemHeight(item, columnWidth);

    entries.push({ item, top, left, width: columnWidth, height });
    columnHeights[column] = top + height + GRID_GAP;
  }

  return {
    entries,
    totalHeight: Math.max(0, Math.max(...columnHeights, 0) - GRID_GAP),
  };
}

function splitForSkeleton(count: number) {
  const leftCount = Math.ceil(count / 2);
  return { leftCount, rightCount: count - leftCount };
}

function MasonryItem({
  entry,
  onMeasure,
  children,
}: {
  entry: MasonryEntry;
  onMeasure: (postId: string, height: number) => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;

    const report = () => {
      const height = node.getBoundingClientRect().height;
      if (height > 0) onMeasure(entry.item.postId, height);
    };

    report();
    const observer = new ResizeObserver(report);
    observer.observe(node);
    return () => observer.disconnect();
  }, [entry.item.postId, onMeasure]);

  return (
    <div
      ref={ref}
      className={styles.item}
      style={{
        width: entry.width,
        transform: `translate(${entry.left}px, ${entry.top}px)`,
      }}
    >
      {children}
    </div>
  );
}

export function FeedGrid({
  items,
  hasNextPage,
  isFetchingNextPage,
  isLoading,
  isError,
  onLoadMore,
  onLike,
  restoreScrollTop,
  onScrollRestored,
  onBeforeItemNavigate,
}: FeedGridProps) {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const heightCacheRef = useRef<Map<string, number>>(new Map());
  const exposedRef = useRef<Set<string>>(new Set());
  const [containerWidth, setContainerWidth] = useState(getFallbackContainerWidth);
  const [layoutVersion, setLayoutVersion] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(
    typeof window !== 'undefined' ? window.innerHeight : 800,
  );

  const measureContainerWidth = useCallback(() => {
    const measured = containerRef.current?.clientWidth ?? 0;
    if (measured > 0) {
      setContainerWidth(measured);
    }
  }, []);

  const handleItemMeasure = useCallback((postId: string, height: number) => {
    const rounded = Math.round(height);
    const prev = heightCacheRef.current.get(postId);
    if (prev !== undefined && Math.abs(prev - rounded) < HEIGHT_EPSILON) return;
    heightCacheRef.current.set(postId, rounded);
    setLayoutVersion((v) => v + 1);
  }, []);

  const { entries, totalHeight } = useMemo(
    () => layoutMasonry(items, containerWidth, heightCacheRef.current),
    [items, containerWidth, layoutVersion],
  );

  const visibleEntries = useMemo(() => {
    if (entries.length === 0) return entries;
    const top = scrollTop - OVERSCAN;
    const bottom = scrollTop + viewportHeight + OVERSCAN;
    return entries.filter((entry) => entry.top + entry.height >= top && entry.top <= bottom);
  }, [entries, scrollTop, viewportHeight]);

  useLayoutEffect(() => {
    if (restoreScrollTop == null || restoreScrollTop <= 0) return;

    const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const target = Math.min(restoreScrollTop, maxScroll);

    window.scrollTo({ top: target, left: 0, behavior: 'instant' as ScrollBehavior });
    setScrollTop(target);

    if (Math.abs(target - restoreScrollTop) <= 2) {
      onScrollRestored?.();
    }
  }, [restoreScrollTop, layoutVersion, totalHeight, onScrollRestored]);

  useLayoutEffect(() => {
    measureContainerWidth();
  }, [measureContainerWidth, items.length]);

  useEffect(() => {
    heightCacheRef.current.clear();
    setLayoutVersion((v) => v + 1);
  }, [containerWidth]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const observer = new ResizeObserver(measureContainerWidth);
    observer.observe(node);
    return () => observer.disconnect();
  }, [measureContainerWidth, isLoading]);

  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        setScrollTop(window.scrollY);
      });
    };
    const onResize = () => setViewportHeight(window.innerHeight);

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasNextPage || isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      (records) => {
        if (records[0]?.isIntersecting) onLoadMore?.();
      },
      { rootMargin: '240px' },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, onLoadMore, totalHeight]);

  useEffect(() => {
    for (const entry of visibleEntries) {
      if (exposedRef.current.has(entry.item.postId)) continue;
      exposedRef.current.add(entry.item.postId);
      track(AnalyticsEvents.FEED_EXPOSE, {
        postId: entry.item.postId,
        position: items.findIndex((item) => item.postId === entry.item.postId),
      });
    }
  }, [visibleEntries, items]);

  const renderCard = useCallback(
    (item: FeedItem) => (
      <ProductCard
        imageUrl={item.coverUrl}
        title={item.title}
        aspectRatio={getCoverAspectRatio(item)}
        price={item.minPrice ?? undefined}
        authorName={item.author.nickname ?? '匿名用户'}
        authorAvatar={item.author.avatarUrl ?? undefined}
        likeCount={item.likeCount}
        liked={item.isLiked}
        data-testid="feed-card"
        onClick={() => {
          track(AnalyticsEvents.FEED_CLICK, { postId: item.postId });
          onBeforeItemNavigate?.();
          navigate(`/posts/${item.postId}`);
        }}
        onLike={(event) => {
          event.stopPropagation();
          onLike?.(item);
        }}
      />
    ),
    [navigate, onBeforeItemNavigate, onLike],
  );

  if (isLoading) {
    const { leftCount, rightCount } = splitForSkeleton(4);
    return (
      <div ref={containerRef} className={styles.scroller}>
        <div className={styles.masonry}>
          <div className={styles.column}>
            {Array.from({ length: leftCount }).map((_, index) => (
              <SkeletonCard key={`left-${index}`} />
            ))}
          </div>
          <div className={styles.column}>
            {Array.from({ length: rightCount }).map((_, index) => (
              <SkeletonCard key={`right-${index}`} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return <Empty title="加载失败" description="请检查网络后刷新重试" />;
  }

  if (items.length === 0) {
    return <Empty title="暂无内容" description="稍后再来看看吧" />;
  }

  return (
    <div ref={containerRef} className={styles.scroller}>
      <div className={styles.canvas} style={{ height: totalHeight }}>
        {visibleEntries.map((entry) => (
          <MasonryItem key={entry.item.postId} entry={entry} onMeasure={handleItemMeasure}>
            {renderCard(entry.item)}
          </MasonryItem>
        ))}
      </div>

      <div ref={sentinelRef} className={styles.sentinel} aria-hidden />

      {isFetchingNextPage && (
        <div className={styles.loadingMore}>
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}
    </div>
  );
}
