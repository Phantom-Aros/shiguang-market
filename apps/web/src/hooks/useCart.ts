import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@shiguang/api-client';
import { useToast } from '@shiguang/ui';
import { cartQueryKey } from '../lib/queryClient';
import { useAuth } from '../contexts/AuthContext';

export function useCart() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();

  const cartQuery = useQuery({
    queryKey: cartQueryKey,
    queryFn: () => api.cart.get(),
    enabled: isAuthenticated,
  });

  const upsertMutation = useMutation({
    mutationFn: ({ productId, quantity }: { productId: string; quantity: number }) =>
      api.cart.upsertItem(productId, quantity),
    onSuccess: (data) => {
      queryClient.setQueryData(cartQueryKey, data);
    },
    onError: (err: Error) => {
      toast.show(err.message || '操作失败', 'error');
    },
  });

  const removeMutation = useMutation({
    mutationFn: (itemId: string) => api.cart.removeItem(itemId),
    onSuccess: (data) => {
      queryClient.setQueryData(cartQueryKey, data);
    },
    onError: (err: Error) => {
      toast.show(err.message || '删除失败', 'error');
    },
  });

  return {
    cart: cartQuery.data,
    isLoading: cartQuery.isLoading,
    itemCount: cartQuery.data?.itemCount ?? 0,
    upsertItem: upsertMutation.mutateAsync,
    removeItem: removeMutation.mutateAsync,
    isUpdating: upsertMutation.isPending || removeMutation.isPending,
    invalidate: () => queryClient.invalidateQueries({ queryKey: cartQueryKey }),
  };
}
