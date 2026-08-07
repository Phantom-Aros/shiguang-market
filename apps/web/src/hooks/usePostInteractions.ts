import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '@shiguang/api-client';
import type { FeedItem, PostDetail } from '@shiguang/shared';
import { useToast } from '@shiguang/ui';
import { useAuth } from '../contexts/AuthContext';
import { feedQueryKey, postQueryKey } from '../lib/queryClient';

type FeedCache = {
  pages: { items: FeedItem[]; nextCursor: string | null }[];
  pageParams: unknown[];
};

function updateFeedItem(
  data: FeedCache | undefined,
  postId: string,
  updater: (item: FeedItem) => FeedItem,
) {
  if (!data) return data;

  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      items: page.items.map((item) => (item.postId === postId ? updater(item) : item)),
    })),
  };
}

export function useInteractionActions() {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const requireLogin = (redirectPath: string) => {
    toast.info('请先登录');
    navigate('/login', { state: { from: redirectPath } });
  };

  const likeMutation = useMutation({
    mutationFn: async ({ postId, liked }: { postId: string; liked: boolean }) => {
      if (liked) {
        return api.posts.unlike(postId);
      }
      return api.posts.like(postId);
    },
    onMutate: async ({ postId, liked }) => {
      await queryClient.cancelQueries({ queryKey: postQueryKey(postId) });
      await queryClient.cancelQueries({ queryKey: feedQueryKey });

      const previousPost = queryClient.getQueryData<PostDetail>(postQueryKey(postId));
      const previousFeed = queryClient.getQueryData<FeedCache>(feedQueryKey);

      const nextLiked = !liked;
      const delta = nextLiked ? 1 : -1;

      if (previousPost) {
        queryClient.setQueryData<PostDetail>(postQueryKey(postId), {
          ...previousPost,
          isLiked: nextLiked,
          likeCount: Math.max(0, previousPost.likeCount + delta),
        });
      }

      queryClient.setQueryData<FeedCache>(feedQueryKey, (current) =>
        updateFeedItem(current, postId, (item) => ({
          ...item,
          isLiked: nextLiked,
          likeCount: Math.max(0, item.likeCount + delta),
        })),
      );

      return { previousPost, previousFeed, postId };
    },
    onError: (_error, _vars, context) => {
      if (context?.previousPost && context.postId) {
        queryClient.setQueryData(postQueryKey(context.postId), context.previousPost);
      }
      if (context?.previousFeed) {
        queryClient.setQueryData(feedQueryKey, context.previousFeed);
      }
      toast.error('操作失败，请重试');
    },
    onSettled: (_data, _error, vars) => {
      queryClient.invalidateQueries({ queryKey: postQueryKey(vars.postId) });
      queryClient.invalidateQueries({ queryKey: feedQueryKey });
    },
  });

  const favoriteMutation = useMutation({
    mutationFn: async ({ postId, favorited }: { postId: string; favorited: boolean }) => {
      if (favorited) {
        return api.posts.unfavorite(postId);
      }
      return api.posts.favorite(postId);
    },
    onMutate: async ({ postId, favorited }) => {
      await queryClient.cancelQueries({ queryKey: postQueryKey(postId) });
      await queryClient.cancelQueries({ queryKey: feedQueryKey });

      const previousPost = queryClient.getQueryData<PostDetail>(postQueryKey(postId));
      const previousFeed = queryClient.getQueryData<FeedCache>(feedQueryKey);

      const nextFavorited = !favorited;
      const delta = nextFavorited ? 1 : -1;

      if (previousPost) {
        queryClient.setQueryData<PostDetail>(postQueryKey(postId), {
          ...previousPost,
          isFavorited: nextFavorited,
          favoriteCount: Math.max(0, previousPost.favoriteCount + delta),
        });
      }

      queryClient.setQueryData<FeedCache>(feedQueryKey, (current) =>
        updateFeedItem(current, postId, (item) => ({
          ...item,
          isFavorited: nextFavorited,
          favoriteCount: Math.max(0, item.favoriteCount + delta),
        })),
      );

      return { previousPost, previousFeed, postId };
    },
    onError: (_error, _vars, context) => {
      if (context?.previousPost && context.postId) {
        queryClient.setQueryData(postQueryKey(context.postId), context.previousPost);
      }
      if (context?.previousFeed) {
        queryClient.setQueryData(feedQueryKey, context.previousFeed);
      }
      toast.error('操作失败，请重试');
    },
    onSettled: (_data, _error, vars) => {
      queryClient.invalidateQueries({ queryKey: postQueryKey(vars.postId) });
      queryClient.invalidateQueries({ queryKey: feedQueryKey });
    },
  });

  return {
    toggleLike: (postId: string, liked: boolean, redirectPath = '/') => {
      if (!isAuthenticated) {
        requireLogin(redirectPath);
        return;
      }
      likeMutation.mutate({ postId, liked });
    },
    toggleFavorite: (postId: string, favorited: boolean, redirectPath?: string) => {
      if (!isAuthenticated) {
        requireLogin(redirectPath ?? `/posts/${postId}`);
        return;
      }
      favoriteMutation.mutate({ postId, favorited });
    },
    isLikePending: likeMutation.isPending,
    isFavoritePending: favoriteMutation.isPending,
  };
}

export function usePostInteractions(postId: string) {
  const actions = useInteractionActions();

  return {
    toggleLike: (liked: boolean) => actions.toggleLike(postId, liked, `/posts/${postId}`),
    toggleFavorite: (favorited: boolean) =>
      actions.toggleFavorite(postId, favorited, `/posts/${postId}`),
    isLikePending: actions.isLikePending,
    isFavoritePending: actions.isFavoritePending,
  };
}
