import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '@shiguang/api-client';
import type { FeedItem } from '@shiguang/shared';
import { feedQueryKey } from '../lib/queryClient';

const PAGE_SIZE = 20;

export function useFeed() {
  return useInfiniteQuery({
    queryKey: feedQueryKey,
    queryFn: ({ pageParam }) =>
      api.feed.list({
        cursor: pageParam as string | undefined,
        limit: PAGE_SIZE,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}

export function flattenFeedPages(pages: { items: FeedItem[] }[] | undefined) {
  return pages?.flatMap((page) => page.items) ?? [];
}
