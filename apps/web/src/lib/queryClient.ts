import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 10 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export const feedQueryKey = ['feed'] as const;
export const postQueryKey = (postId: string) => ['post', postId] as const;
export const relatedQueryKey = (postId: string) => ['post-related', postId] as const;
export const productQueryKey = (productId: string) => ['product', productId] as const;
export const cartQueryKey = ['cart'] as const;
export const ordersQueryKey = ['orders'] as const;
export const orderQueryKey = (orderId: string) => ['order', orderId] as const;
