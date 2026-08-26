import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '@shiguang/api-client';
import type { OrderDetail } from '@shiguang/shared';
import { Button, Empty, Icon, Loading, Price, useToast } from '@shiguang/ui';
import { cartQueryKey, orderQueryKey, ordersQueryKey } from '../lib/queryClient';
import styles from './PayOrder.module.css';

function getStatusMessage(order: OrderDetail) {
  if (order.status === 'paid') return '订单已支付';
  if (order.status === 'cancelled') return '订单已取消，无法支付';
  return '订单状态已变更，无法支付';
}

export function PayOrderPage() {
  const { orderId = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();

  const orderQuery = useQuery({
    queryKey: orderQueryKey(orderId),
    queryFn: () => api.orders.get(orderId),
    enabled: Boolean(orderId),
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const order = orderQuery.data;

  useEffect(() => {
    if (!order || order.status === 'pending') return;
    navigate(`/orders/${orderId}`, { replace: true });
  }, [order, orderId, navigate]);

  const payMutation = useMutation({
    mutationFn: () => api.orders.pay(orderId),
    onSuccess: (nextOrder) => {
      queryClient.setQueryData(orderQueryKey(orderId), nextOrder);
      queryClient.invalidateQueries({ queryKey: ordersQueryKey });
      queryClient.invalidateQueries({ queryKey: cartQueryKey });
      toast.show('支付成功', 'success');
      navigate(`/orders/${orderId}`, { replace: true });
    },
    onError: async (err: Error) => {
      const result = await orderQuery.refetch();
      const latest = result.data;
      if (latest && latest.status !== 'pending') {
        toast.show(getStatusMessage(latest), 'warning');
        navigate(`/orders/${orderId}`, { replace: true });
        return;
      }
      toast.show(err.message || '支付失败', 'error');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => api.orders.cancel(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ordersQueryKey });
      queryClient.invalidateQueries({ queryKey: cartQueryKey });
      queryClient.invalidateQueries({ queryKey: orderQueryKey(orderId) });
      toast.show('订单已取消', 'info');
      navigate('/orders', { replace: true });
    },
    onError: (err: Error) => {
      toast.show(err.message || '取消失败', 'error');
    },
  });

  async function handlePay() {
    const result = await orderQuery.refetch();
    const latest = result.data;
    if (!latest) return;
    if (latest.status !== 'pending') {
      toast.show(getStatusMessage(latest), 'warning');
      navigate(`/orders/${orderId}`, { replace: true });
      return;
    }
    payMutation.mutate();
  }

  if (orderQuery.isLoading) {
    return <Loading tip="加载订单…" block />;
  }

  if (orderQuery.isError || !order) {
    return (
      <Empty
        title="订单不存在"
        action={
          <Button variant="primary" onClick={() => navigate('/orders')}>
            查看订单
          </Button>
        }
      />
    );
  }

  if (order.status !== 'pending') {
    return null;
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Icon name="clock" size={48} className={styles.icon} />
        <h1>待支付</h1>
        <p className={styles.amount}>
          <Price value={order.totalAmount} size="lg" />
        </p>
        <p className={styles.tip}>请在 30 分钟内完成支付，超时订单将自动取消</p>
      </div>

      <section className={styles.section}>
        <h2>订单商品</h2>
        <ul className={styles.list}>
          {order.items.map((item) => (
            <li key={item.itemId} className={styles.item}>
              {item.productCoverUrl && (
                <img src={item.productCoverUrl} alt="" className={styles.cover} />
              )}
              <div className={styles.info}>
                <p className={styles.name}>{item.productName}</p>
                <p className={styles.meta}>x{item.quantity}</p>
              </div>
              <Price value={item.subtotal} />
            </li>
          ))}
        </ul>
      </section>

      <footer className={styles.footer}>
        <Button
          variant="primary"
          block
          loading={payMutation.isPending || orderQuery.isFetching}
          disabled={payMutation.isPending}
          onClick={() => void handlePay()}
          data-testid="mock-pay"
        >
          模拟支付
        </Button>
        <Button
          variant="ghost"
          block
          loading={cancelMutation.isPending}
          disabled={payMutation.isPending}
          onClick={() => cancelMutation.mutate()}
        >
          取消订单
        </Button>
      </footer>
    </div>
  );
}
